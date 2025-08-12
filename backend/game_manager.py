"""
Gestor principal del juego Carioca
Maneja el flujo completo de las partidas
"""
import json
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from game_logic import CariocaGameLogic
from bot_ai import CariocaBotAI, obtener_nombre_bot
import pymysql
from config import Config

class CariocaGameManager:
    
    def __init__(self):
        self.game_logic = CariocaGameLogic()
        self.partidas_activas = {}
        self.bots_activos = {}
    
    def get_db_connection(self):
        return pymysql.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
    
    def crear_partida_completa(self, configuracion: Dict) -> Dict:
        """
        Crea una partida completa con jugadores y bots
        """
        try:
            connection = self.get_db_connection()
            try:
                with connection.cursor() as cursor:
                    # Crear partida base
                    partida_id = self._crear_partida_base(cursor, configuracion)
                    
                    # Agregar jugadores humanos
                    posicion = 1
                    for user_id in configuracion.get('jugadores_humanos', []):
                        cursor.execute("""
                            INSERT INTO partida_jugadores (partida_id, usuario_id, posicion)
                            VALUES (%s, %s, %s)
                        """, (partida_id, user_id, posicion))
                        posicion += 1
                    
                    # Agregar bots
                    for bot_config in configuracion.get('bots', []):
                        nombre_bot = obtener_nombre_bot(bot_config['dificultad'])
                        cursor.execute("""
                            INSERT INTO partida_jugadores (partida_id, posicion, es_bot, nombre_bot, dificultad_bot)
                            VALUES (%s, %s, TRUE, %s, %s)
                        """, (partida_id, posicion, nombre_bot, bot_config['dificultad']))
                        
                        # Crear instancia de IA para el bot
                        self.bots_activos[f"{partida_id}_{posicion}"] = CariocaBotAI(bot_config['dificultad'])
                        posicion += 1
                    
                    connection.commit()
                    
                    # Inicializar partida
                    self.inicializar_partida(partida_id)
                    
                    return {
                        'exito': True,
                        'partida_id': partida_id,
                        'mensaje': 'Partida creada exitosamente'
                    }
                    
            finally:
                connection.close()
                
        except Exception as e:
            return {
                'exito': False,
                'error': f'Error creando partida: {str(e)}'
            }
    
    def _crear_partida_base(self, cursor, configuracion: Dict) -> int:
        """Crea el registro base de la partida"""
        codigo_sala = self._generar_codigo_sala()
        
        cursor.execute("""
            INSERT INTO partidas (codigo_sala, tipo_partida, max_jugadores, configuracion)
            VALUES (%s, %s, %s, %s)
        """, (
            codigo_sala,
            configuracion.get('tipo', 'publica'),
            configuracion.get('max_jugadores', 4),
            json.dumps(configuracion)
        ))
        
        return cursor.lastrowid
    
    def inicializar_partida(self, partida_id: int):
        """Inicializa una partida con cartas y estado inicial"""
        try:
            connection = self.get_db_connection()
            try:
                with connection.cursor() as cursor:
                    # Obtener jugadores
                    cursor.execute("""
                        SELECT id, usuario_id, posicion, es_bot, nombre_bot, dificultad_bot
                        FROM partida_jugadores 
                        WHERE partida_id = %s 
                        ORDER BY posicion
                    """, (partida_id,))
                    
                    jugadores = cursor.fetchall()
                    
                    # Crear y barajar mazo
                    mazo = self._crear_mazo_completo(cursor)
                    random.shuffle(mazo)
                    
                    # Repartir cartas para el primer contrato
                    cartas_por_jugador = Config.CARTAS_INICIALES_POR_CONTRATO[1]
                    cartas_repartidas = 0
                    
                    for jugador in jugadores:
                        cartas_jugador = mazo[cartas_repartidas:cartas_repartidas + cartas_por_jugador]
                        cartas_repartidas += cartas_por_jugador
                        
                        cursor.execute("""
                            UPDATE partida_jugadores 
                            SET cartas_en_mano = %s 
                            WHERE id = %s
                        """, (json.dumps(cartas_jugador), jugador['id']))
                    
                    # Configurar mazo y descarte
                    mazo_restante = mazo[cartas_repartidas:]
                    primera_descarte = mazo_restante.pop(0)
                    
                    # Crear estado inicial del juego
                    cursor.execute("""
                        INSERT INTO estado_juego (partida_id, mazo, descarte, ultima_carta_descartada, jugador_turno_id)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        partida_id,
                        json.dumps(mazo_restante),
                        json.dumps([primera_descarte]),
                        json.dumps(primera_descarte),
                        jugadores[0]['id']
                    ))
                    
                    # Actualizar estado de partida
                    cursor.execute("""
                        UPDATE partidas 
                        SET estado = 'en_curso', contrato_actual = 1, fecha_inicio = NOW(),
                            jugadores_actuales = %s
                        WHERE id = %s
                    """, (len(jugadores), partida_id))
                    
                    connection.commit()
                    
                    # Guardar en memoria
                    self.partidas_activas[partida_id] = {
                        'jugadores': jugadores,
                        'contrato_actual': 1,
                        'turno_actual': 0,
                        'estado': 'en_curso',
                        'fecha_inicio': datetime.now()
                    }
                    
            finally:
                connection.close()
                
        except Exception as e:
            print(f"Error inicializando partida {partida_id}: {str(e)}")
    
    def _crear_mazo_completo(self, cursor) -> List[Dict]:
        """Crea el mazo completo de 54 cartas"""
        cursor.execute("SELECT * FROM cartas ORDER BY palo, valor")
        cartas_db = cursor.fetchall()
        
        mazo = []
        for carta in cartas_db:
            mazo.append({
                'id': carta['id'],
                'nombre': carta['nombre'],
                'palo': carta['palo'],
                'valor': carta['valor'],
                'es_comodin': carta['es_comodin'],
                'imagen': carta['imagen']
            })
        
        return mazo
    
    def procesar_turno_bot(self, partida_id: int, jugador_bot_id: int):
        """Procesa el turno de un bot"""
        try:
            bot_key = f"{partida_id}_{self._obtener_posicion_jugador(partida_id, jugador_bot_id)}"
            bot_ai = self.bots_activos.get(bot_key)
            
            if not bot_ai:
                return {"error": "Bot no encontrado"}
            
            # Obtener estado actual
            estado_juego = self._obtener_estado_juego(partida_id)
            cartas_mano = self._obtener_cartas_jugador(partida_id, jugador_bot_id)
            contrato_actual = estado_juego['contrato_actual']
            
            # Bot decide acción
            decision = bot_ai.decidir_accion(estado_juego, cartas_mano, contrato_actual)
            
            # Ejecutar acción
            return self._ejecutar_accion_bot(partida_id, jugador_bot_id, decision)
            
        except Exception as e:
            return {"error": f"Error procesando turno bot: {str(e)}"}
    
    def _obtener_estado_juego(self, partida_id: int) -> Dict:
        """Obtiene el estado actual del juego"""
        try:
            connection = self.get_db_connection()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT p.contrato_actual, p.ronda_actual, eg.descarte, eg.ultima_carta_descartada
                        FROM partidas p
                        JOIN estado_juego eg ON p.id = eg.partida_id
                        WHERE p.id = %s
                    """, (partida_id,))
                    
                    resultado = cursor.fetchone()
                    if resultado:
                        return {
                            'contrato_actual': resultado['contrato_actual'],
                            'ronda_actual': resultado['ronda_actual'],
                            'descarte': json.loads(resultado['descarte']) if resultado['descarte'] else [],
                            'ultima_carta_descartada': json.loads(resultado['ultima_carta_descartada']) if resultado['ultima_carta_descartada'] else None
                        }
                    
                    return {}
                    
            finally:
                connection.close()
                
        except Exception as e:
            print(f"Error obteniendo estado: {str(e)}")
            return {}
    
    def _obtener_cartas_jugador(self, partida_id: int, jugador_id: int) -> List[Dict]:
        """Obtiene las cartas en mano de un jugador"""
        try:
            connection = self.get_db_connection()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT cartas_en_mano 
                        FROM partida_jugadores 
                        WHERE partida_id = %s AND id = %s
                    """, (partida_id, jugador_id))
                    
                    resultado = cursor.fetchone()
                    if resultado and resultado['cartas_en_mano']:
                        return json.loads(resultado['cartas_en_mano'])
                    
                    return []
                    
            finally:
                connection.close()
                
        except Exception as e:
            print(f"Error obteniendo cartas: {str(e)}")
            return []
    
    def _ejecutar_accion_bot(self, partida_id: int, jugador_id: int, decision: Dict) -> Dict:
        """Ejecuta la acción decidida por el bot"""
        accion = decision.get('accion')
        
        if accion == 'robar_mazo':
            return self._bot_robar_mazo(partida_id, jugador_id)
        elif accion == 'robar_descarte':
            return self._bot_robar_descarte(partida_id, jugador_id)
        elif accion == 'bajar_combinacion':
            return self._bot_bajar_combinacion(partida_id, jugador_id, decision.get('combinaciones', []))
        elif accion == 'descartar':
            return self._bot_descartar(partida_id, jugador_id, decision.get('carta'))
        else:
            return {"error": "Acción no reconocida"}
    
    def _bot_robar_mazo(self, partida_id: int, jugador_id: int) -> Dict:
        """Bot roba carta del mazo"""
        # Implementar lógica de robar del mazo
        return {"exito": True, "accion": "robar_mazo"}
    
    def _bot_robar_descarte(self, partida_id: int, jugador_id: int) -> Dict:
        """Bot roba carta del descarte"""
        # Implementar lógica de robar del descarte
        return {"exito": True, "accion": "robar_descarte"}
    
    def _bot_bajar_combinacion(self, partida_id: int, jugador_id: int, combinaciones: List[Dict]) -> Dict:
        """Bot baja combinaciones"""
        # Implementar lógica de bajar combinaciones
        return {"exito": True, "accion": "bajar_combinacion", "combinaciones": combinaciones}
    
    def _bot_descartar(self, partida_id: int, jugador_id: int, carta: Dict) -> Dict:
        """Bot descarta una carta"""
        # Implementar lógica de descarte
        return {"exito": True, "accion": "descartar", "carta": carta}
    
    def _generar_codigo_sala(self) -> str:
        """Genera código único para la sala"""
        import string
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    def _obtener_posicion_jugador(self, partida_id: int, jugador_id: int) -> int:
        """Obtiene la posición de un jugador en la partida"""
        try:
            connection = self.get_db_connection()
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT posicion FROM partida_jugadores 
                        WHERE partida_id = %s AND id = %s
                    """, (partida_id, jugador_id))
                    
                    resultado = cursor.fetchone()
                    return resultado['posicion'] if resultado else 1
                    
            finally:
                connection.close()
                
        except Exception as e:
            return 1

# Instancia global del gestor
game_manager = CariocaGameManager()
