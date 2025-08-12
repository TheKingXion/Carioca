/**
 * Juego Carioca vs Bots
 * Sistema de partida offline contra IA
 */

class CariocaBotGame {
    constructor() {
        this.difficulty = this.getDifficultyFromURL();
        this.gameState = {
            currentPlayer: 0, // 0 = jugador, 1-3 = bots
            currentContract: 1,
            deck: [],
            discardPile: [],
            players: [
                { name: 'Tú', hand: [], isBot: false, completedContract: false, score: 0 },
                // Orden para coincidir con HTML: bot1 (top) = Roberto, bot2 (left) = Viejo Amanerao, bot3 (right) = Papá
                { name: 'Roberto', hand: [], isBot: true, completedContract: false, score: 0 },
                { name: 'Viejo Amanerao', hand: [], isBot: true, completedContract: false, score: 0 },
                { name: 'Papá', hand: [], isBot: true, completedContract: false, score: 0 }
            ],
            selectedCards: [],
            playedCombinations: [], // { ownerIndex, type: 'trio'|'escalera'|'especial', cards: [] }
            turnActions: { drew: false, discarded: false },
            gamePhase: 'dealing' // dealing, playing, finished
        };
        
        this.contracts = [
            { id: 1, name: '2 tríos', requirement: { trios: 2, escaleras: 0 } },
            { id: 2, name: '1 trío + 1 escalera', requirement: { trios: 1, escaleras: 1 } },
            { id: 3, name: '2 escaleras', requirement: { trios: 0, escaleras: 2 } },
            { id: 4, name: '3 tríos', requirement: { trios: 3, escaleras: 0 } },
            { id: 5, name: '2 tríos + 1 escalera', requirement: { trios: 2, escaleras: 1 } },
            { id: 6, name: '1 trío + 2 escaleras', requirement: { trios: 1, escaleras: 2 } },
            { id: 7, name: '3 escaleras', requirement: { trios: 0, escaleras: 3 } },
            // Contratos finales especiales (13 cartas)
            { id: 8, name: 'Escala Real', requirement: { especial: 'escala_real' } },
            { id: 9, name: 'Escala Falsa', requirement: { especial: 'escala_falsa' } }
        ];

        this.init();
    }

    init() {
        this.setupUI();
        this.bindEvents();
        this.startNewGame();
    }

    getDifficultyFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('difficulty') || 'normal';
    }

    setupUI() {
        // Configurar badge de dificultad
        const difficultyBadge = document.getElementById('difficultyLevel');
        const difficultyNames = {
            facil: 'Fácil 😊',
            normal: 'Normal 🙂',
            dificil: 'Difícil 😤'
        };
        difficultyBadge.textContent = difficultyNames[this.difficulty] || 'Normal 🙂';

        // Configurar información del contrato
        this.updateContractInfo();
    }

    bindEvents() {
        // Controles del juego
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('exitBtn').addEventListener('click', () => this.showExitModal());

        // Acciones del jugador
        document.getElementById('sortHandBtn').addEventListener('click', () => this.sortPlayerHand());
    document.getElementById('makePlayBtn').addEventListener('click', () => this.makePlay()); // jugar = extender o nuevas combos después de bajarse
    document.getElementById('layDownBtn').addEventListener('click', () => this.makePlay()); // bajar primera vez o adicionales
    document.getElementById('extendBtn').addEventListener('click', () => this.extendSelectedToCombination());
        document.getElementById('discardBtn').addEventListener('click', () => this.discardCard());
    // Ya no hay botón de terminar turno: se termina solo al descartar

        // Eventos del mazo
        document.getElementById('deckPile').addEventListener('click', () => this.drawFromDeck());
        document.getElementById('discardPile').addEventListener('click', () => this.drawFromDiscard());

        // Modales
        document.getElementById('resumeBtn').addEventListener('click', () => this.resumeGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('quitBtn').addEventListener('click', () => this.quitToMenu());
        document.getElementById('confirmExitBtn').addEventListener('click', () => this.quitToMenu());
        document.getElementById('cancelExitBtn').addEventListener('click', () => this.hideExitModal());

        // Cerrar modales con click fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                if (e.target.id === 'pauseModal') this.resumeGame();
                if (e.target.id === 'exitModal') this.hideExitModal();
            }
        });
    }

    startNewGame() {
        this.log('Iniciando nueva partida contra bots...');
        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.createInitialDiscard();
        this.updateUI();
    this.resetTurnFlags();
        this.gameState.gamePhase = 'playing';
        this.log(`Partida iniciada en dificultad ${this.difficulty}`);
        // Asegurar etiquetas de nombres en DOM segun orden actual
        const mapping = [null,'#bot1','#bot2','#bot3'];
        for(let i=1;i<=3;i++){
            const el = document.querySelector(`${mapping[i]} .player-name`);
            if(el) el.textContent = this.gameState.players[i].name;
        }
    }

    createDeck() {
        this.gameState.deck = [];
        const suits = ['corazones', 'diamantes', 'treboles', 'espadas'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        // Crear 2 mazos completos (104 cartas)
        for (let deck = 1; deck <= 2; deck++) {
            for (const suit of suits) {
                for (const value of values) {
                    this.gameState.deck.push({
                        id: `${value}_${suit}_${deck}`,
                        value: value,
                        suit: suit,
                        deck: deck,
                        type: 'normal'
                    });
                }
            }
        }

        // Agregar 8 comodines (4 por mazo)
        for (let deck = 1; deck <= 2; deck++) {
            for (let joker = 1; joker <= 4; joker++) {
                this.gameState.deck.push({
                    id: `joker_${deck}_${joker}`,
                    value: 'Comodín',
                    suit: 'joker',
                    deck: deck,
                    type: 'joker'
                });
            }
        }

        this.log(`Mazo creado con ${this.gameState.deck.length} cartas`);
    }

    shuffleDeck() {
        // Algoritmo Fisher-Yates
        for (let i = this.gameState.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.gameState.deck[i], this.gameState.deck[j]] = [this.gameState.deck[j], this.gameState.deck[i]];
        }
        this.log('Mazo mezclado');
    }

    getInitialHandSize() {
        // Regla: todos los contratos inician con 12 cartas excepto los contratos finales especiales (escala real / falsa) que usarán 13.
        // Actualmente tenemos 7 contratos básicos; si se añaden contratos 8+ considerados finales, usarán 13.
        return this.gameState.currentContract >= 8 ? 13 : 12;
    }

    dealCards() {
        // Limpiar manos previas (en caso de reinicio o nuevo contrato)
        this.gameState.players.forEach(p => p.hand = []);
        const handSize = this.getInitialHandSize();
        for (let round = 0; round < handSize; round++) {
            for (let player = 0; player < 4; player++) {
                if (this.gameState.deck.length > 0) {
                    const card = this.gameState.deck.pop();
                    this.gameState.players[player].hand.push(card);
                }
            }
        }
        this.log(`Cartas repartidas: ${handSize} cartas por jugador`);
    }

    createInitialDiscard() {
        if (this.gameState.deck.length > 0) {
            const firstCard = this.gameState.deck.pop();
            this.gameState.discardPile = [firstCard];
            this.log('Primera carta de descarte colocada');
        }
    }

    updateUI() {
        this.updatePlayerHand();
        this.updateBotHands();
        this.updateDeckInfo();
        this.updateGameStatus();
        this.updateDiscardPile();
    this.updateScoreBoard();
    }

    updatePlayerHand() {
        const handContainer = document.getElementById('playerHand');
        handContainer.innerHTML = '';

        this.gameState.players[0].hand.forEach((card, index) => {
            const cardElement = this.createCardElement(card, false);
            cardElement.dataset.cardIndex = index;
            cardElement.addEventListener('click', () => this.selectCard(index));
            handContainer.appendChild(cardElement);
        });
    }

    updateBotHands() {
        // Bot 1 (arriba)
        const bot1Hand = document.querySelector('#bot1 .bot-hand');
        const bot1Count = this.gameState.players[1].hand.length;
        this.renderBotHand(bot1Hand, bot1Count, 'horizontal');
        
        // Bot 2 (izquierda)
        const bot2Hand = document.querySelector('#bot2 .bot-hand');
        const bot2Count = this.gameState.players[2].hand.length;
        this.renderBotHand(bot2Hand, bot2Count, 'vertical-left');
        
        // Bot 3 (derecha)
        const bot3Hand = document.querySelector('#bot3 .bot-hand');
        const bot3Count = this.gameState.players[3].hand.length;
        this.renderBotHand(bot3Hand, bot3Count, 'vertical-right');

        // Actualizar contadores de cartas
        document.querySelector('#bot1 .player-cards-count').textContent = `${bot1Count} cartas`;
        document.querySelector('#bot2 .player-cards-count').textContent = `${bot2Count} cartas`;
        document.querySelector('#bot3 .player-cards-count').textContent = `${bot3Count} cartas`;
    }

    renderBotHand(handContainer, cardCount, orientation) {
        handContainer.innerHTML = '';
        
        const maxVisibleCards = orientation === 'horizontal' ? 10 : 8;
        const cardsToShow = Math.min(cardCount, maxVisibleCards);
        const centerIndex = (cardsToShow - 1) / 2;
        
        for (let i = 0; i < cardsToShow; i++) {
            const cardBack = document.createElement('div');
            
            if (orientation === 'horizontal') {
                cardBack.className = 'card-element small';
                cardBack.style.setProperty('--card-index', i);
                cardBack.style.setProperty('--center-index', centerIndex);
            } else {
                cardBack.className = 'card-element mini';
            }
            
            cardBack.innerHTML = '<div class="card-back-content">🃠</div>';
            cardBack.style.background = 'linear-gradient(135deg, #34495e, #2c3e50)';
            cardBack.style.border = '2px solid #3498db';
            cardBack.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
            
            // Efecto de abanico para cartas horizontales
            if (orientation === 'horizontal') {
                cardBack.style.zIndex = cardsToShow - Math.abs(i - centerIndex);
            }
            
            handContainer.appendChild(cardBack);
        }

        // Indicador si hay más cartas
        if (cardCount > maxVisibleCards) {
            const moreIndicator = document.createElement('div');
            moreIndicator.className = 'more-cards-indicator';
            moreIndicator.textContent = `+${cardCount - maxVisibleCards}`;
            moreIndicator.style.cssText = `
                position: absolute;
                background: #e74c3c;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 0.7em;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                top: -5px;
                right: -5px;
                z-index: 100;
            `;
            handContainer.style.position = 'relative';
            handContainer.appendChild(moreIndicator);
        }
    }

    updateDeckInfo() {
        const deckCount = document.querySelector('.deck-count');
        deckCount.textContent = this.gameState.deck.length;
        
        const deckCardsCount = document.getElementById('deckCardsCount');
        deckCardsCount.textContent = this.gameState.deck.length;
    }

    updateGameStatus() {
        const currentPlayerElement = document.getElementById('currentPlayer');
        const playerName = this.gameState.players[this.gameState.currentPlayer].name;
        currentPlayerElement.textContent = this.gameState.currentPlayer === 0 ? 'Tu turno' : `Turno de ${playerName}`;

        const contractInfo = document.getElementById('contractInfo');
        const currentContractObj = this.contracts[this.gameState.currentContract - 1];
        if (currentContractObj) {
            contractInfo.textContent = currentContractObj.name + (this.gameState.currentContract >= 8 ? ' (13 cartas)' : '');
        }

        // Destacar jugador activo
        this.highlightActivePlayer();
    }

    highlightActivePlayer() {
        // Remover highlight anterior
        document.querySelectorAll('.bot-top, .bot-left, .bot-right, .player-area').forEach(element => {
            element.classList.remove('active-turn');
        });

        // Agregar highlight al jugador activo
        const currentPlayer = this.gameState.currentPlayer;
        
        if (currentPlayer === 0) {
            document.querySelector('.player-area').classList.add('active-turn');
        } else if (currentPlayer === 1) {
            document.querySelector('#bot1').classList.add('active-turn');
        } else if (currentPlayer === 2) {
            document.querySelector('#bot2').classList.add('active-turn');
        } else if (currentPlayer === 3) {
            document.querySelector('#bot3').classList.add('active-turn');
        }
    }

    updateDiscardPile() {
        const discardPile = document.getElementById('discardPile');
        
        if (this.gameState.discardPile.length > 0) {
            const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
            discardPile.innerHTML = '';
            const cardElement = this.createCardElement(topCard, false);
            cardElement.style.width = '100%';
            cardElement.style.height = '100%';
            discardPile.appendChild(cardElement);
        } else {
            discardPile.innerHTML = '<div class="empty-pile">Descarte</div>';
        }
    }

    updateContractInfo() {
        const contractElements = document.querySelectorAll('.contract-item');
        contractElements.forEach((element, index) => {
            element.classList.toggle('active', index === this.gameState.currentContract - 1);
        });
    }

    createCardElement(card, isBack = false) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-element normal';
        
        if (isBack) {
            cardElement.innerHTML = '<div class="card-back-content">🃠</div>';
            cardElement.style.background = 'linear-gradient(135deg, #34495e, #2c3e50)';
            cardElement.style.border = '2px solid #3498db';
        } else {
            if (card.type === 'joker') {
                cardElement.innerHTML = `
                    <div class="card-content">
                        <div style="font-size: 2em; text-align: center; margin-top: 20px;">🃏</div>
                        <div style="text-align: center; font-weight: bold; margin-top: 10px;">COMODÍN</div>
                    </div>
                `;
                cardElement.style.background = 'linear-gradient(135deg, #9b59b6, #8e44ad)';
                cardElement.style.color = 'white';
            } else {
                const suitColor = (card.suit === 'corazones' || card.suit === 'diamantes') ? '#e74c3c' : '#2c3e50';
                const suitSymbol = this.getSuitSymbol(card.suit);
                
                cardElement.innerHTML = `
                    <div class="card-content" style="padding: 5px; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                        <div style="font-size: 0.8em; font-weight: bold; color: ${suitColor};">${card.value}</div>
                        <div style="font-size: 1.5em; text-align: center; color: ${suitColor};">${suitSymbol}</div>
                        <div style="font-size: 0.8em; font-weight: bold; transform: rotate(180deg); align-self: flex-end; color: ${suitColor};">${card.value}</div>
                    </div>
                `;
                cardElement.style.background = 'white';
                cardElement.style.border = `2px solid ${suitColor}`;
            }
        }
        
        return cardElement;
    }

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

    selectCard(index) {
        if (this.gameState.currentPlayer !== 0) return; // Solo el jugador puede seleccionar

        const selectedIndex = this.gameState.selectedCards.indexOf(index);
        
        if (selectedIndex > -1) {
            // Deseleccionar carta
            this.gameState.selectedCards.splice(selectedIndex, 1);
        } else {
            // Seleccionar carta
            this.gameState.selectedCards.push(index);
        }

        this.updateCardSelection();
        this.updateActionButtons();
    }

    updateCardSelection() {
        const cardElements = document.querySelectorAll('#playerHand .card-element');
        cardElements.forEach((element, index) => {
            if (this.gameState.selectedCards.includes(index)) {
                element.style.transform = 'translateY(-10px)';
                element.style.border = '3px solid #f39c12';
            } else {
                element.style.transform = 'translateY(0)';
                element.style.border = '';
            }
        });
    }

    updateActionButtons() {
        const makePlayBtn = document.getElementById('makePlayBtn');
    const layDownBtn = document.getElementById('layDownBtn');
    const extendBtn = document.getElementById('extendBtn');
        const discardBtn = document.getElementById('discardBtn');

        const hasSelection = this.gameState.selectedCards.length > 0;
        const canDiscard = this.gameState.selectedCards.length === 1;

    // layDownBtn: siempre representa acción de bajar (primera vez) o extender/bajar nuevas
    layDownBtn.disabled = !hasSelection;
    makePlayBtn.disabled = !hasSelection; // mantener por compatibilidad visual si se decide usar distinto
        discardBtn.disabled = !canDiscard;
        // Botón Rellenar solo si ya se bajó el contrato y hay selección que pueda encajar
    if (!this.gameState.players[0].completedContract || !hasSelection || this.gameState.playedCombinations.length === 0) {
            extendBtn.disabled = true;
        } else {
            extendBtn.disabled = !this.selectionCanExtendSingleCombination();
        }
    }

    sortPlayerHand() {
        const hand = this.gameState.players[0].hand;
        
        hand.sort((a, b) => {
            // Primero por palo
            if (a.suit !== b.suit) {
                const suitOrder = ['corazones', 'diamantes', 'treboles', 'espadas', 'joker'];
                return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
            }
            
            // Luego por valor
            const valueOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'Comodín'];
            return valueOrder.indexOf(a.value) - valueOrder.indexOf(b.value);
        });

        this.gameState.selectedCards = []; // Limpiar selección
        this.updatePlayerHand();
        this.updateActionButtons();
        this.log('Mano ordenada');
    }

    drawFromDeck() {
    if (this.gameState.currentPlayer !== 0 || this.gameState.deck.length === 0) return;
    if (this.gameState.turnActions.drew) { this.log('Ya tomaste una carta este turno'); return; }

        const card = this.gameState.deck.pop();
        this.gameState.players[0].hand.push(card);
    this.gameState.turnActions.drew = true;
        
        this.updateUI();
        this.log('Carta tomada del mazo');
    }

    drawFromDiscard() {
    if (this.gameState.currentPlayer !== 0 || this.gameState.discardPile.length === 0) return;
    if (this.gameState.turnActions.drew) { this.log('Ya tomaste una carta este turno'); return; }

        const card = this.gameState.discardPile.pop();
        this.gameState.players[0].hand.push(card);
    this.gameState.turnActions.drew = true;
        
        this.updateUI();
        this.log('Carta tomada del descarte');
    }

    makePlay() {
        if (this.gameState.currentPlayer !== 0) return;
        if (this.gameState.selectedCards.length === 0) return;

        const selectedCards = this.gameState.selectedCards
            .map(i => this.gameState.players[0].hand[i])
            .sort((a,b) => this.handSortValue(a) - this.handSortValue(b));

        const contract = this.contracts[this.gameState.currentContract - 1];
        const requirements = contract.requirement;
        if (!this.gameState.players[0].completedContract) {
            // Primer bajada: debe cumplir exactamente el contrato (o superarlo) usando ONLY combinaciones completas
            const result = this.parseSelectedCombinations(selectedCards);
            if (!result.valid) {
                this.log(result.message || 'Selección no válida para bajarse');
                return;
            }
            if (!this.verifyContractFulfilled(requirements, result.counts)) {
                this.log('Las combinaciones no cumplen el contrato actual');
                return;
            }
            this.gameState.players[0].completedContract = true;
            this.log('Contrato cumplido. Te has bajado.');
            // Registrar combinaciones
            result.combinations.forEach(combo => {
                this.gameState.playedCombinations.push({
                    ownerIndex: 0,
                    type: combo.type,
                    cards: combo.cards
                });
            });

            // Eliminar cartas de la mano (usar índices originales)
            const indicesToRemove = [...this.gameState.selectedCards].sort((a,b)=>b-a);
            indicesToRemove.forEach(idx => this.gameState.players[0].hand.splice(idx,1));
            this.gameState.selectedCards = [];
            this.updateUI();
            this.renderPlayedCombinations();
            return;
        }

        // Ya bajado: se permite
        // 1) Extender combinaciones existentes con cartas válidas
        // 2) Formar nuevas combinaciones (mín 3) adicionales si la selección completa se puede agrupar
        const extensionAttempt = this.tryExtendExistingCombinations(selectedCards);
        if (extensionAttempt.success) {
            // Remover cartas usadas
            const indicesToRemove = [...this.gameState.selectedCards].sort((a,b)=>b-a);
            indicesToRemove.forEach(idx => this.gameState.players[0].hand.splice(idx,1));
            this.gameState.selectedCards = [];
            this.updateUI();
            this.renderPlayedCombinations();
            this.log(`Has extendido ${extensionAttempt.extended} combinación(es)`);
            return;
        }

        // Si no se pudo extender, intentar crear nuevas combinaciones completas de la selección
        const result = this.parseSelectedCombinations(selectedCards);
        if (!result.valid) {
            this.log('No se puede extender ni formar combinaciones nuevas con la selección');
            return;
        }
        // Registrar nuevas combinaciones adicionales
        result.combinations.forEach(combo => {
            this.gameState.playedCombinations.push({ ownerIndex: 0, type: combo.type, cards: combo.cards });
        });
        const indicesToRemove = [...this.gameState.selectedCards].sort((a,b)=>b-a);
        indicesToRemove.forEach(idx => this.gameState.players[0].hand.splice(idx,1));
        this.gameState.selectedCards = [];
        this.updateUI();
        this.renderPlayedCombinations();
        this.log(`Has bajado ${result.combinations.length} nueva(s) combinación(es)`);
    }

    handSortValue(card) {
        const valueOrder = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        if (card.type === 'joker') return 100;
        return valueOrder.indexOf(card.value);
    }

    parseSelectedCombinations(cards) {
        // Estrategia simple: intentar dividir la selección completa en grupos que sean trío o escalera
        // Para esta primera versión, si todas las cartas pueden agruparse en combos válidos -> success
        const remaining = [...cards];
        const combinations = [];

        const isJoker = c => c.type === 'joker';

        // Helpers
        const tryExtractTrio = () => {
            // Necesita al menos 3 cartas
            if (remaining.length < 3) return false;
            // Agrupar por valor (ignorando comodines)
            const groups = {};
            remaining.filter(c=>!isJoker(c)).forEach(c => {
                groups[c.value] = groups[c.value] || [];
                groups[c.value].push(c);
            });
            for (const value in groups) {
                const group = groups[value];
                const jokers = remaining.filter(isJoker);
                if (group.length + jokers.length >= 3) {
                    // Tomar hasta 3 cartas para el trío
                    const needed = 3 - group.length;
                    const used = [...group];
                    for (let i = 0; i < needed; i++) used.push(jokers[i]);
                    // Remover usadas de remaining
                    used.forEach(u => {
                        const idx = remaining.indexOf(u); if (idx>-1) remaining.splice(idx,1);
                    });
                    combinations.push({ type: 'trio', cards: used });
                    return true;
                }
            }
            return false;
        };

        const tryExtractEscalera = () => {
            if (remaining.length < 3) return false;
            // Agrupar por palo (sin comodines)
            const suitGroups = {};
            remaining.filter(c=>!isJoker(c)).forEach(c => {
                suitGroups[c.suit] = suitGroups[c.suit] || [];
                suitGroups[c.suit].push(c);
            });
            const valueOrder = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

            for (const suit in suitGroups) {
                const group = suitGroups[suit].sort((a,b)=>valueOrder.indexOf(a.value)-valueOrder.indexOf(b.value));
                // Intentar construir la secuencia más larga usando comodines
                for (let start = 0; start < group.length; start++) {
                    let seq = [group[start]];
                    let jokers = remaining.filter(isJoker);
                    for (let i = start+1; i < group.length; i++) {
                        const prev = seq[seq.length-1];
                        const expectedIndex = valueOrder.indexOf(prev.value)+1;
                        const cardIndex = valueOrder.indexOf(group[i].value);
                        if (cardIndex === expectedIndex) {
                            seq.push(group[i]);
                        } else if (cardIndex > expectedIndex && jokers.length>0) {
                            // Usar comodín para rellenar hueco
                            while (cardIndex > valueOrder.indexOf(seq[seq.length-1].value)+1 && jokers.length>0) {
                                seq.push(jokers.pop());
                            }
                            if (cardIndex === valueOrder.indexOf(seq[seq.length-1].value)+1) {
                                seq.push(group[i]);
                            } else break;
                        } else break;
                    }
                    if (seq.length >= 3) {
                        // Extraer estas cartas de remaining
                        seq.forEach(c=>{ const idx=remaining.indexOf(c); if(idx>-1) remaining.splice(idx,1); });
                        combinations.push({ type: 'escalera', cards: seq });
                        return true;
                    }
                }
            }
            return false;
        };

        // Bucle: intentar extraer combos hasta que no queden cartas o no se pueda
        let progress = true;
        while (remaining.length > 0 && progress) {
            progress = false;
            if (tryExtractTrio()) { progress = true; continue; }
            if (tryExtractEscalera()) { progress = true; continue; }
        }

        if (remaining.length === 0) {
            // Contar combos
            const counts = { trios:0, escaleras:0 };
            combinations.forEach(c => { if(c.type==='trio') counts.trios++; if(c.type==='escalera') counts.escaleras++; });
            return { valid: true, combinations, counts };
        }
        return { valid: false, message: 'No todas las cartas forman combinaciones válidas' };
    }

    verifyContractFulfilled(requirements, counts) {
        if (requirements.especial) {
            // TODO: validar escalas especiales más adelante
            return false; // por ahora no permitir bajar especiales sin lógica
        }
        return (counts.trios >= (requirements.trios||0)) && (counts.escaleras >= (requirements.escaleras||0));
    }

    renderPlayedCombinations() {
        const area = document.getElementById('playedCardsArea');
        if (!area) return;
        area.innerHTML = '';
        if (this.gameState.playedCombinations.length === 0) {
            area.innerHTML = '<div class="empty-played-cards"><p>Las combinaciones aparecerán aquí</p></div>';
            return;
        }
        this.gameState.playedCombinations.forEach((combo, idx) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'played-combo';
            wrapper.style.cssText = 'display:flex;gap:4px;align-items:center;margin:4px;padding:4px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;';
            const label = document.createElement('div');
            label.textContent = `${combo.type === 'trio' ? 'Trío' : combo.type === 'escalera' ? 'Escalera' : 'Especial'} (${this.gameState.players[combo.ownerIndex].name})`;
            label.style.cssText = 'font-size:0.7em;color:#ccc;margin-right:4px;';
            wrapper.appendChild(label);
            combo.cards.forEach(card => {
                const el = this.createCardElement(card, false);
                el.classList.add('mini-played');
                el.style.width = '35px';
                el.style.height = '55px';
                el.style.fontSize = '0.6em';
                wrapper.appendChild(el);
            });
            area.appendChild(wrapper);
        });
    }

    tryExtendExistingCombinations(cards) {
        // Intentar asignar cada carta a alguna combinación válida existente
        let extended = 0;
        const valueOrder = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        const cardAssignments = [];

        const canExtendTrio = (combo, card) => {
            if (combo.type !== 'trio') return false;
            if (card.type === 'joker') return true; // comodín siempre puede alargar
            // Valor base del trío (ignorar comodines)
            const base = combo.cards.find(c=>c.type!=='joker');
            if (!base) return false;
            return base.value === card.value; // mismo valor
        };

        const getRunBounds = (combo) => {
            // Retorna {suit, minIndex, maxIndex} ignorando comodines que pueden estar dentro
            const normals = combo.cards.filter(c=>c.type!=='joker');
            if (normals.length===0) return null;
            const suit = normals[0].suit;
            const indices = normals.map(c=>valueOrder.indexOf(c.value)).sort((a,b)=>a-b);
            return { suit, minIndex: indices[0], maxIndex: indices[indices.length-1] };
        };

        const canExtendEscalera = (combo, card) => {
            if (combo.type !== 'escalera') return false;
            if (card.type === 'joker') return true; // comodín alarga por cualquier extremo
            const bounds = getRunBounds(combo);
            if (!bounds) return false;
            if (card.suit !== bounds.suit) return false;
            const idx = valueOrder.indexOf(card.value);
            return idx === bounds.minIndex - 1 || idx === bounds.maxIndex + 1; // adjacente por algún extremo
        };

        cards.forEach(card => {
            // Probar primero extender escaleras (más restrictivo), luego tríos
            let placed = false;
            for (let i=0; i<this.gameState.playedCombinations.length && !placed; i++) {
                const combo = this.gameState.playedCombinations[i];
                if (canExtendEscalera(combo, card)) {
                    combo.cards.push(card); // añadir al final (no especificamos orden exacto, se puede ordenar luego)
                    placed = true; extended++;
                    cardAssignments.push({card, comboIndex:i});
                }
            }
            if (!placed) {
                for (let i=0; i<this.gameState.playedCombinations.length && !placed; i++) {
                    const combo = this.gameState.playedCombinations[i];
                    if (canExtendTrio(combo, card)) {
                        combo.cards.push(card);
                        placed = true; extended++;
                        cardAssignments.push({card, comboIndex:i});
                    }
                }
            }
        });

        const success = extended === cards.length && extended>0;
        if (!success) {
            // Revert any partial placements (simple approach: if not full success, remove newly added cards)
            if (extended>0) {
                cardAssignments.forEach(assign => {
                    const combo = this.gameState.playedCombinations[assign.comboIndex];
                    const idx = combo.cards.indexOf(assign.card);
                    if (idx>-1) combo.cards.splice(idx,1);
                });
            }
        }
        return { success, extended };
    }

    selectionCanExtendSingleCombination() {
        const selectedCards = this.gameState.selectedCards.map(i=>this.gameState.players[0].hand[i]);
        const valueOrder = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        const isJoker = c => c.type==='joker';
        const getRunBounds = combo => {
            const normals = combo.cards.filter(c=>c.type!=='joker');
            if(normals.length===0) return null;
            const suit = normals[0].suit;
            const idxs = normals.map(c=>valueOrder.indexOf(c.value)).sort((a,b)=>a-b);
            return { suit, min: idxs[0], max: idxs[idxs.length-1] };
        };
        let candidateIndex = -1;
        for (let i=0;i<this.gameState.playedCombinations.length;i++) {
            const combo = this.gameState.playedCombinations[i];
            let ok = true;
            if (combo.type==='trio') {
                const base = combo.cards.find(c=>c.type!=='joker');
                selectedCards.forEach(c=>{ if(!(isJoker(c) || (base && c.value===base.value))) ok=false; });
            } else if (combo.type==='escalera') {
                const bounds = getRunBounds(combo);
                if(!bounds) ok=false; else {
                    selectedCards.forEach(c=>{
                        if(!isJoker(c)) {
                            if(c.suit!==bounds.suit) { ok=false; return; }
                            const idx=valueOrder.indexOf(c.value);
                            if(!(idx===bounds.min-1 || idx===bounds.max+1)) ok=false;
                        }
                    });
                }
            }
            if (ok) {
                if (candidateIndex!==-1) return false; // más de una posible -> no permitir
                candidateIndex = i;
            }
        }
        return candidateIndex !== -1;
    }

    extendSelectedToCombination() {
        if (!this.gameState.players[0].completedContract) { this.log('Primero debes bajar el contrato'); return; }
        if (this.gameState.selectedCards.length===0) return;
        const selectedCards = this.gameState.selectedCards.map(i=>this.gameState.players[0].hand[i]);
        const valueOrder = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        const isJoker = c => c.type==='joker';
        const getRunBounds = combo => {
            const normals = combo.cards.filter(c=>c.type!=='joker');
            if(normals.length===0) return null;
            const suit = normals[0].suit;
            const idxs = normals.map(c=>valueOrder.indexOf(c.value)).sort((a,b)=>a-b);
            return { suit, min: idxs[0], max: idxs[idxs.length-1] };
        };
        let target = null;
        for (let combo of this.gameState.playedCombinations) {
            let ok=true;
            if (combo.type==='trio') {
                const base = combo.cards.find(c=>c.type!=='joker');
                selectedCards.forEach(c=>{ if(!(isJoker(c) || (base && c.value===base.value))) ok=false; });
            } else if (combo.type==='escalera') {
                const b = getRunBounds(combo); if(!b) { ok=false; } else {
                    selectedCards.forEach(c=>{ if(!isJoker(c)) { const idx=valueOrder.indexOf(c.value); if(c.suit!==b.suit || !(idx===b.min-1 || idx===b.max+1)) ok=false; } });
                }
            } else ok=false;
            if (ok) {
                if (target) { this.log('La selección encaja en múltiples combinaciones; usa selección más específica'); return; }
                target = combo;
            }
        }
        if (!target) { this.log('La selección no encaja en una sola combinación'); return; }
        // Aplicar extensión
        selectedCards.forEach(c=> target.cards.push(c));
        // Quitar de mano
        [...this.gameState.selectedCards].sort((a,b)=>b-a).forEach(idx=> this.gameState.players[0].hand.splice(idx,1));
        this.gameState.selectedCards = [];
        this.updateUI();
        this.renderPlayedCombinations();
        this.log('Combinación rellenada');
    }
    

    discardCard() {
        if (this.gameState.selectedCards.length !== 1) return;
    if (!this.gameState.turnActions.drew) { this.log('Debes tomar una carta antes de descartar'); return; }
    if (this.gameState.turnActions.discarded) { this.log('Ya descartaste este turno'); return; }

        const cardIndex = this.gameState.selectedCards[0];
        const card = this.gameState.players[0].hand.splice(cardIndex, 1)[0];
        this.gameState.discardPile.push(card);
        
        this.gameState.selectedCards = [];
        this.updateUI();
        this.log(`Carta descartada: ${card.value} ${this.getSuitSymbol(card.suit)}`);
    this.gameState.turnActions.discarded = true;
        // Si el jugador ya se bajó y se queda sin cartas tras descartar -> avanzar contrato
        if (this.gameState.players[0].completedContract && this.gameState.players[0].hand.length === 0) {
            this.advanceContract();
        } else {
            // Pasar turno normal
            this.nextTurn();
        }
    }

    advanceContract() {
        this.log('Has terminado tus cartas. Avanzando contrato.');
        // Calcular puntajes de la ronda (cartas restantes en mano de cada jugador suman puntos)
        const roundDetails = [];
        this.gameState.players.forEach((p, idx) => {
            const points = this.computeHandPoints(p.hand);
            p.score += points; // En muchas variantes los puntos sobrantes suman al total (penalización). Ajusta si al revés.
            roundDetails.push({ name: p.name, points, total: p.score });
        });
        this.showLastRoundScores(roundDetails);
        this.updateScoreBoard();
        this.gameState.currentContract++;
        if (this.gameState.currentContract > this.contracts.length) {
            this.log('Has completado todos los contratos. ¡Fin del juego!');
            this.gameState.gamePhase = 'finished';
            this.handleGameEnd();
            return;
        }
        // Reiniciar estado para nuevo contrato
        this.gameState.players.forEach(p => { p.hand = []; p.completedContract = false; });
        this.gameState.playedCombinations = [];
        this.gameState.discardPile = [];
        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.createInitialDiscard();
        this.updateContractInfo();
        this.updateUI();
        this.log(`Nuevo contrato: ${this.contracts[this.gameState.currentContract - 1].name}`);
    }

    nextTurn() {
        this.gameState.currentPlayer = (this.gameState.currentPlayer + 1) % 4;
    this.resetTurnFlags();
        this.updateGameStatus();
        
        if (this.gameState.currentPlayer !== 0) {
            // Turno de bot
            setTimeout(() => this.playBotTurn(), 1000 + Math.random() * 2000);
        }
    }

    playBotTurn() {
        const currentBot = this.gameState.players[this.gameState.currentPlayer];
        this.log(`Turno de ${currentBot.name}`);
        // Simular jugada del bot según dificultad básica
        setTimeout(() => {
            // 1. Robar una carta (preferir mazo para evitar dar info)
            if (this.gameState.deck.length > 0) {
                const card = this.gameState.deck.pop();
                currentBot.hand.push(card);
                this.log(`${currentBot.name} toma del mazo`);
            } else if (this.gameState.discardPile.length > 0) {
                const card = this.gameState.discardPile.pop();
                currentBot.hand.push(card);
                this.log(`${currentBot.name} toma del descarte`);
            }

            // 2. Intentar bajarse si no lo ha hecho
            if (!currentBot.completedContract) {
                this.botAttemptLaydown(this.gameState.currentPlayer);
            } else {
                // 3. Intentar extender combinaciones existentes con cartas sueltas
                this.botAttemptExtend(this.gameState.currentPlayer);
            }

            // 4. Elegir carta para descartar
            setTimeout(() => {
                if (currentBot.hand.length > 0) {
                    const discardIndex = this.chooseBotDiscardIndex(currentBot);
                    const discardedCard = currentBot.hand.splice(discardIndex, 1)[0];
                    this.gameState.discardPile.push(discardedCard);
                    this.log(`${currentBot.name} descarta (${discardedCard.value}${discardedCard.type==='joker'?'*':''})`);
                    // Si bot termina sin cartas y ya se bajó -> avanzar contrato
                    if (currentBot.completedContract && currentBot.hand.length === 0) {
                        this.advanceContract();
                        return; // advanceContract gestiona nuevo estado/turno
                    }
                }
                this.updateUI();
                this.nextTurn();
            }, 400 + Math.random() * 600);
        }, 400 + Math.random() * 800);
    }

    chooseBotDiscardIndex(bot) {
        // Estrategia simple: descartar cartas que no ayudan a formar combos (evitar comodines y cartas que extienden)
        const valueOrder = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        const isJoker = c => c.type==='joker';
        // Marcar potencial de cada carta
        const scores = bot.hand.map((card, idx) => {
            if (isJoker(card)) return { idx, score: 100 }; // nunca tirar comodín si hay otras opciones
            // Score base bajo para cartas centrales (más útiles en escaleras)
            const valueIdx = valueOrder.indexOf(card.value);
            let score = 10; // base
            if (valueIdx===0 || valueIdx===12) score -= 2; // A o K un poco menos versátiles
            // Penalizar si hay duplicados (potencial trío)
            if (bot.hand.some(c=>c!==card && c.value===card.value)) score += 20;
            return { idx, score };
        });
        // Elegir menor score (menos útil) pero evitar comodines salvo única carta
        scores.sort((a,b)=>a.score-b.score);
        return scores[0].idx;
    }

    botAttemptLaydown(botIndex) {
        const bot = this.gameState.players[botIndex];
        const contract = this.contracts[this.gameState.currentContract - 1];
        const req = contract.requirement;
        // Generar combinaciones candidatas simples (tríos primero, luego escaleras) hasta cumplir requerimientos
        const handCopy = [...bot.hand];
        const jokers = handCopy.filter(c=>c.type==='joker');
        const normals = handCopy.filter(c=>c.type!=='joker');
        const trios = [];
        const escaleras = [];

        // Buscar tríos
        const byValue = {};
        normals.forEach(c => { byValue[c.value] = byValue[c.value] || []; byValue[c.value].push(c); });
        for (const value in byValue) {
            const group = byValue[value];
            if (group.length + jokers.length >= 3) {
                const used = group.slice(0,3);
                if (used.length < 3) {
                    const need = 3 - used.length;
                    for (let i=0; i<need && jokers.length>0; i++) used.push(jokers.pop());
                }
                if (used.length===3) trios.push(used);
            }
        }

        // Buscar escaleras básicas por palo
        const valueOrder = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        const bySuit = {};
        normals.forEach(c => { bySuit[c.suit] = bySuit[c.suit] || []; bySuit[c.suit].push(c); });
        for (const suit in bySuit) {
            const suitCards = bySuit[suit].sort((a,b)=>valueOrder.indexOf(a.value)-valueOrder.indexOf(b.value));
            for (let i=0; i < suitCards.length; i++) {
                let seq = [suitCards[i]];
                let localJokers = [...jokers];
                for (let j=i+1; j < suitCards.length; j++) {
                    const prev = seq[seq.length-1];
                    const expectedIdx = valueOrder.indexOf(prev.value)+1;
                    const currentIdx = valueOrder.indexOf(suitCards[j].value);
                    if (currentIdx === expectedIdx) {
                        seq.push(suitCards[j]);
                    } else if (currentIdx > expectedIdx && localJokers.length>0) {
                        while (currentIdx > valueOrder.indexOf(seq[seq.length-1].value)+1 && localJokers.length>0) {
                            seq.push(localJokers.pop());
                        }
                        if (currentIdx === valueOrder.indexOf(seq[seq.length-1].value)+1) {
                            seq.push(suitCards[j]);
                        } else break;
                    } else break;
                }
                if (seq.length >= 3) escaleras.push(seq);
            }
        }

        let needTrios = req.trios || 0;
        let needEsc = req.escaleras || 0;
        if (req.especial) return; // aún no manejamos contratos especiales para bots

        const chosenCombos = [];
        for (const t of trios) { if (needTrios>0) { chosenCombos.push({type:'trio', cards:t}); needTrios--; } }
        for (const e of escaleras) { if (needEsc>0) { chosenCombos.push({type:'escalera', cards:e}); needEsc--; } }
        if (needTrios===0 && needEsc===0 && chosenCombos.length>0) {
            // Validar no reutilizar cartas duplicadas
            const usedSet = new Set();
            for (const combo of chosenCombos) {
                let overlap = combo.cards.some(c=>usedSet.has(c));
                if (overlap) { return; }
                combo.cards.forEach(c=>usedSet.add(c));
            }
            // Registrar combinaciones
            chosenCombos.forEach(combo => {
                this.gameState.playedCombinations.push({ ownerIndex: botIndex, type: combo.type, cards: combo.cards });
                // Remover cartas de la mano
                combo.cards.forEach(card => {
                    const idx = bot.hand.indexOf(card);
                    if (idx>-1) bot.hand.splice(idx,1);
                });
            });
            bot.completedContract = true;
            this.log(`${bot.name} se baja (${chosenCombos.map(c=>c.type).join(', ')})`);
            this.renderPlayedCombinations();
            this.updateBotHands();
        }
    }

    botAttemptExtend(botIndex) {
        const bot = this.gameState.players[botIndex];
        const valueOrder = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        const isJoker = c => c.type==='joker';
        const getRunBounds = combo => {
            const normals = combo.cards.filter(c=>c.type!=='joker');
            if (normals.length===0) return null;
            const suit = normals[0].suit;
            const idxs = normals.map(c=>valueOrder.indexOf(c.value)).sort((a,b)=>a-b);
            return { suit, min: idxs[0], max: idxs[idxs.length-1] };
        };
        let extendedAny = false;
        // Intentar una pasada para no vaciar toda la mano en un turno
        for (let i=0; i<bot.hand.length; i++) {
            const card = bot.hand[i];
            let placed = false;
            for (const combo of this.gameState.playedCombinations) {
                if (combo.ownerIndex !== botIndex && combo.ownerIndex !== 0) continue; // permitir extender propias y del jugador (regla opcional; ajustar si no)
                if (combo.type==='trio') {
                    const base = combo.cards.find(c=>c.type!=='joker');
                    if (isJoker(card) || (base && card.value===base.value)) {
                        combo.cards.push(card); bot.hand.splice(i,1); i--; placed=true; extendedAny=true; break;
                    }
                } else if (combo.type==='escalera') {
                    const b = getRunBounds(combo);
                    if (!b) continue;
                    if (isJoker(card)) { combo.cards.push(card); bot.hand.splice(i,1); i--; placed=true; extendedAny=true; break; }
                    const idxVal = valueOrder.indexOf(card.value);
                    if (card.suit===b.suit && (idxVal===b.min-1 || idxVal===b.max+1)) { combo.cards.push(card); bot.hand.splice(i,1); i--; placed=true; extendedAny=true; break; }
                }
            }
            if (placed) break; // solo una extensión por turno para moderar IA
        }
        if (extendedAny) {
            this.log(`${bot.name} extiende una combinación`);
            this.renderPlayedCombinations();
            this.updateBotHands();
        }
    }

    resetTurnFlags() {
        this.gameState.turnActions = { drew: false, discarded: false };
    }

    pauseGame() {
        document.getElementById('pauseModal').style.display = 'block';
    }

    resumeGame() {
        document.getElementById('pauseModal').style.display = 'none';
    }

    showExitModal() {
        document.getElementById('exitModal').style.display = 'block';
    }

    hideExitModal() {
        document.getElementById('exitModal').style.display = 'none';
    }

    restartGame() {
        this.resumeGame();
        this.startNewGame();
    }

    quitToMenu() {
        window.location.href = 'index.html';
    }

    log(message) {
        console.log(`[Carioca Bot Game] ${message}`);
    }

    computeHandPoints(hand) {
        // Sistema de puntos básico: Número = su valor, J=10, Q=10, K=10, A=15, Comodín=25
        const valueMap = { 'J':10, 'Q':10, 'K':10, 'A':15 };
        let total = 0;
        hand.forEach(c => {
            if (c.type==='joker') total += 25;
            else if (!isNaN(parseInt(c.value))) total += parseInt(c.value);
            else total += valueMap[c.value] || 0;
        });
        return total;
    }

    updateScoreBoard() {
        const board = document.getElementById('scoreBoard');
        if (!board) return;
        board.innerHTML = '';
        this.gameState.players.forEach(p => {
            const row = document.createElement('div');
            row.className = 'score-row';
            row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 6px;background:rgba(255,255,255,0.05);margin-bottom:4px;border-radius:6px;font-size:0.85em;';
            row.innerHTML = `<span>${p.name}</span><strong>${p.score}</strong>`;
            board.appendChild(row);
        });
    }

    showLastRoundScores(details) {
        const container = document.getElementById('lastRoundScores');
        if (!container) return;
        const lines = details.map(d => `${d.name}: +${d.points} (Total ${d.total})`);
        container.innerHTML = '<strong>Ronda:</strong><br>' + lines.join('<br>');
    }

    handleGameEnd() {
        // Reproducir audio de cada bot que termine con cartas (derrota simple)
        const audioMap = [
            { match: 'viejo', element: 'botLose_viejo' },
            { match: 'roberto', element: 'botLose_roberto' },
            { match: 'papá', element: 'botLose_papa' }
        ];
        this.gameState.players.forEach(p => {
            if (p.isBot && p.hand && p.hand.length > 0) {
                const entry = audioMap.find(a => p.name.toLowerCase().includes(a.match));
                if (entry) {
                    const audio = document.getElementById(entry.element);
                    if (audio) {
                        audio.currentTime = 0;
                        audio.play().catch(()=>{});
                        this.log(`Reproduciendo audio de derrota de ${p.name}`);
                    }
                }
            }
        });
    }
}

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.cariocaBotGame = new CariocaBotGame();

    // Toggle panel info
    const infoPanel = document.querySelector('.info-panel');
    const toggleBtn = document.getElementById('toggleInfoPanelBtn');
    const closeBtn = document.getElementById('closeInfoPanelBtn');
    const container = document.querySelector('.game-container');
    function hidePanel(){
        if(!infoPanel) return;
        infoPanel.classList.add('collapsed');
        container.classList.add('info-hidden');
    }
    function showPanel(){
        if(!infoPanel) return;
        infoPanel.classList.remove('collapsed');
        container.classList.remove('info-hidden');
    }
    if(toggleBtn){
        toggleBtn.addEventListener('click', () => {
            if(infoPanel.classList.contains('collapsed')) showPanel(); else hidePanel();
        });
    }
    if(closeBtn){
        closeBtn.addEventListener('click', hidePanel);
    }
    // Inicia oculto en pantallas grandes para más espacio (opcional)
    if(window.innerWidth >= 1350){
        hidePanel();
    }

    // Escalado eliminado para mantener tamaño legible; se ajustó CSS para caber sin scroll excesivo.
    function updateAdaptiveSizing(){
        const root = document.documentElement;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Basado principalmente en altura para mantener proporción vertical estable
        let baseH = Math.min(185, Math.max(110, vh / 6.4));
        let baseW = baseH / 1.5;
        // Ajuste suave por anchura (ultra wide crece un poco)
        if(vw > 1800) baseW *= 1.10;
        if(vw > 2200) baseW *= 1.05; // pequeñas ganancias
        if(vw < 1300) baseW *= 0.97;
        if(vw < 1100) baseW *= 0.94;
        baseH = baseW * 1.5;
        // Mínimos para legibilidad
        if(baseW < 64){ baseW = 64; baseH = baseW*1.5; }
        // Establecer variables
        root.style.setProperty('--card-w', baseW.toFixed(2)+'px');
        root.style.setProperty('--card-h', baseH.toFixed(2)+'px');
        root.style.setProperty('--card-w-max', Math.min(baseW*1.55, 140).toFixed(2)+'px');
        root.style.setProperty('--card-h-max', Math.min(baseH*1.55, 210).toFixed(2)+'px');
    }
    window.addEventListener('resize', updateAdaptiveSizing);
    updateAdaptiveSizing();
});
