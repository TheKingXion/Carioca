/**
 * Gestor principal del juego Carioca Online
 * Incluye Drag & Drop, animaciones y lógica completa
 */

class CariocaGameManager {
  constructor() {
    this.socket = null
    this.currentUser = null
    this.gameState = null
    this.playerHand = []
    this.selectedCards = []
    this.combinations = []
    this.draggedCard = null
    this.dropZones = []
    this.gamePhase = "waiting" // waiting, playing, finished
    this.currentTurn = null
    this.timeRemaining = 30
    this.timerInterval = null

    this.init()
  }

  async init() {
    try {
      await this.loadUser()
      await this.loadGameData()
      await cardManager.preloadCardImages()

      this.initializeSocket()
      this.setupEventListeners()
      this.setupDragAndDrop()
      this.initializeUI()

      console.log("🎮 Juego inicializado correctamente")
    } catch (error) {
      console.error("❌ Error inicializando juego:", error)
      this.showError("Error inicializando el juego")
    }
  }

  async loadUser() {
    const userData = localStorage.getItem("carioca_user") || sessionStorage.getItem("carioca_user")
    if (!userData) {
      window.location.href = "lobby.html"
      return
    }
    this.currentUser = JSON.parse(userData)
  }

  async loadGameData() {
    // Primero intentar obtener de URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    const partidaIdFromUrl = urlParams.get('partida')
    
    if (partidaIdFromUrl) {
      // Si viene de URL, crear gameState básico
      this.gameState = {
        partida_id: parseInt(partidaIdFromUrl),
        codigo_sala: partidaIdFromUrl.toString().padStart(6, '0')
      }
      
      // Guardar en localStorage para futuras referencias
      localStorage.setItem("current_game", JSON.stringify(this.gameState))
      
      console.log("🎮 Partida cargada desde URL:", this.gameState)
    } else {
      // Fallback: intentar obtener de localStorage
      const gameData = localStorage.getItem("current_game")
      if (!gameData) {
        console.error("❌ No se encontró información de la partida")
        window.location.href = "lobby.html"
        return
      }
      this.gameState = JSON.parse(gameData)
    }

    // Actualizar UI con datos del juego
    document.getElementById("salaCodigoDisplay").textContent = `Sala: ${this.gameState.codigo_sala || "------"}`
    
    console.log("🎮 Datos del juego cargados:", this.gameState)
  }

  initializeSocket() {
    this.socket = io("http://localhost:5000")

    this.socket.on("connect", () => {
      console.log("🔌 Conectado al servidor")
      this.socket.emit("unirse_partida", {
        partida_id: this.gameState.partida_id,
        user_id: this.currentUser.user_id,
      })
    })

    this.socket.on("estado_partida", (data) => {
      this.updateGameState(data)
    })

    this.socket.on("carta_robada", (data) => {
      this.handleCardDrawn(data)
    })

    this.socket.on("combinacion_bajada", (data) => {
      this.handleCombinationPlayed(data)
    })

    this.socket.on("carta_descartada", (data) => {
      this.handleCardDiscarded(data)
    })

    this.socket.on("turno_cambiado", (data) => {
      this.handleTurnChanged(data)
    })

    this.socket.on("carioca_logrado", (data) => {
      this.handleCariocaAchieved(data)
    })

    this.socket.on("error_juego", (data) => {
      this.showError(data.mensaje)
    })
  }

