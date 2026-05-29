import os
from datetime import timedelta


def _bool_env(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.lower() in {'1', 'true', 'yes', 'on'}


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-me')
    DEBUG = os.environ.get('FLASK_ENV') == 'development'

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-me')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    MONGODB_URI = os.environ.get('MONGODB_URI', 'mongodb://admin:Admin%40123@mongos:27017/mowndark?authSource=admin')
    MONGODB_DB_NAME = os.environ.get('MONGODB_DB_NAME', 'mowndark')

    CORS_ORIGINS = [origin.strip() for origin in os.environ.get(
        'CORS_ORIGINS',
        'http://localhost:3000,http://127.0.0.1:3000'
    ).split(',') if origin.strip()]

    ALLOW_ANONYMOUS = _bool_env('ALLOW_ANONYMOUS', True)
    DEFAULT_PERMISSION = os.environ.get('DEFAULT_PERMISSION', 'editable')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))

    ENABLE_ADMIN_LAB_APIS = _bool_env('ENABLE_ADMIN_LAB_APIS', True)
    ENABLE_DOCKER_LOG_API = _bool_env('ENABLE_DOCKER_LOG_API', False)

    EMBEDDINGS_ENABLED = _bool_env('EMBEDDINGS_ENABLED', False)
    OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://127.0.0.1:11434')
    OLLAMA_EMBED_MODEL = os.environ.get('OLLAMA_EMBED_MODEL', 'nomic-embed-text')

    PERMISSION_TYPES = ['freely', 'editable', 'limited', 'locked', 'protected', 'private']
