/**
 * Utilitaires géométriques pour le canvas et les fils SVG.
 * Les positions de pins sont toujours recalculées à partir des composants.
 */

/**
 * Position absolue d'une pin sur le canvas.
 *
 * [MB-VIS-COMP-005] Fonction géométrique CANONIQUE unique : traduction pure
 * `component.x/y` (position d'instance) + `pinDef.dx/dy` (offset local de
 * définition, componentDefinitions.js) → coordonnées absolues Canvas.
 * Aucune rotation n'est appliquée : aucun composant du pipeline réel ne
 * porte de `component.rotation` actif (seule occurrence trouvée dans tout
 * le code source : un champ arbitraire de test de passthrough générique,
 * ReactDocumentMapper.test.js T11, sans rapport avec la géométrie des
 * pins — voir rapport MB-VIS-COMP-005 §Rotation). Si une rotation devient
 * un jour active, cette fonction est le seul endroit où l'appliquer.
 *
 * Aucun branchement par type de composant ici (I6) — c'est précisément ce
 * qui la distingue de `pinPresentationGeometry.js::getPinPresentationPosition()`,
 * qui délègue son cas générique à CETTE fonction mais conserve, à côté,
 * une projection visuelle volontaire et légitime pour LED (MB-VIS-LED-V5) :
 * cette dernière ne fait PAS partie du calcul canonique et ne déplace
 * jamais la position électrique retournée ici.
 *
 * @param {{ x: number, y: number }} component
 * @param {{ dx: number, dy: number }} pinDef
 * @returns {{ x: number, y: number } | null}
 */
