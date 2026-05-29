import json
import math
import urllib.error
import urllib.request
from datetime import datetime
from flask import current_app


def embeddings_enabled():
    return bool(current_app.config.get('EMBEDDINGS_ENABLED'))


def generate_embedding(text):
    if not embeddings_enabled():
        return None

    payload = json.dumps({
        'model': current_app.config.get('OLLAMA_EMBED_MODEL', 'nomic-embed-text'),
        'prompt': text,
    }).encode('utf-8')
    url = current_app.config.get('OLLAMA_BASE_URL', 'http://127.0.0.1:11434').rstrip('/') + '/api/embeddings'
    request = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f'[EMBEDDING] Failed to generate embedding: {exc}')
        return None

    embedding = data.get('embedding')
    if isinstance(embedding, list) and embedding:
        return embedding
    return None


def cosine_similarity(left, right):
    if not left or not right or len(left) != len(right):
        return 0.0

    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if not left_norm or not right_norm:
        return 0.0
    return dot / (left_norm * right_norm)


def embedding_text(note):
    title = note.get('title') or ''
    tags = ' '.join(note.get('tags') or [])
    content = note.get('content') or ''
    return f'{title}\n{tags}\n\n{content}'.strip()


def find_similar(query_embedding, notes, limit=10):
    scored = []
    for note in notes:
        score = cosine_similarity(query_embedding, note.get('embedding'))
        if score > 0:
            scored.append((note, score))
    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[:limit]


def embedding_metadata(embedding):
    return {
        'embedding_model': current_app.config.get('OLLAMA_EMBED_MODEL', 'nomic-embed-text'),
        'embedding_dimensions': len(embedding),
        'embedding_updated_at': datetime.utcnow(),
    }
