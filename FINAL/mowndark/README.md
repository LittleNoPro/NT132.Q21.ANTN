# Mowndark

Next.js, Flask, Ollama vector search, and a MongoDB sharded cluster with 3 shards.

## Run

1. `./scripts/setup.sh`
2. `docker-compose up --build -d`
3. `./scripts/init.sh --reset-notes`
4. Open `http://localhost:3000`

## Services

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Mongos: `mongodb://127.0.0.1:27017`
- Ollama should be running on the host at `http://127.0.0.1:11434`
