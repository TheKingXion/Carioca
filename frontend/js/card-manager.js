/**
 * Gestor de cartas para el juego Carioca Online
 * Maneja la creación, validación y manipulación de cartas
 */

class CardManager {
  constructor() {
    this.cardImages = new Map()
    this.loadedImages = false
    this.cardValues = {
      A: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      J: 11,
      Q: 12,
      K: 13,
      joker: 0,
    }
    this.suitColors = {
      corazones: "red",
      diamantes: "red",
      treboles: "black",
      picas: "black",
      joker: "red",
    }
    this.suitSymbols = {
      corazones: "♥",
      diamantes: "♦",
      treboles: "♣",
      picas: "♠",
      joker: "🃏",
    }
  }

  /**
   * Precargar imágenes de cartas
   */
  async preloadCardImages() {
    if (this.loadedImages) return

    const palos = ["corazones", "diamantes", "treboles", "picas"]
    const valores = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

    const loadPromises = []

    // Cargar cartas normales desde las imágenes PNG generadas
    for (const palo of palos) {
      for (const valor of valores) {
        const cardId = `${valor}_${palo}`
        const imagePath = `assets/cartas/frontal/${valor}_${palo}.png`

        const promise = this.loadCardImage(cardId, imagePath)
        loadPromises.push(promise)
      }
    }

    // Cargar jokers
    for (let i = 1; i <= 4; i++) {
      const jokerId = `joker_${i}`
      const jokerPath = `assets/cartas/frontal/joker_${i}.png`
      loadPromises.push(this.loadCardImage(jokerId, jokerPath))
    }

    // Cargar reversos
    const reversoNormal = this.loadCardImage('reverso_carta', 'assets/cartas/reverso/reverso_carta.png')
    const reversoJoker = this.loadCardImage('reverso_joker', 'assets/cartas/reverso/reverso_joker.png')
    loadPromises.push(reversoNormal, reversoJoker)

    try {
      await Promise.all(loadPromises)
      this.loadedImages = true
      console.log("✅ Imágenes de cartas PNG precargadas")
    } catch (error) {
      console.error("❌ Error precargando imágenes:", error)
    }
  }

