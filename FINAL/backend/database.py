from pymongo import ASCENDING, DESCENDING, MongoClient, TEXT
from pymongo.errors import OperationFailure, PyMongoError

mongo_client = None
db = None


def init_db(app):
    global mongo_client, db

    mongo_client = MongoClient(
        app.config['MONGODB_URI'],
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=30000,
        retryWrites=True,
        retryReads=True,
    )
    db = mongo_client[app.config['MONGODB_DB_NAME']]
    app.db = db

    try:
        mongo_client.admin.command('ping')
        try:
            shards = mongo_client.admin.command('listShards').get('shards', [])
            print(f"[DB] Connected to sharded MongoDB through mongos ({len(shards)} shard(s)).")
        except Exception:
            print('[DB] Connected to MongoDB.')
    except PyMongoError as exc:
        print(f'[DB] Warning: MongoDB is not ready yet: {exc}')

    _create_indexes()
    return db


def _create_indexes():
    global db

    if db is None:
        return

    def ensure_index(collection, keys, **kwargs):
        try:
            collection.create_index(keys, **kwargs)
        except OperationFailure as exc:
            if exc.code in {85, 86}:
                print(f"[DB] Skipping existing conflicting index on {collection.name}: {exc.details.get('errmsg', exc)}")
                return
            raise

    try:
        ensure_index(db.users, [('email', ASCENDING)], unique=True, background=True)
        ensure_index(db.users, [('username', ASCENDING)], unique=True, sparse=True, background=True)

        ensure_index(db.notes, [('shortid', ASCENDING)], sparse=True, background=True)
        ensure_index(db.notes, [('alias', ASCENDING)], sparse=True, background=True)
        ensure_index(db.notes, [('owner_id', ASCENDING)], background=True)
        ensure_index(db.notes, [('permission', ASCENDING)], background=True)
        ensure_index(db.notes, [('created_at', DESCENDING)], background=True)
        ensure_index(db.notes, [('updated_at', DESCENDING)], background=True)
        ensure_index(
            db.notes,
            [('title', TEXT), ('content', TEXT)],
            name='notes_text_search',
            weights={'title': 10, 'content': 1},
            background=True,
        )

        ensure_index(db.images, [('note_id', ASCENDING)], background=True)
        ensure_index(db.images, [('uploaded_by', ASCENDING)], background=True)
        ensure_index(db.images, [('created_at', DESCENDING)], background=True)

        ensure_index(db.audit_logs, [('created_at', DESCENDING)], background=True)
        ensure_index(
            db.write_concern_demo,
            [('batchId', ASCENDING), ('mode', ASCENDING), ('sequence', ASCENDING)],
            name='usecase8_batch_mode_sequence',
            background=True,
        )
    except Exception as exc:
        print(f'[DB] Warning: index creation issue: {exc}')


def get_db():
    global db
    return db


def get_collection(collection_name):
    global db
    if db is not None:
        return db[collection_name]
    return None


def get_client():
    global mongo_client
    return mongo_client
