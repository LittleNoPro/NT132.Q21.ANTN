import time
from datetime import datetime
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from pymongo.write_concern import WriteConcern

from database import get_db

admin_bp = Blueprint('admin', __name__)


def lab_enabled():
    return bool(current_app.config.get('ENABLE_ADMIN_LAB_APIS'))


def disabled_response():
    return jsonify({'error': 'Admin lab APIs are disabled'}), 403


@admin_bp.route('/audit-logs', methods=['GET'])
def audit_logs():
    if not lab_enabled():
        return disabled_response()

    database = get_db()
    limit = min(max(int(request.args.get('limit', 50)), 1), 200)
    logs = list(database.audit_logs.find({}).sort('created_at', -1).limit(limit))
    return jsonify({
        'logs': [
            {
                'id': str(log.get('_id')),
                'event': log.get('event'),
                'details': log.get('details', {}),
                'created_at': log.get('created_at').isoformat() if log.get('created_at') else None,
            }
            for log in logs
        ]
    })


@admin_bp.route('/write-concern-test', methods=['POST'])
def write_concern_test():
    if not lab_enabled():
        return disabled_response()

    database = get_db()
    payload = request.get_json() or {}
    count = min(max(int(payload.get('count', 100)), 1), 2000)
    batch_id = payload.get('batchId') or str(uuid4())
    base = database.write_concern_demo

    async_docs = [
        {'batchId': batch_id, 'mode': 'async-fire-and-forget', 'sequence': i, 'created_at': datetime.utcnow()}
        for i in range(count)
    ]
    sync_docs = [
        {'batchId': batch_id, 'mode': 'sync-majority-journal', 'sequence': i, 'created_at': datetime.utcnow()}
        for i in range(count)
    ]

    async_collection = base.with_options(write_concern=WriteConcern(w=0))
    sync_collection = base.with_options(write_concern=WriteConcern(w='majority', j=True, wtimeout=10000))

    start = time.perf_counter()
    async_result = async_collection.insert_many(async_docs, ordered=False)
    async_elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    start = time.perf_counter()
    sync_result = sync_collection.insert_many(sync_docs, ordered=False)
    sync_elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    time.sleep(0.2)
    async_count = base.count_documents({'batchId': batch_id, 'mode': 'async-fire-and-forget'})
    sync_count = base.count_documents({'batchId': batch_id, 'mode': 'sync-majority-journal'})

    database.audit_logs.insert_one({
        'event': 'write_concern_test',
        'details': {'batchId': batch_id, 'count': count},
        'created_at': datetime.utcnow(),
    })

    return jsonify({
        'batchId': batch_id,
        'requestedPerMode': count,
        'asyncStyle': {
            'writeConcern': {'w': 0},
            'acknowledged': async_result.acknowledged,
            'elapsedMs': async_elapsed_ms,
            'verifiedCount': async_count,
        },
        'syncDurable': {
            'writeConcern': {'w': 'majority', 'j': True},
            'acknowledged': sync_result.acknowledged,
            'elapsedMs': sync_elapsed_ms,
            'verifiedCount': sync_count,
        },
        'pass': async_count == count and sync_count == count and sync_result.acknowledged,
    })
