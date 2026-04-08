from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import PyMongoError

mongo_client = None
db = None

def init_db(app):
    global mongo_client, db

    uri = app.config['MONGODB_URI']
    db_name = app.config['MONGODB_DB_NAME']

    print("[DB] Connecting to MongoDB...")
    print(f"[DB] Database: {db_name}")

    mongo_client = MongoClient(
        uri,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=30000,
        retryWrites=True,
        retryReads=True,
    )

    try:
        mongo_client.admin.command('ping')
        print("[DB] Connected to MongoDB successfully!")

        try:
            shard_info = mongo_client.admin.command('listShards')
            shards = shard_info.get('shards', [])
            print(f"[DB] Cluster type: Sharded ({len(shards)} shard(s))")
        except Exception:
            try:
                rs_status = mongo_client.admin.command('replSetGetStatus')
                print(f"[DB] Replica Set: {rs_status.get('set', 'unknown')}")
            except Exception:
                print("[DB] Connected to a standalone MongoDB instance.")
    except PyMongoError as e:
        print(f"[DB] WARNING: Could not connect to MongoDB: {e}")
        print("[DB] The application will retry on first request.")

    db = mongo_client[db_name]
    app.db = db
    _create_indexes()

    return db

def _create_indexes():
    global db

    if db is not None:
        try:
            db.users.create_index([('email', ASCENDING)], unique=True, background=True)
            db.users.create_index([('username', ASCENDING)], unique=True, sparse=True, background=True)
            db.notes.create_index([('shortid', ASCENDING)], sparse=True, background=True)
            db.notes.create_index([('alias', ASCENDING)], sparse=True, background=True)
            db.notes.create_index([('owner_id', ASCENDING)], background=True)
            db.notes.create_index([('permission', ASCENDING)], background=True)
            db.notes.create_index([('title', ASCENDING)], background=True)
            db.notes.create_index([('created_at', DESCENDING)], background=True)
            db.notes.create_index([('updated_at', DESCENDING)], background=True)
            db.images.create_index([('note_id', ASCENDING)], background=True)
            db.images.create_index([('uploaded_by', ASCENDING)], background=True)
            db.images.create_index([('created_at', DESCENDING)], background=True)

            print("[DB] Indexes ensured successfully.")
        except Exception as e:
            print(f"[DB] Warning: Could not ensure indexes: {e}")

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
