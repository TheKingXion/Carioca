import json
import random
from typing import List, Dict, Tuple, Any

class CariocaGameLogic:
    def __init__(self):
        self.contratos = {
            1: {"trios": 2, "escalas": 0, "descripcion": "2 Tríos"},
            2: {"trios": 1, "escalas": 1, "descripcion": "1 Trío + 1 Escala"},
            3: {"trios": 0, "escalas": 2, "descripcion": "2 Escalas"},
            4: {"trios": 3, "escalas": 0, "descripcion": "3 Tríos"},
            5: {"trios": 2, "escalas": 1, "descripcion": "2 Tríos + 1 Escala"},
            6: {"trios": 1, "escalas": 2, "descripcion": "1 Trío + 2 Escalas"},
            7: {"trios": 0, "escalas": 3, "descripcion": "3 Escalas"},
            8: {"trios": 4, "escalas": 0, "descripcion": "4 Tríos"},
            9: {"trios": 3, "escalas": 1, "descripcion": "3 Tríos + 1 Escala"},
            10: {"trios": 2, "escalas": 2, "descripcion": "2 Tríos + 2 Escalas"}
        }
        
        self.valores_cartas = {
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
            '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
        }
    
    def validar_contrato(self, numero_contrato: int, combinaciones: List[Dict]) -> Tuple[bool, str, Dict]:
        """
        Valida si las combinaciones cumplen con el contrato especificado
        """
        if numero_contrato not in self.contratos:
            return False, "Contrato inválido", {}
        
        contrato = self.contratos[numero_contrato]
        trios_requeridos = contrato["trios"]
        escalas_requeridas = contrato["escalas"]
        
        trios_encontrados = 0
        escalas_encontradas = 0
        
        for combinacion in combinaciones:
            tipo = combinacion.get('tipo')
            cartas = combinacion.get('cartas', [])
            
            if tipo == 'trio':
                if self.validar_trio(cartas):
                    trios_encontrados += 1
                else:
                    return False, f"Trío inválido: {cartas}", {}
            
            elif tipo == 'escala':
                if self.validar_escala(cartas):
                    escalas_encontradas += 1
                else:
                    return False, f"Escala inválida: {cartas}", {}
        
        # Verificar si cumple con el contrato
        if trios_encontrados >= trios_requeridos and escalas_encontradas >= escalas_requeridas:
            return True, f"Contrato {numero_contrato} completado exitosamente", {
                'trios': trios_encontrados,
                'escalas': escalas_encontradas,
                'requerido': contrato
            }
        else:
            return False, f"Contrato incompleto. Necesitas {trios_requeridos} tríos y {escalas_requeridas} escalas", {}
    
    def validar_trio(self, cartas: List[Dict]) -> bool:
        """
        Valida si las cartas forman un trío válido
        """
        if len(cartas) < 3:
            return False
        
        # Obtener valores de las cartas (sin comodines)
        valores = []
        comodines = 0
        
        for carta in cartas:
            if carta.get('es_comodin', False):
                comodines += 1
            else:
                valores.append(carta.get('valor'))
        
        # Si hay cartas normales, todas deben tener el mismo valor
        if valores:
            valor_base = valores[0]
            if not all(v == valor_base for v in valores):
                return False
        
        # Un trío debe tener al menos 3 cartas
        return len(cartas) >= 3
    
    def validar_escala(self, cartas: List[Dict]) -> bool:
        """
        Valida si las cartas forman una escala válida
        """
        if len(cartas) < 3:
            return False
        
        # Separar cartas por palo
        palos = {}
        comodines = []
        
        for carta in cartas:
            if carta.get('es_comodin', False):
                comodines.append(carta)
            else:
                palo = carta.get('palo')
                if palo not in palos:
                    palos[palo] = []
                palos[palo].append(carta)
        
        # Una escala debe ser del mismo palo
        if len(palos) > 1:
            return False
        
        if len(palos) == 0:  # Solo comodines
            return len(comodines) >= 3
        
        # Obtener el palo de la escala
        palo_escala = list(palos.keys())[0]
        cartas_palo = palos[palo_escala]
        
        # Convertir valores a números
        valores_numericos = []
        for carta in cartas_palo:
            valor = carta.get('valor')
            if valor in self.valores_cartas:
                valores_numericos.append(self.valores_cartas[valor])
        
        valores_numericos.sort()
        
        # Verificar secuencia con comodines
        return self.verificar_secuencia_con_comodines(valores_numericos, len(comodines))
    
    def verificar_secuencia_con_comodines(self, valores: List[int], comodines: int) -> bool:
        """
        Verifica si los valores pueden formar una secuencia usando comodines
        """
        if not valores and comodines >= 3:
            return True
        
        if len(valores) == 0:
            return False
        
        # Eliminar duplicados y ordenar
        valores_unicos = sorted(set(valores))
        
        # Calcular huecos en la secuencia
        huecos = 0
        for i in range(1, len(valores_unicos)):
            huecos += valores_unicos[i] - valores_unicos[i-1] - 1
        
        # Los comodines deben cubrir los huecos y completar al menos 3 cartas
        total_cartas = len(valores) + comodines
        return total_cartas >= 3 and comodines >= huecos
    
    def calcular_puntos_carta(self, carta: Dict) -> int:
        """
        Calcula los puntos de una carta según las reglas de Carioca
        """
        if carta.get('es_comodin', False):
            return 25  # Jokers valen 25 puntos
        
        valor = carta.get('valor')
        if valor in ['J', 'Q', 'K']:
            return 10
        elif valor == 'A':
            return 15
        else:
            return self.valores_cartas.get(valor, 0)
    
    def calcular_puntos_mano(self, cartas: List[Dict]) -> int:
        """
        Calcula el total de puntos de una mano
        """
        return sum(self.calcular_puntos_carta(carta) for carta in cartas)
    
    def puede_agregar_a_combinacion(self, carta: Dict, combinacion: List[Dict]) -> bool:
        """
        Verifica si una carta puede agregarse a una combinación existente
        """
        if not combinacion:
            return False
        
        # Determinar tipo de combinación
        if self.es_trio(combinacion):
            return self.puede_agregar_a_trio(carta, combinacion)
        elif self.es_escala(combinacion):
            return self.puede_agregar_a_escala(carta, combinacion)
        
        return False
    
    def es_trio(self, combinacion: List[Dict]) -> bool:
        """
        Determina si una combinación es un trío
        """
        if len(combinacion) < 3:
            return False
        
        valores = [c.get('valor') for c in combinacion if not c.get('es_comodin', False)]
        return len(set(valores)) <= 1
    
    def es_escala(self, combinacion: List[Dict]) -> bool:
        """
        Determina si una combinación es una escala
        """
        return self.validar_escala(combinacion)
    
    def puede_agregar_a_trio(self, carta: Dict, trio: List[Dict]) -> bool:
        """
        Verifica si una carta puede agregarse a un trío
        """
        if carta.get('es_comodin', False):
            return True
        
        # Obtener valor del trío
        valores_trio = [c.get('valor') for c in trio if not c.get('es_comodin', False)]
        if not valores_trio:
            return True  # Trío de solo comodines
        
        valor_trio = valores_trio[0]
        return carta.get('valor') == valor_trio
    
    def puede_agregar_a_escala(self, carta: Dict, escala: List[Dict]) -> bool:
        """
        Verifica si una carta puede agregarse a una escala
        """
        if carta.get('es_comodin', False):
            return True
        
        # Obtener palo de la escala
        palos_escala = [c.get('palo') for c in escala if not c.get('es_comodin', False)]
        if not palos_escala:
            return True  # Escala de solo comodines
        
        palo_escala = palos_escala[0]
        if carta.get('palo') != palo_escala:
            return False
        
        # Verificar si el valor puede extender la secuencia
        valores = [self.valores_cartas.get(c.get('valor'), 0) for c in escala if not c.get('es_comodin', False)]
        nuevo_valor = self.valores_cartas.get(carta.get('valor'), 0)
        
        if not valores:
            return True
        
        valores.append(nuevo_valor)
        valores.sort()
        
        # Verificar secuencia
        for i in range(1, len(valores)):
            if valores[i] - valores[i-1] != 1:
                return False
        
        return True
    
    def generar_sugerencias(self, cartas_mano: List[Dict], contrato_actual: int) -> List[Dict]:
        """
        Genera sugerencias de combinaciones posibles para el jugador
        """
        sugerencias = []
        
        # Buscar posibles tríos
        trios_posibles = self.buscar_trios_posibles(cartas_mano)
        sugerencias.extend(trios_posibles)
        
        # Buscar posibles escalas
        escalas_posibles = self.buscar_escalas_posibles(cartas_mano)
        sugerencias.extend(escalas_posibles)
        
        return sugerencias
    
    def buscar_trios_posibles(self, cartas: List[Dict]) -> List[Dict]:
        """
        Busca posibles tríos en las cartas
        """
        trios = []
        valores_count = {}
        
        # Contar cartas por valor
        for carta in cartas:
            if not carta.get('es_comodin', False):
                valor = carta.get('valor')
                if valor not in valores_count:
                    valores_count[valor] = []
                valores_count[valor].append(carta)
        
        # Buscar tríos
        for valor, cartas_valor in valores_count.items():
            if len(cartas_valor) >= 3:
                trios.append({
                    'tipo': 'trio',
                    'cartas': cartas_valor[:3],
                    'valor': valor
                })
        
        return trios
    
    def buscar_escalas_posibles(self, cartas: List[Dict]) -> List[Dict]:
        """
        Busca posibles escalas en las cartas
        """
        escalas = []
        
        # Agrupar por palo
        cartas_por_palo = {}
        for carta in cartas:
            if not carta.get('es_comodin', False):
                palo = carta.get('palo')
                if palo not in cartas_por_palo:
                    cartas_por_palo[palo] = []
                cartas_por_palo[palo].append(carta)
        
        # Buscar escalas en cada palo
        for palo, cartas_palo in cartas_por_palo.items():
            if len(cartas_palo) >= 3:
                # Ordenar por valor
                cartas_ordenadas = sorted(cartas_palo, key=lambda c: self.valores_cartas.get(c.get('valor'), 0))
                
                # Buscar secuencias
                for i in range(len(cartas_ordenadas) - 2):
                    secuencia = [cartas_ordenadas[i]]
                    
                    for j in range(i + 1, len(cartas_ordenadas)):
                        valor_actual = self.valores_cartas.get(secuencia[-1].get('valor'), 0)
                        valor_siguiente = self.valores_cartas.get(cartas_ordenadas[j].get('valor'), 0)
                        
                        if valor_siguiente == valor_actual + 1:
                            secuencia.append(cartas_ordenadas[j])
                        elif valor_siguiente > valor_actual + 1:
                            break
                    
                    if len(secuencia) >= 3:
                        escalas.append({
                            'tipo': 'escala',
                            'cartas': secuencia,
                            'palo': palo
                        })
        
        return escalas
