import re
from datetime import datetime
from bson import ObjectId
import shortuuid
import markdown
import bleach
from pymongo import ReturnDocument
from database import get_collection

class Note:

    collection_name = 'notes'


    PERMISSION_FREELY = 'freely'
    PERMISSION_EDITABLE = 'editable'
    PERMISSION_LIMITED = 'limited'
    PERMISSION_LOCKED = 'locked'
    PERMISSION_PROTECTED = 'protected'
    PERMISSION_PRIVATE = 'private'

    @staticmethod
    def get_collection():
        return get_collection(Note.collection_name)

    @staticmethod
    def generate_shortid():
        return shortuuid.uuid()[:10]

    @staticmethod
    def create(owner_id=None, title='Untitled', content='', permission='private', alias=None):
        collection = Note.get_collection()


        if not content:
            content = f"# {title}\n\nStart writing your markdown here..."

        note_data = {
            'shortid': Note.generate_shortid(),
            'alias': alias,
            'title': title,
            'content': content,
            'embedding': None,
            'owner_id': owner_id,
            'permission': permission if owner_id else 'freely',
            'view_count': 0,
            'last_change_user_id': owner_id,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        try:
            result = collection.insert_one(note_data)
            note_data['_id'] = result.inserted_id
            return note_data
        except Exception as e:
            print(f"Error creating note: {e}")
            return None

    @staticmethod
    def find_by_id(note_id):
        collection = Note.get_collection()
        try:
            return collection.find_one({'_id': ObjectId(note_id)})
        except:
            return None

    @staticmethod
    def find_by_shortid(shortid):
        collection = Note.get_collection()
        return collection.find_one({'shortid': shortid})

    @staticmethod
    def find_by_alias(alias):
        collection = Note.get_collection()
        return collection.find_one({'alias': alias})

    @staticmethod
    def find_by_id_or_shortid(note_id):

        note = Note.find_by_shortid(note_id)
        if note:
            return note


        note = Note.find_by_alias(note_id)
        if note:
            return note


        return Note.find_by_id(note_id)

    @staticmethod
    def find_by_owner(owner_id):
        collection = Note.get_collection()
        return list(collection.find({'owner_id': owner_id}).sort('updated_at', -1))

    @staticmethod
    def find_public_notes(query='', limit=20):
        collection = Note.get_collection()
        filters = {
            'permission': {'$in': ['freely', 'editable', 'protected']}
        }

        query = (query or '').strip()
        if query:
            pattern = re.escape(query)
            filters['$or'] = [
                {'title': {'$regex': pattern, '$options': 'i'}},
                {'content': {'$regex': pattern, '$options': 'i'}},
                {'alias': {'$regex': pattern, '$options': 'i'}},
            ]

        return list(collection.find(filters).sort('updated_at', -1).limit(limit))

    @staticmethod
    def update(note_id, update_data, user_id=None):
        collection = Note.get_collection()
        update_data['updated_at'] = datetime.utcnow()

        if user_id:
            update_data['last_change_user_id'] = user_id


        if 'content' in update_data and 'title' not in update_data:
            content = update_data['content']

            lines = content.split('\n')
            for line in lines:
                if line.startswith('# '):
                    update_data['title'] = line[2:].strip()
                    break

        try:
            result = collection.find_one_and_update(
                {'_id': ObjectId(note_id)},
                {'$set': update_data},
                return_document=ReturnDocument.AFTER
            )
            return result
        except Exception as e:
            print(f"Error updating note: {e}")
            return None

    @staticmethod
    def delete(note_id):
        collection = Note.get_collection()
        try:
            result = collection.delete_one({'_id': ObjectId(note_id)})
            return result.deleted_count > 0
        except:
            return False

    @staticmethod
    def delete_by_owner(owner_id):
        collection = Note.get_collection()
        try:
            collection.delete_many({'owner_id': owner_id})
            return True
        except:
            return False

    @staticmethod
    def increment_view_count(note_id):
        collection = Note.get_collection()
        try:
            collection.update_one(
                {'_id': ObjectId(note_id)},
                {'$inc': {'view_count': 1}}
            )
        except:
            pass

    @staticmethod
    def is_owner(note, user_id):
        if not user_id or not note:
            return False
        return note.get('owner_id') == user_id

    @staticmethod
    def can_view(note, user_id=None):
        if not note:
            return False

        permission = note.get('permission', 'private')


        if permission == 'private':
            return Note.is_owner(note, user_id)


        if permission == 'limited':
            return Note.is_owner(note, user_id)


        if permission == 'locked':
            return user_id is not None


        return True

    @staticmethod
    def can_edit(note, user_id=None):
        if not note:
            return False

        permission = note.get('permission', 'private')


        if permission == 'freely':
            return True


        if permission == 'editable':
            return user_id is not None


        if permission in ['private', 'locked', 'protected', 'limited']:
            return Note.is_owner(note, user_id)

        return False

    @staticmethod
    def render_html(content):

        html = markdown.markdown(content, extensions=[
            'extra',
            'codehilite',
            'toc',
            'tables',
            'fenced_code'
        ])


        allowed_tags = bleach.ALLOWED_TAGS | {
            'p', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'ul', 'ol', 'li', 'blockquote', 'hr', 'br',
            'img', 'div', 'span'
        }
        allowed_attrs = {
            **bleach.ALLOWED_ATTRIBUTES,
            'img': ['src', 'alt', 'title'],
            'a': ['href', 'title', 'target'],
            'code': ['class'],
            'pre': ['class'],
            'div': ['class'],
            'span': ['class']
        }

        return bleach.clean(html, tags=allowed_tags, attributes=allowed_attrs)

    @staticmethod
    def generate_description(content, max_length=200):

        text = content

        text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)

        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)

        text = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', '', text)

        text = re.sub(r'\*+([^\*]+)\*+', r'\1', text)
        text = re.sub(r'_+([^_]+)_+', r'\1', text)

        text = re.sub(r'```[^`]*```', '', text, flags=re.DOTALL)
        text = re.sub(r'`[^`]+`', '', text)


        text = ' '.join(text.split())

        if len(text) > max_length:
            text = text[:max_length].rsplit(' ', 1)[0] + '...'

        return text

    @staticmethod
    def to_json(note, include_content=True):
        if not note:
            return None

        result = {
            'id': str(note['_id']),
            'shortid': note.get('shortid'),
            'alias': note.get('alias'),
            'title': note.get('title', 'Untitled'),
            'description': Note.generate_description(note.get('content', '')),
            'permission': note.get('permission', 'freely'),
            'view_count': note.get('view_count', 0),
            'has_embedding': note.get('embedding') is not None,
            'owner_id': note.get('owner_id'),
            'last_change_user_id': note.get('last_change_user_id'),
            'created_at': note.get('created_at').isoformat() if note.get('created_at') else None,
            'updated_at': note.get('updated_at').isoformat() if note.get('updated_at') else None
        }

        if include_content:
            result['content'] = note.get('content', '')

        return result
