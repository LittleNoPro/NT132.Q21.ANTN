"""
User model for MongoDB
"""

from datetime import datetime
from bson import ObjectId
import bcrypt
from database import get_collection

class User:
    """User model class with static methods for database operations"""
    
    collection_name = 'users'
    
    @staticmethod
    def get_collection():
        return get_collection(User.collection_name)
    
    @staticmethod
    def create(email, password, username=None):
        """Create a new user"""
        collection = User.get_collection()
        
        # Hash password
        hashed_password = bcrypt.hashpw(
            password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
        
        user_data = {
            'email': email.lower(),
            'password': hashed_password,
            'username': username,
            'display_name': username or email.split('@')[0],
            'avatar_url': None,
            'role': 'user',
            'history': [],
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        try:
            result = collection.insert_one(user_data)
            user_data['_id'] = result.inserted_id
            return user_data
        except Exception as e:
            print(f"Error creating user: {e}")
            return None
    
    @staticmethod
    def find_by_id(user_id):
        """Find user by ID"""
        collection = User.get_collection()
        try:
            return collection.find_one({'_id': ObjectId(user_id)})
        except:
            return None
    
    @staticmethod
    def find_by_email(email):
        """Find user by email"""
        collection = User.get_collection()
        return collection.find_one({'email': email.lower()})
    
    @staticmethod
    def find_by_username(username):
        """Find user by username"""
        collection = User.get_collection()
        return collection.find_one({'username': username})
    
    @staticmethod
    def verify_password(user, password):
        """Verify user password"""
        if not user or not user.get('password'):
            return False
        return bcrypt.checkpw(
            password.encode('utf-8'),
            user['password'].encode('utf-8')
        )
    
    @staticmethod
    def update(user_id, update_data):
        """Update user data"""
        collection = User.get_collection()
        update_data['updated_at'] = datetime.utcnow()
        
        try:
            result = collection.find_one_and_update(
                {'_id': ObjectId(user_id)},
                {'$set': update_data},
                return_document=True
            )
            return result
        except Exception as e:
            print(f"Error updating user: {e}")
            return None
    
    @staticmethod
    def update_password(user_id, new_password):
        """Update user password"""
        hashed_password = bcrypt.hashpw(
            new_password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        return User.update(user_id, {'password': hashed_password})
    
    @staticmethod
    def delete(user_id):
        """Delete user"""
        collection = User.get_collection()
        try:
            result = collection.delete_one({'_id': ObjectId(user_id)})
            return result.deleted_count > 0
        except:
            return False
    
    @staticmethod
    def add_to_history(user_id, note_id):
        """Add note to user's history"""
        collection = User.get_collection()
        history_entry = {
            'note_id': note_id,
            'accessed_at': datetime.utcnow()
        }
        
        # Remove if already exists, then add to front
        collection.update_one(
            {'_id': ObjectId(user_id)},
            {
                '$pull': {'history': {'note_id': note_id}},
            }
        )
        collection.update_one(
            {'_id': ObjectId(user_id)},
            {
                '$push': {
                    'history': {
                        '$each': [history_entry],
                        '$position': 0,
                        '$slice': 100  # Keep only last 100 entries
                    }
                },
                '$set': {'updated_at': datetime.utcnow()}
            }
        )
    
    @staticmethod
    def remove_from_history(user_id, note_id):
        """Remove note from user's history"""
        collection = User.get_collection()
        collection.update_one(
            {'_id': ObjectId(user_id)},
            {
                '$pull': {'history': {'note_id': note_id}},
                '$set': {'updated_at': datetime.utcnow()}
            }
        )
    
    @staticmethod
    def to_json(user):
        """Convert user document to JSON-serializable dict"""
        if not user:
            return None
        return {
            'id': str(user['_id']),
            'email': user.get('email'),
            'username': user.get('username'),
            'display_name': user.get('display_name'),
            'avatar_url': user.get('avatar_url'),
            'role': user.get('role', 'user'),
            'created_at': user.get('created_at').isoformat() if user.get('created_at') else None
        }
