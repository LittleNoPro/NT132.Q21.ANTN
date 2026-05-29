"""
Note routes for CRUD operations on markdown notes
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models.note import Note
from models.user import User

notes_bp = Blueprint('notes', __name__)

def get_optional_user_id():
    """Get user ID if authenticated, None otherwise"""
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except:
        return None

@notes_bp.route('', methods=['GET'])
@jwt_required()
def get_my_notes():
    """Get all notes owned by the current user"""
    user_id = get_jwt_identity()
    notes = Note.find_by_owner(user_id)
    
    return jsonify({
        'notes': [Note.to_json(note) for note in notes]
    })

@notes_bp.route('', methods=['POST'])
def create_note():
    """Create a new note"""
    user_id = get_optional_user_id()
    data = request.get_json() or {}
    
    # Check if anonymous notes are allowed
    if not user_id and not current_app.config.get('ALLOW_ANONYMOUS', True):
        return jsonify({'error': 'Authentication required to create notes'}), 401
    
    title = data.get('title', 'Untitled')
    content = data.get('content', '')
    # New notes are always private by default
    permission = 'private' if user_id else 'freely'
    alias = data.get('alias')
    tags = data.get('tags') if isinstance(data.get('tags'), list) else []

    note = Note.create(
        owner_id=user_id,
        title=title,
        content=content,
        permission=permission,
        alias=alias,
        tags=tags
    )
    
    if not note:
        return jsonify({'error': 'Failed to create note'}), 500
    
    return jsonify({
        'message': 'Note created successfully',
        'note': Note.to_json(note)
    }), 201

@notes_bp.route('/<note_id>', methods=['GET'])
def get_note(note_id):
    """Get a note by ID or shortid"""
    user_id = get_optional_user_id()
    note = Note.find_by_id_or_shortid(note_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    # Check view permission
    if not Note.can_view(note, user_id):
        return jsonify({'error': 'You do not have permission to view this note'}), 403
    
    # Increment view count
    Note.increment_view_count(note['_id'])
    
    return jsonify({
        'note': Note.to_json(note)
    })

@notes_bp.route('/<note_id>', methods=['PUT'])
def update_note(note_id):
    """Update a note"""
    user_id = get_optional_user_id()
    note = Note.find_by_id_or_shortid(note_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    # Check edit permission
    if not Note.can_edit(note, user_id):
        return jsonify({'error': 'You do not have permission to edit this note'}), 403
    
    data = request.get_json() or {}
    
    # Update fields
    update_data = {}
    if 'title' in data:
        update_data['title'] = data['title']
    if 'content' in data:
        update_data['content'] = data['content']
    if 'permission' in data and Note.is_owner(note, user_id):
        update_data['permission'] = data['permission']
    if 'alias' in data and Note.is_owner(note, user_id):
        update_data['alias'] = data['alias']
    if 'tags' in data and isinstance(data['tags'], list):
        update_data['tags'] = data['tags']

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
    """Delete a note"""
    user_id = get_jwt_identity()
    note = Note.find_by_id_or_shortid(note_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    # Only owner can delete
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
    """Get a published/public view of a note"""
    user_id = get_optional_user_id()
    note = Note.find_by_shortid(shortid)
    
    if not note:
        # Try alias
        note = Note.find_by_alias(shortid)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    if not Note.can_view(note, user_id):
        return jsonify({'error': 'You do not have permission to view this note'}), 403
    
    Note.increment_view_count(note['_id'])
    
    return jsonify({
        'note': Note.to_json(note, include_content=True)
    })
