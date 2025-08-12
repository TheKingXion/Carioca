import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Configuración de la base de datos
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '2218')
    DB_NAME = os.getenv('DB_NAME', 'carioca_online')
    
    # Configuración del servidor
    SECRET_KEY = os.getenv('SECRET_KEY', 'carioca_secret_key_2025')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # Configuración del juego Carioca con 112 cartas (2 barajas)
    MAX_JUGADORES_POR_PARTIDA = 4
    MIN_JUGADORES_POR_PARTIDA = 2
    TOTAL_CARTAS_MAZO = 112  # 2 barajas completas
    CARTAS_POR_BARAJA = 56   # 52 cartas normales + 4 jokers
    
    # Cartas iniciales por contrato (ajustado para más cartas disponibles)
    CARTAS_INICIALES_POR_CONTRATO = {
        1: 11,  # Contrato 1: 11 cartas
        2: 10,  # Contrato 2: 10 cartas
        3: 9,   # Contrato 3: 9 cartas
        4: 8,   # Contrato 4: 8 cartas
        5: 7,   # Contrato 5: 7 cartas
        6: 6,   # Contrato 6: 6 cartas
        7: 5,   # Contrato 7: 5 cartas
        8: 4,   # Contrato 8: 4 cartas
        9: 3,   # Contrato 9: 3 cartas
        10: 2   # Contrato 10: 2 cartas
    }
    
    TIEMPO_TURNO = 60  # segundos por turno
    MAX_CONTRATOS = 10
    PUNTOS_JOKER = 25
    PUNTOS_AS = 15
    PUNTOS_FIGURAS = 10  # J, Q, K
    
    # Configuración específica para 2 barajas
    BARAJAS_DISPONIBLES = ['azul', 'roja']
    JOKERS_POR_BARAJA = 2
    TOTAL_JOKERS = 4  # 2 por baraja
    
    # Configuración de WebSocket
    SOCKETIO_ASYNC_MODE = 'threading'
    SOCKETIO_CORS_ALLOWED_ORIGINS = "*"
    
    @staticmethod
    def get_db_connection_string():
        return f"mysql+pymysql://{Config.DB_USER}:{Config.DB_PASSWORD}@{Config.DB_HOST}/{Config.DB_NAME}"
