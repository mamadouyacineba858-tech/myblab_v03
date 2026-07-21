/**
 * Génère une clé stable et unique pour le système de sélection.
 * Format interne : "type:id" (ex: "wire:123", "component:R1")
 */
export function getSelectionKey(type, id) {
  return `${type}:${id}`;
}

/**
 * Parse une clé de sélection pour récupérer le type et l'id.
 */
export function parseSelectionKey(key) {
  const [type, id] = key.split(':');
  return { type, id };
}

/**
 * Politique IA-01-P1 : Détermine le nouvel activeItem à partir du Set de sélection.
 * Règle : Le dernier élément inséré dans le Set devient l'activeItem.
 * Si le Set est vide, retourne null.
 */
export function promoteActiveItem(selection) {
  if (!selection || selection.size === 0) return null;
  const keys = Array.from(selection);
  const lastKey = keys[keys.length - 1];
  return parseSelectionKey(lastKey);
}