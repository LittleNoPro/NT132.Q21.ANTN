from pathlib import Path

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from config import Config
from database import init_db
from routes import register_routes


load_dotenv(Path(__file__).resolve().parent.parent / '.env')

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)


    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)
    JWTManager(app)


    init_db(app)


    register_routes(app)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
