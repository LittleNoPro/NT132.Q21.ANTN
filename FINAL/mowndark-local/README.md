# Mowndark Local

Local Next.js + Flask app that connects to an existing `mongos` router and uses Ollama for vector search.

## Run

1. Make sure Mongo is reachable with `mongosh --host mongos --port 27017 -u admin -p 'Admin@123' --authenticationDatabase admin`
2. Make sure Ollama is running at `http://127.0.0.1:11434`
3. Seed notes with `./scripts/init.sh --reset-notes`
4. Start the app with `./run.sh`
5. Open `http://127.0.0.1:3000`

## Stop

`./down.sh`