  setupEventListeners() {
    // Botones de acción
    document.getElementById("robarBtn").addEventListener("click", () => this.showDrawOptions())
    document.getElementById("bajarBtn").addEventListener("click", () => this.attemptPlayCombinations())
    document.getElementById("descartarBtn").addEventListener("click", () => this.activateDiscardMode())
    document.getElementById("cariocaBtn").addEventListener("click", () => this.declareCarioca())

    // Controles de mano
    document.querySelector('.hand-btn[onclick="ordenarCartas()"]').addEventListener("click", () => this.sortHand())
    document
      .querySelector('.hand-btn[onclick="mostrarAyudaCartas()"]')
      .addEventListener("click", () => this.showHandHelp())

    // Chat del juego
    document.getElementById("gameChatInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.sendGameMessage()
      }
    })

    // Mazo y descarte
    document.querySelector(".deck-pile").addEventListener("click", () => this.drawFromDeck())
    document.querySelector(".discard-pile").addEventListener("click", () => this.drawFromDiscard())

    // Prevenir selección de texto durante drag
    document.addEventListener("selectstart", (e) => {
      if (e.target.closest(".card-element")) {
        e.preventDefault()
      }
    })
  }

  setupDragAndDrop() {
    // Configurar drop zones
    this.setupDropZones()

    // Eventos globales de drag
    document.addEventListener("dragover", (e) => {
      e.preventDefault()
    })

    document.addEventListener("drop", (e) => {
      e.preventDefault()
      this.handleGlobalDrop(e)
    })
  }

  setupDropZones() {
    // Área de combinaciones del jugador
    const combinationsContainer = document.getElementById("combinationsContainer")
    this.setupDropZone(combinationsContainer, "combinations")

    // Pila de descarte
    const discardPile = document.querySelector(".discard-pile")
    this.setupDropZone(discardPile, "discard")

    // Crear zonas de drop dinámicas para nuevas combinaciones
    this.createDynamicDropZones()
  }

  setupDropZone(element, type) {
    element.addEventListener("dragover", (e) => {
      e.preventDefault()
      element.classList.add("drag-over")

      // Validar si el drop es válido
      if (this.validateDrop(this.draggedCard, type)) {
        element.classList.add("valid-drop")
      } else {
        element.classList.add("invalid-drop")
      }
    })

    element.addEventListener("dragleave", (e) => {
      if (!element.contains(e.relatedTarget)) {
        element.classList.remove("drag-over", "valid-drop", "invalid-drop")
      }
    })

    element.addEventListener("drop", (e) => {
      e.preventDefault()
      element.classList.remove("drag-over", "valid-drop", "invalid-drop")
      this.handleDrop(e, type)
    })
  }

  createDynamicDropZones() {
    const container = document.getElementById("combinationsContainer")

    // Crear zona para nuevo trío
    const trioZone = this.createDropZone("trio", "🎯 Nuevo Trío (3 cartas del mismo valor)")
    container.appendChild(trioZone)

    // Crear zona para nueva escala
    const escalaZone = this.createDropZone("escala", "📈 Nueva Escala (4+ cartas consecutivas)")
    container.appendChild(escalaZone)
  }

  createDropZone(type, label) {
    const zone = document.createElement("div")
    zone.className = `drop-zone ${type}-zone`
    zone.dataset.type = type
    zone.innerHTML = `
            <div class="drop-zone-content">
                <div class="drop-zone-icon">${type === "trio" ? "🎯" : "📈"}</div>
                <div class="drop-zone-label">${label}</div>
                <div class="drop-zone-cards" data-combination-type="${type}"></div>
            </div>
        `

    this.setupDropZone(zone, type)
    return zone
  }

  validateDrop(cardData, dropType) {
    if (!cardData) return false

    switch (dropType) {
      case "discard":
        return this.gamePhase === "discard"
      case "trio":
      case "escala":
        return this.gamePhase === "play" && this.isMyTurn()
      case "combinations":
        return this.gamePhase === "play" && this.isMyTurn()
      default:
        return false
    }
  }

  handleDrop(event, dropType) {
    const cardData = JSON.parse(event.dataTransfer.getData("text/plain"))

    switch (dropType) {
      case "discard":
        this.discardCard(cardData)
        break
      case "trio":
        this.addCardToCombination(cardData, "trio")
        break
      case "escala":
        this.addCardToCombination(cardData, "escala")
        break
      case "combinations":
        this.handleCombinationDrop(event, cardData)
        break
    }
  }

  handleGlobalDrop(event) {
    // Manejar drops fuera de zonas específicas
    const dropZone = event.target.closest(".drop-zone")
    if (!dropZone) {
      // Devolver carta a la mano
      this.returnCardToHand()
    }
  }

  addCardToCombination(cardData, combinationType) {
    const zone = document.querySelector(`.${combinationType}-zone .drop-zone-cards`)
    const existingCards = Array.from(zone.children)

    // Crear elemento de carta para la combinación
    const cardElement = cardManager.createCardElement(cardData, {
      size: "small",
      interactive: false,
    })

    cardElement.classList.add("combination-card")
    zone.appendChild(cardElement)

    // Remover carta de la mano
    this.removeCardFromHand(cardData.cardId)

    // Validar combinación
    this.validateCombinationZone(zone, combinationType)

    // Actualizar UI
    this.updateActionButtons()
    this.addCardAnimation(cardElement, "added-to-combination")
  }

  validateCombinationZone(zone, type) {
    const cards = this.getCardsFromZone(zone)
    const isValid = cardManager.validateCombination(cards, type)

    zone.parentElement.classList.toggle("valid", isValid)
    zone.parentElement.classList.toggle("invalid", !isValid)

    // Mostrar feedback visual
    if (isValid) {
      this.showFeedback("✅ Combinación válida", "success")
    } else {
      this.showFeedback("❌ Combinación inválida", "error")
    }
  }

  getCardsFromZone(zone) {
    return Array.from(zone.children).map((cardElement) => ({
      id: cardElement.dataset.cardId,
      palo: cardElement.dataset.suit,
      valor: Number.parseInt(cardElement.dataset.value),
      es_comodin: cardElement.dataset.isJoker === "true",
      baraja: cardElement.dataset.deck,
    }))
  }

  removeCardFromHand(cardId) {
    const cardElement = document.querySelector(`#playerHand [data-card-id="${cardId}"]`)
    if (cardElement) {
      this.addCardAnimation(cardElement, "removing-from-hand", () => {
        cardElement.remove()
        this.playerHand = this.playerHand.filter((card) => card.id !== cardId)
        this.updateHandDisplay()
      })
    }
  }

  returnCardToHand() {
    // Implementar lógica para devolver carta arrastrada a la mano
    if (this.draggedCard) {
      this.showFeedback("Carta devuelta a la mano", "info")
    }
  }

  // Funciones de animación
  addCardAnimation(element, animationType, callback) {
    element.classList.add(animationType)

    const animationDuration = {
      dealing: 500,
      collecting: 300,
      "added-to-combination": 400,
      "removing-from-hand": 300,
      "card-flip": 300,
    }

    setTimeout(() => {
      element.classList.remove(animationType)
      if (callback) callback()
    }, animationDuration[animationType] || 300)
  }

  dealCardAnimation(cardElement, delay = 0) {
    setTimeout(() => {
      cardElement.classList.add("dealing")
      this.addCardAnimation(cardElement, "dealing")
    }, delay)
  }

  // Funciones del juego
  updateGameState(data) {
    this.gameState = { ...this.gameState, ...data }
    this.updateUI()
  }

  updateUI() {
    this.updatePlayerHand()
    this.updateOpponents()
    this.updateGameInfo()
    this.updateActionButtons()
    this.updateTimer()
  }

  updatePlayerHand() {
    const handContainer = document.getElementById("playerHand")
    handContainer.innerHTML = ""

    this.playerHand.forEach((card, index) => {
      const cardElement = cardManager.createCardElement(card, {
        size: "normal",
        interactive: true,
      })

      // Configurar drag and drop
      this.setupCardDragAndDrop(cardElement, card)

      // Animación de reparto
      this.dealCardAnimation(cardElement, index * 100)

      handContainer.appendChild(cardElement)
    })
  }

  setupCardDragAndDrop(cardElement, cardData) {
    cardElement.addEventListener("dragstart", (e) => {
      this.draggedCard = cardData
      cardElement.classList.add("dragging")

      e.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          cardId: cardData.id,
          suit: cardData.palo,
          value: cardData.valor,
          deck: cardData.baraja,
          isJoker: cardData.es_comodin,
        }),
      )

      // Efectos visuales
      this.highlightDropZones(true)
    })

    cardElement.addEventListener("dragend", () => {
      cardElement.classList.remove("dragging")
      this.draggedCard = null
      this.highlightDropZones(false)
    })

    // Click para seleccionar
    cardElement.addEventListener("click", (e) => {
      e.stopPropagation()
      this.toggleCardSelection(cardElement, cardData)
    })
  }

  highlightDropZones(highlight) {
    const dropZones = document.querySelectorAll(".drop-zone")
    dropZones.forEach((zone) => {
      zone.classList.toggle("highlighted", highlight)
    })
  }

  toggleCardSelection(cardElement, cardData) {
    const isSelected = cardElement.classList.contains("selected")

    if (isSelected) {
      cardElement.classList.remove("selected")
      this.selectedCards = this.selectedCards.filter((card) => card.id !== cardData.id)
    } else {
      cardElement.classList.add("selected")
      this.selectedCards.push(cardData)
    }

    this.updateActionButtons()
  }

  // Acciones del juego
  showDrawOptions() {
    if (!this.isMyTurn()) {
      this.showError("No es tu turno")
      return
    }

    document.getElementById("robarModal").style.display = "flex"

    // Actualizar información de la carta del descarte
    const discardInfo = document.getElementById("cartaDescarteInfo")
    if (this.gameState.ultima_carta_descartada) {
      const card = this.gameState.ultima_carta_descartada
      discardInfo.textContent = `${cardManager.getDisplayValue(card.valor)} de ${card.palo}`
    }
  }

  async drawFromDeck() {
    this.cerrarModal("robarModal")
    await this.drawCard("mazo")
  }

  async drawFromDiscard() {
    this.cerrarModal("robarModal")
    await this.drawCard("descarte")
  }

  async drawCard(source) {
    if (!this.isMyTurn()) {
      this.showError("No es tu turno")
      return
    }

    try {
      this.socket.emit("robar_carta", {
        partida_id: this.gameState.partida_id,
        user_id: this.currentUser.user_id,
        origen: source,
      })

      this.gamePhase = "play"
      this.updateActionButtons()
    } catch (error) {
      this.showError("Error al robar carta")
    }
  }

  handleCardDrawn(data) {
    if (data.exito) {
      // Agregar carta a la mano con animación
      const newCard = data.carta
      this.playerHand.push(newCard)

      const cardElement = cardManager.createCardElement(newCard, {
        size: "normal",
        interactive: true,
      })

      this.setupCardDragAndDrop(cardElement, newCard)
      this.dealCardAnimation(cardElement)

      document.getElementById("playerHand").appendChild(cardElement)

      // Actualizar contador del mazo
      document.getElementById("mazoCount").textContent = data.cartas_restantes

      this.showFeedback("Carta robada", "success")
    }
  }

  attemptPlayCombinations() {
    const validCombinations = this.getValidCombinations()

    if (validCombinations.length === 0) {
      this.showError("No tienes combinaciones válidas para bajar")
      return
    }

    // Enviar combinaciones al servidor
    this.socket.emit("bajar_combinacion", {
      partida_id: this.gameState.partida_id,
      user_id: this.currentUser.user_id,
      combinaciones: validCombinations,
    })
  }

  getValidCombinations() {
    const combinations = []
    const zones = document.querySelectorAll(".drop-zone.valid")

    zones.forEach((zone) => {
      const cards = this.getCardsFromZone(zone.querySelector(".drop-zone-cards"))
      const type = zone.dataset.type

      if (cards.length > 0) {
        combinations.push({
          tipo: type,
          cartas: cards,
        })
      }
    })

    return combinations
  }

  activateDiscardMode() {
    if (this.selectedCards.length !== 1) {
      this.showError("Selecciona exactamente una carta para descartar")
      return
    }

    this.gamePhase = "discard"
    this.updateActionButtons()
    this.showFeedback("Arrastra la carta al descarte", "info")
  }

  discardCard(cardData) {
    this.socket.emit("descartar_carta", {
      partida_id: this.gameState.partida_id,
      user_id: this.currentUser.user_id,
      carta: cardData,
    })
  }

  handleCardDiscarded(data) {
    if (data.exito) {
      // Actualizar pila de descarte
      const discardPile = document.querySelector(".discard-pile .card")
      const newCard = cardManager.createCardElement(data.carta, {
        size: "normal",
        interactive: false,
      })

      discardPile.replaceWith(newCard)

      // Remover carta de la mano
      this.removeCardFromHand(data.carta.id)

      this.gamePhase = "waiting"
      this.updateActionButtons()

      if (data.carioca) {
        this.handleCariocaAchieved(data)
      }
    }
  }

  declareCarioca() {
    if (this.playerHand.length === 0) {
      this.socket.emit("declarar_carioca", {
        partida_id: this.gameState.partida_id,
        user_id: this.currentUser.user_id,
      })
    } else {
      this.showError("Debes quedarte sin cartas para declarar Carioca")
    }
  }

  handleCariocaAchieved(data) {
    this.showCariocaAnimation()
    this.showFeedback(`🏆 ¡${data.jugador} logró CARIOCA!`, "success")
  }

  showCariocaAnimation() {
    // Crear animación de celebración
    const celebration = document.createElement("div")
    celebration.className = "carioca-celebration"
    celebration.innerHTML = `
            <div class="celebration-content">
                <h2>🏆 ¡CARIOCA! 🏆</h2>
                <div class="confetti"></div>
            </div>
        `

    document.body.appendChild(celebration)

    setTimeout(() => {
      celebration.remove()
    }, 3000)
  }

  // Utilidades
  isMyTurn() {
    return this.currentTurn === this.currentUser.user_id
  }

  updateActionButtons() {
    const isMyTurn = this.isMyTurn()
    const hasCards = this.playerHand.length > 0
    const hasSelectedCards = this.selectedCards.length > 0
    const hasValidCombinations = this.getValidCombinations().length > 0

    document.getElementById("robarBtn").disabled = !isMyTurn || this.gamePhase !== "waiting"
    document.getElementById("bajarBtn").disabled = !isMyTurn || !hasValidCombinations
    document.getElementById("descartarBtn").disabled = !isMyTurn || this.gamePhase !== "play"
    document.getElementById("cariocaBtn").disabled = !isMyTurn || hasCards
  }

  updateTimer() {
    const timerElement = document.getElementById("tiempoRestante")
    timerElement.textContent = this.timeRemaining

    if (this.timeRemaining <= 10) {
      timerElement.parentElement.classList.add("warning")
    } else {
      timerElement.parentElement.classList.remove("warning")
    }
  }

  startTimer() {
    this.clearTimer()
    this.timerInterval = setInterval(() => {
      this.timeRemaining--
      this.updateTimer()

      if (this.timeRemaining <= 0) {
        this.handleTimeOut()
      }
    }, 1000)
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  handleTimeOut() {
    this.clearTimer()
    if (this.isMyTurn()) {
      this.showError("Se acabó el tiempo. Turno automático.")
      // Lógica de turno automático
    }
  }

  sortHand() {
    this.playerHand.sort((a, b) => {
      if (a.palo !== b.palo) {
        return a.palo.localeCompare(b.palo)
      }
      return a.valor - b.valor
    })

    this.updatePlayerHand()
    this.showFeedback("Cartas ordenadas", "info")
  }

  showHandHelp() {
    // Resaltar posibles combinaciones
    this.highlightPossibleCombinations()
  }

  highlightPossibleCombinations() {
    // Lógica para resaltar cartas que pueden formar combinaciones
    const possibleTrios = this.findPossibleTrios()
    const possibleEscalas = this.findPossibleEscalas()

    // Resaltar cartas
    possibleTrios.forEach((cards) => {
      cards.forEach((card) => {
        const element = document.querySelector(`[data-card-id="${card.id}"]`)
        if (element) element.classList.add("possible-trio")
      })
    })

    possibleEscalas.forEach((cards) => {
      cards.forEach((card) => {
        const element = document.querySelector(`[data-card-id="${card.id}"]`)
        if (element) element.classList.add("possible-escala")
      })
    })

    // Remover resaltado después de 3 segundos
    setTimeout(() => {
      document.querySelectorAll(".possible-trio, .possible-escala").forEach((el) => {
        el.classList.remove("possible-trio", "possible-escala")
      })
    }, 3000)
  }

  findPossibleTrios() {
    // Implementar lógica para encontrar posibles tríos
    return []
  }

  findPossibleEscalas() {
    // Implementar lógica para encontrar posibles escalas
    return []
  }

  sendGameMessage() {
    const input = document.getElementById("gameChatInput")
    const message = input.value.trim()

    if (message) {
      this.socket.emit("mensaje_juego", {
        partida_id: this.gameState.partida_id,
        user_id: this.currentUser.user_id,
        mensaje: message,
      })
      input.value = ""
    }
  }

  showFeedback(message, type) {
    const feedback = document.createElement("div")
    feedback.className = `game-feedback ${type}`
    feedback.textContent = message

    document.body.appendChild(feedback)

    setTimeout(() => {
      feedback.classList.add("show")
    }, 10)

    setTimeout(() => {
      feedback.classList.remove("show")
      setTimeout(() => feedback.remove(), 300)
    }, 2000)
  }

  showError(message) {
    this.showFeedback(message, "error")
  }

  cerrarModal(modalId) {
    document.getElementById(modalId).style.display = "none"
  }
}

