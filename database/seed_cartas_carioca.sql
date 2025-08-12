-- Actualizar para usar 2 barajas completas (112 cartas)
-- Insertar todas las cartas del juego Carioca con 2 barajas
USE carioca_online;

-- Limpiar tabla de cartas
DELETE FROM cartas;

-- BARAJA AZUL (Primera baraja)
-- Insertar cartas de Corazones (♥) - Baraja Azul
INSERT INTO cartas (nombre, palo, valor, es_comodin, imagen, orden_valor) VALUES
('As de Corazones (Azul)', 'corazones', 1, FALSE, 'azul/as_corazones.png', 1),
('2 de Corazones (Azul)', 'corazones', 2, FALSE, 'azul/2_corazones.png', 2),
('3 de Corazones (Azul)', 'corazones', 3, FALSE, 'azul/3_corazones.png', 3),
('4 de Corazones (Azul)', 'corazones', 4, FALSE, 'azul/4_corazones.png', 4),
('5 de Corazones (Azul)', 'corazones', 5, FALSE, 'azul/5_corazones.png', 5),
('6 de Corazones (Azul)', 'corazones', 6, FALSE, 'azul/6_corazones.png', 6),
('7 de Corazones (Azul)', 'corazones', 7, FALSE, 'azul/7_corazones.png', 7),
('8 de Corazones (Azul)', 'corazones', 8, FALSE, 'azul/8_corazones.png', 8),
('9 de Corazones (Azul)', 'corazones', 9, FALSE, 'azul/9_corazones.png', 9),
('10 de Corazones (Azul)', 'corazones', 10, FALSE, 'azul/10_corazones.png', 10),
('J de Corazones (Azul)', 'corazones', 11, FALSE, 'azul/j_corazones.png', 11),
('Q de Corazones (Azul)', 'corazones', 12, FALSE, 'azul/q_corazones.png', 12),
('K de Corazones (Azul)', 'corazones', 13, FALSE, 'azul/k_corazones.png', 13);

-- Insertar cartas de Diamantes (♦) - Baraja Azul
INSERT INTO cartas (nombre, palo, valor, es_comodin, imagen, orden_valor) VALUES
('As de Diamantes (Azul)', 'diamantes', 1, FALSE, 'azul/as_diamantes.png', 1),
('2 de Diamantes (Azul)', 'diamantes', 2, FALSE, 'azul/2_diamantes.png', 2),
('3 de Diamantes (Azul)', 'diamantes', 3, FALSE, 'azul/3_diamantes.png', 3),
('4 de Diamantes (Azul)', 'diamantes', 4, FALSE, 'azul/4_diamantes.png', 4),
('5 de Diamantes (Azul)', 'diamantes', 5, FALSE, 'azul/5_diamantes.png', 5),
('6 de Diamantes (Azul)', 'diamantes', 6, FALSE, 'azul/6_diamantes.png', 6),
('7 de Diamantes (Azul)', 'diamantes', 7, FALSE, 'azul/7_diamantes.png', 7),
('8 de Diamantes (Azul)', 'diamantes', 8, FALSE, 'azul/8_diamantes.png', 8),
('9 de Diamantes (Azul)', 'diamantes', 9, FALSE, 'azul/9_diamantes.png', 9),
('10 de Diamantes (Azul)', 'diamantes', 10, FALSE, 'azul/10_diamantes.png', 10),
('J de Diamantes (Azul)', 'diamantes', 11, FALSE, 'azul/j_diamantes.png', 11),
('Q de Diamantes (Azul)', 'diamantes', 12, FALSE, 'azul/q_diamantes.png', 12),
('K de Diamantes (Azul)', 'diamantes', 13, FALSE, 'azul/k_diamantes.png', 13);

-- Insertar cartas de Tréboles (♣) - Baraja Azul
INSERT INTO cartas (nombre, palo, valor, es_comodin, imagen, orden_valor) VALUES
('As de Tréboles (Azul)', 'treboles', 1, FALSE, 'azul/as_treboles.png', 1),
('2 de Tréboles (Azul)', 'treboles', 2, FALSE, 'azul/2_treboles.png', 2),
('3 de Tréboles (Azul)', 'treboles', 3, FALSE, 'azul/3_treboles.png', 3),
('4 de Tréboles (Azul)', 'treboles', 4, FALSE, 'azul/4_treboles.png', 4),
('5 de Tréboles (Azul)', 'treboles', 5, FALSE, 'azul/5_treboles.png', 5),
('6 de Tréboles (Azul)', 'treboles', 6, FALSE, 'azul/6_treboles.png', 6),
('7 de Tréboles (Azul)', 'treboles', 7, FALSE, 'azul/7_treboles.png', 7),
('8 de Tréboles (Azul)', 'treboles', 8, FALSE, 'azul/8_treboles.png', 8),
('9 de Tréboles (Azul)', 'treboles', 9, FALSE, 'azul/9_treboles.png', 9),
('10 de Tréboles (Azul)', 'treboles', 10, FALSE, 'azul/10_treboles.png', 10),
('J de Tréboles (Azul)', 'treboles', 11, FALSE, 'azul/j_treboles.png', 11),
('Q de Tréboles (Azul)', 'treboles', 12, FALSE, 'azul/q_treboles.png', 12),
('K de Tréboles (Azul)', 'treboles', 13, FALSE, 'azul/k_treboles.png', 13);

