from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import pymysql
import bcrypt
import json
from datetime import datetime, timedelta
import random
import string
import os
from config import Config
from game_logic import CariocaGameLogic

app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.config['SECRET_KEY'] = Config.SECRET_KEY
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)

# Instancia de la lógica del juego
game_logic = CariocaGameLogic()

# Almacenar sesiones activas y partidas
sesiones_activas = {}
partidas_activas = {}
salas_espera = {}
# Perfil de usuario: ver y modificar

@app.route('/perfil/<int:user_id>', methods=['GET'])
def ver_perfil(user_id):
    """Obtener información del perfil de un usuario"""
    try:
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, nombre, email, avatar, nivel, experiencia, victorias, derrotas
                    FROM usuarios WHERE id = %s
                """, (user_id,))
                perfil = cursor.fetchone()
                if not perfil:
                    return jsonify({"error": "Usuario no encontrado"}), 404
                return jsonify(perfil), 200
        finally:
            connection.close()
    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500

@app.route('/perfil/<int:user_id>', methods=['PUT'])
def modificar_perfil(user_id):
    """Modificar información del perfil de un usuario"""
    try:
        data = request.get_json()
        nombre = data.get('nombre')
        avatar = data.get('avatar')
        email = data.get('email')

        if not any([nombre, avatar, email]):
            return jsonify({"error": "No se enviaron datos para actualizar"}), 400

        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # Verificar si el nuevo nombre o email ya existen (y no es el mismo usuario)
                if nombre:
                    cursor.execute("SELECT id FROM usuarios WHERE nombre = %s AND id != %s", (nombre, user_id))
                    if cursor.fetchone():
                        return jsonify({"error": "Nombre de usuario ya en uso"}), 400
                if email:
                    cursor.execute("SELECT id FROM usuarios WHERE email = %s AND id != %s", (email, user_id))
                    if cursor.fetchone():
                        return jsonify({"error": "Email ya en uso"}), 400

                # Actualizar campos
                campos = []
                valores = []
                if nombre:
                    campos.append("nombre = %s")
                    valores.append(nombre)
                if avatar:
                    campos.append("avatar = %s")
                    valores.append(avatar)
                if email:
                    campos.append("email = %s")
                    valores.append(email)
                valores.append(user_id)
                sql = f"UPDATE usuarios SET {', '.join(campos)} WHERE id = %s"
                cursor.execute(sql, tuple(valores))
                connection.commit()
                return jsonify({"mensaje": "Perfil actualizado correctamente"}), 200
        finally:
            connection.close()
    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500
# Servir archivos estáticos
@app.route('/')
def serve_index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

# Conexión a la base de datos
def get_db_connection():
    return pymysql.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/api/status')
def api_status():
    return jsonify({
        "mensaje": "🃏 Servidor Carioca Online funcionando",
        "version": "2.0.0",
        "juego": "Carioca - 10 Contratos",
        "estado": "activo",
        "modo": "Solo vs Bots",
        "endpoints": [
            "/register - POST",
            "/login - POST",
            "/crear_partida - POST",
            "/crear_sala - POST",
            "/unirse_sala - POST",
            "/stats/<user_id> - GET",
            "/contratos - GET",
            "/cartas - GET",
            "/cartas/test - GET"
        ],
        "cartas_totales": 112,
        "distribución": {
            "cartas_normales": 104,
            "jokers": 8,
            "barajas": 2
        }
    })

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        nombre = data.get('nombre')
        email = data.get('email')
        password = data.get('password')
        
        if not all([nombre, email, password]):
            return jsonify({"error": "Todos los campos son obligatorios"}), 400
        
        # Encriptar contraseña
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # Verificar si el usuario ya existe por email
                cursor.execute("SELECT id FROM usuarios WHERE email = %s", (email,))
                if cursor.fetchone():
                    return jsonify({"error": "Este email ya está registrado"}), 400
                
                # Verificar si el usuario ya existe por nombre
                cursor.execute("SELECT id FROM usuarios WHERE nombre = %s", (nombre,))
                if cursor.fetchone():
                    return jsonify({"error": "Este nombre de usuario ya existe"}), 400
                
                # Insertar nuevo usuario
                cursor.execute(
                    "INSERT INTO usuarios (nombre, email, password) VALUES (%s, %s, %s)",
                    (nombre, email, password_hash.decode('utf-8'))
                )
                user_id = cursor.lastrowid
                
                # Crear estadísticas iniciales
                cursor.execute(
                    "INSERT INTO estadisticas (usuario_id, contratos_completados) VALUES (%s, %s)",
                    (user_id, json.dumps([0] * 10))
                )
                
                # Crear configuraciones iniciales (verificar si la tabla existe)
                try:
                    cursor.execute(
                        "INSERT INTO configuraciones_usuario (usuario_id) VALUES (%s)",
                        (user_id,)
                    )
                except Exception as config_error:
                    print(f"Advertencia: No se pudieron crear las configuraciones del usuario: {config_error}")
                    # Continuar sin las configuraciones si la tabla no existe
                
                connection.commit()
                
                return jsonify({
                    "mensaje": "Usuario registrado exitosamente",
                    "user_id": user_id,
                    "nombre": nombre
                }), 201
                
        finally:
            connection.close()
            
    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not all([email, password]):
            return jsonify({"error": "Email y contraseña son obligatorios"}), 400
        
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id, nombre, password, victorias, derrotas, nivel, experiencia FROM usuarios WHERE email = %s",
                    (email,)
                )
                user = cursor.fetchone()
                
                if not user:
                    return jsonify({"error": "Usuario no encontrado"}), 404
                
                # Verificar contraseña
                if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
                    # Actualizar último acceso
                    cursor.execute(
                        "UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = %s",
                        (user['id'],)
                    )
                    connection.commit()
                    
                    return jsonify({
                        "mensaje": "Login exitoso",
                        "user_id": user['id'],
                        "nombre": user['nombre'],
                        "victorias": user['victorias'],
                        "derrotas": user['derrotas'],
                        "nivel": user['nivel'],
                        "experiencia": user['experiencia']
                    }), 200
                else:
                    return jsonify({"error": "Contraseña incorrecta"}), 401
                    
        finally:
            connection.close()
            
    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500

@app.route('/contratos')
def get_contratos():
    """Obtener información de todos los contratos"""
    try:
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM contratos ORDER BY numero_contrato")
                contratos = cursor.fetchall()
                return jsonify(contratos), 200
        finally:
            connection.close()
    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500

@app.route('/crear_partida', methods=['POST'])
def crear_partida():
    """Crear una nueva partida (alias para crear_sala)"""
    return crear_sala()

@app.route('/crear_sala', methods=['POST'])
def crear_sala():
    """Crear una nueva sala de juego"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        max_jugadores = data.get('max_jugadores', 4)
        tipo_partida = data.get('tipo_partida', 'publica')
        configuracion_bots = data.get('bots', [])
        
        if not user_id:
            return jsonify({"error": "ID de usuario requerido"}), 400
        
        if max_jugadores < 2 or max_jugadores > 4:
            return jsonify({"error": "Número de jugadores debe ser entre 2 y 4"}), 400
        
        # Generar código único para la sala
        codigo_sala = generar_codigo_sala()
        
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # Crear la partida
                cursor.execute("""
                    INSERT INTO partidas (codigo_sala, tipo_partida, max_jugadores, configuracion)
                    VALUES (%s, %s, %s, %s)
                """, (codigo_sala, tipo_partida, max_jugadores, json.dumps({
                    'bots': configuracion_bots,
                    'creador': user_id
                })))
                
                partida_id = cursor.lastrowid
                
                # Agregar al creador como primer jugador
                cursor.execute("""
                    INSERT INTO partida_jugadores (partida_id, usuario_id, posicion)
                    VALUES (%s, %s, 1)
                """, (partida_id, user_id))
                
                # Agregar bots si se especificaron
                posicion = 2
                for bot_config in configuracion_bots:
                    cursor.execute("""
                        INSERT INTO partida_jugadores (partida_id, posicion, es_bot, nombre_bot, dificultad_bot)
                        VALUES (%s, %s, TRUE, %s, %s)
                    """, (partida_id, posicion, bot_config['nombre'], bot_config['dificultad']))
                    posicion += 1
                
                # Actualizar contador de jugadores
                cursor.execute("""
                    UPDATE partidas SET jugadores_actuales = %s WHERE id = %s
                """, (1 + len(configuracion_bots), partida_id))
                
                connection.commit()
                
                # Inicializar partida en memoria si está completa
                if 1 + len(configuracion_bots) >= max_jugadores:
                    inicializar_partida_carioca(partida_id)
                
                return jsonify({
                    "mensaje": "Sala creada exitosamente",
                    "partida_id": partida_id,
                    "codigo_sala": codigo_sala,
                    "jugadores_actuales": 1 + len(configuracion_bots),
                    "max_jugadores": max_jugadores
                }), 201
                
        finally:
            connection.close()
            
    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500

