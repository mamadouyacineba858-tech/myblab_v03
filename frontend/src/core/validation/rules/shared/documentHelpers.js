/**
 * Utilitaires internes partagés par les règles de validation MB-CF4-001.
 *
 * Ne redéfinissent aucune API Core existante : dérivent uniquement des
 * structures réelles (Document Core, canonicalRegistry) déjà en place.
 * canonicalRegistry.js reste la seule source de vérité des types, pins,
 * rôles et paramètres (conformément au contrat CF4 et à CSA-CF4-001-A).
 */
import { getCanonicalEntry } from '../../../../simulator/canonicalRegistry.js'

/**
 * Liste effective des composants à valider : ceux déjà présents dans le
 * Document, plus — uniquement lorsque la commande en cours est
 * ADD_COMPONENT — le composant que la commande propose d'ajouter.
 *
 * Nécessaire car la validation est pré-exécution (ADR-010) : au moment de
 * l'appel, le composant proposé n'existe pas encore dans le Document reçu
 * par AddComponentHandler.
 */
export function getEffectiveComponents(document, command) {
  const existing = (document && document.components) || []
  if (command && command.type === 'ADD_COMPONENT' && command.payload && command.payload.componentType) {
    const { componentType, position = { x: 0, y: 0 }, parameters = {} } = command.payload
    const pending = {
      id: command.payload.componentId || '__pending_add_component__',
      type: componentType,
      position: { ...position },
      parameters: { ...parameters },
    }
    return [...existing, pending]
  }
  return existing
}

/**
 * Wires effectifs à valider.
 *
 * MB-CF3-001 ne route pas addWire via le CommandBus (hors périmètre,
 * cf. CSA-CF3-001 Q2) : les wires effectifs sont donc aujourd'hui toujours
 * ceux déjà présents dans le Document. Cette fonction reste néanmoins
 * générique (signature (document, command)) pour ne pas coupler les
 * règles à cette limitation temporaire du périmètre CF3.
 */
export function getEffectiveWires(document) {
  return (document && document.wires) || []
}

export function findComponent(components, componentId) {
  return components.find((c) => c.id === componentId) || null
}

/**
 * Résout le rôle canonique d'un pin donné pour un componentId présent dans
 * la liste de composants fournie. Retourne null si le composant, son type
 * canonique, ou le pin lui-même sont introuvables (résolution défensive —
 * les règles appelantes décident si cela constitue un problème).
 */
export function resolvePinRole(components, componentId, pinId) {
  const component = findComponent(components, componentId)
  if (!component) return null
  const entry = getCanonicalEntry(component.type)
  if (!entry || !Array.isArray(entry.pins)) return null
  const pin = entry.pins.find((p) => p.id === pinId)
  return pin ? pin.role : null
}

/**
 * [CSA-CF4-001-A — amendement anti-duplication] Détermine si un rôle
 * canonique (chaîne renvoyée par resolvePinRole, donc déjà issue de
 * canonicalRegistry) appartient à une "famille" de rôles apparentés
 * (ex. famille "power" = {"power", "power_out"}).
 *
 * canonicalRegistry.js ne modélise pas explicitement de notion de famille :
 * les rôles y sont de simples chaînes ("power", "power_out", "ground",
 * "ground_out", ...) suivant la convention "<base>" / "<base>_out". Plutôt
 * que de dupliquer localement l'énumération des variantes connues (ce que
 * faisaient POWER_ROLES/GROUND_ROLES avant cet amendement — une seconde
 * source de vérité qui aurait pu diverger silencieusement du Registry), on
 * dérive l'appartenance à la famille directement de cette convention de
 * nommage déjà utilisée par le Registry, sans coder en dur la liste des
 * suffixes existants. Toute évolution future de canonicalRegistry.js suivant
 * la même convention (ex. un rôle "power_in") est donc gérée automatiquement.
 */
export function roleMatchesFamily(role, familyPrefix) {
  if (typeof role !== 'string') return false
  return role === familyPrefix || role.startsWith(`${familyPrefix}_`)
}

/**
 * [CSA-CF4-001-A — amendement anti-duplication] Indique si le type canonique
 * donné expose, dans canonicalRegistry.js, au moins un pin du rôle exact
 * fourni. Permet aux règles CF4 de dériver des faits ("ce type est-il une
 * source d'alimentation ?") directement des pins déclarés dans le Registry,
 * plutôt que de coder en dur un nom de type (ex. "POWER") qui dupliquerait
 * une connaissance déjà présente — et potentiellement amenée à évoluer —
 * dans canonicalRegistry.js.
 */
export function typeHasCanonicalPinRole(type, role) {
  const entry = getCanonicalEntry(type)
  return !!entry && Array.isArray(entry.pins) && entry.pins.some((p) => p.role === role)
}

/**
 * [CSA-CF4-001-A — amendement anti-duplication] Résout, pour un type
 * canonique donné, la clé de paramètre (ex. "resistance") déclarée dans le
 * parameterSchema de canonicalRegistry.js pour un parameterType donné
 * (ex. "resistance"). Remplace le codage en dur du nom de clé dans les
 * règles ELE-001/002/003 : si canonicalRegistry.js renommait un jour cette
 * clé, la règle continuerait de cibler le bon champ sans modification,
 * puisque parameterType (la classification sémantique du paramètre) reste
 * la donnée stable côté Registry. Retourne null si le type ou le paramètre
 * n'existe pas — les règles appelantes traitent alors l'absence comme
 * "rien à valider" (défensif, cohérent avec resolvePinRole).
 */
export function getCanonicalParameterKeyByType(type, parameterType) {
  const entry = getCanonicalEntry(type)
  if (!entry || !Array.isArray(entry.parameterSchema)) return null
  const schema = entry.parameterSchema.find((p) => p.parameterType === parameterType)
  return schema ? schema.key : null
}
