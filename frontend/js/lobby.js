/**
 * Sistema de lobby para Carioca Online
 * Maneja la creación y gestión de salas de juego
 */

class LobbyManager {
    constructor() {
        this.socket = null;
        this.currentRoom = null;
        this.availableRooms = [];
        this.init();
    }

    init() {
        this.initSocket();
        this.bindEvents();
        this.loadUserInfo();
        this.refreshRooms();
    }

    /**
     * Inicializar conexión Socket.IO
     */
    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Conectado al servidor');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Desconectado del servidor');
            this.updateConnectionStatus(false);
        });

        this.socket.on('rooms_list', (rooms) => {
            this.updateRoomsList(rooms);
        });

        this.socket.on('room_created', (roomData) => {
            this.onRoomCreated(roomData);
        });

        this.socket.on('room_joined', (roomData) => {
            this.onRoomJoined(roomData);
        });

        this.socket.on('room_error', (error) => {
            this.showError(error.message);
        });

        this.socket.on('player_joined', (playerData) => {
            this.onPlayerJoined(playerData);
        });

        this.socket.on('player_left', (playerData) => {
            this.onPlayerLeft(playerData);
        });

        this.socket.on('game_starting', (gameData) => {
            this.onGameStarting(gameData);
        });
    }

    /**
     * Vincular eventos de la interfaz
     */
    bindEvents() {
        // Botón crear sala
        const createRoomBtn = document.getElementById('createRoomBtn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => this.showCreateRoomModal());
        }

        // Botón juego rápido
        const quickGameBtn = document.getElementById('quickGameBtn');
        if (quickGameBtn) {
            quickGameBtn.addEventListener('click', () => this.startQuickGame());
        }

        // Botón refrescar salas
        const refreshBtn = document.getElementById('refreshRoomsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshRooms());
        }

        // Botón cerrar sesión
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Modal crear sala
        this.bindCreateRoomModal();
    }

    /**
     * Eventos del modal de crear sala
     */
    bindCreateRoomModal() {
        const modal = document.getElementById('createRoomModal');
        const createBtn = document.getElementById('confirmCreateRoom');
        const cancelBtn = document.getElementById('cancelCreateRoom');
        
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createRoom());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideCreateRoomModal());
        }

        // Cerrar modal al hacer clic fuera
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideCreateRoomModal();
                }
            });
        }
    }

    /**
     * Cargar información del usuario
     */
    loadUserInfo() {
        const user = authManager.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Actualizar info del usuario en el UI
        const userName = document.getElementById('userName');
        const userStats = document.getElementById('userStats');
        
        if (userName) {
            userName.textContent = user.nombre;
        }
        
        if (userStats && !user.es_invitado) {
            userStats.innerHTML = `
                <div class="stat">
                    <span class="stat-label">Victorias:</span>
                    <span class="stat-value">${user.victorias || 0}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Derrotas:</span>
                    <span class="stat-value">${user.derrotas || 0}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Puntos:</span>
                    <span class="stat-value">${user.puntos_totales || 0}</span>
                </div>
            `;
        }
    }

    /**
     * Actualizar estado de conexión
     */
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.className = connected ? 'status connected' : 'status disconnected';
            statusElement.textContent = connected ? 'Conectado' : 'Desconectado';
        }
    }

    /**
     * Refrescar lista de salas
     */
    refreshRooms() {
        if (this.socket) {
            this.socket.emit('get_rooms');
        }
    }

    /**
     * Actualizar lista de salas en el UI
     */
    updateRoomsList(rooms) {
        this.availableRooms = rooms;
        const roomsList = document.getElementById('roomsList');
        
        if (!roomsList) return;

        if (rooms.length === 0) {
            roomsList.innerHTML = `
                <div class="no-rooms">
                    <p>No hay salas disponibles</p>
                    <p>¡Crea una nueva sala para empezar a jugar!</p>
                </div>
            `;
            return;
        }

        roomsList.innerHTML = rooms.map(room => `
            <div class="room-card" data-room-id="${room.id}">
                <div class="room-header">
                    <h3 class="room-name">${room.name}</h3>
                    <span class="room-status ${room.status}">${this.getRoomStatusText(room.status)}</span>
                </div>
                <div class="room-info">
                    <div class="room-players">
                        <i class="fas fa-users"></i>
                        <span>${room.players.length}/${room.max_players}</span>
                    </div>
                    <div class="room-difficulty">
                        <i class="fas fa-star"></i>
                        <span>${this.getDifficultyText(room.bot_difficulty)}</span>
                    </div>
                </div>
                <div class="room-players-list">
                    ${room.players.map(player => `
                        <span class="player-tag ${player.is_bot ? 'bot' : 'human'}">
                            ${player.is_bot ? '🤖' : '👤'} ${player.name}
                        </span>
                    `).join('')}
                </div>
                <div class="room-actions">
                    <button class="btn btn-primary" onclick="lobbyManager.joinRoom('${room.id}')" 
                            ${room.players.length >= room.max_players ? 'disabled' : ''}>
                        ${room.players.length >= room.max_players ? 'Sala Llena' : 'Unirse'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Obtener texto del estado de la sala
     */
    getRoomStatusText(status) {
        const statusMap = {
            'waiting': 'Esperando',
            'playing': 'Jugando',
            'finished': 'Terminado'
        };
        return statusMap[status] || status;
    }

    /**
     * Obtener texto de dificultad
     */
    getDifficultyText(difficulty) {
        const difficultyMap = {
            'facil': 'Fácil',
            'medio': 'Medio',
            'dificil': 'Difícil'
        };
        return difficultyMap[difficulty] || difficulty;
    }

    /**
     * Mostrar modal de crear sala
     */
    showCreateRoomModal() {
        const modal = document.getElementById('createRoomModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('roomNameInput').focus();
        }
    }

    /**
     * Ocultar modal de crear sala
     */
    hideCreateRoomModal() {
        const modal = document.getElementById('createRoomModal');
        if (modal) {
            modal.style.display = 'none';
            this.clearCreateRoomForm();
        }
    }

    /**
     * Limpiar formulario de crear sala
     */
    clearCreateRoomForm() {
        document.getElementById('roomNameInput').value = '';
        document.getElementById('maxPlayersSelect').value = '4';
        document.getElementById('botDifficultySelect').value = 'medio';
    }

    /**
     * Crear nueva sala
     */
    createRoom() {
        const roomName = document.getElementById('roomNameInput').value.trim();
        const maxPlayers = parseInt(document.getElementById('maxPlayersSelect').value);
        const botDifficulty = document.getElementById('botDifficultySelect').value;

        if (!roomName) {
            this.showError('Por favor ingresa un nombre para la sala');
            return;
        }

        if (roomName.length > 30) {
            this.showError('El nombre de la sala no puede exceder 30 caracteres');
            return;
        }

        const roomData = {
            name: roomName,
            max_players: maxPlayers,
            bot_difficulty: botDifficulty
        };

        this.socket.emit('create_room', roomData);
    }

    /**
     * Unirse a una sala
     */
    joinRoom(roomId) {
        if (this.socket) {
            this.socket.emit('join_room', { room_id: roomId });
        }
    }

    /**
     * Iniciar juego rápido
     */
    startQuickGame() {
        const quickGameData = {
            max_players: 4,
            bot_difficulty: 'medio'
        };
        
        this.socket.emit('quick_game', quickGameData);
    }

    /**
     * Eventos de sala
     */
    onRoomCreated(roomData) {
        this.hideCreateRoomModal();
        this.showSuccess('Sala creada exitosamente');
        this.currentRoom = roomData;
        this.enterRoomWaiting();
    }

    onRoomJoined(roomData) {
        this.currentRoom = roomData;
        this.enterRoomWaiting();
    }

    onPlayerJoined(playerData) {
        if (this.currentRoom) {
            this.showInfo(`${playerData.name} se unió a la sala`);
            this.updateRoomWaiting();
        }
    }

    onPlayerLeft(playerData) {
        if (this.currentRoom) {
            this.showInfo(`${playerData.name} abandonó la sala`);
            this.updateRoomWaiting();
        }
    }

    onGameStarting(gameData) {
        this.showSuccess('¡El juego está comenzando!');
        setTimeout(() => {
            window.location.href = 'game.html';
        }, 2000);
    }

    /**
     * Entrar a sala de espera
     */
    enterRoomWaiting() {
        // Aquí se puede implementar una pantalla de espera
        // Por ahora, simplemente actualizamos la lista
        this.refreshRooms();
    }

    /**
     * Actualizar sala de espera
     */
    updateRoomWaiting() {
        // Actualizar información de la sala actual
        this.refreshRooms();
    }

    /**
     * Salir de la sala actual
     */
    leaveRoom() {
        if (this.currentRoom && this.socket) {
            this.socket.emit('leave_room');
            this.currentRoom = null;
        }
    }

    /**
     * Cerrar sesión
     */
    logout() {
        if (this.socket) {
            this.socket.disconnect();
        }
        authManager.logout();
        window.location.href = 'index.html';
    }

    /**
     * Mostrar mensajes
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Agregar al contenedor de notificaciones
        let container = document.getElementById('notificationsContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationsContainer';
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 100);

        // Remover después de 4 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => container.removeChild(notification), 300);
        }, 4000);
    }
}

// Instancia global del lobby
window.lobbyManager = new LobbyManager();

// Funciones globales
function createRoom() {
    window.lobbyManager.createRoom();
}

function joinRoom(roomId) {
    window.lobbyManager.joinRoom(roomId);
}

function refreshRooms() {
    window.lobbyManager.refreshRooms();
}

function startQuickGame() {
    window.lobbyManager.startQuickGame();
}
