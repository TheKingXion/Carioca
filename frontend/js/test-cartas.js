/**
 * Sistema de Test de Cartas para Carioca Online
 * Permite probar y visualizar todas las cartas del juego
 */

class CardTester {
    constructor() {
        this.allCards = [];
        this.visibleCards = [];
        this.foundPngCards = [];
        this.missingCards = [];
        this.currentFilter = 'all';
        this.currentSize = 'normal';
        this.currentMode = 'png';
        
        this.init();
    }

    init() {
        this.generateAllCards();
        this.bindEvents();
        this.loadCards();
        this.updateStats();
        this.logMessage('Sistema de test iniciado correctamente', 'success');
    }

    /**
     * Generar todas las cartas del juego (112 cartas total)
     */
    generateAllCards() {
        const suits = ['corazones', 'diamantes', 'treboles', 'espadas'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        // Generar 2 mazos completos (104 cartas)
        for (let deck = 1; deck <= 2; deck++) {
            for (const suit of suits) {
                for (const value of values) {
                    this.allCards.push({
                        id: `${value}_${suit}_${deck}`,
                        value: value,
                        suit: suit,
                        deck: deck,
                        type: 'normal',
                        filename: `${value}_${suit}.png`
                    });
                }
            }
        }

        // Agregar 8 comodines (4 por mazo)
        for (let deck = 1; deck <= 2; deck++) {
            for (let joker = 1; joker <= 4; joker++) {
                this.allCards.push({
                    id: `joker_${deck}_${joker}`,
                    value: 'Comodín',
                    suit: 'joker',
                    deck: deck,
                    type: 'joker',
                    filename: joker <= 2 ? `joker_red.png` : `joker_black.png`
                });
            }
        }

        this.visibleCards = [...this.allCards];
        this.logMessage(`Generadas ${this.allCards.length} cartas total`, 'info');
    }

    /**
     * Vincular eventos de la interfaz
     */
    bindEvents() {
        // Control de tamaño
        document.getElementById('cardSize').addEventListener('change', (e) => {
            this.currentSize = e.target.value;
            this.updateCardSize();
        });

        // Filtro de palos
        document.getElementById('filterSuit').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.filterCards();
        });

        // Modo de visualización
        document.getElementById('displayMode').addEventListener('change', (e) => {
            this.currentMode = e.target.value;
            this.loadCards();
        });

        // Botones de acción
        document.getElementById('shuffleBtn').addEventListener('click', () => {
            this.shuffleCards();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetView();
        });

        document.getElementById('testDealBtn').addEventListener('click', () => {
            this.dealTestHand();
        });

