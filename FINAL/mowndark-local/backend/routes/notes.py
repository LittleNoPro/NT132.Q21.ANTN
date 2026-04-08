from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models.note import Note

notes_bp = Blueprint('notes', __name__)

def get_optional_user_id():
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None

def _generate_note_embedding(title, content):
    try:
        from services.embedding_service import EMBEDDING_AVAILABLE, generate_embedding

        if not EMBEDDING_AVAILABLE:
            return None

        text = f"{title}\n\n{content}".strip()
        return generate_embedding(text)
    except Exception as exc:
        print(f"[NOTE] Warning: embedding generation failed: {exc}")
        return None

@notes_bp.route('', methods=['GET'])
@jwt_required()
def get_my_notes():
    user_id = get_jwt_identity()
    notes = Note.find_by_owner(user_id)

    return jsonify({
        'notes': [Note.to_json(note) for note in notes]
    })

@notes_bp.route('', methods=['POST'])
def create_note():
    user_id = get_optional_user_id()
    data = request.get_json() or {}


    if not user_id and not current_app.config.get('ALLOW_ANONYMOUS', True):
        return jsonify({'error': 'Authentication required to create notes'}), 401

    title = data.get('title', 'Untitled')
    content = data.get('content', '')

    default_permission = 'private' if user_id else 'freely'
    permission = data.get('permission', default_permission)

    if data.get('is_public') and permission == default_permission:
        permission = 'freely'
    alias = data.get('alias')

    note = Note.create(
        owner_id=user_id,
        title=title,
        content=content,
        permission=permission,
        alias=alias
    )

    if not note:
        return jsonify({'error': 'Failed to create note'}), 500

    embedding = _generate_note_embedding(title, content)
    if embedding:
        note = Note.update(note['_id'], {'embedding': embedding}, user_id) or note

    return jsonify({
        'message': 'Note created successfully',
        'note': Note.to_json(note)
    }), 201

@notes_bp.route('/public', methods=['GET'])
def get_public_notes():
    query = request.args.get('q', '')
    limit = min(max(int(request.args.get('limit', 20)), 1), 100)
    notes = Note.find_public_notes(query=query, limit=limit)

    return jsonify({
        'notes': [Note.to_json(note, include_content=False) for note in notes],
        'query': query,
        'count': len(notes),
    })

@notes_bp.route('/<note_id>', methods=['GET'])
def get_note(note_id):
    user_id = get_optional_user_id()
    note = Note.find_by_id_or_shortid(note_id)

    if not note:
        return jsonify({'error': 'Note not found'}), 404


    if not Note.can_view(note, user_id):
        return jsonify({'error': 'You do not have permission to view this note'}), 403


    Note.increment_view_count(note['_id'])

    return jsonify({
        'note': Note.to_json(note)
    })

@notes_bp.route('/<note_id>', methods=['PUT'])
def update_note(note_id):
    user_id = get_optional_user_id()
    note = Note.find_by_id_or_shortid(note_id)

    if not note:
        return jsonify({'error': 'Note not found'}), 404


    if not Note.can_edit(note, user_id):
        return jsonify({'error': 'You do not have permission to edit this note'}), 403

    data = request.get_json() or {}


    update_data = {}
    if 'title' in data:
        update_data['title'] = data['title']
    if 'content' in data:
        update_data['content'] = data['content']
    if 'permission' in data and Note.is_owner(note, user_id):
        update_data['permission'] = data['permission']
    if 'alias' in data and Note.is_owner(note, user_id):
        update_data['alias'] = data['alias']

    if 'title' in update_data or 'content' in update_data:
        next_title = update_data.get('title', note.get('title', 'Untitled'))
        next_content = update_data.get('content', note.get('content', ''))
        embedding = _generate_note_embedding(next_title, next_content)
        if embedding:
            update_data['embedding'] = embedding

    updated_note = Note.update(note['_id'], update_data, user_id)

    if not updated_note:
        return jsonify({'error': 'Failed to update note'}), 500

    return jsonify({
        'message': 'Note updated successfully',
        'note': Note.to_json(updated_note)
    })

@notes_bp.route('/<note_id>', methods=['DELETE'])
@jwt_required()
def delete_note(note_id):
    user_id = get_jwt_identity()
    note = Note.find_by_id_or_shortid(note_id)

    if not note:
        return jsonify({'error': 'Note not found'}), 404


    if not Note.is_owner(note, user_id):
        return jsonify({'error': 'Only the owner can delete this note'}), 403

    success = Note.delete(note['_id'])

    if not success:
        return jsonify({'error': 'Failed to delete note'}), 500

    return jsonify({
        'message': 'Note deleted successfully'
    })

@notes_bp.route('/s/<shortid>', methods=['GET'])
def get_published_note(shortid):
    user_id = get_optional_user_id()
    note = Note.find_by_shortid(shortid)

    if not note:

        note = Note.find_by_alias(shortid)

    if not note:
        return jsonify({'error': 'Note not found'}), 404

    if not Note.can_view(note, user_id):
        return jsonify({'error': 'You do not have permission to view this note'}), 403

    Note.increment_view_count(note['_id'])

    return jsonify({
        'note': Note.to_json(note, include_content=True)
    })
