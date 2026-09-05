/**
 * Presentation-only pin coordinates.
 *
 * Electrical pin coordinates remain canonical in componentDefinitions.js and
 * continue to drive simulation/connectivity/breadboard placement. This module
 * only defines where a connector is drawn and where a wire visually lands.
 *
 * [MB-VIS-COMP-005] Le cas générique (aucune projection visuelle) déléguait
 * jusqu'ici à une réimplémentation locale de la même formule
 * (`component.x + pinDef.dx`, `component.y + pinDef.dy`, même garde
 * Number.isFinite) que `geometry.js::getPinPosition()` — duplication
 * établie (byte pour byte identique) et retirée : ce fichier délègue
 * maintenant à `getPinPosition()`, la fonction géométrique canonique
 * unique. La projection visuelle LED elle-même (LED_VISUAL_PINS) est
 * volontairement conservée telle quelle : c'est une décision de
 * présentation légitime, distincte du calcul canonique, documentée depuis
 * MB-VIS-LED-V5, qui ne déplace jamais la position électrique retournée
 * par getPinPosition() (I8) — seul l'endroit où un fil est DESSINÉ change,
 * jamais la géométrie électrique.
 */
import { getPinPosition } from "./geometry.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { scalePointAroundCenter } from "./localScale.js"

// [MB-VIS-CANVAS-052] Paramètre optionnel `{ scale }` de
// getPinPresentationPosition() (déclaration plus bas) : présentation du
// focus/local zoom, jamais une seconde géométrie électrique. `scale` vaut
// `1` par défaut (comportement strictement inchangé pour tout appelant
// existant qui ne le fournit pas — non-régression totale, LED-V5/wire
// endpoints). Quand `scale` diffère de `1`, la position de présentation
// déjà résolue (canonique ou projection par type) est reprojetée autour du
// CENTRE du composant (`component.x/y` + moitié des dimensions de
// componentDefinitions.js) par scalePointAroundCenter() — exactement la
// même formule que l'effet visuel d'un `transform: scale(scale)` posé sur
// le wrapper `.circuit-component` (CircuitComponent.jsx) avec
// `transform-origin: center center`. Seul circuitSelectors.js::buildWirePaths()
// passe `scale !== 1` (pour l'extrémité de fil du composant focalisé) ;
// CircuitComponent.jsx ne recalcule jamais la position DOM de son <Pin>,
// qui hérite déjà de la mise à l'échelle par héritage CSS naturel (enfant
// du wrapper transformé) — voir Delivery Report MB-VIS-CANVAS-052 §Design.

const LED_VISUAL_PINS = {
  anode: { x: 28, y: 62 },
  cathode: { x: 52, y: 62 },
}

/**
 * [MB-VIS-COMP-034] Projection de présentation du transistor NPN (boîtier
 * raster TO-92). Les 3 pins électriques canoniques — collector en haut
 * (45,0), base à gauche (0,45), emitter à droite (90,45) — sont DESSINÉS
 * sur les 3 véritables pattes verticales du raster, en bas du composant.
 * Décision de présentation uniquement (même statut que LED_VISUAL_PINS) :
 * la position électrique retournée par getPinPosition() n'est jamais
 * déplacée ; seul l'endroit où un connecteur / un fil est dessiné change.
 * Projection V5 validée CSA : B=(32,60) C=(42,60) E=(51,60).
 */
const NPN_TRANSISTOR_VISUAL_PINS = {
  base: { x: 32, y: 60 },
  collector: { x: 42, y: 60 },
  emitter: { x: 51, y: 60 },
}

/**
 * [MB-VIS-COMP-036] Projection de présentation de l'alimentation POWER
 * (boîtier raster benchtop DC lab supply). Les 2 pins électriques
 * canoniques — 5V (70,37), GND (58,25) — sont DESSINÉS sur les 2 bornes
 * réelles du raster (rouge/noire), en bas du composant. Décision de
 * présentation uniquement (même statut que LED_VISUAL_PINS /
 * NPN_TRANSISTOR_VISUAL_PINS) : la position électrique retournée par
 * getPinPosition() n'est jamais déplacée ; seul l'endroit où un connecteur /
 * un fil est dessiné change. La borne verte EARTH visible sur l'asset est
 * purement décorative — elle n'a pas d'entrée ici, ce n'est pas un pin
 * logique. Projection V2 validée CSA : GND=(22,67) 5V=(35,67).
 */
