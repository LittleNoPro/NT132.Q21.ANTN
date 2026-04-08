import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from models.note import Note

search_bp = Blueprint('search', __name__)

def get_optional_user_id():
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None

def _build_visibility_filter(user_id):
    visibility = [{'permission': {'$in': ['freely', 'editable', 'protected']}}]
    if user_id:
        visibility.append({'owner_id': user_id})
    return {'$or': visibility}

def _score_text_match(note, query):
    query_lower = query.lower()
    title = (note.get('title') or '').lower()
    alias = (note.get('alias') or '').lower()
    content = (note.get('content') or '').lower()
    tags = note.get('tags') or []
    tags_text = ' '.join(tag for tag in tags if isinstance(tag, str)).lower()

    score = 0.0
    if title == query_lower:
        score += 8.0
    if alias == query_lower:
        score += 7.0
    if query_lower in title:
        score += 5.0
    if query_lower in alias:
        score += 4.0
    if query_lower in tags_text:
        score += 3.0
    score += min(title.count(query_lower), 3) * 1.5
    score += min(alias.count(query_lower), 3) * 1.5
    score += min(tags_text.count(query_lower), 5) * 0.75
    score += min(content.count(query_lower), 10) * 0.25
    return round(score, 4)

def _sort_key(item):
    note, score = item
    updated_at = note.get('updated_at')
    return score, updated_at.isoformat() if updated_at else ''

@search_bp.route('', methods=['GET'])
def search_notes():
    query = request.args.get('q', '').strip()
    mode = request.args.get('mode', 'text').lower()
    limit = min(max(int(request.args.get('limit', 20)), 1), 50)

    if not query:
        return jsonify({'results': [], 'query': '', 'mode': mode, 'count': 0})

    user_id = get_optional_user_id()
    if mode == 'vector':
        return _vector_search(query, user_id, limit)
    return _text_search(query, user_id, limit)

def _text_search(query, user_id, limit):
    collection = Note.get_collection()
    if collection is None:
        return jsonify({'error': 'Database not available'}), 503

    try:
        pattern = re.escape(query)
        documents = list(
            collection.find(
                {
                    '$and': [
                        _build_visibility_filter(user_id),
                        {
                            '$or': [
                                {'title': {'$regex': pattern, '$options': 'i'}},
                                {'alias': {'$regex': pattern, '$options': 'i'}},
                                {'content': {'$regex': pattern, '$options': 'i'}},
                                {'tags': {'$regex': pattern, '$options': 'i'}},
                            ]
                        },
                    ]
                }
            )
            .limit(max(limit * 10, 50))
        )
        scored = sorted(
            ((note, _score_text_match(note, query)) for note in documents),
            key=_sort_key,
            reverse=True,
        )[:limit]
        return jsonify({
            'results': [
                Note.to_json(note, include_content=False)
                for note, _ in scored
            ],
            'mode': 'text',
            'query': query,
            'count': len(scored),
        })
    except Exception as exc:
        print(f"[SEARCH] Text search error: {exc}")
        return jsonify({'error': f'Search failed: {exc}'}), 500

def _vector_search(query, user_id, limit):
    try:
        from services.embedding_service import EMBEDDING_AVAILABLE, find_similar, generate_embedding
    except ImportError:
        return jsonify({'error': 'Vector search service is unavailable'}), 503

    if not EMBEDDING_AVAILABLE:
        return jsonify({'error': 'Vector search is unavailable'}), 503

    query_embedding = generate_embedding(query)
    if query_embedding is None:
        return jsonify({'error': 'Failed to generate query embedding'}), 500

    collection = Note.get_collection()
    if collection is None:
        return jsonify({'error': 'Database not available'}), 503

    try:
        documents = list(
            collection.find({
                'embedding': {'$exists': True, '$ne': None},
                **_build_visibility_filter(user_id),
            })
        )
        similar = find_similar(query_embedding, documents, top_k=limit)
        results = [
            {
                **Note.to_json(doc, include_content=False),
                'score': round(score, 4),
            }
            for doc, score in similar
            if score > 0.1
        ]
        return jsonify({
            'results': results,
            'mode': 'vector',
            'query': query,
            'count': len(results),
            'total_indexed': len(documents),
        })
    except Exception as exc:
        print(f"[SEARCH] Vector search error: {exc}")
        return jsonify({'error': f'Vector search failed: {exc}'}), 500

@search_bp.route('/reindex', methods=['POST'])
def reindex_embeddings():
    try:
        from services.embedding_service import EMBEDDING_AVAILABLE, generate_embedding
    except ImportError:
        return jsonify({'error': 'Vector search service is unavailable'}), 503

    if not EMBEDDING_AVAILABLE:
        return jsonify({'error': 'Vector search is unavailable'}), 503

    collection = Note.get_collection()
    if collection is None:
        return jsonify({'error': 'Database not available'}), 503

    notes_without_embedding = list(
        collection.find(
            {'$or': [{'embedding': {'$exists': False}}, {'embedding': None}]},
            {'_id': 1, 'title': 1, 'content': 1},
        )
    )

    indexed = 0
    failed = 0
    for note in notes_without_embedding:
        title = note.get('title', '')
        content = note.get('content', '')
        embedding = generate_embedding(f"{title}\n\n{content}".strip())
        if embedding:
            collection.update_one({'_id': note['_id']}, {'$set': {'embedding': embedding}})
            indexed += 1
        else:
            failed += 1

    return jsonify({
        'message': 'Reindexing complete',
        'indexed': indexed,
        'failed': failed,
        'total_without_embedding': len(notes_without_embedding),
    })

@search_bp.route('/stats', methods=['GET'])
def search_stats():
    collection = Note.get_collection()
    if collection is None:
        return jsonify({'error': 'Database not available'}), 503

    try:
        from services.embedding_service import EMBEDDING_AVAILABLE
    except ImportError:
        EMBEDDING_AVAILABLE = False

    try:
        return jsonify({
            'total_notes': collection.count_documents({}),
            'notes_with_embedding': collection.count_documents({'embedding': {'$exists': True, '$ne': None}}),
            'public_notes': collection.count_documents({'permission': {'$in': ['freely', 'editable', 'protected']}}),
            'vector_search_available': EMBEDDING_AVAILABLE,
            'text_search_available': True,
        })
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500
