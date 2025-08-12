"""
Inteligencia Artificial para los bots del Carioca
Tres niveles de dificultad: Fácil, Medio, Difícil
"""
import random
import json
from typing import List, Dict, Any, Tuple
from game_logic import CariocaGameLogic

class CariocaBotAI:
    
    def __init__(self, dificultad: str = 'medio'):
        self.dificultad = dificultad.lower()
        self.game_logic = CariocaGameLogic()
        
        # Configuración por dificultad
        self.config = {
            'facil': {
                'probabilidad_error': 0.3,
                'tiempo_pensamiento': (1, 3),
                'agresividad': 0.2,
                'memoria_cartas': 0.1
            },
            'medio': {
                'probabilidad_error': 0.15,
                'tiempo_pensamiento': (2, 5),
                'agresividad': 0.5,
                'memoria_cartas': 0.6
            },
            'dificil': {
                'probabilidad_error': 0.05,
                'tiempo_pensamiento': (3, 8),
                'agresividad': 0.8,
                'memoria_cartas': 0.9
            }
        }
    
    def decidir_accion(self, estado_juego: Dict, cartas_mano: List[Dict], 
                      contrato_actual: int) -> Dict[str, Any]:
        """
        Decide qué acción tomar basado en el estado del juego
        """
        config = self.config[self.dificultad]
        
        # Simular tiempo de pensamiento
        tiempo_pensamiento = random.uniform(*config['tiempo_pensamiento'])
        
        # Analizar cartas en mano
        analisis = self.analizar_cartas(cartas_mano, contrato_actual)
        
        # Decidir acción principal
        if analisis['puede_bajar'] and random.random() > config['probabilidad_error']:
            return self.decidir_bajar_combinacion(cartas_mano, contrato_actual, analisis)
        elif self.debe_robar_descarte(estado_juego, cartas_mano, contrato_actual):
            return {'accion': 'robar_descarte'}
        else:
            return {'accion': 'robar_mazo'}
    
    def analizar_cartas(self, cartas: List[Dict], contrato_actual: int) -> Dict:
        """
        Analiza las cartas en mano para determinar posibles combinaciones
        """
        # Separar cartas normales y comodines
        comodines = [c for c in cartas if c.get('es_comodin', False)]
        normales = [c for c in cartas if not c.get('es_comodin', False)]
        
        # Buscar tríos posibles
        trios_posibles = self.buscar_trios_posibles(normales, comodines)
        
        # Buscar escalas posibles
        escalas_posibles = self.buscar_escalas_posibles(normales, comodines)
        
        # Verificar si puede completar el contrato
        puede_bajar = self.puede_completar_contrato(
            contrato_actual, trios_posibles, escalas_posibles
        )
        
        return {
            'trios_posibles': trios_posibles,
            'escalas_posibles': escalas_posibles,
            'puede_bajar': puede_bajar,
            'comodines_disponibles': len(comodines),
            'cartas_utiles': len(trios_posibles) + len(escalas_posibles)
        }
    
    def buscar_trios_posibles(self, cartas_normales: List[Dict], 
                             comodines: List[Dict]) -> List[Dict]:
        """
        Busca tríos posibles en las cartas
        """
        trios = []
        
        # Agrupar cartas por valor
        por_valor = {}
        for carta in cartas_normales:
            valor = carta['valor']
            if valor not in por_valor:
                por_valor[valor] = []
            por_valor[valor].append(carta)
        
        # Buscar tríos completos (3 cartas del mismo valor)
        for valor, cartas_valor in por_valor.items():
            if len(cartas_valor) >= 3:
                trios.append({
                    'tipo': 'trio',
                    'cartas': cartas_valor[:3],
                    'completo': True
                })
            elif len(cartas_valor) == 2 and len(comodines) > 0:
                # Trío con comodín
                trios.append({
                    'tipo': 'trio',
                    'cartas': cartas_valor + [comodines[0]],
                    'completo': True,
                    'usa_comodin': True
                })
        
        return trios
    
    def buscar_escalas_posibles(self, cartas_normales: List[Dict], 
                               comodines: List[Dict]) -> List[Dict]:
        """
        Busca escalas posibles en las cartas
        """
        escalas = []
        
        # Agrupar cartas por palo
        por_palo = {}
        for carta in cartas_normales:
            palo = carta['palo']
            if palo not in por_palo:
                por_palo[palo] = []
            por_palo[palo].append(carta)
        
        # Buscar escalas en cada palo
        for palo, cartas_palo in por_palo.items():
            if len(cartas_palo) >= 3:  # Mínimo 3 cartas para intentar escala
                cartas_ordenadas = sorted(cartas_palo, key=lambda x: x['valor'])
                escalas_palo = self.encontrar_escalas_en_palo(cartas_ordenadas, comodines)
                escalas.extend(escalas_palo)
        
        return escalas
    
    def encontrar_escalas_en_palo(self, cartas_ordenadas: List[Dict], 
                                 comodines: List[Dict]) -> List[Dict]:
        """
        Encuentra escalas posibles en un palo específico
        """
        escalas = []
        
        # Buscar secuencias consecutivas
        for i in range(len(cartas_ordenadas) - 2):  # Mínimo 3 cartas
            secuencia = [cartas_ordenadas[i]]
            
            for j in range(i + 1, len(cartas_ordenadas)):
                carta_actual = cartas_ordenadas[j]
                ultima_carta = secuencia[-1]
                
                if carta_actual['valor'] == ultima_carta['valor'] + 1:
                    secuencia.append(carta_actual)
                elif carta_actual['valor'] == ultima_carta['valor'] + 2 and len(comodines) > 0:
                    # Puede usar comodín para llenar hueco
                    secuencia.append(comodines[0])  # Comodín
                    secuencia.append(carta_actual)
                    break
                else:
                    break
            
            if len(secuencia) >= 4:  # Escala válida
                escalas.append({
                    'tipo': 'escala',
                    'cartas': secuencia,
                    'completo': True,
                    'usa_comodin': any(c.get('es_comodin', False) for c in secuencia)
                })
        
        return escalas
    
    def puede_completar_contrato(self, contrato_num: int, trios: List[Dict], 
                                escalas: List[Dict]) -> bool:
        """
        Verifica si puede completar el contrato actual
        """
        contrato = self.game_logic.CONTRATOS.get(contrato_num, {})
        
        if contrato.get('tipo') == 'escala_falsa':
            # Lógica especial para escala falsa
            return False  # Simplificado por ahora
        elif contrato.get('tipo') == 'escala_real':
            # Lógica especial para escala real
            return False  # Simplificado por ahora
        else:
            # Contratos normales
            trios_necesarios = contrato.get('trios', 0)
            escalas_necesarias = contrato.get('escalas', 0)
            
            trios_completos = len([t for t in trios if t.get('completo', False)])
            escalas_completas = len([e for e in escalas if e.get('completo', False)])
            
            return (trios_completos >= trios_necesarios and 
                   escalas_completas >= escalas_necesarias)
    
    def decidir_bajar_combinacion(self, cartas_mano: List[Dict], contrato_actual: int, 
                                 analisis: Dict) -> Dict:
        """
        Decide qué combinaciones bajar
        """
        combinaciones = []
        
        # Agregar tríos completos
        for trio in analisis['trios_posibles']:
            if trio.get('completo', False):
                combinaciones.append(trio)
        
        # Agregar escalas completas
        for escala in analisis['escalas_posibles']:
            if escala.get('completo', False):
                combinaciones.append(escala)
        
        return {
            'accion': 'bajar_combinacion',
            'combinaciones': combinaciones
        }
    
    def debe_robar_descarte(self, estado_juego: Dict, cartas_mano: List[Dict], 
                           contrato_actual: int) -> bool:
        """
        Decide si debe robar del descarte en lugar del mazo
        """
        if not estado_juego.get('ultima_carta_descartada'):
            return False
        
        carta_descarte = estado_juego['ultima_carta_descartada']
        config = self.config[self.dificultad]
        
        # Evaluar utilidad de la carta del descarte
        utilidad = self.evaluar_utilidad_carta(carta_descarte, cartas_mano, contrato_actual)
        
        # Decisión basada en dificultad y utilidad
        umbral_decision = 0.3 + (config['agresividad'] * 0.4)
        
        return utilidad > umbral_decision
    
    def evaluar_utilidad_carta(self, carta: Dict, cartas_mano: List[Dict], 
                              contrato_actual: int) -> float:
        """
        Evalúa qué tan útil es una carta para el bot
        """
        if carta.get('es_comodin', False):
            return 0.9  # Los comodines siempre son muy útiles
        
        utilidad = 0.0
        
        # Verificar si completa un trío
        cartas_mismo_valor = [c for c in cartas_mano 
                             if c['valor'] == carta['valor'] and not c.get('es_comodin', False)]
        
        if len(cartas_mismo_valor) >= 2:
            utilidad += 0.8  # Completa un trío
        elif len(cartas_mismo_valor) == 1:
            utilidad += 0.4  # Ayuda a formar un trío
        
        # Verificar si ayuda en escalas
        cartas_mismo_palo = [c for c in cartas_mano 
                            if c['palo'] == carta['palo'] and not c.get('es_comodin', False)]
        
        for carta_palo in cartas_mismo_palo:
            diferencia = abs(carta_palo['valor'] - carta['valor'])
            if diferencia == 1:
                utilidad += 0.6  # Carta consecutiva
            elif diferencia == 2:
                utilidad += 0.3  # Carta cercana
        
        return min(utilidad, 1.0)
    
    def decidir_descarte(self, cartas_mano: List[Dict], contrato_actual: int) -> Dict:
        """
        Decide qué carta descartar
        """
        # Evaluar utilidad de cada carta
        utilidades = []
        for i, carta in enumerate(cartas_mano):
            utilidad = self.evaluar_utilidad_carta(carta, cartas_mano[:i] + cartas_mano[i+1:], contrato_actual)
            utilidades.append((i, utilidad))
        
        # Ordenar por utilidad (menor primero para descartar)
        utilidades.sort(key=lambda x: x[1])
        
        # Agregar algo de aleatoriedad según dificultad
        config = self.config[self.dificultad]
        if random.random() < config['probabilidad_error']:
            # Decisión subóptima
            indice_descarte = random.randint(0, len(cartas_mano) - 1)
        else:
            # Decisión óptima
            indice_descarte = utilidades[0][0]
        
        return {
            'accion': 'descartar',
            'carta': cartas_mano[indice_descarte],
            'indice': indice_descarte
        }

# Nombres temáticos para los bots según dificultad
NOMBRES_BOTS = {
    'facil': [
        'Bot Novato', 'Bot Aprendiz', 'Bot Principiante',
        'Bot Estudiante', 'Bot Rookie', 'Bot Junior'
    ],
    'medio': [
        'Bot Estratega', 'Bot Calculador', 'Bot Táctico',
        'Bot Analista', 'Bot Competente', 'Bot Veterano'
    ],
    'dificil': [
        'Bot Maestro', 'Bot Experto', 'Bot Campeón',
        'Bot Leyenda', 'Bot Invencible', 'Bot Supremo'
    ]
}

def obtener_nombre_bot(dificultad: str) -> str:
    """Obtiene un nombre aleatorio para el bot según su dificultad"""
    nombres = NOMBRES_BOTS.get(dificultad.lower(), NOMBRES_BOTS['medio'])
    return random.choice(nombres)