export function getPinPosition(component, pinDef) {
  if (!component || !pinDef) return null
  const x = component.x + pinDef.dx
  const y = component.y + pinDef.dy
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

/**
 * Convertit des coordonnées client (souris/pointeur) en coordonnées
 * Document/Canvas — le seul repère dans lequel vivent `component.x/y`,
 * `pin.dx/dy`, le snapping et le rectangle de marquee.
 *
 * [MB-VIS-CANVAS-049] Point d'entrée UNIQUE de la conversion écran→document
 * pour toutes les interactions pointeur (drag composant, marquee, drag/
 * insertion de waypoint, drag Breadboard, dépôt/aperçu Sidebar). `canvasRect`
 * provient de `canvasRef.current.getBoundingClientRect()` — le conteneur
 * `.simulation-canvas`, jamais transformé — alors que son contenu (grille,
 * composants, fils, breadboard, marquee) vit dans `.simulation-canvas__zoom-layer`,
 * mis à l'échelle par un unique `transform: scale(zoom)` (SimulationCanvas.jsx).
 * Un pixel écran ne vaut donc plus un pixel Document dès que `zoom !== 1` :
 * `zoom` doit être fourni par l'appelant et la conversion divise par cette
 * valeur — un facteur de projection Document→écran, jamais l'inverse. Ceci
 * ne réintroduit AUCUN recalcul de zoom dans le renderer (interdit par
 * `visualContract.js`) : cette fonction ne dessine rien, elle ne fait que
 * transformer une coordonnée pointeur avant qu'elle n'alimente la géométrie
 * Document — exactement le rôle que la Décision CSA du Blueprint
 * MB-VIS-CANVAS-049 lui assigne ("Le zoom est un facteur de projection entre
 * Document et écran ; il ne modifie jamais les coordonnées du Document.").
 *
 * `zoom` est optionnel (défaut `1`, comportement strictement inchangé pour
 * tout appelant qui ne le fournit pas encore) et défensif : une valeur non
 * finie ou nulle retombe sur `1` plutôt que de produire une division par
 * zéro ou un résultat non fini.
 *
 * [MB-VIS-CANVAS-050] `translateX`/`translateY` étendent cette même fonction
 * (et non une seconde formule) pour intégrer le pan : la relation complète
 * viewport est `screen = translation + document * zoom` (Décision CSA D2 du
 * Blueprint CANVAS-050), dont voici l'inverse. Défauts `0` : tout appelant
 * existant (049) qui n'en fournit aucun garde un comportement strictement
 * inchangé. `utils/viewport.js` (calcul du nouveau viewport lors d'un zoom
 * orienté curseur) appelle cette même fonction plutôt que de redériver la
 * conversion — un seul oracle screen→Document dans tout le repository.
 *
 * @param {MouseEvent | { clientX: number, clientY: number }} event
 * @param {DOMRect} canvasRect
 * @param {number} [zoom=1]
 * @param {number} [translateX=0]
 * @param {number} [translateY=0]
 */
export function clientToCanvas(event, canvasRect, zoom = 1, translateX = 0, translateY = 0) {
  const z = Number.isFinite(zoom) && zoom !== 0 ? zoom : 1
  const tx = Number.isFinite(translateX) ? translateX : 0
  const ty = Number.isFinite(translateY) ? translateY : 0
  return {
    x: (event.clientX - canvasRect.left - tx) / z,
    y: (event.clientY - canvasRect.top - ty) / z,
  }
}

/**
 * Distance euclidienne entre deux points.
 */
export function distance(a, b) {
  if (!a || !b) return Infinity
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

// ============================================================================
// FONCTIONS MB-003.4 (Rectangle de sélection)
// ============================================================================

/**
 * Vérifie si un point est à l'intérieur d'un rectangle.
 * @param {number} px - Coordonnée X du point
 * @param {number} py - Coordonnée Y du point
 * @param {number} rx - Coordonnée X du rectangle (coin supérieur gauche)
 * @param {number} ry - Coordonnée Y du rectangle (coin supérieur gauche)
 * @param {number} rw - Largeur du rectangle
 * @param {number} rh - Hauteur du rectangle
 * @returns {boolean}
 */
export function isPointInRect(px, py, rx, ry, rw, rh) {
  const minX = Math.min(rx, rx + rw)
  const maxX = Math.max(rx, rx + rw)
  const minY = Math.min(ry, ry + rh)
  const maxY = Math.max(ry, ry + rh)
  return px >= minX && px <= maxX && py >= minY && py <= maxY
}

/**
 * Vérifie si deux rectangles se chevauchent.
 * 
 * @param {number} r1x, r1y, r1w, r1h - Premier rectangle (le MARQUEE)
 * @param {number} r2x, r2y, r2w, r2h - Second rectangle (l'ÉLÉMENT TESTÉ)
 * @param {number} threshold - Seuil de chevauchement (0-1) par rapport à l'aire de r2.
 *                            Ex: 0.5 signifie que 50% de l'élément testé doit être recouvert.
 * @returns {boolean}
 */
export function rectsOverlap(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h, threshold = 0.5) {
  const overlapX = Math.max(0, Math.min(r1x + r1w, r2x + r2w) - Math.max(r1x, r2x))
  const overlapY = Math.max(0, Math.min(r1y + r1h, r2y + r2h) - Math.max(r1y, r2y))
  const overlapArea = overlapX * overlapY
  const r2Area = r2w * r2h
  return overlapArea >= r2Area * threshold
}

/**
 * Calcule la boîte englobante d'un fil (entre deux points).
 * @param {{ x: number, y: number }} from - Point de départ
 * @param {{ x: number, y: number }} to - Point d'arrivée
 * @param {number} padding - Marge supplémentaire (défaut: 5)
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function getWireBoundingBox(from, to, padding = 5) {
  const minX = Math.min(from.x, to.x) - padding
  const maxX = Math.max(from.x, to.x) + padding
  const minY = Math.min(from.y, to.y) - padding
  const maxY = Math.max(from.y, to.y) + padding
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * Extrait les points d'une chaîne SVG 'd'.
 * 
 * @param {string} d - Chaîne SVG path data (ex: "M 430 285 L 585 285 L 585 280 L 740 280")
 * @returns {Array<{x: number, y: number}>} - Liste des points extraits
 */
export function extractPointsFromPathData(d) {
  if (!d || typeof d !== 'string') return []
  
  const numbers = d.match(/[\d.]+/g)
  if (!numbers || numbers.length < 4) return []
  
  const points = []
  for (let i = 0; i < numbers.length; i += 2) {
    points.push({
      x: parseFloat(numbers[i]),
      y: parseFloat(numbers[i + 1])
    })
  }
  return points
}

// ============================================================================
// MB-004.5 : Comparaison de positions
// ============================================================================

/**
 * Vérifie si deux Maps de positions sont différentes.
 * 
 * @param {Map<string, {x: number, y: number}>} before - Positions initiales
 * @param {Map<string, {x: number, y: number}>} after - Positions finales
 * @returns {boolean} - true si les positions ont changé
 */
export function hasPositionsChanged(before, after) {
  if (!before || !after) return true
  if (before.size !== after.size) return true
  
  for (const [uid, pos] of before) {
    const afterPos = after.get(uid)
    if (!afterPos) return true
    if (afterPos.x !== pos.x || afterPos.y !== pos.y) return true
  }
  
  return false
}