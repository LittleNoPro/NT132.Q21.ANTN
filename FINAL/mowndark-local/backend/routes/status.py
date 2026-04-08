import json
from urllib import error, request

from flask import Blueprint, jsonify, current_app

status_bp = Blueprint('status', __name__)

def _check_ollama(base_url):
    url = f"{base_url.rstrip('/')}/api/tags"

    try:
        with request.urlopen(url, timeout=3) as response:
            payload = json.loads(response.read().decode('utf-8'))
            models = payload.get('models', [])
            return {
                'healthy': True,
                'base_url': base_url,
                'model_count': len(models),
            }
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return {
            'healthy': False,
            'base_url': base_url,
            'error': str(exc),
        }

@status_bp.route('', methods=['GET'])
def get_status():
    ollama = _check_ollama(current_app.config.get('OLLAMA_BASE_URL'))
    return jsonify({
        'status': 'ok',
        'name': 'Mowndark',
        'version': '2.0.0',
        'features': {
            'external_mongos': True,
            'public_notes': True,
            'authentication': True,
            'image_uploads': True,
            'ollama': ollama['healthy'],
            'vector_search': ollama['healthy'],
        }
    })

@status_bp.route('/config', methods=['GET'])
def get_config():
    return jsonify({
        'allowAnonymous': current_app.config.get('ALLOW_ANONYMOUS', True),
        'defaultPermission': current_app.config.get('DEFAULT_PERMISSION', 'editable'),
        'ollamaBaseUrl': current_app.config.get('OLLAMA_BASE_URL'),
        'ollamaEmbedModel': current_app.config.get('OLLAMA_EMBED_MODEL'),
        'permissionTypes': current_app.config.get('PERMISSION_TYPES', [
            'freely', 'editable', 'limited', 'locked', 'protected', 'private'
        ])
    })

@status_bp.route('/health', methods=['GET'])
def health_check():
    from database import get_client

    client = get_client()
    db_healthy = False

    if client:
        try:
            client.admin.command('ping')
            db_healthy = True
        except Exception:
            pass

    return jsonify({
        'healthy': db_healthy,
        'database': 'connected' if db_healthy else 'disconnected'
    }), 200 if db_healthy else 503

@status_bp.route('/ollama', methods=['GET'])
def ollama_status():
    status = _check_ollama(current_app.config.get('OLLAMA_BASE_URL'))
    return jsonify(status), 200 if status['healthy'] else 503

@status_bp.route('/replica', methods=['GET'])
def replica_status():
    from database import get_client

    client = get_client()
    if not client:
        return jsonify({'error': 'Database not connected'}), 503

    try:
        shard_info = client.admin.command('listShards')
        shards = []
        for s in shard_info.get('shards', []):
            shards.append({
                'id': s.get('_id'),
                'host': s.get('host'),
                'state': s.get('state')
            })

        return jsonify({
            'type': 'sharded_cluster',
            'shards': shards,
            'shard_count': len(shards),
            'ok': shard_info.get('ok')
        })
    except Exception:
        pass

    try:
        rs_status = client.admin.command('replSetGetStatus')
        members = []
        for member in rs_status.get('members', []):
            members.append({
                'id': member.get('_id'),
                'name': member.get('name'),
                'state': member.get('stateStr'),
                'health': member.get('health'),
                'uptime': member.get('uptime'),
                'optime': str(member.get('optimeDate', ''))
            })

        return jsonify({
            'type': 'replica_set',
            'set': rs_status.get('set'),
            'members': members,
            'ok': rs_status.get('ok')
        })
    except Exception:
        try:
            server_info = client.server_info()
            return jsonify({
                'type': 'unknown',
                'note': 'Could not retrieve cluster or RS status',
                'server_version': server_info.get('version'),
                'ok': 1
            })
        except Exception as e2:
            return jsonify({'error': str(e2)}), 500
