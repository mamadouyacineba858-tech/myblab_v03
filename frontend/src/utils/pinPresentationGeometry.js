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
 * Resolve the presentation coordinate of a component pin.
 * Falls back to the canonical electrical coordinate (getPinPosition(),
 * geometry.js) for every component and every pin that has no presentation
 * override.
 */
export function getPinPresentationPosition(component, pinDef) {
  if (!component || !pinDef) return null

  if (component.type === "LED" && LED_VISUAL_PINS[pinDef.id]) {
    const visual = LED_VISUAL_PINS[pinDef.id]
    const x = component.x + visual.x
    const y = component.y + visual.y
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    return { x, y }
  }

  if (component.type === "NPN_TRANSISTOR" && NPN_TRANSISTOR_VISUAL_PINS[pinDef.id]) {
    const visual = NPN_TRANSISTOR_VISUAL_PINS[pinDef.id]
    const x = component.x + visual.x
    const y = component.y + visual.y
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    return { x, y }
  }

  return getPinPosition(component, pinDef)
}

export function getLedVisualPinPosition(pinId) {
  const visual = LED_VISUAL_PINS[pinId]
  return visual ? { ...visual } : null
}