// Funciones globales para eventos del HTML
function mostrarOpcionesRobar() {
  gameManager.showDrawOptions()
}

function robarCarta(origen) {
  if (origen === "mazo") {
    gameManager.drawFromDeck()
  } else {
    gameManager.drawFromDiscard()
  }
}

function intentarBajarCombinaciones() {
  gameManager.attemptPlayCombinations()
}

function activarModoDescarte() {
  gameManager.activateDiscardMode()
}

function declararCarioca() {
  gameManager.declareCarioca()
}

function ordenarCartas() {
  gameManager.sortHand()
}

function mostrarAyudaCartas() {
  gameManager.showHandHelp()
}

function enviarMensajeJuego() {
  gameManager.sendGameMessage()
}

function mostrarAyuda() {
  document.getElementById("ayudaModal").style.display = "flex"
}

function mostrarConfiguracion() {
  document.getElementById("configModal").style.display = "flex"
}

function abandonarPartida() {
  document.getElementById("salirModal").style.display = "flex"
}

function confirmarSalida() {
  localStorage.removeItem("current_game")
  window.location.href = "lobby.html"
}

function cerrarModal(modalId) {
  document.getElementById(modalId).style.display = "none"
}

function mostrarTab(tabName) {
  // Ocultar todas las tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.style.display = "none"
  })

  // Remover clase active de todos los botones
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active")
  })

  // Mostrar tab seleccionada
  document.getElementById(tabName + "Tab").style.display = "block"
  event.target.classList.add("active")
}

// Inicializar el juego cuando se carga la página
let gameManager
let cardManager

document.addEventListener("DOMContentLoaded", async () => {
  try {
    cardManager = new CardManager()
    gameManager = new CariocaGameManager()
    console.log("🎮 Gestor del juego inicializado")
  } catch (error) {
    console.error("❌ Error inicializando gestor del juego:", error)
  }
})
