"""
Authentication routes for user login, register, and token management
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, 
    create_refresh_token,
    jwt_required, 
    get_jwt_identity
)
from models.user import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email')
    password = data.get('password')
    username = data.get('username')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Check if user already exists
    if User.find_by_email(email):
        return jsonify({'error': 'Email already registered'}), 409
    
    if username and User.find_by_username(username):
        return jsonify({'error': 'Username already taken'}), 409
    
    # Create new user
    user = User.create(email=email, password=password, username=username)
    
    if not user:
        return jsonify({'error': 'Failed to create user'}), 500
    
    # Generate tokens
    access_token = create_access_token(identity=str(user['_id']))
    refresh_token = create_refresh_token(identity=str(user['_id']))
    
    return jsonify({
        'message': 'User registered successfully',
        'user': User.to_json(user),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return tokens"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Find user and verify password
    user = User.find_by_email(email)
    
    if not user or not User.verify_password(user, password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Generate tokens
    access_token = create_access_token(identity=str(user['_id']))
    refresh_token = create_refresh_token(identity=str(user['_id']))
    
    return jsonify({
        'message': 'Login successful',
        'user': User.to_json(user),
        'access_token': access_token,
        'refresh_token': refresh_token
    })

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    current_user_id = get_jwt_identity()
    access_token = create_access_token(identity=current_user_id)
    
    return jsonify({
        'access_token': access_token
    })

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user"""
    current_user_id = get_jwt_identity()
    user = User.find_by_id(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': User.to_json(user)
    })

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (client should discard tokens)"""
    # JWT tokens are stateless, so we just return success
    # Client should remove tokens from storage
    return jsonify({'message': 'Logged out successfully'})
