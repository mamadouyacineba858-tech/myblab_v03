/**
 * Presentation-only pin coordinates.
 *
 * Electrical pin coordinates remain canonical in componentDefinitions.js and
 * continue to drive simulation/connectivity/breadboard placement. This module
 * only defines where a connector is drawn and where a wire visually lands.
 *
 * [MB-VIS-COMP-005] Le cas générique délègue à `geometry.js::getPinPosition()`,
 * la fonction géométrique canonique unique.
 *
 * [FT-B-001-S4/S5 — Physical Contact Presentation Convergence] Le point
 * physique de présentation d'une pin est résolu de façon GÉNÉRIQUE via le
 * modèle PhysicalContact (`utils/contactModel.js`), SANS aucune branche de
 * type :
 *   1. un `contact` explicite fourni par l'appelant est prioritaire ;
 *   2. sinon, si la pin déclare des `contacts`, on résout son contact PAR
 *      DÉFAUT (première déclaration) ;
 *   3. sinon, `getPinPosition()`.
 *
 * Les 6 registres `*_VISUAL_PINS` de la dette FT-B sont SUPPRIMÉS :
 * LED_VISUAL_PINS (== géométrie canonique), BUTTON_VISUAL_PINS /
 * BUTTON_LATCHING_VISUAL_PINS (== contact par défaut S2, patte basse) en S4 ;
 * NPN_TRANSISTOR_VISUAL_PINS / POWER_VISUAL_PINS / ARDUINO_VISUAL_PINS en S5
 * (leurs coordonnées vivent dans les `contacts` déclarés). `pin.dx/dy`
 * (géométrie électrique canonique) n'est jamais déplacée.
 */
import { getPinPosition } from "./geometry.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { scalePointAroundCenter } from "./localScale.js"
import { getDefaultContact } from "./contactModel.js"

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

/**
 * Resolve the presentation coordinate of a component pin.
 *
 * Résolution GÉNÉRIQUE, sans aucune branche de type (FT-B-001-S5 : les 6
 * registres `*_VISUAL_PINS` de la dette FT-B — LED / BUTTON / BUTTON_LATCHING
 * en S4, NPN_TRANSISTOR / POWER / ARDUINO en S5 — sont SUPPRIMÉS ; leurs
 * coordonnées vivent désormais dans les `contacts` déclarés de
 * componentDefinitions.js). Ordre :
 *   1. si `pinDef` déclare des `contacts` ⇒ le modèle PhysicalContact est
 *      AUTORITAIRE : `contact` demandé, sinon contact PAR DÉFAUT (première
 *      déclaration) ;
 *   2. sinon, si un `contact` (implicite, synthétisé par l'appelant) est
 *      fourni avec des dx/dy finis ⇒ `component.x/y + contact.dx/dy` ;
 *   3. sinon ⇒ `getPinPosition()` (géométrie canonique).
 *
 * `contact.dx/dy` n'est jamais un nouvel oracle : il provient de
 * componentDefinitions.js (`PIN_PRESENTATION_BY_TYPE`). La position électrique
 * (getPinPosition, breadboard, simulation) n'est jamais déplacée. La
 * reprojection `scale` (focus/localScale, MB-VIS-CANVAS-052) s'applique
 * ensuite à l'identique.
 */
export function getPinPresentationPosition(component, pinDef, { scale = 1, contact } = {}) {
  if (!component || !pinDef) return null

  let basePos = null

  const hasDeclaredContacts = Array.isArray(pinDef.contacts) && pinDef.contacts.length > 0

  if (hasDeclaredContacts) {
    const chosen =
      contact && Number.isFinite(contact.dx) && Number.isFinite(contact.dy)
        ? contact
        : getDefaultContact(pinDef)
    if (chosen && Number.isFinite(chosen.dx) && Number.isFinite(chosen.dy)) {
      const x = component.x + chosen.dx
      const y = component.y + chosen.dy
      basePos = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
    }
  } else if (contact && Number.isFinite(contact.dx) && Number.isFinite(contact.dy)) {
    const x = component.x + contact.dx
    const y = component.y + contact.dy
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
