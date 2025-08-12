-- Base de datos completa para Carioca Online con 10 contratos
CREATE DATABASE IF NOT EXISTS carioca_online;
USE carioca_online;

-- Tabla de usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    victorias INT DEFAULT 0,
    derrotas INT DEFAULT 0,
    puntos_totales INT DEFAULT 0,
    nivel INT DEFAULT 1,
    experiencia INT DEFAULT 0,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de contratos del Carioca (10 rondas)
CREATE TABLE contratos (
    id INT PRIMARY KEY,
    numero_contrato INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    cartas_requeridas INT NOT NULL,
    trios_requeridos INT DEFAULT 0,
    escalas_requeridas INT DEFAULT 0,
    tipo_especial ENUM('normal', 'escala_falsa', 'escala_real') DEFAULT 'normal',
    puntos_base INT DEFAULT 0
);

-- Tabla de partidas
CREATE TABLE partidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_sala VARCHAR(10) UNIQUE,
    estado ENUM('esperando', 'en_curso', 'finalizada', 'cancelada') DEFAULT 'esperando',
    tipo_partida ENUM('publica', 'privada', 'vs_bot') DEFAULT 'publica',
    jugadores_actuales INT DEFAULT 0,
    max_jugadores INT DEFAULT 4,
    min_jugadores INT DEFAULT 2,
    contrato_actual INT DEFAULT 1,
    ronda_actual INT DEFAULT 1,
    turno_actual INT DEFAULT 1,
    direccion_turno ENUM('horario', 'antihorario') DEFAULT 'horario',
    ganador_id INT NULL,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP NULL,
    configuracion JSON,
    FOREIGN KEY (ganador_id) REFERENCES usuarios(id),
    FOREIGN KEY (contrato_actual) REFERENCES contratos(id)
);

-- Tabla de jugadores en partida
CREATE TABLE partida_jugadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partida_id INT NOT NULL,
    usuario_id INT NULL, -- NULL si es bot
    posicion INT NOT NULL, -- 1, 2, 3, 4
    es_bot BOOLEAN DEFAULT FALSE,
    nombre_bot VARCHAR(50) NULL,
    dificultad_bot ENUM('facil', 'medio', 'dificil') NULL,
    puntos_ronda INT DEFAULT 0,
    puntos_totales INT DEFAULT 0,
    cartas_en_mano JSON, -- Array de cartas
    ha_bajado BOOLEAN DEFAULT FALSE,
    combinaciones_bajadas JSON, -- Array de combinaciones
    estado ENUM('activo', 'desconectado', 'eliminado') DEFAULT 'activo',
    fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    UNIQUE KEY unique_partida_posicion (partida_id, posicion),
    UNIQUE KEY unique_partida_usuario (partida_id, usuario_id)
);

-- Tabla de cartas del juego
CREATE TABLE cartas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,
    palo ENUM('corazones', 'diamantes', 'treboles', 'picas', 'joker') NOT NULL,
    valor INT NOT NULL, -- 1-13 para cartas normales, 0 para jokers
    es_comodin BOOLEAN DEFAULT FALSE,
    imagen VARCHAR(100) NOT NULL,
    orden_valor INT NOT NULL, -- Para ordenamiento (As=1 o 14 según contexto)
    baraja ENUM('azul', 'roja') NOT NULL DEFAULT 'azul'
);

-- Actualizar la tabla de cartas para incluir información de baraja
-- ALTER TABLE cartas ADD COLUMN baraja ENUM('azul', 'roja') NOT NULL DEFAULT 'azul';

-- Actualizar configuración para 112 cartas
UPDATE cartas SET baraja = 'azul' WHERE imagen LIKE 'azul/%';
UPDATE cartas SET baraja = 'roja' WHERE imagen LIKE 'roja/%';

-- Tabla de estado del juego por partida
CREATE TABLE estado_juego (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partida_id INT NOT NULL,
    mazo JSON NOT NULL, -- Cartas restantes en el mazo
    descarte JSON NOT NULL, -- Pila de descarte
    ultima_carta_descartada JSON NULL,
    jugador_turno_id INT NOT NULL,
    fase_turno ENUM('robar', 'bajar', 'descartar') DEFAULT 'robar',
    tiempo_turno_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acciones_disponibles JSON, -- Acciones que puede hacer el jugador actual
    FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE,
    FOREIGN KEY (jugador_turno_id) REFERENCES partida_jugadores(id)
);

-- Tabla de combinaciones (tríos y escalas)
CREATE TABLE combinaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partida_id INT NOT NULL,
    jugador_id INT NOT NULL,
    tipo ENUM('trio', 'escala', 'escala_falsa', 'escala_real') NOT NULL,
    cartas JSON NOT NULL, -- Array de cartas en la combinación
    tiene_comodin BOOLEAN DEFAULT FALSE,
    posicion_comodin INT NULL, -- Posición del comodín en la combinación
    es_valida BOOLEAN DEFAULT TRUE,
    ronda_creada INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE,
    FOREIGN KEY (jugador_id) REFERENCES partida_jugadores(id)
);

