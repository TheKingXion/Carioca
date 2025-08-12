-- Insertar logros específicos para Carioca
USE carioca_online;

-- Limpiar tabla de logros
DELETE FROM logros;

-- Logros por Victorias
INSERT INTO logros (codigo, nombre, descripcion, categoria, condicion, puntos_experiencia, icono, es_secreto) VALUES
('primera_victoria', 'Primera Victoria', 'Gana tu primera partida de Carioca', 'victorias', '{"victorias": 1}', 100, '🏆', FALSE),
('veterano', 'Veterano', 'Gana 10 partidas', 'victorias', '{"victorias": 10}', 250, '🎖️', FALSE),
('maestro', 'Maestro del Carioca', 'Gana 50 partidas', 'victorias', '{"victorias": 50}', 500, '👑', FALSE),
('leyenda', 'Leyenda Viviente', 'Gana 100 partidas', 'victorias', '{"victorias": 100}', 1000, '⭐', FALSE),

-- Logros por Contratos
('contrato_1', 'Especialista en Tríos', 'Completa el Contrato 1 (2 Tríos) 10 veces', 'contratos', '{"contrato": 1, "veces": 10}', 150, '🎯', FALSE),
('contrato_5', 'Equilibrista', 'Completa el Contrato 5 (2 Tríos y 1 Escala) 5 veces', 'contratos', '{"contrato": 5, "veces": 5}', 200, '⚖️', FALSE),
('contrato_9', 'Maestro de la Escala Falsa', 'Completa el Contrato 9 (Escala Falsa) por primera vez', 'contratos', '{"contrato": 9, "veces": 1}', 300, '🌈', FALSE),
('contrato_10', 'Rey de la Escala Real', 'Completa el Contrato 10 (Escala Real) por primera vez', 'contratos', '{"contrato": 10, "veces": 1}', 500, '👑', FALSE),
('todos_contratos', 'Completista', 'Completa todos los 10 contratos al menos una vez', 'contratos', '{"todos_contratos": true}', 750, '🎊', FALSE),

-- Logros por Puntos
('puntos_bajo', 'Eficiente', 'Gana una partida con menos de 50 puntos', 'puntos', '{"puntos_max": 50, "victoria": true}', 200, '💎', FALSE),
('puntos_perfecto', 'Perfección Absoluta', 'Gana una partida con 0 puntos (Carioca en todos los contratos)', 'puntos', '{"puntos": 0, "victoria": true}', 1000, '✨', TRUE),

-- Logros por Tiempo
('rapido', 'Velocista', 'Completa una partida en menos de 30 minutos', 'tiempo', '{"tiempo_max": 30}', 150, '⚡', FALSE),
('maratonista', 'Maratonista', 'Juega por más de 5 horas en total', 'tiempo', '{"tiempo_total": 300}', 300, '🏃', FALSE),

-- Logros Especiales
('carioca_perfecto', 'Carioca Perfecto', 'Logra Carioca (quedarte sin cartas) en una ronda', 'especial', '{"carioca": true}', 400, '🎴', FALSE),
('sin_comodines', 'Purista', 'Gana una partida sin usar ningún comodín', 'especial', '{"sin_comodines": true}', 350, '🚫', FALSE),
('solo_comodines', 'Rey de los Comodines', 'Completa un contrato usando ambos jokers', 'especial', '{"ambos_jokers": true}', 300, '🃏', FALSE),
('racha_5', 'En Racha', 'Gana 5 partidas consecutivas', 'especial', '{"racha": 5}', 400, '🔥', FALSE),
('racha_10', 'Imparable', 'Gana 10 partidas consecutivas', 'especial', '{"racha": 10}', 800, '💥', TRUE),

-- Logros vs Bots
('vence_facil', 'Domador de Novatos', 'Vence a 3 bots fáciles', 'especial', '{"bots_facil": 3}', 100, '🤖', FALSE),
('vence_medio', 'Estratega', 'Vence a 3 bots medios', 'especial', '{"bots_medio": 3}', 200, '🧠', FALSE),
('vence_dificil', 'Exterminador', 'Vence a 3 bots difíciles', 'especial', '{"bots_dificil": 3}', 400, '💀', FALSE),

-- Logros Secretos
('easter_egg', 'Explorador', 'Descubre un secreto en el juego', 'especial', '{"secreto": "easter_egg"}', 500, '🥚', TRUE),
('desarrollador', 'Amigo del Desarrollador', 'Logro especial para testers', 'especial', '{"codigo_especial": "DEV2024"}', 1000, '👨‍💻', TRUE);

-- Verificar inserción
SELECT categoria, COUNT(*) as cantidad FROM logros GROUP BY categoria;
SELECT * FROM logros WHERE es_secreto = TRUE;