@app.route('/unirse_sala', methods=['POST'])
def unirse_sala():
    """Unirse a una sala existente"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        codigo_sala = data.get('codigo_sala')
        
        if not all([user_id, codigo_sala]):
            return jsonify({"error": "ID de usuario y código de sala requeridos"}), 400
        
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # Buscar la partida
                cursor.execute("""
                    SELECT id, jugadores_actuales, max_jugadores, estado 
                    FROM partidas WHERE codigo_sala = %s
                """, (codigo_sala,))
                
                partida = cursor.fetchone()
                if not partida:
                    return jsonify({"error": "Sala no encontrada"}), 404
                
                if partida['estado'] != 'esperando':
                    return jsonify({"error": "La partida ya comenzó"}), 400
                
                if partida['jugadores_actuales'] >= partida['max_jugadores']:
                    return jsonify({"error": "Sala llena"}), 400
                
                # Verificar que el usuario no esté ya en la partida
                cursor.execute("""
                    SELECT id FROM partida_jugadores 
                    WHERE partida_id = %s AND usuario_id = %s
                """, (partida['id'], user_id))
                
                if cursor.fetchone():
                    return jsonify({"error": "Ya estás en esta partida"}), 400
                
                # Encontrar la siguiente posición disponible
                cursor.execute("""
                    SELECT posicion FROM partida_jugadores 
                    WHERE partida_id = %s ORDER BY posicion
                """, (partida['id'],))
                
                posiciones_ocupadas = [row['posicion'] for row in cursor.fetchall()]
                nueva_posicion = None
                
                for pos in range(1, partida['max_jugadores'] + 1):
                    if pos not in posiciones_ocupadas:
                        nueva_posicion = pos
                        break
                
                # Agregar jugador a la partida
                cursor.execute("""
                    INSERT INTO partida_jugadores (partida_id, usuario_id, posicion)
                    VALUES (%s, %s, %s)
                """, (partida['id'], user_id, nueva_posicion))
                
                # Actualizar contador de jugadores
                nuevos_jugadores = partida['jugadores_actuales'] + 1
                cursor.execute("""
                    UPDATE partidas SET jugadores_actuales = %s WHERE id = %s
                """, (nuevos_jugadores, partida['id']))
                
                connection.commit()
                
                # Si la sala está completa, inicializar partida
                if nuevos_jugadores >= partida['max_jugadores']:
                    inicializar_partida_carioca(partida['id'])
                
                return jsonify({
                    "mensaje": "Te uniste a la sala exitosamente",
                    "partida_id": partida['id'],
                    "posicion": nueva_posicion,
                    "jugadores_actuales": nuevos_jugadores,
                    "max_jugadores": partida['max_jugadores']
                }), 200
                
        finally:
            connection.close()
            
    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500

@app.route('/stats/<int:user_id>')
def get_stats(user_id):
    try:
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT u.nombre, u.victorias, u.derrotas, u.puntos_totales, u.nivel, u.experiencia,
                           e.partidas_jugadas, e.mejor_puntuacion, e.tiempo_total_jugado,
                           e.contratos_completados, e.cariocas_logrados, e.escalas_reales_logradas,
                           e.escalas_falsas_logradas, e.racha_victorias_actual, e.mejor_racha_victorias
                    FROM usuarios u
                    LEFT JOIN estadisticas e ON u.id = e.usuario_id
                    WHERE u.id = %s
                """, (user_id,))
                
                stats = cursor.fetchone()
                if not stats:
                    return jsonify({"error": "Usuario no encontrado"}), 404
                
                # Parsear contratos completados
                if stats['contratos_completados']:
                    stats['contratos_completados'] = json.loads(stats['contratos_completados'])
                else:
                    stats['contratos_completados'] = [0] * 10
                
                return jsonify(stats), 200
                
        finally:
            connection.close()
            
    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500

