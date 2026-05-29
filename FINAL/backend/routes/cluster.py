from flask import Blueprint, jsonify

from database import get_client, get_db

cluster_bp = Blueprint('cluster', __name__)


@cluster_bp.route('/status', methods=['GET'])
def status():
    client = get_client()
    database = get_db()
    if client is None or database is None:
        return jsonify({'healthy': False, 'error': 'Database not initialized'}), 503

    try:
        ping = client.admin.command('ping')
        shards = client.admin.command({ 'listShards': 1 }).get('shards', [])
        return jsonify({
            'healthy': bool(ping.get('ok')),
            'clusterType': 'sharded',
            'database': database.name,
            'shardCount': len(shards),
            'shards': [{'id': shard.get('_id'), 'host': shard.get('host')} for shard in shards],
            'collections': database.list_collection_names(),
        })
    except Exception as exc:
        return jsonify({'healthy': False, 'error': str(exc)}), 503


@cluster_bp.route('/shards', methods=['GET'])
def shards():
    client = get_client()
    if client is None:
        return jsonify({'error': 'Database not initialized'}), 503

    try:
        result = client.admin.command({ 'listShards': 1 })
        return jsonify({
            'ok': result.get('ok'),
            'shards': [{'id': shard.get('_id'), 'host': shard.get('host')} for shard in result.get('shards', [])],
        })
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500
