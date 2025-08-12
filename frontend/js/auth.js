/**
 * Sistema de autenticación para Carioca Online
 * Maneja login, registro y verificación de sesiones
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkSession();
    }

    /**
     * Verificar si hay una sesión activa
     */
    checkSession() {
        const userData = localStorage.getItem('carioca_user') || sessionStorage.getItem('carioca_user');
        
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                return true;
            } catch (e) {
                console.error('Error parsing user data:', e);
                this.logout();
                return false;
            }
        }
        
        return false;
    }

    /**
     * Obtener usuario actual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Verificar si el usuario está autenticado
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Iniciar sesión
     */
    async login(email, password, remember = false) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                
                // Guardar en localStorage o sessionStorage según "recordarme"
                const storage = remember ? localStorage : sessionStorage;
                storage.setItem('carioca_user', JSON.stringify(data.user));
                
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error || 'Error de autenticación' };
            }
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }

    /**
     * Registrar nuevo usuario
     */
    async register(userData) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, message: 'Usuario registrado exitosamente' };
            } else {
                return { success: false, error: data.error || 'Error en el registro' };
            }
        } catch (error) {
            console.error('Error en registro:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }

    /**
     * Cerrar sesión
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem('carioca_user');
        sessionStorage.removeItem('carioca_user');
        localStorage.removeItem('current_game');
        sessionStorage.removeItem('current_game');
    }

    /**
     * Crear usuario invitado
     */
    createGuestUser() {
        const guestUser = {
            id: Date.now(),
            nombre: 'Invitado',
            email: 'guest@carioca.com',
            es_invitado: true,
            victorias: 0,
            derrotas: 0,
            puntos_totales: 0,
            fecha_registro: new Date().toISOString()
        };

        this.currentUser = guestUser;
        sessionStorage.setItem('carioca_user', JSON.stringify(guestUser));
        
        return guestUser;
    }

    /**
     * Actualizar datos del usuario
     */
    updateUser(userData) {
        if (this.currentUser) {
            this.currentUser = { ...this.currentUser, ...userData };
            
            // Actualizar en storage
            const storage = localStorage.getItem('carioca_user') ? localStorage : sessionStorage;
            storage.setItem('carioca_user', JSON.stringify(this.currentUser));
        }
    }

    /**
     * Verificar si se requiere autenticación para una página
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    /**
     * Redirigir si ya está autenticado
     */
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = 'lobby.html';
            return true;
        }
        return false;
    }

    /**
     * Obtener token de autenticación (si existe)
     */
    getAuthToken() {
        return this.currentUser?.token || null;
    }

    /**
     * Validar email
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validar contraseña
     */
    validatePassword(password) {
        return password && password.length >= 6;
    }

    /**
     * Generar nombre de usuario único para invitados
     */
    generateGuestName() {
        const adjectives = ['Rápido', 'Astuto', 'Valiente', 'Sabio', 'Genial', 'Épico'];
        const nouns = ['Jugador', 'As', 'Campeón', 'Maestro', 'Estratega', 'Leyenda'];
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 999) + 1;
        
        return `${adj}${noun}${num}`;
    }
}

// Instancia global del gestor de autenticación
window.authManager = new AuthManager();

// Funciones globales para compatibilidad
function getCurrentUser() {
    return window.authManager.getCurrentUser();
}

function isAuthenticated() {
    return window.authManager.isAuthenticated();
}

function requireAuth() {
    return window.authManager.requireAuth();
}

function logout() {
    window.authManager.logout();
    window.location.href = 'index.html';
}

// Auto-ejecutar verificaciones en carga de página
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Páginas que requieren autenticación
    const protectedPages = ['lobby.html', 'game.html', 'perfil.html'];
    
    // Páginas de auth que redirigen si ya está autenticado
    const authPages = ['login.html', 'register.html'];
    
    if (protectedPages.includes(currentPage)) {
        window.authManager.requireAuth();
    } else if (authPages.includes(currentPage)) {
        window.authManager.redirectIfAuthenticated();
    }
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
