/**
 * normalizeDocumentBreadboards.js — FT-C-BREAD-MULTI-001-A (CSA ruling D3).
 *
 * FRONTIÈRE DE NORMALISATION UNIQUE entre l'ancien modèle Document singleton
 * (`document.breadboard: object | null`) et le modèle canonique
 * multi-breadboard (`document.breadboards: BreadboardEntry[]`).
 *
 * Règle canonique (CSA D3 / §5) — déterministe, idempotente, sans perte :
 *   { breadboard: null }   -> { breadboards: [] }
 *   { breadboard: B }      -> { breadboards: [B] }
 *   { breadboards: [...] }  -> forme canonique validée / clonée, conservée
 *
 * Aucune perte d'`id` / `position` / `layout` ni des propriétés inconnues
 * portées par une entrée breadboard (compatibilité legacy, §5). Jamais de
 * duplication d'une entrée legacy, jamais deux sources actives simultanées.
 *
 * INTERDIT ailleurs (CSA D3) : aucune branche
 * `if (doc.breadboard) ... else if (doc.breadboards) ...` dans les handlers,
 * la connectivité, la solidarité, le placement ou la simulation métier — ces
 * couches consomment `breadboards[]`.
 *
 * ─── PROJECTION TRANSITOIRE (FT-C-BREAD-MULTI-001-A UNIQUEMENT) ──────────────
 * La sortie porte AUSSI `breadboard = breadboards[0] ?? null`, en LECTURE
 * SEULE, pour les consommateurs pas encore migrés (Presentation,
 * breadboardConnectivity, engineAdapter, exportCircuit). Ce n'est PAS une
 * seconde source de vérité : aucune logique de mutation ne l'écrit — elle est
 * TOUJOURS dérivée ici de `breadboards[]`. Elle sera retirée en
 * FT-C-BREAD-MULTI-001-B / -D quand ces couches liront `breadboards[]`.
 */

/** Clone superficiel sûr d'une entrée breadboard (position clonée en profondeur). */
function cloneBreadboardEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const cloned = { ...entry }
  if (entry.position && typeof entry.position === 'object') {
    cloned.position = { ...entry.position }
  }
  return cloned
}

/**
 * Collection canonique `breadboards[]` d'un Document, clonée, sans entrée
 * nulle. Accepte indifféremment la forme canonique (`breadboards[]`) ou
 * l'ancienne forme singleton (`breadboard`).
 *
 * @param {object | null | undefined} document
 * @returns {Array<object>}
 */
export function toCanonicalBreadboards(document) {
  if (!document || typeof document !== 'object') return []

  if (Array.isArray(document.breadboards)) {
    return document.breadboards
      .map(cloneBreadboardEntry)
      .filter((entry) => entry !== null)
  }

  const legacy = cloneBreadboardEntry(document.breadboard)
  return legacy ? [legacy] : []
}

/**
 * Normalise un Document vers la forme canonique multi-breadboard.
 *
 * @param {object | null | undefined} document
 * @returns {object} `{ ...document, breadboards, breadboard }` — `breadboards`
 *   canonique (source de vérité), `breadboard` = projection transitoire
 *   lecture seule (`breadboards[0] ?? null`).
 */
export function normalizeDocumentBreadboards(document) {
  if (!document || typeof document !== 'object') {
    return { breadboards: [], breadboard: null }
  }

  const breadboards = toCanonicalBreadboards(document)

  return {
    ...document,
    breadboards,
    breadboard: breadboards.length > 0 ? { ...breadboards[0] } : null,
  }
}