-- Insertar cartas de Picas (♠) - Baraja Azul
INSERT INTO cartas (nombre, palo, valor, es_comodin, imagen, orden_valor) VALUES
('As de Picas (Azul)', 'picas', 1, FALSE, 'azul/as_picas.png', 1),
('2 de Picas (Azul)', 'picas', 2, FALSE, 'azul/2_picas.png', 2),
('3 de Picas (Azul)', 'picas', 3, FALSE, 'azul/3_picas.png', 3),
('4 de Picas (Azul)', 'picas', 4, FALSE, 'azul/4_picas.png', 4),
('5 de Picas (Azul)', 'picas', 5, FALSE, 'azul/5_picas.png', 5),
('6 de Picas (Azul)', 'picas', 6, FALSE, 'azul/6_picas.png', 6),
('7 de Picas (Azul)', 'picas', 7, FALSE, 'azul/7_picas.png', 7),
('8 de Picas (Azul)', 'picas', 8, FALSE, 'azul/8_picas.png', 8),
('9 de Picas (Azul)', 'picas', 9, FALSE, 'azul/9_picas.png', 9),
('10 de Picas (Azul)', 'picas', 10, FALSE, 'azul/10_picas.png', 10),
('J de Picas (Azul)', 'picas', 11, FALSE, 'azul/j_picas.png', 11),
('Q de Picas (Azul)', 'picas', 12, FALSE, 'azul/q_picas.png', 12),
('K de Picas (Azul)', 'picas', 13, FALSE, 'azul/k_picas.png', 13);

-- Insertar Jokers - Baraja Azul
INSERT INTO cartas (nombre, palo, valor, es_comodin, imagen, orden_valor) VALUES
('Joker Rojo (Azul)', 'joker', 0, TRUE, 'azul/joker_rojo.png', 0),
('Joker Negro (Azul)', 'joker', 0, TRUE, 'azul/joker_negro.png', 0);

-- BARAJA ROJA (Segunda baraja)
-- Insertar cartas de Corazones (♥) - Baraja Roja
INSERT INTO cartas (nombre, palo, valor, es_comodin, imagen, orden_valor) VALUES
('As de Corazones (Roja)', 'corazones', 1, FALSE, 'roja/as_corazones.png', 1),
('2 de Corazones (Roja)', 'corazones', 2, FALSE, 'roja/2_corazones.png', 2),
('3 de Corazones (Roja)', 'corazones', 3, FALSE, 'roja/3_corazones.png', 3),
('4 de Corazones (Roja)', 'corazones', 4, FALSE, 'roja/4_corazones.png', 4),
('5 de Corazones (Roja)', 'corazones', 5, FALSE, 'roja/5_corazones.png', 5),
('6 de Corazones (Roja)', 'corazones', 6, FALSE, 'roja/6_corazones.png', 6),
('7 de Corazones (Roja)', 'corazones', 7, FALSE, 'roja/7_corazones.png', 7),
('8 de Corazones (Roja)', 'corazones', 8, FALSE, 'roja/8_corazones.png', 8),
('9 de Corazones (Roja)', 'corazones', 9, FALSE, 'roja/9_corazones.png', 9),
('10 de Corazones (Roja)', 'corazones', 10, FALSE, 'roja/10_corazones.png', 10),
('J de Corazones (Roja)', 'corazones', 11, FALSE, 'roja/j_corazones.png', 11),
('Q de Corazones (Roja)', 'corazones', 12, FALSE, 'roja/q_corazones.png', 12),
('K de Corazones (Roja)', 'corazones', 13, FALSE, 'roja/k_corazones.png', 13);

-- Insertar cartas de Diamantes (♦) - Baraja Roja
INSERT INTO cartas (nombre, palo, valor, es_comodin, imagen, orden_valor) VALUES
('As de Diamantes (Roja)', 'diamantes', 1, FALSE, 'roja/as_diamantes.png', 1),
('2 de Diamantes (Roja)', 'diamantes', 2, FALSE, 'roja/2_diamantes.png', 2),
('3 de Diamantes (Roja)', 'diamantes', 3, FALSE, 'roja/3_diamantes.png', 3),
('4 de Diamantes (Roja)', 'diamantes', 4, FALSE, 'roja/4_diamantes.png', 4),
('5 de Diamantes (Roja)', 'diamantes', 5, FALSE, 'roja/5_diamantes.png', 5),
('6 de Diamantes (Roja)', 'diamantes', 6, FALSE, 'roja/6_diamantes.png', 6),
('7 de Diamantes (Roja)', 'diamantes', 7, FALSE, 'roja/7_diamantes.png', 7),
('8 de Diamantes (Roja)', 'diamantes', 8, FALSE, 'roja/8_diamantes.png', 8),
('9 de Diamantes (Roja)', 'diamantes', 9, FALSE, 'roja/9_diamantes.png', 9),
('10 de Diamantes (Roja)', 'diamantes', 10, FALSE, 'roja/10_diamantes.png', 10),
('J de Diamantes (Roja)', 'diamantes', 11, FALSE, 'roja/j_diamantes.png', 11),
('Q de Diamantes (Roja)', 'diamantes', 12, FALSE, 'roja/q_diamantes.png', 12),
('K de Diamantes (Roja)', 'diamantes', 13, FALSE, 'roja/k_diamantes.png', 13);