  /**
   * Cargar una imagen de carta específica
   */
  loadCardImage(cardId, imagePath) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        this.cardImages.set(cardId, img)
        resolve(img)
      }
      img.onerror = () => {
        console.warn(`No se pudo cargar imagen para ${cardId}, usando placeholder`)
        resolve(null)
      }
      img.src = imagePath
    })
  }

  /**
   * Crear elemento HTML de carta
   */
  createCardElement(cardData, options = {}) {
    const { size = "normal", interactive = true, showBack = false } = options

    const cardElement = document.createElement("div")
    cardElement.className = `card-element ${size}`

    // Configurar datos de la carta
    cardElement.dataset.cardId = cardData.id
    cardElement.dataset.suit = cardData.palo
    cardElement.dataset.value = cardData.valor
    cardElement.dataset.deck = cardData.baraja
    cardElement.dataset.isJoker = cardData.es_comodin

    if (showBack) {
      cardElement.innerHTML = this.createCardBackHTML()
    } else {
      cardElement.innerHTML = this.createCardFrontHTML(cardData)
    }

    // Configurar interactividad
    if (interactive) {
      cardElement.draggable = true
      cardElement.addEventListener("dragstart", this.handleDragStart.bind(this))
      cardElement.addEventListener("dragend", this.handleDragEnd.bind(this))
    }

    return cardElement
  }

  /**
   * Crear HTML para el frente de la carta usando imágenes PNG
   */
  createCardFrontHTML(cardData) {
    const isJoker = cardData.es_comodin || cardData.valor === 'joker'
    
    let imagePath
    if (isJoker) {
      // Para jokers, usar una de las 4 imágenes de joker
      const jokerNum = cardData.id ? cardData.id.split('_')[1] || '1' : '1'
      imagePath = `assets/cartas/frontal/joker_${jokerNum}.png`
    } else {
      // Para cartas normales
      imagePath = `assets/cartas/frontal/${cardData.valor}_${cardData.palo}.png`
    }

    return `
      <div class="card-content-image">
        <img src="${imagePath}" alt="${cardData.valor} de ${cardData.palo}" class="card-png" 
             onerror="this.src='assets/cartas/frontal/A_picas.png'">
      </div>
    `
  }

  /**
   * Crear HTML para el dorso de la carta usando imagen PNG
   */
  createCardBackHTML() {
    return `
      <div class="card-back-content">
        <img src="assets/cartas/reverso/reverso_carta.png" alt="Reverso de carta" class="card-png">
      </div>
    `
  }

  /**
   * Obtener valor de visualización de la carta
   */
  getDisplayValue(valor) {
    if (valor === "joker") return "J"
    return valor
  }

  /**
   * Obtener valor numérico de la carta
   */
  getNumericValue(valor) {
    return this.cardValues[valor] || 0
  }

  /**
   * Validar si las cartas forman un trío
   */
  validateTrio(cards) {
    if (cards.length < 3) return false

    // Agrupar por valor
    const valueGroups = {}
    let jokers = 0

    cards.forEach((card) => {
      if (card.es_comodin) {
        jokers++
      } else {
        const value = card.valor
        valueGroups[value] = (valueGroups[value] || 0) + 1
      }
    })

    // Verificar si se puede formar un trío
    const values = Object.keys(valueGroups)

    if (values.length === 0) {
      // Solo jokers
      return jokers >= 3
    }

    if (values.length === 1) {
      // Todas las cartas del mismo valor + jokers
      const sameValueCards = valueGroups[values[0]]
      return sameValueCards + jokers >= 3
    }

    return false
  }

  /**
   * Validar si las cartas forman una escala
   */
  validateEscala(cards) {
    if (cards.length < 4) return false

    // Separar jokers de cartas normales
    const normalCards = cards.filter((card) => !card.es_comodin)
    const jokers = cards.filter((card) => card.es_comodin).length

    if (normalCards.length === 0) return false

    // Verificar que todas las cartas normales sean del mismo palo
    const suit = normalCards[0].palo
    if (!normalCards.every((card) => card.palo === suit)) {
      return false
    }

    // Ordenar cartas por valor
    const sortedValues = normalCards.map((card) => this.getNumericValue(card.valor)).sort((a, b) => a - b)

    // Verificar secuencia con jokers
    return this.canFormSequence(sortedValues, jokers)
  }

  /**
   * Verificar si se puede formar una secuencia con jokers
   */
  canFormSequence(values, jokers) {
    if (values.length === 0) return false

    let gaps = 0
    for (let i = 1; i < values.length; i++) {
      const gap = values[i] - values[i - 1] - 1
      if (gap < 0) return false // Cartas duplicadas
      gaps += gap
    }

    return gaps <= jokers
  }

  /**
   * Validar combinación según tipo
   */
  validateCombination(cards, type) {
    switch (type) {
      case "trio":
        return this.validateTrio(cards)
      case "escala":
        return this.validateEscala(cards)
      default:
        return false
    }
  }

  /**
   * Obtener posibles combinaciones de una mano
   */
  findPossibleCombinations(hand) {
    const combinations = {
      trios: [],
      escalas: [],
    }

    // Buscar tríos
    const trios = this.findTrios(hand)
    combinations.trios = trios

    // Buscar escalas
    const escalas = this.findEscalas(hand)
    combinations.escalas = escalas

    return combinations
  }

  /**
   * Buscar posibles tríos en la mano
   */
  findTrios(hand) {
    const trios = []
    const valueGroups = {}

    // Agrupar cartas por valor
    hand.forEach((card, index) => {
      if (card.es_comodin) return

      const value = card.valor
      if (!valueGroups[value]) {
        valueGroups[value] = []
      }
      valueGroups[value].push({ card, index })
    })

    // Encontrar grupos de 3 o más
    Object.entries(valueGroups).forEach(([value, cards]) => {
      if (cards.length >= 3) {
        // Generar todas las combinaciones posibles de 3 cartas
        for (let i = 0; i < cards.length - 2; i++) {
          for (let j = i + 1; j < cards.length - 1; j++) {
            for (let k = j + 1; k < cards.length; k++) {
              trios.push([cards[i].card, cards[j].card, cards[k].card])
            }
          }
        }
      }
    })

    return trios
  }

  /**
   * Buscar posibles escalas en la mano
   */
  findEscalas(hand) {
    const escalas = []
    const suitGroups = {}

    // Agrupar cartas por palo
    hand.forEach((card, index) => {
      if (card.es_comodin) return

      const suit = card.palo
      if (!suitGroups[suit]) {
        suitGroups[suit] = []
      }
      suitGroups[suit].push({ card, index })
    })

    // Buscar secuencias en cada palo
    Object.entries(suitGroups).forEach(([suit, cards]) => {
      if (cards.length >= 4) {
        // Ordenar por valor
        cards.sort((a, b) => this.getNumericValue(a.card.valor) - this.getNumericValue(b.card.valor))

        // Buscar secuencias consecutivas
        const sequences = this.findConsecutiveSequences(cards)
        escalas.push(...sequences)
      }
    })

    return escalas
  }

  /**
   * Encontrar secuencias consecutivas
   */
  findConsecutiveSequences(cards) {
    const sequences = []

    for (let start = 0; start < cards.length - 3; start++) {
      const sequence = [cards[start].card]
      let currentValue = this.getNumericValue(cards[start].card.valor)

      for (let i = start + 1; i < cards.length; i++) {
        const nextValue = this.getNumericValue(cards[i].card.valor)

        if (nextValue === currentValue + 1) {
          sequence.push(cards[i].card)
          currentValue = nextValue
        } else if (nextValue > currentValue + 1) {
          break
        }
      }

      if (sequence.length >= 4) {
        sequences.push(sequence)
      }
    }

    return sequences
  }

  /**
   * Manejar inicio de arrastre
   */
  handleDragStart(event) {
    const cardElement = event.target
    cardElement.classList.add("dragging")

    const cardData = {
      cardId: cardElement.dataset.cardId,
      suit: cardElement.dataset.suit,
      value: cardElement.dataset.value,
      deck: cardElement.dataset.deck,
      isJoker: cardElement.dataset.isJoker === "true",
    }

    event.dataTransfer.setData("text/plain", JSON.stringify(cardData))
    event.dataTransfer.effectAllowed = "move"
  }

  /**
   * Manejar fin de arrastre
   */
  handleDragEnd(event) {
    const cardElement = event.target
    cardElement.classList.remove("dragging")
  }

  /**
   * Calcular puntos de una carta
   */
  calculateCardPoints(card) {
    if (card.es_comodin) return 25

    const value = card.valor
    if (value === "A") return 15
    if (["J", "Q", "K"].includes(value)) return 10

    return this.getNumericValue(value)
  }

  /**
   * Calcular puntos totales de una mano
   */
  calculateHandPoints(hand) {
    return hand.reduce((total, card) => total + this.calculateCardPoints(card), 0)
  }

  /**
   * Ordenar mano por palo y valor
   */
  sortHand(hand) {
    const suitOrder = ["picas", "treboles", "diamantes", "corazones", "joker"]

    return hand.sort((a, b) => {
      // Primero por palo
      const suitA = suitOrder.indexOf(a.palo)
      const suitB = suitOrder.indexOf(b.palo)

      if (suitA !== suitB) {
        return suitA - suitB
      }

      // Luego por valor
      return this.getNumericValue(a.valor) - this.getNumericValue(b.valor)
    })
  }

  // Crear mazo completo de cartas
  createFullDeck() {
    const deck = []
    const palos = ["corazones", "diamantes", "treboles", "picas"]
    const valores = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    const barajas = ["azul", "roja"]

    // Crear cartas normales
    for (const baraja of barajas) {
      for (const palo of palos) {
        for (const valor of valores) {
          deck.push({
            id: `${valor}_${palo}_${baraja}`,
            nombre: `${valor} de ${palo}`,
            palo: palo,
            valor: valor,
            es_comodin: false,
            imagen: `/placeholder.svg?height=120&width=80&text=${valor}${this.suitSymbols[palo]}`,
            baraja: baraja,
          })
        }
      }

      // Agregar jokers
      deck.push({
        id: `joker_${baraja}`,
        nombre: `Joker ${baraja}`,
        palo: "joker",
        valor: "joker",
        es_comodin: true,
        imagen: `/placeholder.svg?height=120&width=80&text=🃏`,
        baraja: baraja,
      })
    }

    return deck
  }

  /** Barajar mazo */
  shuffleDeck(deck) {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}

// Crear instancia global del gestor de cartas
const cardManager = new CardManager()

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardManager;
} else {
    window.cardManager = cardManager;
}
// Precargar imágenes al cargar el script
cardManager.preloadCardImages().catch((error) => {
    console.error("❌ Error al precargar imágenes de cartas:", error)
});
// Exponer la instancia global para uso en el frontend
window.cardManager = cardManager;
