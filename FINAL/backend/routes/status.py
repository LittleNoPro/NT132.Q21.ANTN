"""
Status routes for health checks and configuration
"""

from flask import Blueprint, jsonify, current_app

status_bp = Blueprint('status', __name__)

@status_bp.route('', methods=['GET'])
def get_status():
    """Get server status"""
    return jsonify({
        'status': 'ok',
        'name': 'Mowndark',
        'version': '1.0.0'
    })

@status_bp.route('/config', methods=['GET'])
def get_config():
    """Get public configuration options"""
    return jsonify({
        'allowAnonymous': current_app.config.get('ALLOW_ANONYMOUS', True),
        'defaultPermission': current_app.config.get('DEFAULT_PERMISSION', 'editable'),
        'permissionTypes': current_app.config.get('PERMISSION_TYPES', [
            'freely', 'editable', 'limited', 'locked', 'protected', 'private'
        ]),
        'embeddingsEnabled': current_app.config.get('EMBEDDINGS_ENABLED', False),
        'adminLabApisEnabled': current_app.config.get('ENABLE_ADMIN_LAB_APIS', False)
    })

@status_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for container orchestration"""
    return jsonify({
        'healthy': True
    })
