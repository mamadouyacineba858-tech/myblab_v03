/**
 * assemblyGeometry.js — FT-C-001-A "Through-Hole Assembly Geometry".
 *
 * Résout la GÉOMÉTRIE VISUELLE D'ASSEMBLAGE d'un composant traversant : pour
 * chaque contact physique visible, le segment `root → target` que
 * `AssemblyLeadsLayer` dessine comme patte / cosse.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Assembly Geometry est DÉRIVÉE, LECTURE SEULE, PRÉSENTATION UNIQUEMENT.  │
 * │  (ruling FT-C-001-R1 §10)                                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Sources (aucune nouvelle vérité) :
 *  - `component` rendu (`x`, `y`, `type`) — déjà l'objet d'aperçu pendant un
 *    drag / une insertion (useCircuitState.js) : l'Assembly Geometry suit donc
 *    automatiquement drag → insertion → position finale → déplacement du
 *    breadboard → undo/redo, SANS second état persistant ;
 *  - `getComponentDef(type)` (dimensions + pins canoniques) ;
 *  - modèle PhysicalContact (`utils/contactModel.js`) — extrémité réelle d'une
 *    patte, inchangée par ce ticket ;
 *  - `breadboard` + `resolveComponentContactHoles()` (primitive S3) — trous
 *    réellement résolus ; `getBreadboardHolePosition()` — leur centre exact ;
 *  - profil mécanique de présentation (`visualization/assemblyProfiles.js`) —
 *    point de naissance de la patte sous le corps.
 *
 * INTERDITS respectés : aucun `*_VISUAL_PINS`, aucun état Document d'assembly,
 * `contactId` jamais une identité électrique, aucun net model, aucune branche
 * `type === …`, aucun nouveau pas / tolérance, aucune mutation.
 *
 * INVARIANT DE COÏNCIDENCE : `contact.target` est TOUJOURS le PhysicalContact
 * naturel (`component.{x,y} + contact.{dx,dy}`) — exactement ce que renvoie
 * `getPinPresentationPosition()` (hit target du <Pin>) et
 * `buildWirePaths()` (extrémité de fil). L'extrémité de patte, le hit target et
 * l'endpoint de fil coïncident donc PAR CONSTRUCTION. Quand le composant est
 * enfiché, `computeBreadboardPlacement()` a déjà aligné ses PhysicalContacts
 * sur les trous (tolérance ±2) : `contact.hole` / `contact.holePosition`
 * exposent le trou résolu et son centre exact (dérivés, pour les preuves et la
 * QA), sans jamais déplacer `target`.
 */
import { getComponentDef } from "../config/componentDefinitions.js"
import { resolveWireConnectableContacts } from "./contactModel.js"
import {
  resolveComponentContactHoles,
  getBreadboardHolePosition,
} from "./breadboardGeometry.js"
import { getAssemblyProfile } from "../visualization/assemblyProfiles.js"

// Les `pin.id` / `contact.id` du catalogue sont alphanumériques (anode, base,
// B, 1a, …) : "|" ne peut jamais y apparaître, la clé est donc sans collision.
function contactKey(pinId, contactId) {
  return `${pinId}|${contactId}`
}

/**
 * @typedef {Object} AssemblyContact
 * @property {string} pinId                identité électrique canonique (inchangée)
 * @property {string} contactId            identité de PRÉSENTATION uniquement
 * @property {{x:number,y:number}} root    naissance mécanique de la patte (sous le corps)
 * @property {{x:number,y:number}} target  PhysicalContact naturel = hit target = endpoint fil
 * @property {{column:number,row:number}|null} hole   trou breadboard résolu, ou null
 * @property {{x:number,y:number}|null} holePosition  centre exact du trou résolu, ou null
 * @property {'wire'|'lug'} style
 */

/**
 * @typedef {Object} AssemblyGeometry
 * @property {boolean} inserted   au moins un contact enfichable ET tous résolus
 * @property {AssemblyContact[]} contacts   ordre (pin, puis contact) préservé
 */

const EMPTY = Object.freeze({ inserted: false, contacts: [] })

/**
 * @param {{ type?: string, x?: number, y?: number } | null} component  objet rendu (aperçu inclus)
 * @param {{ id?: string, position?: {x:number,y:number} } | null} breadboard
 * @param {{ def?: object, profile?: (import('../visualization/assemblyProfiles.js').AssemblyProfile)|null }} [options]
 * @returns {AssemblyGeometry}
 */
export function resolveAssemblyGeometry(component, breadboard, options = {}) {
  const def = options.def ?? getComponentDef(component?.type)
  if (!component || !def || !Array.isArray(def.pins)) return EMPTY

  const ox = Number.isFinite(component.x) ? component.x : NaN
  const oy = Number.isFinite(component.y) ? component.y : NaN
  if (!Number.isFinite(ox) || !Number.isFinite(oy)) return EMPTY

  const profile =
    options.profile !== undefined ? options.profile : getAssemblyProfile(component.type)

  // Assembly Geometry = composants TRAVERSANTS uniquement. Un type sans profil
  // mécanique (RESISTOR, POWER, ARDUINO, BUZZER, CAPACITOR tant que FT-C-001-B
  // n'a pas livré son asset radial, …) ne produit AUCUNE patte dynamique —
  // géométrie vide, `AssemblyLeadsLayer` ne rend rien (aucune patte fantôme).
  if (!profile || !profile.leads || typeof profile.leads !== "object") return EMPTY

  // Trous réellement résolus, par CONTACT enfichable (primitive S3, contact-aware,
  // même `holeAt()` — aucun arrondi / tolérance dupliqué). Politique locale :
  // ENFICHÉ = au moins un contact enfichable ET tous résolus (résultats partiels
  // ⇒ non enfiché, politique sûre §34-C).
  const holeByKey = new Map()
  let insertableCount = 0
  let insertableResolved = 0
  if (breadboard && breadboard.position) {
    const { results } = resolveComponentContactHoles(breadboard, def.pins, { x: ox, y: oy })
    for (const r of results) {
      insertableCount += 1
      if (r.resolved && r.hole) {
        insertableResolved += 1
        holeByKey.set(contactKey(r.pinId, r.contactId), r.hole)
      }
    }
  }
  const inserted = insertableCount > 0 && insertableResolved === insertableCount

  const contacts = []
  for (const pin of def.pins) {
    const leadProfile = profile.leads[pin.id] ?? null

    // Une patte par contact VISIBLE (câblable) — MÊME ensemble que les hit
    // targets <Pin> (CircuitComponent.jsx consomme resolveWireConnectableContacts).
    for (const physical of resolveWireConnectableContacts(pin)) {
      const target = { x: ox + physical.dx, y: oy + physical.dy }

      let root = target
      if (
        leadProfile &&
        leadProfile.root &&
        Number.isFinite(leadProfile.root.dx) &&
        Number.isFinite(leadProfile.root.dy)
      ) {
        root = { x: ox + leadProfile.root.dx, y: oy + leadProfile.root.dy }
      }

      const hole = holeByKey.get(contactKey(pin.id, physical.id)) ?? null
      const holePosition = hole
        ? getBreadboardHolePosition(breadboard, hole.column, hole.row)
        : null

      contacts.push({
        pinId: pin.id,
        contactId: physical.id,
        root,
        target,
        hole: hole ? { column: hole.column, row: hole.row } : null,
        holePosition,
        style: leadProfile && leadProfile.style === "lug" ? "lug" : "wire",
      })
    }
  }

  return { inserted, contacts }
}
