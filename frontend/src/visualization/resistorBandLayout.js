/**
 * resistorBandLayout.js — MB-L1-PROP-004
 *
 * Contrat géométrique UNIQUE des bandes RESISTOR : aucune coordonnée de
 * bande ne doit être dispersée dans ResistorPart.jsx ou CircuitComponent.css
 * — tout consommateur lit ce module.
 *
 * Coordonnées exprimées en POURCENTAGE de la boîte canonique du composant
 * (`getComponentDef("RESISTOR")`, 84×28 — jamais recopiée ici en dur en
 * pixels absolus) : un CSS `left/width/top/height` en `%` suit alors
 * automatiquement, sans aucune correction JS, le zoom global, le
 * `localScale` de focus et tout redimensionnement futur — le wrapper
 * `.circuit-component` applique un unique `transform: scale()` qui agrandit
 * déjà uniformément l'asset, les <Pin> et donc, avec ce contrat en `%`,
 * les bandes (cf. commentaires MB-VIS-CANVAS-052 de CircuitComponent.jsx).
 *
 * Origine des valeurs : mesure pixel par pixel de
 * `resistor.base.3x.png` (510×171, 3x de 170×57) à la génération de
 * l'asset neutre MB-L1-PROP-004 — les 4 emplacements correspondent
 * exactement à l'empreinte des anciennes bandes peintes fixes
 * (marron/noir/rouge/or) retirées de `resistor.default.3x.png`, pour que
 * la projection dynamique occupe la même zone visuelle que l'ancien rendu
 * figé. Hauteur/position verticale : intersection (jamais un dépassement)
 * de l'emprise alpha réelle du corps sur les 4 plages de colonnes, pour
 * qu'aucune bande ne puisse jamais déborder du corps ni recouvrir les
 * fils (§13/§14 du ticket).
 */

// Bandes 1-3 (chiffres + multiplicateur) resserrées ; bande de tolérance
// nettement séparée par un intervalle plus large — reproduit fidèlement
// l'espacement d'une vraie résistance 4 bandes (cf. §13 : séparation
// visuelle obligatoire de la bande de tolérance).
const FOUR_BAND_LAYOUT = Object.freeze([
  Object.freeze({ slot: 'digit1', leftPercent: 35.88, widthPercent: 4.70, topPercent: 28.64, heightPercent: 40.93 }),
  Object.freeze({ slot: 'digit2', leftPercent: 43.14, widthPercent: 4.51, topPercent: 28.64, heightPercent: 40.93 }),
  Object.freeze({ slot: 'multiplier', leftPercent: 51.76, widthPercent: 4.90, topPercent: 28.64, heightPercent: 40.93 }),
  Object.freeze({ slot: 'tolerance', leftPercent: 60.79, widthPercent: 3.92, topPercent: 28.64, heightPercent: 40.93 }),
])

// Point d'extension pour de futurs modèles à 5/6 bandes — voir
// resistorColorCode.js `BAND_COUNT_STRATEGIES` (même principe d'extension,
// aucune réécriture du renderer requise pour ajouter une entrée ici).
const BAND_LAYOUT_BY_COUNT = {
  4: FOUR_BAND_LAYOUT,
}

/**
 * @param {number} [bandCount]
 * @returns {ReadonlyArray<{slot:string, leftPercent:number, widthPercent:number, topPercent:number, heightPercent:number}>}
 *   Toujours dans le même ordre que `encodeResistorColorCode(...).bands`
 *   pour le même `bandCount` — un consommateur zippe les deux tableaux par
 *   index.
 */
export function getResistorBandLayout(bandCount = 4) {
  return BAND_LAYOUT_BY_COUNT[bandCount] ?? []
}
