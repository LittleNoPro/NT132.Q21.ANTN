import os
from datetime import timedelta

def _parse_origins():
    raw_value = os.environ.get('CORS_ORIGINS')
    if raw_value:
        return [origin.strip() for origin in raw_value.split(',') if origin.strip()]

    return [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]

class Config:


    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-me')
    DEBUG = os.environ.get('FLASK_ENV') == 'development'


    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-me')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)


    MONGODB_URI = os.environ.get(
        'MONGODB_URI',
        'mongodb://admin:Admin%40123@mongos:27017/mowndark?authSource=admin'
    )
    MONGODB_DB_NAME = os.environ.get('MONGODB_DB_NAME', 'mowndark')
    OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
    OLLAMA_EMBED_MODEL = os.environ.get('OLLAMA_EMBED_MODEL', 'nomic-embed-text:latest')
    CORS_ORIGINS = _parse_origins()


    ALLOW_ANONYMOUS = os.environ.get('ALLOW_ANONYMOUS', 'true').lower() == 'true'
    DEFAULT_PERMISSION = os.environ.get('DEFAULT_PERMISSION', 'editable')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024


    PERMISSION_TYPES = ['freely', 'editable', 'limited', 'locked', 'protected', 'private']
