/**
 * Documentation des capacités standard de la plateforme MYBlab.
 * 
 * ADR #3 : Les capabilities sont des chaînes OUVERTES.
 * Le framework accepte toute chaîne non vide comme capability.
 * Ce fichier fournit des CONVENTIONS pour éviter les variations
 * (ex: "analog" vs "analogue" vs "analogic").
 * 
 * Un nouveau composant peut déclarer une capacité non listée ici
 * (ex: "pwm", "uart", "i2c") sans modifier ce fichier.
 * 
 * @see MB-SIM-001 Contrat architectural V4 + Addenda A1-A4 + V5 + V5.1
 */

/**
 * Capacités standard recommandées.
 * 
 * Ces constantes servent de convention pour toute la plateforme.
 * Elles ne sont PAS obligatoires : un modèle peut utiliser
 * n'importe quelle chaîne comme capability.
 * 
 * @constant
 * @type {Readonly<Record<string, string>>}
 */
export const STANDARD_CAPABILITIES = Object.freeze({
  // === Capacités fondamentales ===
  /** Simulation logique binaire (HIGH/LOW) */
  DIGITAL: 'digital',
  /** Simulation électrique en courant continu */
  DC: 'dc',
  /** Simulation électrique en courant alternatif */
  AC: 'ac',
  /** Simulation temporelle (timing, horloges, PWM) */
  TIMING: 'timing',
  /** Simulation thermique (dissipation, température) */
  THERMAL: 'thermal',
  
  // === Capacités physiques ===
  /** Composants mécaniques (moteurs, servos, potentiomètres) */
  MECHANICAL: 'mechanical',
  /** Composants optiques (LEDs, LDR, écrans) */
  OPTICAL: 'optical',
  
  // === Extensions futures documentées ===
  // PWM: 'pwm',
  // UART: 'uart',
  // I2C: 'i2c',
  // SPI: 'spi',
  // BLUETOOTH: 'bluetooth',
})

/**
 * Retourne la liste de toutes les capacités standard.
 * 
 * @returns {string[]} Tableau des valeurs de capacités standard
 */
export function getAllStandardCapabilities() {
  return Object.values(STANDARD_CAPABILITIES)
}

/**
 * Vérifie si une valeur peut être utilisée comme capability.
 * 
 * ADR #3 : Le framework accepte TOUTE chaîne non vide.
 * Cette fonction ne rejette PAS les capacités non standard.
 * Elle valide uniquement le format (string non vide).
 * 
 * @param {any} capability - Valeur à valider
 * @returns {boolean} true si la valeur est une chaîne non vide
 */
export function isValidCapability(capability) {
  return typeof capability === 'string' && capability.length > 0
}