/**
 * PotentiometerModel — Modèle électrique d'un potentiomètre.
 *
 * MB-SIM-008 v2 : modèle DC SIMPLIFIÉ à 3 broches (LEFT / WIPER / RIGHT).
 * Représentation retenue pour la position du curseur : un ratio `position`
 * dans [0, 1] (0 = extrémité LEFT, 1 = extrémité RIGHT), qui détermine deux
 * résistances équivalentes calculées par la contribution DC (voir
 * simulator/dcContributionRegistry.js) :
 *   - resistance(LEFT ↔ WIPER)  = resistance × position
 *   - resistance(WIPER ↔ RIGHT) = resistance × (1 - position)
 * Ce choix est documenté ici conformément à la délégation de conception du
 * ticket MB-SIM-008 v2 (§9) : c'est la représentation la plus directement
 * compatible avec le motif de contribution résistif déjà utilisé pour
 * RESISTOR/LDR/THERMISTOR/DC_MOTOR (loi d'Ohm sur une valeur de résistance
 * effective), sans introduire de nouveau formalisme. Aucune dépendance au
 * temps, aucune dynamique de rotation du curseur.
 *
 * Le contrat déclaratif du composant est porté par le Registry canonique.
 * Le modèle conserve uniquement son comportement de validation. La
 * contribution au solveur DC est portée séparément par
 * simulator/dcContributionRegistry.js.
 */

export const PotentiometerModel = {
  type: 'POTENTIOMETER',
  validate(params) {
    if (!params || typeof params !== 'object') return false
    if (typeof params.resistance !== 'number') return false
    if (!Number.isFinite(params.resistance)) return false
    if (params.resistance <= 0) return false
    if (typeof params.position !== 'number') return false
    if (!Number.isFinite(params.position)) return false
    if (params.position < 0 || params.position > 1) return false
    return true
  },
}