        document.getElementById('clearLogBtn').addEventListener('click', () => {
            this.clearLog();
        });
    }

    /**
     * Cargar y mostrar las cartas
     */
    async loadCards() {
        const container = document.getElementById('cardsContainer');
        container.innerHTML = '';
        
        this.foundPngCards = [];
        this.missingCards = [];

        container.classList.add('loading');

        for (const card of this.visibleCards) {
            const cardElement = await this.createCardElement(card);
            container.appendChild(cardElement);
        }

        container.classList.remove('loading');
        this.updateStats();
        this.updateMissingCards();
        
        this.logMessage(`Cargadas ${this.visibleCards.length} cartas en modo ${this.currentMode}`, 'info');
    }

    /**
     * Crear elemento de carta
     */
    async createCardElement(cardData) {
        const cardItem = document.createElement('div');
        cardItem.className = 'card-test-item';
        cardItem.dataset.suit = cardData.suit;
        cardItem.dataset.value = cardData.value;

        if (this.currentMode === 'png' || this.currentMode === 'both') {
            const pngCard = await this.createPngCard(cardData);
            cardItem.appendChild(pngCard);
        }

        if (this.currentMode === 'css' || this.currentMode === 'both') {
            const cssCard = this.createCssCard(cardData);
            if (this.currentMode === 'both') {
                const label = document.createElement('div');
                label.className = 'comparison-label';
                label.textContent = 'CSS';
                cardItem.appendChild(label);
            }
            cardItem.appendChild(cssCard);
        }

        // Información de la carta
        const cardInfo = document.createElement('div');
        cardInfo.className = 'card-info';
        cardInfo.innerHTML = `
            <div>${cardData.value} ${this.getSuitSymbol(cardData.suit)}</div>
            <div>Mazo ${cardData.deck}</div>
            <div>${cardData.filename}</div>
        `;
        cardItem.appendChild(cardInfo);

        return cardItem;
    }

    /**
     * Crear carta PNG con respaldo completo
     */
    async createPngCard(cardData) {
        return new Promise((resolve) => {
            const cardElement = document.createElement('div');
            cardElement.className = `card-element ${this.currentSize}`;

            const img = document.createElement('img');
            img.className = 'card-png';
            img.src = `assets/cartas/${cardData.filename}`;
            
            img.onload = () => {
                // PNG encontrado - mostrar imagen
                cardElement.classList.add('found');
                cardElement.innerHTML = '';
                
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.style.borderRadius = '8px';
                cardElement.appendChild(img);
                
                // Indicador de estado
                const indicator = document.createElement('div');
                indicator.className = 'status-indicator found';
                indicator.textContent = '✓ PNG';
                cardElement.appendChild(indicator);
                
                this.foundPngCards.push(cardData);
                resolve(cardElement);
            };
            
            img.onerror = () => {
                // PNG no encontrado - usar respaldo con información completa
                cardElement.classList.add('missing');
                cardElement.innerHTML = '';
                
                if (cardData.type === 'joker') {
                    // Respaldo para comodín
                    cardElement.innerHTML = `
                        <div class="card-content fallback-card">
                            <div class="fallback-header">
                                <span class="card-value">COMODÍN</span>
                            </div>
                            <div class="card-center">
                                <div class="suit-symbol">🃏</div>
                            </div>
                            <div class="fallback-info">
                                <div><strong>Archivo:</strong> ${cardData.filename}</div>
                                <div><strong>Tipo:</strong> Comodín</div>
                                <div><strong>Mazo:</strong> ${cardData.deck}</div>
                                <div><strong>Color respaldo:</strong> ${cardData.filename.includes('red') ? 'Rojo' : 'Negro'}</div>
                            </div>
                        </div>
                    `;
                    cardElement.style.background = 'linear-gradient(135deg, #9b59b6, #8e44ad)';
                    cardElement.style.color = 'white';
                } else {
                    // Respaldo para carta normal con toda la información
                    const suitColor = (cardData.suit === 'corazones' || cardData.suit === 'diamantes') ? '#e74c3c' : '#2c3e50';
                    const suitSymbol = this.getSuitSymbol(cardData.suit);
                    const suitName = this.getSuitName(cardData.suit);
                    
                    cardElement.innerHTML = `
                        <div class="card-content fallback-card">
                            <div class="fallback-header">
                                <span class="card-value" style="color: ${suitColor};">${cardData.value}</span>
                                <span class="card-suit" style="color: ${suitColor};">${suitSymbol}</span>
                            </div>
                            <div class="card-center">
                                <div class="suit-symbol" style="color: ${suitColor}; font-size: 2em;">${suitSymbol}</div>
                            </div>
                            <div class="fallback-info">
                                <div><strong>Valor:</strong> ${cardData.value}</div>
                                <div><strong>Palo:</strong> ${suitName}</div>
                                <div><strong>Color:</strong> ${suitColor === '#e74c3c' ? 'Rojo' : 'Negro'}</div>
                                <div><strong>Archivo:</strong> ${cardData.filename}</div>
                                <div><strong>Mazo:</strong> ${cardData.deck}</div>
                            </div>
                        </div>
                    `;
                    cardElement.style.background = 'white';
                    cardElement.style.border = `2px solid ${suitColor}`;
                    cardElement.style.color = suitColor;
                }

                // Indicador de estado
                const indicator = document.createElement('div');
                indicator.className = 'status-indicator missing';
                indicator.textContent = '⚠ Sin PNG';
                cardElement.appendChild(indicator);
                
                this.missingCards.push(cardData);
                resolve(cardElement);
            };
        });
    }

    /**
     * Obtener nombre del palo en español
     */
    getSuitName(suit) {
        const names = {
            corazones: 'Corazones',
            diamantes: 'Diamantes',
            treboles: 'Tréboles',
            espadas: 'Espadas',
            joker: 'Comodín'
        };
        return names[suit] || suit;
    }

    /**
     * Crear carta CSS
     */
    createCssCard(cardData) {
        const cardElement = document.createElement('div');
        cardElement.className = `card-element ${this.currentSize}`;
        
        if (cardData.type === 'joker') {
            cardElement.innerHTML = `
                <div class="card-content">
                    <div style="font-size: 2em; text-align: center; margin-top: 20px;">🃏</div>
                    <div style="text-align: center; font-weight: bold; margin-top: 10px;">COMODÍN</div>
                </div>
            `;
            cardElement.style.background = 'linear-gradient(135deg, #9b59b6, #8e44ad)';
            cardElement.style.color = 'white';
        } else {
            const suitColor = (cardData.suit === 'corazones' || cardData.suit === 'diamantes') ? '#e74c3c' : '#2c3e50';
            const suitSymbol = this.getSuitSymbol(cardData.suit);
            
            cardElement.innerHTML = `
                <div class="card-content" style="padding: 5px; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                    <div style="font-size: 0.8em; font-weight: bold; color: ${suitColor};">${cardData.value}</div>
                    <div style="font-size: 1.5em; text-align: center; color: ${suitColor};">${suitSymbol}</div>
                    <div style="font-size: 0.8em; font-weight: bold; transform: rotate(180deg); align-self: flex-end; color: ${suitColor};">${cardData.value}</div>
                </div>
            `;
        }
        
        return cardElement;
    }

    /**
     * Obtener símbolo del palo
     */
    getSuitSymbol(suit) {
        const symbols = {
            corazones: '♥',
            diamantes: '♦',
            treboles: '♣',
            espadas: '♠',
            joker: '🃏'
        };
        return symbols[suit] || '?';
    }

    /**
     * Actualizar tamaño de cartas
     */
    updateCardSize() {
        const cards = document.querySelectorAll('.card-element');
        cards.forEach(card => {
            card.className = card.className.replace(/\b(small|normal|large)\b/g, '');
            card.classList.add(this.currentSize);
        });
        this.logMessage(`Tamaño de cartas cambiado a: ${this.currentSize}`, 'info');
    }

    /**
     * Filtrar cartas por palo
     */
    filterCards() {
        const container = document.getElementById('cardsContainer');
        container.classList.add('filtering');

        if (this.currentFilter === 'all') {
            this.visibleCards = [...this.allCards];
        } else if (this.currentFilter === 'comodines') {
            this.visibleCards = this.allCards.filter(card => card.type === 'joker');
        } else {
            this.visibleCards = this.allCards.filter(card => card.suit === this.currentFilter);
        }

        setTimeout(() => {
            this.loadCards();
            container.classList.remove('filtering');
        }, 300);

        this.logMessage(`Filtro aplicado: ${this.currentFilter} (${this.visibleCards.length} cartas)`, 'info');
    }

    /**
     * Mezclar cartas
     */
    shuffleCards() {
        const container = document.getElementById('cardsContainer');
        container.classList.add('shuffling');

        // Algoritmo Fisher-Yates para mezclar
        for (let i = this.visibleCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.visibleCards[i], this.visibleCards[j]] = [this.visibleCards[j], this.visibleCards[i]];
        }

        setTimeout(() => {
            this.loadCards();
            container.classList.remove('shuffling');
        }, 500);

        this.logMessage('Cartas mezcladas aleatoriamente', 'info');
    }

    /**
     * Resetear vista
     */
    resetView() {
        this.currentFilter = 'all';
        this.currentSize = 'normal';
        this.currentMode = 'png';
        
        document.getElementById('filterSuit').value = 'all';
        document.getElementById('cardSize').value = 'normal';
        document.getElementById('displayMode').value = 'png';
        
        this.filterCards();
        this.logMessage('Vista reseteada a valores por defecto', 'info');
    }

    /**
     * Repartir mano de prueba
     */
    dealTestHand() {
        const handContainer = document.getElementById('testHand');
        handContainer.innerHTML = '';
        handContainer.classList.add('populated');

        // Mezclar todas las cartas y tomar 11
        const shuffledCards = [...this.allCards].sort(() => Math.random() - 0.5);
        const hand = shuffledCards.slice(0, 11);

        hand.forEach((cardData, index) => {
            setTimeout(async () => {
                const cardElement = await this.createCardElement(cardData);
                cardElement.classList.add('dealing');
                cardElement.style.animationDelay = `${index * 0.1}s`;
                handContainer.appendChild(cardElement);
            }, index * 100);
        });

        this.logMessage('Mano de prueba repartida (11 cartas)', 'success');
    }

    /**
     * Actualizar estadísticas
     */
    updateStats() {
        document.getElementById('totalCards').textContent = this.allCards.length;
        document.getElementById('visibleCards').textContent = this.visibleCards.length;
        document.getElementById('foundPngCards').textContent = this.foundPngCards.length;
        document.getElementById('missingCards').textContent = this.missingCards.length;
    }

    /**
     * Actualizar cartas faltantes
     */
    updateMissingCards() {
        const container = document.getElementById('missingCardsContainer');
        container.innerHTML = '';

        if (this.missingCards.length === 0) {
            return; // El CSS se encarga del mensaje de éxito
        }

        this.missingCards.forEach(cardData => {
            const missingItem = document.createElement('div');
            missingItem.className = 'missing-card-item';
            missingItem.innerHTML = `
                <div><strong>${cardData.value} ${this.getSuitSymbol(cardData.suit)}</strong></div>
                <div>Mazo ${cardData.deck}</div>
                <div>${cardData.filename}</div>
            `;
            container.appendChild(missingItem);
        });
    }

    /**
     * Agregar mensaje al log
     */
    logMessage(message, type = 'info') {
        const logContainer = document.getElementById('testLog');
        const timestamp = new Date().toLocaleTimeString();
        
        const logEntry = document.createElement('p');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    /**
     * Limpiar log
     */
    clearLog() {
        const logContainer = document.getElementById('testLog');
        logContainer.innerHTML = '<p class="log-entry">Log limpiado...</p>';
        this.logMessage('Sistema de test reiniciado', 'info');
    }
}

// Inicializar el tester cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.cardTester = new CardTester();
});

// Funciones globales para compatibilidad
function shuffleCards() {
    window.cardTester.shuffleCards();
}

function resetView() {
    window.cardTester.resetView();
}

function dealTestHand() {
    window.cardTester.dealTestHand();
}
