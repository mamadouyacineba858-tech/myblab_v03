// MB-BREADBOARD-012 — endpoint canonique d'un wire sur trou Breadboard.
//
// Le wire React/Core conserve sa forme historique {fromUid, fromPin,
// toUid, toPin}. Un endpoint trou est encodé dans ces deux champs avec un
// sentinel explicite ; les couches de présentation/simulation le résolvent
// via holeAt(). Aucun composant fictif n'est ajouté au Document.

export const BREADBOARD_HOLE_PIN_ID = "__BREADBOARD_HOLE__"
export const BREADBOARD_HOLE_UID_PREFIX = "__breadboard_hole__"

export function makeBreadboardHoleEndpoint(breadboardId, column, row) {
  if (!breadboardId || !Number.isInteger(column) || !Number.isInteger(row)) return null
  return {
    uid: `${BREADBOARD_HOLE_UID_PREFIX}:${encodeURIComponent(breadboardId)}:${column}:${row}`,
    pinId: BREADBOARD_HOLE_PIN_ID,
  }
}

export function parseBreadboardHoleEndpoint(uid, pinId) {
  if (pinId !== BREADBOARD_HOLE_PIN_ID || typeof uid !== "string") return null
  const prefix = `${BREADBOARD_HOLE_UID_PREFIX}:`
  if (!uid.startsWith(prefix)) return null
  const parts = uid.slice(prefix.length).split(":")
  if (parts.length !== 3) return null
  const [encodedBreadboardId, columnText, rowText] = parts
  const column = Number(columnText)
  const row = Number(rowText)
  if (!encodedBreadboardId || !Number.isInteger(column) || !Number.isInteger(row)) return null
  try {
    return {
      breadboardId: decodeURIComponent(encodedBreadboardId),
      column,
      row,
    }
  } catch {
    return null
  }
}

export function isBreadboardHoleEndpoint(uid, pinId) {
  return parseBreadboardHoleEndpoint(uid, pinId) !== null
}
