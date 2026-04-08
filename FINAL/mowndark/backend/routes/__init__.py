from flask import jsonify
from routes.auth import auth_bp
from routes.notes import notes_bp
from routes.users import users_bp
from routes.status import status_bp
from routes.images import images_bp
from routes.search import search_bp

def register_routes(app):


    api_prefix = '/api'


    app.register_blueprint(auth_bp, url_prefix=f'{api_prefix}/auth')
    app.register_blueprint(notes_bp, url_prefix=f'{api_prefix}/notes')
    app.register_blueprint(users_bp, url_prefix=f'{api_prefix}/users')
    app.register_blueprint(status_bp, url_prefix=f'{api_prefix}/status')
    app.register_blueprint(images_bp, url_prefix=f'{api_prefix}/images')
    app.register_blueprint(search_bp, url_prefix=f'{api_prefix}/search')


    @app.route('/')
    def index():
        return jsonify({
            'name': 'Mowndark API',
            'version': '2.0.0',
            'description': 'Markdown note backend connected to MongoDB through mongos',
            'features': [
                'Markdown notes',
                'JWT authentication',
                'Public note sharing',
                'Image uploads',
                'Keyword and vector search',
            ]
        })


    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy'})


    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500
