import re
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from pymongo import TEXT

from models.note import Note
from services.embedding_service import embedding_metadata, embedding_text, embeddings_enabled, find_similar, generate_embedding

search_bp = Blueprint('search', __name__)


def get_optional_user_id():
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None


def visibility_filter(user_id):
    public_filter = {'permission': {'$in': ['freely', 'editable', 'protected']}}
    if user_id:
        return {'$or': [public_filter, {'owner_id': user_id}]}
    return public_filter


@search_bp.route('', methods=['GET'])
def search_notes():
    query = request.args.get('q', '').strip()
    mode = request.args.get('mode', 'text').lower()
    limit = min(max(int(request.args.get('limit', 20)), 1), 50)

    if not query:
        return jsonify({'query': query, 'mode': mode, 'count': 0, 'results': []})

    if mode == 'vector':
        return vector_search(query, get_optional_user_id(), limit)
    return text_search(query, get_optional_user_id(), limit)


def text_search(query, user_id, limit):
    collection = Note.get_collection()
    if collection is None:
        return jsonify({'error': 'Database not available'}), 503

    try:
        cursor = collection.find(
            {'$and': [visibility_filter(user_id), {'$text': {'$search': query}}]},
            {'score': {'$meta': 'textScore'}},
        ).sort([('score', {'$meta': 'textScore'})]).limit(limit)
        results = [
            {**Note.to_json(note, include_content=False), 'score': round(note.get('score', 0), 4)}
            for note in cursor
        ]
    except Exception:
        pattern = re.escape(query)
        cursor = collection.find({
            '$and': [
                visibility_filter(user_id),
                {'$or': [
                    {'title': {'$regex': pattern, '$options': 'i'}},
                    {'content': {'$regex': pattern, '$options': 'i'}},
                    {'tags': {'$regex': pattern, '$options': 'i'}},
                ]},
            ],
        }).limit(limit)
        results = [Note.to_json(note, include_content=False) for note in cursor]

    return jsonify({'query': query, 'mode': 'text', 'count': len(results), 'results': results})


def vector_search(query, user_id, limit):
    if not embeddings_enabled():
        return jsonify({'error': 'Vector search is disabled', 'mode': 'vector'}), 503

    query_embedding = generate_embedding(query)
    if query_embedding is None:
        return jsonify({'error': 'Could not generate query embedding', 'mode': 'vector'}), 503

    collection = Note.get_collection()
    notes = list(collection.find({**visibility_filter(user_id), 'embedding': {'$exists': True, '$ne': None}}))
    results = [
        {**Note.to_json(note, include_content=False), 'score': round(score, 4)}
        for note, score in find_similar(query_embedding, notes, limit)
    ]
    return jsonify({
        'query': query,
        'mode': 'vector',
        'count': len(results),
        'total_indexed': len(notes),
        'results': results,
    })


@search_bp.route('/reindex', methods=['POST'])
def reindex_embeddings():
    if not embeddings_enabled():
        return jsonify({'error': 'Vector search is disabled'}), 503

    collection = Note.get_collection()
    notes = list(collection.find({}, {'title': 1, 'content': 1, 'tags': 1, 'embedding': 1}))
    indexed = 0
    failed = 0

    for note in notes:
        embedding = generate_embedding(embedding_text(note))
        if embedding:
            collection.update_one(
                {'_id': note['_id']},
                {'$set': {'embedding': embedding, **embedding_metadata(embedding)}},
            )
            indexed += 1
        else:
            failed += 1

    return jsonify({'indexed': indexed, 'failed': failed, 'total': len(notes)})


@search_bp.route('/stats', methods=['GET'])
def search_stats():
    collection = Note.get_collection()
    if collection is None:
        return jsonify({'error': 'Database not available'}), 503

    return jsonify({
        'text_search_available': True,
        'vector_search_available': embeddings_enabled(),
        'total_notes': collection.count_documents({}),
        'notes_with_embedding': collection.count_documents({'embedding': {'$exists': True, '$ne': None}}),
    })
