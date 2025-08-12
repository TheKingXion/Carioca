# Carioca Online (Solo vs Bots)

Un juego de cartas Carioca para navegador con modo contra bots, interfaz adaptable y reglas completas.

## Características
- 10 contratos con validación de bajada y relleno.
- IA básica para bots: se bajan y rellenan cuando es posible.
- Puntaje por ronda y marcador global.
- Panel de información colapsable; diseño en grid compacto.
- Adaptable a 1920x1080, 1280x720 y tamaños intermedios sin perder legibilidad.
- Audios de derrota por bot cuando finaliza la partida.

## Estructura
- frontend/: HTML, CSS y JS de la UI y lógica del modo bots.
- backend/: Servidor Flask con endpoints y base para multijugador.
- database/: Esquemas y seeds SQL.
- docs/: Documentación funcional y técnica.

## Requisitos
- Python 3.11+
- pip (o pipx)

## Puesta en marcha
1. Instala dependencias: `pip install -r requirements.txt`.
2. Ejecuta: `python backend/app.py`.
3. Abre http://localhost:5000 o carga `frontend/partida-bots.html` en tu navegador para jugar contra bots.

Nota: Si usas Windows PowerShell, puedes ejecutar en una línea: `pip install -r requirements.txt; python backend/app.py`.

## Tests
- Abre `frontend/test-cartas.html` para verificar la generación y consistencia de cartas.

## Cómo se juega (resumen)
- Debes cumplir el contrato actual para bajarte.
- Luego puedes extender combinaciones en mesa.
- Al terminar una ronda se suman puntos por cartas restantes (A=15, J/Q/K=10, Joker=25, numéricas su valor) y gana quien tenga menor puntaje total al finalizar los contratos.

## Créditos
- Ambar Rojas
- Pablo Cocio
- Vicente Soto
- Benjamin Cona

## Licencia
- Uso educativo/demostrativo. Ajusta según tus necesidades.