const POWER_VISUAL_PINS = {
  GND: { x: 22, y: 67 },
  '5V': { x: 35, y: 67 },
}

/**
 * [MB-VIS-COMP-037] Projection de présentation d'ARDUINO (carte raster
 * photoréaliste, vue de dessus). Contrairement aux composants précédents
 * (LED/NPN/POWER, dont l'asset colle aux 4 bords du canevas canonique),
 * l'asset ARDUINO est une PHOTO d'une carte complète, légèrement pivotée et
 * cadrée avec marge dans le canevas 120×140 — son silhouette réel ne
 * coïncide PAS avec les 4 coordonnées électriques canoniques D2(0,50),
 * D3(0,75), GND(0,110), 5V(120,50). Coordonnées déterminées par pixel-probe
 * indépendant du silhouette réel de l'asset installé (alpha du PNG,
 * décodeur maison, recoupé 1x et 3x/3 — cohérent à ±1 px) :
 *   - D2  : bord gauche réel de la carte à y=50  -> x≈3
 *   - D3  : bord gauche réel de la carte à y=75  -> x≈15
 *   - GND : la carte NE S'ÉTEND PAS jusqu'à y=110 (dernière ligne opaque
 *           y≈108) -> projeté sur le bord gauche réel à cette dernière
 *           ligne visible, x≈15
 *   - 5V  : bord droit réel de la carte à y=50   -> x≈115
 * Décision de présentation uniquement (même statut que LED_VISUAL_PINS /
 * NPN_TRANSISTOR_VISUAL_PINS / POWER_VISUAL_PINS) : la position électrique
 * retournée par getPinPosition() n'est jamais déplacée ; seul l'endroit où
 * un connecteur / un fil est dessiné change.
 */
const ARDUINO_VISUAL_PINS = {
  D2: { x: 3, y: 50 },
  D3: { x: 15, y: 75 },
  GND: { x: 15, y: 108 },
  '5V': { x: 115, y: 50 },
}

/**
 * Resolve the presentation coordinate of a component pin.
 * Falls back to the canonical electrical coordinate (getPinPosition(),
 * geometry.js) for every component and every pin that has no presentation
 * override.
 */
export function getPinPresentationPosition(component, pinDef, { scale = 1 } = {}) {
  if (!component || !pinDef) return null

  let basePos = null

  if (component.type === "LED" && LED_VISUAL_PINS[pinDef.id]) {
    const visual = LED_VISUAL_PINS[pinDef.id]
    const x = component.x + visual.x
    const y = component.y + visual.y
    basePos = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  } else if (component.type === "NPN_TRANSISTOR" && NPN_TRANSISTOR_VISUAL_PINS[pinDef.id]) {
    const visual = NPN_TRANSISTOR_VISUAL_PINS[pinDef.id]
    const x = component.x + visual.x
    const y = component.y + visual.y
    basePos = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  } else if (component.type === "POWER" && POWER_VISUAL_PINS[pinDef.id]) {
    const visual = POWER_VISUAL_PINS[pinDef.id]
    const x = component.x + visual.x
    const y = component.y + visual.y
    basePos = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  } else if (component.type === "ARDUINO" && ARDUINO_VISUAL_PINS[pinDef.id]) {
    const visual = ARDUINO_VISUAL_PINS[pinDef.id]
    const x = component.x + visual.x
    const y = component.y + visual.y
    basePos = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  } else {
    basePos = getPinPosition(component, pinDef)
  }

  if (!basePos) return null
  if (!Number.isFinite(scale) || scale === 1) return basePos

  // [MB-VIS-CANVAS-052] Centre de mise à l'échelle : dérivé des dimensions
  // canoniques de componentDefinitions.js (jamais d'un getBoundingClientRect
  // déjà transformé — Blueprint H). Un type inconnu/dimensions absentes
  // retombe sur 0 (aucun décalage) plutôt que de produire NaN.
  const def = getComponentDef(component.type)
  const width = def?.width ?? 0
  const height = def?.height ?? 0
  const center = { x: component.x + width / 2, y: component.y + height / 2 }
  return scalePointAroundCenter(basePos, center, scale)
}

export function getLedVisualPinPosition(pinId) {
  const visual = LED_VISUAL_PINS[pinId]
  return visual ? { ...visual } : null
}
