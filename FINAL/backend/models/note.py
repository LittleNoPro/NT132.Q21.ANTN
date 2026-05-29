"""
Note model for MongoDB
"""

from datetime import datetime
from bson import ObjectId
import shortuuid
import markdown
import bleach
from database import get_collection

class Note:
    """Note model class with static methods for database operations"""
    
    collection_name = 'notes'
    
    # Permission types (similar to CodiMD)
    PERMISSION_FREELY = 'freely'      # Anyone can edit
    PERMISSION_EDITABLE = 'editable'  # Signed-in users can edit
    PERMISSION_LIMITED = 'limited'    # Only invited users can edit
    PERMISSION_LOCKED = 'locked'      # Only owner can edit, signed-in can view
    PERMISSION_PROTECTED = 'protected' # Only owner can edit, anyone can view
    PERMISSION_PRIVATE = 'private'    # Only owner can view and edit
    
    @staticmethod
    def get_collection():
        return get_collection(Note.collection_name)
    
    @staticmethod
    def generate_shortid():
        """Generate a unique short ID"""
        return shortuuid.uuid()[:10]
    
    @staticmethod
    def create(owner_id=None, title='Untitled', content='', permission='private', alias=None, tags=None):
        """Create a new note"""
        collection = Note.get_collection()

        # Default content if empty
        if not content:
            content = f"# {title}\n\nStart writing your markdown here..."

        note_data = {
            'shortid': Note.generate_shortid(),
            'alias': alias,
            'title': title,
            'content': content,
            'tags': tags or [],
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
        """Find note by MongoDB ID"""
        collection = Note.get_collection()
        try:
            return collection.find_one({'_id': ObjectId(note_id)})
        except:
            return None
    
    @staticmethod
    def find_by_shortid(shortid):
        """Find note by short ID"""
        collection = Note.get_collection()
        return collection.find_one({'shortid': shortid})
    
    @staticmethod
    def find_by_alias(alias):
        """Find note by alias"""
        collection = Note.get_collection()
        return collection.find_one({'alias': alias})
    
    @staticmethod
    def find_by_id_or_shortid(note_id):
        """Find note by either MongoDB ID or short ID"""
        # Try shortid first
        note = Note.find_by_shortid(note_id)
        if note:
            return note
        
        # Try alias
        note = Note.find_by_alias(note_id)
        if note:
            return note
        
        # Try MongoDB ID
        return Note.find_by_id(note_id)
    
    @staticmethod
    def find_by_owner(owner_id):
        """Find all notes by owner"""
        collection = Note.get_collection()
        return list(collection.find({'owner_id': owner_id}).sort('updated_at', -1))
    
    @staticmethod
    def find_public_notes(limit=20):
        """Find publicly viewable notes"""
        collection = Note.get_collection()
        return list(collection.find({
            'permission': {'$in': ['freely', 'editable', 'protected']}
        }).sort('updated_at', -1).limit(limit))
    
    @staticmethod
    def update(note_id, update_data, user_id=None):
        """Update note"""
        collection = Note.get_collection()
        update_data['updated_at'] = datetime.utcnow()
        
        if user_id:
            update_data['last_change_user_id'] = user_id
        
        # Extract title from content if not provided
        if 'content' in update_data and 'title' not in update_data:
            content = update_data['content']
            # Try to extract title from first heading
            lines = content.split('\n')
            for line in lines:
                if line.startswith('# '):
                    update_data['title'] = line[2:].strip()
                    break
        
        try:
            result = collection.find_one_and_update(
                {'_id': ObjectId(note_id)},
                {'$set': update_data},
                return_document=True
            )
            return result
        except Exception as e:
            print(f"Error updating note: {e}")
            return None
    
    @staticmethod
    def delete(note_id):
        """Delete note"""
        collection = Note.get_collection()
        try:
            result = collection.delete_one({'_id': ObjectId(note_id)})
            return result.deleted_count > 0
        except:
            return False
    
    @staticmethod
    def delete_by_owner(owner_id):
        """Delete all notes by owner"""
        collection = Note.get_collection()
        try:
            collection.delete_many({'owner_id': owner_id})
            return True
        except:
            return False
    
    @staticmethod
    def increment_view_count(note_id):
        """Increment the view count of a note"""
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
        """Check if user is the owner of the note"""
        if not user_id or not note:
            return False
        return note.get('owner_id') == user_id
    
    @staticmethod
    def can_view(note, user_id=None):
        """Check if user can view the note"""
        if not note:
            return False
        
        permission = note.get('permission', 'private')
        
        # Private notes - only owner
        if permission == 'private':
            return Note.is_owner(note, user_id)
        
        # Limited - only owner (or invited users when implemented)
        if permission == 'limited':
            return Note.is_owner(note, user_id)
        
        # Locked - need to be signed in to view
        if permission == 'locked':
            return user_id is not None
        
        # Freely, Editable, Protected - anyone can view (public read)
        return True
    
    @staticmethod
    def can_edit(note, user_id=None):
        """Check if user can edit the note"""
        if not note:
            return False
        
        permission = note.get('permission', 'private')
        
        # Freely - anyone can edit
        if permission == 'freely':
            return True
        
        # Editable - signed-in users can edit
        if permission == 'editable':
            return user_id is not None
        
        # Private, Locked, Protected, Limited - only owner can edit
        if permission in ['private', 'locked', 'protected', 'limited']:
            return Note.is_owner(note, user_id)
        
        return False
    
    @staticmethod
    def render_html(content):
        """Render markdown content to HTML"""
        # Convert markdown to HTML
        html = markdown.markdown(content, extensions=[
            'extra',
            'codehilite',
            'toc',
            'tables',
            'fenced_code'
        ])
        
        # Sanitize HTML
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
        """Generate description from content"""
        # Remove markdown formatting
        text = content
        # Remove headings
        import re
        text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
        # Remove links
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
        # Remove images
        text = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', '', text)
        # Remove bold/italic
        text = re.sub(r'\*+([^\*]+)\*+', r'\1', text)
        text = re.sub(r'_+([^_]+)_+', r'\1', text)
        # Remove code blocks
        text = re.sub(r'```[^`]*```', '', text, flags=re.DOTALL)
        text = re.sub(r'`[^`]+`', '', text)
        
        # Clean up whitespace
        text = ' '.join(text.split())
        
        if len(text) > max_length:
            text = text[:max_length].rsplit(' ', 1)[0] + '...'
        
        return text
    
    @staticmethod
    def to_json(note, include_content=True):
        """Convert note document to JSON-serializable dict"""
        if not note:
            return None
        
        result = {
            'id': str(note['_id']),
            'shortid': note.get('shortid'),
            'alias': note.get('alias'),
            'title': note.get('title', 'Untitled'),
            'tags': note.get('tags', []),
            'permission': note.get('permission', 'freely'),
            'view_count': note.get('view_count', 0),
            'owner_id': note.get('owner_id'),
            'last_change_user_id': note.get('last_change_user_id'),
            'embedding_model': note.get('embedding_model'),
            'embedding_dimensions': note.get('embedding_dimensions'),
            'created_at': note.get('created_at').isoformat() if note.get('created_at') else None,
            'updated_at': note.get('updated_at').isoformat() if note.get('updated_at') else None
        }
        
        if include_content:
            result['content'] = note.get('content', '')
            result['description'] = Note.generate_description(note.get('content', ''))
        
        return result
