// Lobby JavaScript - Solo para partidas vs Bots
class LobbyBotManager {
    constructor() {
        this.currentUser = null;
        this.configuracionPartida = {
            tipo: 'vs_bot',
            maxJugadores: 3,
            dificultad: 'facil',
            bots: [],
            modoRapido: false,
            ayudasVisibles: true,
            sonidosActivados: true
        };
        this.historialPartidas = [];
        
        this.init();
    }

    init() {
        this.verificarAutenticacion();
        this.configurarEventListeners();
        this.cargarConfiguracion();
        this.cargarHistorialPartidas();
        this.cargarEstadisticas();
        this.inicializarParticulas();
        this.mostrarConsejoDelDia();
        this.actualizarConfiguracionBots();
    }

    verificarAutenticacion() {
        const userData = localStorage.getItem('carioca_user') || sessionStorage.getItem('carioca_user');
        if (!userData) {
            window.location.href = 'login.html';
            return;
        }

        try {
            this.currentUser = JSON.parse(userData);
            this.actualizarInfoUsuario();
        } catch (e) {
            console.error('Error parsing user data:', e);
            window.location.href = 'login.html';
        }
    }

    actualizarInfoUsuario() {
        if (!this.currentUser) return;
        
        document.getElementById('userName').textContent = this.currentUser.nombre;
        document.getElementById('userWins').textContent = this.currentUser.victorias || 0;
        document.getElementById('userLosses').textContent = this.currentUser.derrotas || 0;
        document.getElementById('userLevel').textContent = this.currentUser.nivel || 1;
        
        // Actualizar avatar
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.textContent = this.currentUser.nombre.charAt(0).toUpperCase();
        }
    }

    configurarEventListeners() {
        // Eventos de creación de partida
        const crearBtn = document.querySelector('[onclick="crearPartidaVsBots()"]');
        if (crearBtn) {
            crearBtn.removeAttribute('onclick');
            crearBtn.addEventListener('click', () => this.crearPartidaVsBots());
        }

        const rapidaBtn = document.querySelector('[onclick="partidaRapidaVsBots()"]');
        if (rapidaBtn) {
            rapidaBtn.removeAttribute('onclick');
            rapidaBtn.addEventListener('click', () => this.partidaRapidaVsBots());
        }

        // Eventos de configuración
        document.getElementById('modoRapido')?.addEventListener('change', (e) => {
            this.configuracionPartida.modoRapido = e.target.checked;
        });

        document.getElementById('ayudasVisibles')?.addEventListener('change', (e) => {
            this.configuracionPartida.ayudasVisibles = e.target.checked;
        });

        document.getElementById('sonidosActivados')?.addEventListener('change', (e) => {
            this.configuracionPartida.sonidosActivados = e.target.checked;
        });

        // Eventos de modales
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
                this.cerrarModal(e.target.closest('.modal').id);
            }
        });
    }

    seleccionarJugadores(num) {
        this.configuracionPartida.maxJugadores = num;
        
        // Actualizar UI
        document.querySelectorAll('.player-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.players) === num) {
                btn.classList.add('active');
            }
        });
        
        this.actualizarConfiguracionBots();
    }

    seleccionarDificultad(dificultad) {
        this.configuracionPartida.dificultad = dificultad;
        
        // Actualizar UI
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.difficulty === dificultad) {
                btn.classList.add('active');
            }
        });
        
        this.actualizarConfiguracionBots();
    }

    actualizarConfiguracionBots() {
        const container = document.getElementById('botConfigContainer');
        if (!container) return;

        const numBots = this.configuracionPartida.maxJugadores - 1; // -1 porque el jugador humano cuenta
        const dificultad = this.configuracionPartida.dificultad;
        
        // Nombres predefinidos para los bots
        const nombresBots = [
            { facil: 'Bot Principiante', medio: 'Bot Intermedio', dificil: 'Bot Experto' },
            { facil: 'Compañero IA', medio: 'Rival IA', dificil: 'Maestro IA' },
            { facil: 'Ayudante Bot', medio: 'Desafiante Bot', dificil: 'Campeón Bot' }
        ];

        this.configuracionPartida.bots = [];
        let html = '';

        for (let i = 0; i < numBots; i++) {
            const nombreBot = nombresBots[i][dificultad];
            this.configuracionPartida.bots.push({
                nombre: nombreBot,
                dificultad: dificultad,
                posicion: i + 2 // Posición 1 es para el jugador humano
            });

            html += `
                <div class="bot-item">
                    <div class="bot-avatar">🤖</div>
                    <div class="bot-info">
                        <h5>${nombreBot}</h5>
                        <p>Dificultad: ${dificultad}</p>
                    </div>
                    <div class="bot-status">✅ Listo</div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    async crearPartidaVsBots() {
        this.mostrarModalCreandoPartida();

        try {
            const response = await fetch('/crear_partida', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    tipo_partida: 'vs_bot',
                    max_jugadores: this.configuracionPartida.maxJugadores,
                    configuracion_bots: this.configuracionPartida.bots,
                    configuracion: {
                        modoRapido: this.configuracionPartida.modoRapido,
                        ayudasVisibles: this.configuracionPartida.ayudasVisibles,
                        sonidosActivados: this.configuracionPartida.sonidosActivados
                    }
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Agregar al historial
                this.agregarPartidaAlHistorial({
                    id: data.partida_id,
                    fecha: new Date().toISOString(),
                    jugadores: this.configuracionPartida.maxJugadores,
                    bots: this.configuracionPartida.bots.length,
                    dificultad: this.configuracionPartida.dificultad,
                    estado: 'en_curso'
                });

                this.cerrarModal('creandoPartidaModal');
                
                // Redirigir al juego
                window.location.href = `game.html?partida=${data.partida_id}`;
            } else {
                throw new Error(data.error || 'Error desconocido');
            }

        } catch (error) {
            console.error('Error creando partida:', error);
            this.cerrarModal('creandoPartidaModal');
            this.mostrarError('Error al crear la partida: ' + error.message);
        }
    }

    partidaRapidaVsBots() {
        // Configuración por defecto para partida rápida
        this.configuracionPartida.maxJugadores = 3;
        this.configuracionPartida.dificultad = 'facil';
        this.configuracionPartida.modoRapido = true;
        
        // Actualizar UI
        this.seleccionarJugadores(3);
        this.seleccionarDificultad('facil');
        document.getElementById('modoRapido').checked = true;
        
        // Crear partida inmediatamente
        this.crearPartidaVsBots();
    }

    cargarHistorialPartidas() {
        const historial = localStorage.getItem('carioca_historial_' + this.currentUser.id);
        if (historial) {
            this.historialPartidas = JSON.parse(historial);
        } else {
            this.historialPartidas = [];
        }
        this.mostrarHistorialPartidas();
    }

    agregarPartidaAlHistorial(partida) {
        this.historialPartidas.unshift(partida);
        
        // Mantener solo las últimas 50 partidas
        if (this.historialPartidas.length > 50) {
            this.historialPartidas = this.historialPartidas.slice(0, 50);
        }
        
        localStorage.setItem('carioca_historial_' + this.currentUser.id, JSON.stringify(this.historialPartidas));
        this.mostrarHistorialPartidas();
    }

    mostrarHistorialPartidas() {
        const container = document.getElementById('historialPartidas');
        if (!container) return;

        if (this.historialPartidas.length === 0) {
            container.innerHTML = `
                <div class="no-games-message">
                    <div class="no-games-icon">🎯</div>
                    <h3>¡Comienza tu primera partida!</h3>
                    <p>Crea una partida contra bots para empezar a jugar</p>
                    <button class="btn-primary" onclick="lobbyManager.partidaRapidaVsBots()">
                        🚀 Jugar Ahora
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        this.historialPartidas.slice(0, 10).forEach(partida => {
            const fecha = new Date(partida.fecha).toLocaleDateString();
            const hora = new Date(partida.fecha).toLocaleTimeString();
            
            html += `
                <div class="history-item ${partida.resultado || 'pendiente'}">
                    <div class="history-icon">
                        ${partida.resultado === 'victoria' ? '🏆' : 
                          partida.resultado === 'derrota' ? '💔' : '🎮'}
                    </div>
                    <div class="history-info">
                        <h4>Partida vs ${partida.bots} Bots</h4>
                        <p>Jugadores: ${partida.jugadores} | Dificultad: ${partida.dificultad}</p>
                        <span class="history-date">${fecha} ${hora}</span>
                    </div>
                    <div class="history-status">
                        ${partida.resultado ? 
                          (partida.resultado === 'victoria' ? 'Victoria' : 'Derrota') : 
                          'En progreso'}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    cargarEstadisticas() {
        // Estadísticas desde el historial local
        const victorias = this.historialPartidas.filter(p => p.resultado === 'victoria').length;
        const derrotas = this.historialPartidas.filter(p => p.resultado === 'derrota').length;
        const total = victorias + derrotas;
        const porcentaje = total > 0 ? Math.round((victorias / total) * 100) : 0;

        document.getElementById('totalPartidas').textContent = total;
        document.getElementById('partidasGanadas').textContent = victorias;
        document.getElementById('partidasPerdidas').textContent = derrotas;
        document.getElementById('porcentajeVictorias').textContent = porcentaje + '%';

        // Progreso del nivel (simulado)
        const nivel = Math.floor(total / 10) + 1;
        const expActual = (total % 10) * 10;
        const expSiguiente = 100;
        
        document.getElementById('nivelActual').textContent = nivel;
        document.getElementById('expActual').textContent = expActual;
        document.getElementById('expSiguienteNivel').textContent = expSiguiente;
        
        const expBar = document.getElementById('experienciaBar');
        if (expBar) {
            expBar.style.width = (expActual / expSiguiente * 100) + '%';
        }
    }

    mostrarConsejoDelDia() {
        const consejos = [
            "En el Carioca, es importante observar las cartas que descartan tus oponentes para saber qué juegos están armando.",
            "Guarda cartas de diferentes palos para tener más opciones al formar escalas.",
            "Los comodines son muy valiosos, úsalos estratégicamente en los contratos más difíciles.",
            "Observa el patrón de descarte de los bots para predecir sus próximos movimientos.",
            "En el modo rápido, las decisiones rápidas son clave para mantener el ritmo de juego.",
            "Trata de completar los contratos más fáciles primero para obtener ventaja temprana.",
            "Las escalas de color son más difíciles de formar pero otorgan más puntos.",
            "No te olvides de mirar tu mano completa antes de decidir qué carta descartar.",
            "Los bots de dificultad alta pueden recordar todas las cartas jugadas.",
            "Practica con bots fáciles antes de enfrentarte a los más difíciles."
        ];
        
        const consejoDelDia = consejos[Math.floor(Math.random() * consejos.length)];
        const container = document.getElementById('consejoDelDia');
        if (container) {
            container.innerHTML = `<p>${consejoDelDia}</p>`;
        }
    }

    // Funciones de UI
    mostrarModalCreandoPartida() {
        const modal = document.getElementById('creandoPartidaModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Simular progreso de creación
            const progressBar = document.getElementById('creatingProgress');
            if (progressBar) {
                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * 30;
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(interval);
                    }
                    progressBar.style.width = progress + '%';
                }, 500);
            }
        }
    }

    cerrarModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    mostrarError(mensaje) {
        // Crear y mostrar toast de error
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">❌</span>
                <span class="toast-message">${mensaje}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 4000);
    }

    cargarConfiguracion() {
        const config = localStorage.getItem('carioca_config_' + this.currentUser.id);
        if (config) {
            const savedConfig = JSON.parse(config);
            Object.assign(this.configuracionPartida, savedConfig);
            
            // Aplicar a la UI
            document.getElementById('modoRapido').checked = this.configuracionPartida.modoRapido;
            document.getElementById('ayudasVisibles').checked = this.configuracionPartida.ayudasVisibles;
            document.getElementById('sonidosActivados').checked = this.configuracionPartida.sonidosActivados;
        }
    }

    inicializarParticulas() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        // Crear partículas de cartas flotantes
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.innerHTML = ['🃏', '♠️', '♥️', '♦️', '♣️'][Math.floor(Math.random() * 5)];
            
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 10 + 's';
            particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
            
            particlesContainer.appendChild(particle);
        }
    }

    // Funciones llamadas desde HTML
    filtrarHistorial() {
        const filtro = document.getElementById('filtroHistorial').value;
        // Implementar filtrado si es necesario
        this.mostrarHistorialPartidas();
    }

    actualizarHistorial() {
        this.cargarHistorialPartidas();
        this.cargarEstadisticas();
    }

    limpiarHistorial() {
        if (confirm('¿Estás seguro de que quieres limpiar todo el historial?')) {
            this.historialPartidas = [];
            localStorage.removeItem('carioca_historial_' + this.currentUser.id);
            this.mostrarHistorialPartidas();
            this.cargarEstadisticas();
        }
    }

    volverAlMenu() {
        window.location.href = 'index.html';
    }

    mostrarEstadisticas() {
        // Abrir modal de estadísticas
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Actualizar datos del modal
            const victorias = this.historialPartidas.filter(p => p.resultado === 'victoria').length;
            const derrotas = this.historialPartidas.filter(p => p.resultado === 'derrota').length;
            const total = victorias + derrotas;
            const winRate = total > 0 ? Math.round((victorias / total) * 100) : 0;
            
            document.getElementById('statVictorias').textContent = victorias;
            document.getElementById('statDerrotas').textContent = derrotas;
            document.getElementById('statWinRate').textContent = winRate + '%';
            document.getElementById('statNivel').textContent = Math.floor(total / 10) + 1;
        }
    }

    mostrarConfiguracion() {
        const modal = document.getElementById('configModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    activarModoTest() {
        const modal = document.getElementById('testModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
}

// Funciones globales para compatibilidad con HTML
function seleccionarJugadores(num) {
    if (window.lobbyManager) {
        window.lobbyManager.seleccionarJugadores(num);
    }
}

function seleccionarDificultad(dificultad) {
    if (window.lobbyManager) {
        window.lobbyManager.seleccionarDificultad(dificultad);
    }
}

function crearPartidaVsBots() {
    if (window.lobbyManager) {
        window.lobbyManager.crearPartidaVsBots();
    }
}

function partidaRapidaVsBots() {
    if (window.lobbyManager) {
        window.lobbyManager.partidaRapidaVsBots();
    }
}

function filtrarHistorial() {
    if (window.lobbyManager) {
        window.lobbyManager.filtrarHistorial();
    }
}

function actualizarHistorial() {
    if (window.lobbyManager) {
        window.lobbyManager.actualizarHistorial();
    }
}

function limpiarHistorial() {
    if (window.lobbyManager) {
        window.lobbyManager.limpiarHistorial();
    }
}

function volverAlMenu() {
    if (window.lobbyManager) {
        window.lobbyManager.volverAlMenu();
    }
}

function mostrarEstadisticas() {
    if (window.lobbyManager) {
        window.lobbyManager.mostrarEstadisticas();
    }
}

function mostrarConfiguracion() {
    if (window.lobbyManager) {
        window.lobbyManager.mostrarConfiguracion();
    }
}

function activarModoTest() {
    if (window.lobbyManager) {
        window.lobbyManager.activarModoTest();
    }
}

function cerrarModal(modalId) {
    if (window.lobbyManager) {
        window.lobbyManager.cerrarModal(modalId);
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.lobbyManager = new LobbyBotManager();
});
