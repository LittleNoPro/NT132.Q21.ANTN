from datetime import datetime
from bson import ObjectId
import bcrypt
from pymongo import ReturnDocument
from database import get_collection

class User:

    collection_name = 'users'

    @staticmethod
    def get_collection():
        return get_collection(User.collection_name)

    @staticmethod
    def create(email, password, username=None):
        collection = User.get_collection()


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
        collection = User.get_collection()
        try:
            return collection.find_one({'_id': ObjectId(user_id)})
        except:
            return None

    @staticmethod
    def find_by_email(email):
        collection = User.get_collection()
        return collection.find_one({'email': email.lower()})

    @staticmethod
    def find_by_username(username):
        collection = User.get_collection()
        return collection.find_one({'username': username})

    @staticmethod
    def verify_password(user, password):
        if not user or not user.get('password'):
            return False
        return bcrypt.checkpw(
            password.encode('utf-8'),
            user['password'].encode('utf-8')
        )

    @staticmethod
    def update(user_id, update_data):
        collection = User.get_collection()
        update_data['updated_at'] = datetime.utcnow()

        try:
            result = collection.find_one_and_update(
                {'_id': ObjectId(user_id)},
                {'$set': update_data},
                return_document=ReturnDocument.AFTER
            )
            return result
        except Exception as e:
            print(f"Error updating user: {e}")
            return None

    @staticmethod
    def update_password(user_id, new_password):
        hashed_password = bcrypt.hashpw(
            new_password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')

        return User.update(user_id, {'password': hashed_password})

    @staticmethod
    def delete(user_id):
        collection = User.get_collection()
        try:
            result = collection.delete_one({'_id': ObjectId(user_id)})
            return result.deleted_count > 0
        except:
            return False

    @staticmethod
    def add_to_history(user_id, note_id):
        collection = User.get_collection()
        history_entry = {
            'note_id': note_id,
            'accessed_at': datetime.utcnow()
        }


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
                        '$slice': 100
                    }
                },
                '$set': {'updated_at': datetime.utcnow()}
            }
        )

    @staticmethod
    def remove_from_history(user_id, note_id):
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
        if not user:
            return None
        return {
            'id': str(user['_id']),
            'email': user.get('email'),
            'username': user.get('username'),
            'display_name': user.get('display_name'),
            'avatar_url': user.get('avatar_url'),
            'created_at': user.get('created_at').isoformat() if user.get('created_at') else None
        }
