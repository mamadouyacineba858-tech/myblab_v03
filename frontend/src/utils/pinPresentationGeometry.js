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
 * [FT-B-001-S4 — Physical Contact Presentation Convergence] Le point physique
 * de présentation d'une pin est désormais résolu de façon GÉNÉRIQUE via le
 * modèle PhysicalContact (`utils/contactModel.js`) :
 *   1. un `contact` explicite fourni par l'appelant est prioritaire ;
 *   2. sinon, si la pin déclare des `contacts`, on résout son contact PAR
 *      DÉFAUT (première déclaration) — cela remplace les anciennes constantes
 *      LED_VISUAL_PINS / BUTTON_VISUAL_PINS / BUTTON_LATCHING_VISUAL_PINS,
 *      SUPPRIMÉES : LED == géométrie canonique, BUTTON* == contact par défaut
 *      S2 (patte basse), tous pixel-identiques ;
 *   3. sinon, `getPinPosition()`.
 *
 * EXCEPTIONS TEMPORAIRES `NPN_TRANSISTOR_VISUAL_PINS` / `POWER_VISUAL_PINS` /
 * `ARDUINO_VISUAL_PINS` : conservées jusqu'à FT-B-001-S5. Leur point physique
 * de présentation diverge encore de `pin.dx/dy`, or `pin.dx/dy` porte pour ces
 * types un contrat d'attachement breadboard historique (MB-BREADBOARD-005/007
 * pour POWER, MB-BREADBOARD-008 pour ARDUINO). Les migrer en PhysicalContact
 * maintenant changerait la géométrie consommée par S3 pour l'enfichage — hors
 * périmètre S4. Ces 3 branches restent des décisions de présentation pure :
 * la position électrique retournée par getPinPosition() n'est jamais déplacée.
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
 * [MB-VIS-COMP-034] Projection de présentation du transistor NPN (boîtier
 * raster TO-92). Les 3 pins électriques canoniques — collector en haut
 * (45,0), base à gauche (0,45), emitter à droite (90,45) — sont DESSINÉS
 * sur les 3 véritables pattes verticales du raster, en bas du composant.
 * Décision de présentation uniquement (même statut que LED_VISUAL_PINS) :
 * la position électrique retournée par getPinPosition() n'est jamais
 * déplacée ; seul l'endroit où un connecteur / un fil est dessiné change.
 * Projection V5 validée CSA : B=(32,60) C=(42,60) E=(51,60).
 */
// TODO FT-B-001-S5 — legacy breadboard attachment contract.
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
// TODO FT-B-001-S5 — legacy breadboard attachment contract (MB-BREADBOARD-005/007).
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
// TODO FT-B-001-S5 — legacy breadboard attachment contract (MB-BREADBOARD-008).
const ARDUINO_VISUAL_PINS = {
  D2: { x: 3, y: 50 },
  D3: { x: 15, y: 75 },
  GND: { x: 15, y: 108 },
  '5V': { x: 115, y: 50 },
}

/**
 * Resolve the presentation coordinate of a component pin.
 *
 * Résolution générique (FT-B-001-S4). Ordre :
 *   1. si `pinDef` déclare des `contacts` ⇒ le modèle PhysicalContact est
 *      AUTORITAIRE pour cette pin : on utilise le `contact` demandé, sinon son
 *      contact PAR DÉFAUT (première déclaration). Remplace LED_VISUAL_PINS
 *      (== canonique) et BUTTON_VISUAL_PINS / BUTTON_LATCHING_VISUAL_PINS
 *      (== contact par défaut S2, patte basse dy 58), SUPPRIMÉS ;
 *   2. exceptions TEMPORAIRES NPN_TRANSISTOR / POWER / ARDUINO ⇒
 *      `*_VISUAL_PINS`. Elles PRÉCÈDENT la résolution générique du contact
 *      (§3 ci-dessous) : un contact implicite synthétisé par l'appelant
 *      (CircuitComponent) ne doit pas court-circuiter la projection visuelle
 *      historique tant que S5 n'a pas tranché leur contrat d'attachement
 *      breadboard (MB-BREADBOARD-005/007 pour POWER, MB-BREADBOARD-008 pour
 *      ARDUINO) ;
 *   3. sinon, si un `contact` (implicite ou explicite) est fourni avec des
 *      dx/dy finis ⇒ `component.x/y + contact.dx/dy` (LED, RESISTOR, …) ;
 *   4. sinon ⇒ `getPinPosition()` (géométrie canonique).
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
  } else if (component.type === "NPN_TRANSISTOR" && NPN_TRANSISTOR_VISUAL_PINS[pinDef.id]) {
    // TODO FT-B-001-S5 — legacy breadboard attachment contract.
    const visual = NPN_TRANSISTOR_VISUAL_PINS[pinDef.id]
    const x = component.x + visual.x
    const y = component.y + visual.y
    basePos = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  } else if (component.type === "POWER" && POWER_VISUAL_PINS[pinDef.id]) {
    // TODO FT-B-001-S5 — legacy breadboard attachment contract (MB-BREADBOARD-005/007).
    const visual = POWER_VISUAL_PINS[pinDef.id]
    const x = component.x + visual.x
    const y = component.y + visual.y
    basePos = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  } else if (component.type === "ARDUINO" && ARDUINO_VISUAL_PINS[pinDef.id]) {
    // TODO FT-B-001-S5 — legacy breadboard attachment contract (MB-BREADBOARD-008).
    const visual = ARDUINO_VISUAL_PINS[pinDef.id]
    const x = component.x + visual.x
    const y = component.y + visual.y
    basePos = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
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
