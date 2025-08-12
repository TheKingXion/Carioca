-- Insertar los 10 contratos del Carioca
USE carioca_online;

-- Limpiar tabla de contratos
DELETE FROM contratos;

-- Insertar los 10 contratos según las reglas oficiales
INSERT INTO contratos (id, numero_contrato, nombre, descripcion, cartas_requeridas, trios_requeridos, escalas_requeridas, tipo_especial, puntos_base) VALUES
(1, 1, '2 Tríos', 'Formar 2 tríos (3 cartas del mismo número cada uno)', 6, 2, 0, 'normal', 20),
(2, 2, '1 Escala y 1 Trío', 'Formar 1 escala (4 cartas consecutivas del mismo palo) y 1 trío', 7, 1, 1, 'normal', 25),
(3, 3, '2 Escalas', 'Formar 2 escalas (4 cartas consecutivas del mismo palo cada una)', 8, 0, 2, 'normal', 30),
(4, 4, '3 Tríos', 'Formar 3 tríos (3 cartas del mismo número cada uno)', 9, 3, 0, 'normal', 35),
(5, 5, '2 Tríos y 1 Escala', 'Formar 2 tríos y 1 escala (4 cartas consecutivas del mismo palo)', 10, 2, 1, 'normal', 40),
(6, 6, '2 Escalas y 1 Trío', 'Formar 2 escalas (4 cartas consecutivas del mismo palo) y 1 trío', 11, 1, 2, 'normal', 45),
(7, 7, '3 Escalas', 'Formar 3 escalas (4 cartas consecutivas del mismo palo cada una)', 12, 0, 3, 'normal', 50),
(8, 8, '4 Tríos', 'Formar 4 tríos (3 cartas del mismo número cada uno)', 12, 4, 0, 'normal', 55),
(9, 9, 'Escala Falsa', 'Formar una escala con todas las cartas (13) en orden, sin importar palo', 13, 0, 0, 'escala_falsa', 60),
(10, 10, 'Escala Real', 'Formar una escala con todas las cartas (13) del mismo palo en orden', 13, 0, 0, 'escala_real', 65);

-- Verificar inserción
SELECT * FROM contratos ORDER BY numero_contrato;
