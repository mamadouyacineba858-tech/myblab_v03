/**
 * breadboardElectricalIdentity.js — FT-C-BREAD-MULTI-001-B (CSA D2).
 *
 * PRIMITIVE UNIQUE d'identité électrique GLOBALE d'un groupe de breadboard.
 *
 * `holeAt()` (breadboardGeometry.js, NON modifié) produit une identité de
 * groupe LOCALE au breadboard (rail / colonne de strip). Deux breadboards
 * distincts peuvent produire la même identité locale : `A` et `B` ont chacun
 * un « rail + haut ». Elles NE désignent PAS le même réseau électrique.
 *
 * `makeBreadboardGroupKey(breadboardId, localGroupKey)` enveloppe l'identité
 * locale dans une clé GLOBALE :
 *   - déterministe (mêmes entrées -> même sortie) ;
 *   - stable (utilisable comme clé Map / Set / union-find) ;
 *   - collision-safe : deux couples (id, local) distincts ne peuvent JAMAIS
 *     produire la même clé, même si un `breadboardId` ou un `localGroupKey`
 *     contient le séparateur naïf ':' (c'est précisément pourquoi on n'utilise
 *     pas `breadboardId + ':' + localGroupKey`).
 *
 * INVARIANT ÉLECTRIQUE : aucune égalité d'identité LOCALE ne relie deux
 * breadboards. Une continuité inter-breadboards n'existe QUE via un élément
 * électrique explicite (wire trou<->trou), traité par l'union-find de
 * breadboardConnectivity.js sur ces clés globales.
 */

/**
 * @param {string} breadboardId  identité du breadboard propriétaire du groupe
 * @param {string} localGroupKey identité de groupe locale (sortie de holeAt())
 * @returns {string} clé électrique globale, collision-safe
 */
export function makeBreadboardGroupKey(breadboardId, localGroupKey) {
  return JSON.stringify(['bbgroup', String(breadboardId), String(localGroupKey)])
}

/**
 * Décode une clé produite par `makeBreadboardGroupKey`. Utilitaire de test /
 * debug — la dérivation de connectivité n'a besoin que de l'égalité de clés.
 *
 * @param {string} globalGroupKey
 * @returns {{ breadboardId: string, localGroupKey: string } | null}
 */
export function parseBreadboardGroupKey(globalGroupKey) {
  try {
    const parsed = JSON.parse(globalGroupKey)
    if (!Array.isArray(parsed) || parsed.length !== 3 || parsed[0] !== 'bbgroup') return null
    return { breadboardId: parsed[1], localGroupKey: parsed[2] }
  } catch {
    return null
  }
}
