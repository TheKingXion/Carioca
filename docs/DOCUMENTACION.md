# Proyecto: Carioca Online (Solo vs Bots)

Este documento describe la arquitectura, reglas, lógica de juego, UI/UX, y procesos para desarrollar, ejecutar y mantener el proyecto.

## 1. Resumen
- Modalidad: Juego de cartas Carioca contra 3 bots.
- Frontend: HTML, CSS, JavaScript puro.
- Backend: Flask (Python) para endpoints REST y estáticos. Base de datos MySQL (esquemas en `database/`).
- Estados clave: contratos, manos, combinaciones en mesa, descarte/mazo, turnos, puntuación, final de ronda y de partida.

## 2. Estructura del repositorio
- frontend/
  - index.html, lobby.html, login.html, register.html, perfil.html
  - game.html (multijugador), partida-bots.html (modo bots)
  - css/* estilos responsivos y grid compacto
  - js/* lógica de UI y motor de juego (`partida-bots.js` contiene la lógica principal)
- backend/
  - app.py (API y servidor)
  - game_logic.py, game_manager.py, bot_ai.py (base para multijugador)
  - config.py (variables de entorno)
- database/
  - schema*.sql y seeds para cartas/contratos

## 3. Reglas de Carioca implementadas
- Secuencia de 10 contratos; la mano inicial es de 12 cartas, y en los contratos finales se inicia con 13 cartas.
- "Bajarse": el jugador debe cumplir el contrato vigente colocando sus combinaciones en mesa.
- "Rellenar": tras bajarse, se puede extender combinaciones propias o ajenas con cartas válidas.
- Jokers: comodines válidos según reglas; puntúan 25 si quedan en mano.
- Puntuación por cierre de ronda y acumulado por jugador con tablero de puntajes.

## 4. Motor de juego (partida-bots.js)
- Representa jugadores, manos, combinaciones bajadas, contrato actual y turnos.
- Funciones clave:
  - makePlay(): intenta bajarse conforme al contrato.
  - extendSelectedToCombination(): rellena una combinación existente.
  - selectionCanExtendSingleCombination(): validación de extensión.
  - botAttemptLaydown() y botAttemptExtend(): heurísticas básicas de bots.
  - computeHandPoints() y updateScoreBoard(): puntajes y UI.
  - handleGameEnd(): determina fin de partida y reproduce audio por bot perdedor.
- Tamaños adaptativos: updateAdaptiveSizing() ajusta variables CSS para que todo quepa sin perder legibilidad.

## 5. UI/UX
- Layout en grid compacto con áreas: botTop, botLeft, table, botRight, player.
- Panel de información colapsable (botón Info + botón Cerrar), con z-index corregido para no tapar la mesa.
- Responsivo para 1920x1080 y 1280x720, y adaptable a tamaños intermedios.
- Sin transform global que empequeñezca las cartas: se ajustan dimensiones reales.

## 6. Backend
- Flask sirve los archivos de `frontend/` y endpoints auxiliares:
  - /api/status, /cartas, /cartas/test, /contratos, registro/login, creación de sala, etc.
- WebSocket vía Flask-SocketIO preparado para escalamiento a multijugador.

## 7. Base de datos
- Archivos SQL en `database/` proporcionan esquema y datos semilla de cartas/contratos/logros.
- El modo bots puede funcionar sin DB, pero los endpoints y multijugador la usan.

## 8. Cómo ejecutar
- Requisitos: Python 3.11+, pip, Node opcional para utilidades.
- Instalar dependencias: `pip install -r requirements.txt`.
- Ejecutar backend: `python backend/app.py` (sirve frontend en http://localhost:5000).
- Abrir `frontend/partida-bots.html` directo en el navegador también funciona para modo local sin backend.

## 9. Tests
- Se conserva el test de cartas: `frontend/test-cartas.html` (+ `frontend/js/test-cartas.js`).
- Otras páginas de prueba y debug se han eliminado del repositorio.

## 10. Créditos y licencia
- Ver archivo `Creditos` y `README.md`.

## 11. Roadmap breve
- Mejorar IA de bots (gestión de riesgo, conteo de cartas vistas).
- Conectar modo bots a persistencia opcional de estadísticas.
- Completar multijugador online en tiempo real.
- Agregar suite de pruebas unitarias de lógica (sin DOM).

(Documentacion Generada por GPT-5)
