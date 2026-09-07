/**
 * contactModel.js — FT-B-001-S2.
 *
 * Modèle générique des CONTACTS PHYSIQUES d'un pin de présentation.
 *
 * Une pin canonique (identité électrique = `component uid` + `pin.id`) porte
 * un ou plusieurs contacts physiques. Le contact est une identité de
 * PRÉSENTATION / D'ASSEMBLAGE uniquement : `contact.id` n'est JAMAIS un nœud
 * électrique et ne doit jamais remplacer `pin.id` dans une jointure de net.
 *
 * Source de vérité : `componentDefinitions.js` (`PIN_PRESENTATION_BY_TYPE` →
 * `buildPins()`), qui pose un tableau `contacts` optionnel sur la pin. Ce
 * module n'ajoute AUCUN registre de coordonnées et ne contient AUCUN
 * branchement `type === "…"` : il ne fait que lire la définition fournie et
 * synthétiser le contact implicite pour les pins mono-contact (cas courant,
 * comportement historique strictement préservé).
 *
 * Une pin SANS `contacts` explicite ⇒ EXACTEMENT UN contact implicite situé
 * en `pin.dx` / `pin.dy` (id = `pin.id`) : tout composant ordinaire à un
 * contact par pin se comporte comme avant S2.
 */

/**
 * @typedef {Object} PhysicalContact
 * @property {string} id                  identité de présentation, unique dans la pin
 * @property {number} dx                  offset local X (repère du composant)
 * @property {number} dy                  offset local Y
 * @property {boolean} wireConnectable    un fil peut s'y ancrer
 * @property {boolean} breadboardInsertable  métadonnée passive S2 (non consommée par le breadboard avant S3)
 */

/**
 * Contacts physiques d'une pin de présentation, dans l'ordre de déclaration.
 *
 * - `pinDef.contacts` présent et non vide ⇒ renvoyé tel quel, chaque entrée
 *   normalisée (`wireConnectable`/`breadboardInsertable` par défaut `true`,
 *   `dx`/`dy` repliés sur ceux de la pin si absents).
 * - sinon ⇒ un unique contact implicite `{ id: pinDef.id, dx: pinDef.dx,
 *   dy: pinDef.dy, wireConnectable: true, breadboardInsertable: true }`.
 *
 * @param {{ id:string, dx?:number, dy?:number, contacts?:Array }} pinDef
 * @returns {PhysicalContact[]}
 */
export function resolveContacts(pinDef) {
  if (!pinDef || typeof pinDef !== "object") return []

  const pinDx = Number.isFinite(pinDef.dx) ? pinDef.dx : 0
  const pinDy = Number.isFinite(pinDef.dy) ? pinDef.dy : 0

  if (Array.isArray(pinDef.contacts) && pinDef.contacts.length > 0) {
    return pinDef.contacts.map((c) => ({
      id: String(c?.id),
      dx: Number.isFinite(c?.dx) ? c.dx : pinDx,
      dy: Number.isFinite(c?.dy) ? c.dy : pinDy,
      wireConnectable: c?.wireConnectable !== false,
      breadboardInsertable: c?.breadboardInsertable !== false,
    }))
  }

  return [{
    id: String(pinDef.id),
    dx: pinDx,
    dy: pinDy,
    wireConnectable: true,
    breadboardInsertable: true,
  }]
}

/**
 * Contacts d'une pin auxquels un fil peut s'ancrer (⊆ resolveContacts).
 * Un contact implicite est toujours `wireConnectable`.
 *
 * @param {object} pinDef
 * @returns {PhysicalContact[]}
 */
export function resolveWireConnectableContacts(pinDef) {
  return resolveContacts(pinDef).filter((c) => c.wireConnectable)
}

/**
 * Contact physique par DÉFAUT d'une pin — déterministe : le PREMIER contact
 * déclaré (donc, pour une pin mono-contact, le contact implicite = la pin).
 * Stable après export/import et undo/redo (l'ordre vit dans le code, jamais
 * dans le Document).
 *
 * @param {object} pinDef
 * @returns {PhysicalContact | null}
 */
export function getDefaultContact(pinDef) {
  const contacts = resolveContacts(pinDef)
  return contacts.length > 0 ? contacts[0] : null
}

/**
 * `contact.id` par défaut d'une pin (ou `null`).
 * @param {object} pinDef
 * @returns {string | null}
 */
export function getDefaultContactId(pinDef) {
  const c = getDefaultContact(pinDef)
  return c ? c.id : null
}

/**
 * Résout le contact physique effectif d'un endpoint de fil, avec repli
 * DÉTERMINISTE. `contactId` est une ancre VISUELLE : un identifiant absent,
 * inconnu ou périmé retombe TOUJOURS sur le contact par défaut de LA MÊME
 * pin canonique — jamais sur une autre pin, jamais d'erreur, jamais
 * d'inférence pixel.
 *
 * Règles (FT-B-001-S2 §10) :
 *  A. pin sans `contacts` → contact implicite (pin.dx/dy) ;
 *  B. pin à un seul contact → ce contact ;
 *  C. pin multi-contacts + `contactId` absent → premier contact déclaré ;
 *  D. `contactId` inconnu/périmé → contact par défaut de cette même pin.
 *
 * INVARIANT ABSOLU : ne change JAMAIS `pin.id`. Aucune conséquence
 * électrique.
 *
 * @param {object} pinDef
 * @param {string | null | undefined} contactId
 * @returns {PhysicalContact | null}
 */
export function resolveContact(pinDef, contactId) {
  const contacts = resolveContacts(pinDef)
  if (contacts.length === 0) return null
  if (contactId != null) {
    const found = contacts.find((c) => c.id === String(contactId))
    if (found) return found
  }
  return contacts[0]
}