-- Tabla de movimientos/acciones del juego
CREATE TABLE movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partida_id INT NOT NULL,
    jugador_id INT NOT NULL,
    tipo_movimiento ENUM('robar_mazo', 'robar_descarte', 'bajar_combinacion', 'agregar_carta', 'descartar', 'carioca') NOT NULL,
    datos_movimiento JSON NOT NULL, -- Detalles específicos del movimiento
    ronda INT NOT NULL,
    turno INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE,
    FOREIGN KEY (jugador_id) REFERENCES partida_jugadores(id)
);

-- Tabla de estadísticas detalladas
CREATE TABLE estadisticas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    partidas_jugadas INT DEFAULT 0,
    partidas_ganadas INT DEFAULT 0,
    partidas_vs_bots INT DEFAULT 0,
    partidas_vs_humanos INT DEFAULT 0,
    contratos_completados JSON, -- Array con conteo por contrato [0,0,0,0,0,0,0,0,0,0]
    mejor_puntuacion INT DEFAULT 0,
    peor_puntuacion INT DEFAULT 0,
    puntos_promedio DECIMAL(10,2) DEFAULT 0,
    tiempo_total_jugado INT DEFAULT 0, -- en minutos
    cariocas_logrados INT DEFAULT 0, -- Veces que se quedó sin cartas
    escalas_reales_logradas INT DEFAULT 0,
    escalas_falsas_logradas INT DEFAULT 0,
    trios_formados INT DEFAULT 0,
    escalas_formadas INT DEFAULT 0,
    comodines_utilizados INT DEFAULT 0,
    racha_victorias_actual INT DEFAULT 0,
    mejor_racha_victorias INT DEFAULT 0,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de historial de partidas
CREATE TABLE historial_partidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partida_id INT NOT NULL,
    usuario_id INT NOT NULL,
    posicion_final INT NOT NULL, -- 1=ganador, 2=segundo, etc.
    puntos_finales INT NOT NULL,
    contratos_completados INT NOT NULL, -- Cuántos contratos logró completar
    tiempo_jugado INT NOT NULL, -- en minutos
    logro_carioca BOOLEAN DEFAULT FALSE, -- Si se quedó sin cartas
    fecha_partida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabla de logros/achievements
CREATE TABLE logros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria ENUM('victorias', 'contratos', 'puntos', 'tiempo', 'especial') NOT NULL,
    condicion JSON NOT NULL, -- Condiciones para desbloquear
    puntos_experiencia INT DEFAULT 0,
    icono VARCHAR(100),
    es_secreto BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de logros desbloqueados por usuario
CREATE TABLE usuario_logros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    logro_id INT NOT NULL,
    fecha_desbloqueo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    partida_id INT NULL, -- Partida donde se desbloqueó (si aplica)
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (logro_id) REFERENCES logros(id),
    FOREIGN KEY (partida_id) REFERENCES partidas(id),
    UNIQUE KEY unique_usuario_logro (usuario_id, logro_id)
);

-- Tabla de configuraciones de usuario
CREATE TABLE configuraciones_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    volumen_musica DECIMAL(3,2) DEFAULT 0.5,
    volumen_efectos DECIMAL(3,2) DEFAULT 0.7,
    tema_visual ENUM('claro', 'oscuro', 'auto') DEFAULT 'auto',
    animaciones_habilitadas BOOLEAN DEFAULT TRUE,
    notificaciones_habilitadas BOOLEAN DEFAULT TRUE,
    auto_ordenar_cartas BOOLEAN DEFAULT TRUE,
    mostrar_ayudas BOOLEAN DEFAULT TRUE,
    idioma VARCHAR(5) DEFAULT 'es',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario_config (usuario_id)
);

-- Tabla de salas de espera (matchmaking)
CREATE TABLE salas_espera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo_partida ENUM('publica', 'privada', 'vs_bot') DEFAULT 'publica',
    max_jugadores INT DEFAULT 4,
    dificultad_bots ENUM('facil', 'medio', 'dificil') NULL,
    cantidad_bots INT DEFAULT 0,
    preferencias JSON, -- Configuraciones adicionales
    fecha_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para optimización
CREATE INDEX idx_partidas_estado ON partidas(estado);
CREATE INDEX idx_partidas_codigo ON partidas(codigo_sala);
CREATE INDEX idx_partida_jugadores_partida ON partida_jugadores(partida_id);
CREATE INDEX idx_partida_jugadores_usuario ON partida_jugadores(usuario_id);
CREATE INDEX idx_movimientos_partida ON movimientos(partida_id);
CREATE INDEX idx_movimientos_jugador ON movimientos(jugador_id);
CREATE INDEX idx_estadisticas_usuario ON estadisticas(usuario_id);
CREATE INDEX idx_historial_usuario ON historial_partidas(usuario_id);
CREATE INDEX idx_historial_partida ON historial_partidas(partida_id);
