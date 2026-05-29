"""
User routes for user management
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.note import Note

users_bp = Blueprint('users', __name__)

@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': User.to_json(user)
    })

@users_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update current user profile"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Fields that can be updated
    allowed_fields = ['username', 'display_name', 'avatar_url']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if 'username' in update_data:
        # Check if username is already taken
        existing_user = User.find_by_username(update_data['username'])
        if existing_user and str(existing_user['_id']) != user_id:
            return jsonify({'error': 'Username already taken'}), 409
    
    updated_user = User.update(user_id, update_data)
    
    if not updated_user:
        return jsonify({'error': 'Failed to update profile'}), 500
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': User.to_json(updated_user)
    })

@users_bp.route('/me/password', methods=['PUT'])
@jwt_required()
def change_password():
    """Change user password"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current and new password are required'}), 400
    
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400
    
    user = User.find_by_id(user_id)
    
    if not user or not User.verify_password(user, current_password):
        return jsonify({'error': 'Current password is incorrect'}), 401
    
    success = User.update_password(user_id, new_password)
    
    if not success:
        return jsonify({'error': 'Failed to update password'}), 500
    
    return jsonify({
        'message': 'Password updated successfully'
    })

@users_bp.route('/me', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Delete current user account"""
    user_id = get_jwt_identity()
    
    # Delete all user's notes first
    Note.delete_by_owner(user_id)
    
    # Delete user
    success = User.delete(user_id)
    
    if not success:
        return jsonify({'error': 'Failed to delete account'}), 500
    
    return jsonify({
        'message': 'Account deleted successfully'
    })

@users_bp.route('/<username>', methods=['GET'])
def get_user_profile(username):
    """Get user profile by username"""
    user = User.find_by_username(username)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get user's public notes (protected, editable, freely)
    collection = Note.get_collection()
    public_notes = list(collection.find({
        'owner_id': str(user['_id']),
        'permission': {'$in': ['protected', 'editable', 'freely']}
    }).sort('updated_at', -1).limit(50))
    
    return jsonify({
        'user': User.to_json(user),
        'notes': [Note.to_json(note, include_content=False) for note in public_notes]
    })

@users_bp.route('/me/notes', methods=['GET'])
@jwt_required()
def get_my_notes():
    """Get all notes owned by current user"""
    user_id = get_jwt_identity()
    notes = Note.find_by_owner(user_id)
    
    return jsonify({
        'notes': [Note.to_json(note) for note in notes]
    })

@users_bp.route('/me/history', methods=['GET'])
@jwt_required()
def get_history():
    """Get user's note viewing/editing history"""
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    history = user.get('history', [])
    
    return jsonify({
        'history': history
    })

@users_bp.route('/me/history', methods=['POST'])
@jwt_required()
def add_to_history():
    """Add a note to user's history"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    note_id = data.get('note_id')
    if not note_id:
        return jsonify({'error': 'Note ID is required'}), 400
    
    User.add_to_history(user_id, note_id)
    
    return jsonify({
        'message': 'Added to history'
    })

@users_bp.route('/me/history/<note_id>', methods=['DELETE'])
@jwt_required()
def remove_from_history(note_id):
    """Remove a note from user's history"""
    user_id = get_jwt_identity()
    
    User.remove_from_history(user_id, note_id)
    
    return jsonify({
        'message': 'Removed from history'
    })
