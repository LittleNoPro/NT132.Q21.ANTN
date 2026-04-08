import json
import math
from urllib import error, request

from config import Config

def _get_models():
    url = f"{Config.OLLAMA_BASE_URL.rstrip('/')}/api/tags"
    with request.urlopen(url, timeout=5) as response:
        payload = json.loads(response.read().decode('utf-8'))
        return [model.get('name') for model in payload.get('models', []) if model.get('name')]

def _pick_embed_model():
    preferred = Config.OLLAMA_EMBED_MODEL
    try:
        models = _get_models()
    except Exception:
        return preferred

    if preferred in models:
        return preferred

    for name in models:
        if 'embed' in name:
            return name
    return preferred

EMBEDDING_MODEL = _pick_embed_model()
EMBEDDING_AVAILABLE = True

def generate_embedding(text):
    if not text or not text.strip():
        return None

    payload = json.dumps({
        'model': EMBEDDING_MODEL,
        'input': text[:6000],
    }).encode('utf-8')

    req = request.Request(
        f"{Config.OLLAMA_BASE_URL.rstrip('/')}/api/embed",
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with request.urlopen(req, timeout=30) as response:
            body = json.loads(response.read().decode('utf-8'))
            embeddings = body.get('embeddings') or []
            if embeddings:
                return embeddings[0]
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"[EMBEDDING] Failed to generate embedding: {exc}")
        return None
    return None

def cosine_similarity(vec_a, vec_b):
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

def find_similar(query_embedding, documents, top_k=20):
    scored = []
    for doc in documents:
        embedding = doc.get('embedding')
        if not embedding:
            continue
        try:
            score = cosine_similarity(query_embedding, embedding)
        except Exception:
            continue
        scored.append((doc, float(score)))

    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[:top_k]
