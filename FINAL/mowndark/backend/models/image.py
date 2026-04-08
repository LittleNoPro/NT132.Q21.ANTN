from datetime import datetime
from bson import ObjectId, Binary
from database import get_collection

class Image:

    collection_name = 'images'

    @staticmethod
    def get_collection():
        return get_collection(Image.collection_name)

    @staticmethod
    def create(filename, content_type, data, size, note_id=None, uploaded_by=None):
        collection = Image.get_collection()

        image_data = {
            'filename': filename,
            'content_type': content_type,
            'data': Binary(data),
            'size': size,
            'note_id': note_id,
            'uploaded_by': uploaded_by,
            'created_at': datetime.utcnow()
        }

        try:
            result = collection.insert_one(image_data)
            image_data['_id'] = result.inserted_id
            return image_data
        except Exception as e:
            print(f"Error creating image: {e}")
            return None

    @staticmethod
    def find_by_id(image_id):
        collection = Image.get_collection()
        try:
            return collection.find_one({'_id': ObjectId(image_id)})
        except:
            return None

    @staticmethod
    def find_by_note(note_id):
        collection = Image.get_collection()
        return list(collection.find(
            {'note_id': note_id},
            {'data': 0}
        ).sort('created_at', -1))

    @staticmethod
    def find_by_user(user_id):
        collection = Image.get_collection()
        return list(collection.find(
            {'uploaded_by': user_id},
            {'data': 0}
        ).sort('created_at', -1))

    @staticmethod
    def delete(image_id):
        collection = Image.get_collection()
        try:
            result = collection.delete_one({'_id': ObjectId(image_id)})
            return result.deleted_count > 0
        except:
            return False

    @staticmethod
    def delete_by_note(note_id):
        collection = Image.get_collection()
        try:
            collection.delete_many({'note_id': note_id})
            return True
        except:
            return False

    @staticmethod
    def to_json(image, include_data=False):
        if not image:
            return None

        result = {
            'id': str(image['_id']),
            'filename': image.get('filename'),
            'content_type': image.get('content_type'),
            'size': image.get('size'),
            'note_id': image.get('note_id'),
            'uploaded_by': image.get('uploaded_by'),
            'url': f"/api/images/{image['_id']}",
            'created_at': image.get('created_at').isoformat() if image.get('created_at') else None
        }

        if include_data and 'data' in image:
            import base64
            result['data'] = base64.b64encode(image['data']).decode('utf-8')

        return result