def generar_codigo_sala():
    """Generar código único de 6 caracteres para la sala"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def inicializar_partida_carioca(partida_id):
    """Inicializar una partida de Carioca con todas las reglas"""
    try:
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                # Obtener jugadores de la partida
                cursor.execute("""
                    SELECT id, usuario_id, posicion, es_bot, nombre_bot, dificultad_bot
                    FROM partida_jugadores 
                    WHERE partida_id = %s 
                    ORDER BY posicion
                """, (partida_id,))
                
                jugadores = cursor.fetchall()
                
                # Crear mazo completo
                mazo = crear_mazo_carioca()
                random.shuffle(mazo)
                
                # Repartir cartas para el primer contrato (11 cartas cada uno)
                cartas_por_jugador = 11
                cartas_repartidas = 0
                
                for i, jugador in enumerate(jugadores):
                    cartas_jugador = mazo[cartas_repartidas:cartas_repartidas + cartas_por_jugador]
                    cartas_repartidas += cartas_por_jugador
                    
                    # Actualizar cartas en mano del jugador
                    cursor.execute("""
                        UPDATE partida_jugadores 
                        SET cartas_en_mano = %s 
                        WHERE id = %s
                    """, (json.dumps(cartas_jugador), jugador['id']))
                
                # Cartas restantes en el mazo
                mazo_restante = mazo[cartas_repartidas:]
                
                # Primera carta del descarte
                carta_descarte = mazo_restante.pop(0)
                descarte = [carta_descarte]
                
                # Crear estado del juego
                cursor.execute("""
                    INSERT INTO estado_juego (partida_id, mazo, descarte, ultima_carta_descartada, jugador_turno_id)
                    VALUES (%s, %s, %s, %s, %s)
                """, (partida_id, json.dumps(mazo_restante), json.dumps(descarte), 
                      json.dumps(carta_descarte), jugadores[0]['id']))
                
                # Actualizar estado de la partida
                cursor.execute("""
                    UPDATE partidas 
                    SET estado = 'en_curso', contrato_actual = 1, fecha_inicio = NOW()
                    WHERE id = %s
                """, (partida_id,))
                
                connection.commit()
                
                # Guardar en memoria para acceso rápido
                partidas_activas[partida_id] = {
                    'jugadores': jugadores,
                    'contrato_actual': 1,
                    'turno_actual': 0,
                    'estado': 'en_curso'
                }
                
                print(f"Partida {partida_id} inicializada con {len(jugadores)} jugadores")
                
        finally:
            connection.close()
            
    except Exception as e:
        print(f"Error inicializando partida {partida_id}: {str(e)}")

def crear_mazo_carioca():
    """Crear mazo completo de 112 cartas para Carioca (2 barajas + 8 jokers)"""
    mazo = []
    
    # Palos y valores
    palos = ['corazones', 'diamantes', 'treboles', 'picas']
    valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    
    # Símbolos para los palos
    simbolos_palos = {
        'corazones': '♥️',
        'diamantes': '♦️',
        'treboles': '♣️',
        'picas': '♠️'
    }
    
    # Valores numéricos para ordenamiento y cálculos
    valores_numericos = {
        'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, 
        '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    }
    
    # Colores de las barajas
    colores_baraja = {
        'roja': '#DC2626',
        'azul': '#2563EB'
    }
    
    # Crear dos barajas completas (roja y azul)
    for baraja in ['roja', 'azul']:
        # Cartas normales (52 por baraja = 104 cartas totales)
        for palo in palos:
            for valor in valores:
                carta_id = f"{valor}_{palo}_{baraja}"
                mazo.append({
                    'id': carta_id,
                    'nombre': f"{valor} de {palo.title()}",
                    'palo': palo,
                    'valor': valor,
                    'valor_numerico': valores_numericos[valor],
                    'simbolo_palo': simbolos_palos[palo],
                    'es_comodin': False,
                    'es_joker': False,
                    'color_carta': 'rojo' if palo in ['corazones', 'diamantes'] else 'negro',
                    'color_baraja': colores_baraja[baraja],
                    'baraja': baraja,
                    'imagen': f"assets/cartas/frontal/{valor}_{palo}.png",
                    'imagen_reverso': f"assets/cartas/reverso/{baraja}.png",
                    'puntos': 10 if valor in ['J', 'Q', 'K'] else (15 if valor == 'A' else valores_numericos[valor])
                })
        
        # 4 Jokers por baraja (8 jokers totales)
        for i in range(1, 5):
            joker_id = f"joker{i}_{baraja}"
            mazo.append({
                'id': joker_id,
                'nombre': f"Joker {i} ({baraja.title()})",
                'palo': 'joker',
                'valor': 'joker',
                'valor_numerico': 0,  # Los jokers pueden representar cualquier valor
                'simbolo_palo': '🃏',
                'es_comodin': True,
                'es_joker': True,
                'color_carta': 'multicolor',
                'color_baraja': colores_baraja[baraja],
                'baraja': baraja,
                'imagen': f"assets/cartas/frontal/joker{i}_{baraja}.png",
                'imagen_reverso': f"assets/cartas/reverso/{baraja}.png",
                'puntos': 25  # Los jokers valen 25 puntos
            })
    
    print(f"🃏 Mazo completo creado: {len(mazo)} cartas")
    print(f"📊 Distribución:")
    print(f"   - Cartas normales: 104 (52 por baraja x 2 barajas)")
    print(f"   - Jokers: 8 (4 por baraja x 2 barajas)")
    print(f"   - Total: {len(mazo)} cartas")
    
    return mazo

@app.route('/cartas')
def get_cartas():
    """Endpoint para obtener todas las cartas del mazo"""
    try:
        mazo = crear_mazo_carioca()
        
        # Estadísticas del mazo
        stats = {
            'total_cartas': len(mazo),
            'cartas_normales': len([c for c in mazo if not c['es_joker']]),
            'jokers': len([c for c in mazo if c['es_joker']]),
            'por_baraja': {
                'roja': len([c for c in mazo if c['baraja'] == 'roja']),
                'azul': len([c for c in mazo if c['baraja'] == 'azul'])
            },
            'por_palo': {}
        }
        
        # Contar por palo
        for palo in ['corazones', 'diamantes', 'treboles', 'picas', 'joker']:
            stats['por_palo'][palo] = len([c for c in mazo if c['palo'] == palo])
        
        return jsonify({
            'cartas': mazo,
            'estadisticas': stats,
            'total': len(mazo)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error generando cartas: {str(e)}"}), 500

@app.route('/cartas/test')
def test_cartas():
    """Endpoint para probar la generación de cartas y mostrar ejemplos"""
    try:
        mazo = crear_mazo_carioca()
        
        # Ejemplos de diferentes tipos de cartas
        ejemplos = {
            'carta_normal_roja': next((c for c in mazo if c['palo'] == 'corazones' and c['valor'] == 'A' and c['baraja'] == 'roja'), None),
            'carta_normal_azul': next((c for c in mazo if c['palo'] == 'picas' and c['valor'] == 'K' and c['baraja'] == 'azul'), None),
            'joker_rojo': next((c for c in mazo if c['es_joker'] and c['baraja'] == 'roja'), None),
            'joker_azul': next((c for c in mazo if c['es_joker'] and c['baraja'] == 'azul'), None),
            'carta_figura': next((c for c in mazo if c['valor'] == 'Q' and c['palo'] == 'diamantes'), None)
        }
        
        # Validaciones
        validaciones = {
            'total_correcto': len(mazo) == 112,
            'jokers_correctos': len([c for c in mazo if c['es_joker']]) == 8,
            'cartas_normales_correctas': len([c for c in mazo if not c['es_joker']]) == 104,
            'barajas_equilibradas': (
                len([c for c in mazo if c['baraja'] == 'roja']) == 56 and
                len([c for c in mazo if c['baraja'] == 'azul']) == 56
            )
        }
        
        return jsonify({
            'mensaje': '🃏 Test de generación de cartas completado',
            'ejemplos': ejemplos,
            'validaciones': validaciones,
            'total_cartas': len(mazo),
            'todas_validaciones_ok': all(validaciones.values())
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error en test de cartas: {str(e)}"}), 500

# WebSocket Events
@socketio.on('connect')
def on_connect():
    print(f'Cliente conectado: {request.sid}')
    emit('connected', {'data': 'Conectado al servidor Carioca'})

@socketio.on('disconnect')
def on_disconnect():
    print(f'Cliente desconectado: {request.sid}')
    if request.sid in sesiones_activas:
        del sesiones_activas[request.sid]

@socketio.on('unirse_partida')
def on_unirse_partida(data):
    """Jugador se une a una partida específica"""
    partida_id = data.get('partida_id')
    user_id = data.get('user_id')
    
    if partida_id and user_id:
        join_room(f"partida_{partida_id}")
        sesiones_activas[request.sid] = {
            'user_id': user_id,
            'partida_id': partida_id
        }
        
        # Enviar estado actual de la partida
        estado_partida = obtener_estado_partida(partida_id, user_id)
        emit('estado_partida', estado_partida)
        
        # Notificar a otros jugadores
        emit('jugador_conectado', {
            'user_id': user_id,
            'mensaje': f'Jugador {user_id} se conectó'
        }, room=f"partida_{partida_id}", include_self=False)

def obtener_estado_partida(partida_id, user_id):
    """Obtener el estado actual de la partida para un jugador"""
    return {
        "partida_id": partida_id,
        "user_id": user_id,
        "estado": "conectado"
    }

if __name__ == '__main__':
    print("🃏 Iniciando servidor Carioca Online...")
    print("📱 Accede a: http://localhost:5000")
    print("🎮 ¡Disfruta jugando!")
    socketio.run(app, debug=True, host='127.0.0.1', port=5000)