-- Insertar cartas de Tréboles (♣) - Baraja Roja
INSERT INTO cartas (nombre, palo, valor, es_comodin, imagen, orden_valor) VALUES
('As de Tréboles (Roja)', 'treboles', 1, FALSE, 'roja/as_treboles.png', 1),
('2 de Tréboles (Roja)', 'treboles', 2, FALSE, 'roja/2_treboles.png', 2),
('3 de Tréboles (Roja)', 'treboles', 3, FALSE, 'roja/3_treboles.png', 3),
('4 de Tréboles (Roja)', 'treboles', 4, FALSE, 'roja/4_treboles.png', 4),
('5 de Tréboles (Roja)', 'treboles', 5, FALSE, 'roja/5_treboles.png', 5),
('6 de Tréboles (Roja)', 'treboles', 6, FALSE, 'roja/6_treboles.png', 6),
('7 de Tréboles (Roja)', 'treboles', 7, FALSE, 'roja/7_treboles.png', 7),
('8 de Tréboles (Roja)', 'treboles', 8, FALSE, 'roja/8_treboles.png', 8),
('9 de Tréboles (Roja)', 'treboles', 9, FALSE, 'roja/9_treboles.png', 9),
('10 de Tréboles (Roja)', 'treboles', 10, FALSE, 'roja/10_treboles.png', 10),
('J de Tréboles (Roja)', 'treboles', 11, FALSE, 'roja/j_treboles.png', 11),
('Q de Tréboles (Roja)', 'treboles', 12, FALSE, 'roja/q_treboles.png', 12),
('K de Tréboles (Roja)', 'treboles', 13, FALSE, 'roja/k_treboles.png', 13);

-- Insertar cartas de Picas (♠) - Baraja Roja
INSERT INTO cartas (nombre, palo, valor, es_comodin, imagen, orden_valor) VALUES
('As de Picas (Roja)', 'picas', 1, FALSE, 'roja/as_picas.png', 1),
('2 de Picas (Roja)', 'picas', 2, FALSE, 'roja/2_picas.png', 2),
('3 de Picas (Roja)', 'picas', 3, FALSE, 'roja/3_picas.png', 3),
('4 de Picas (Roja)', 'picas', 4, FALSE, 'roja/4_picas.png', 4),
('5 de Picas (Roja)', 'picas', 5, FALSE, 'roja/5_picas.png', 5),
('6 de Picas (Roja)', 'picas', 6, FALSE, 'roja/6_picas.png', 6),
('7 de Picas (Roja)', 'picas', 7, FALSE, 'roja/7_picas.png', 7),
('8 de Picas (Roja)', 'picas', 8, FALSE, 'roja/8_picas.png', 8),
('9 de Picas (Roja)', 'picas', 9, FALSE, 'roja/9_picas.png', 9),
('10 de Picas (Roja)', 'picas', 10, FALSE, 'roja/10_picas.png', 10),
('J de Picas (Roja)', 'picas', 11, FALSE, 'roja/j_picas.png', 11),
('Q de Picas (Roja)', 'picas', 12, FALSE, 'roja/q_picas.png', 12),
('K de Picas (Roja)', 'picas', 13, FALSE, 'roja/k_picas.png', 13);

-- Insertar Jokers - Baraja Roja
INSERT INTO cartas (nombre, palo, valor, es_comodin, imagen, orden_valor) VALUES
('Joker Rojo (Roja)', 'joker', 0, TRUE, 'roja/joker_rojo.png', 0),
('Joker Negro (Roja)', 'joker', 0, TRUE, 'roja/joker_negro.png', 0);

-- Verificar inserción (debe mostrar 112 cartas)
SELECT COUNT(*) as total_cartas FROM cartas;
SELECT 
    CASE 
        WHEN imagen LIKE 'azul/%' THEN 'Baraja Azul'
        WHEN imagen LIKE 'roja/%' THEN 'Baraja Roja'
        ELSE 'Otra'
    END as baraja,
    palo, 
    COUNT(*) as cantidad 
FROM cartas 
GROUP BY 
    CASE 
        WHEN imagen LIKE 'azul/%' THEN 'Baraja Azul'
        WHEN imagen LIKE 'roja/%' THEN 'Baraja Roja'
        ELSE 'Otra'
    END,
    palo 
ORDER BY baraja, palo;
