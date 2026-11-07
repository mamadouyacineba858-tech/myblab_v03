/**
 * Presentation-only cable routing. Rounds corners of an existing SVG polyline
 * without changing its endpoints, stored waypoints or electrical topology.
 * The original polyline remains the interaction and waypoint-insertion path.
 */
export function roundedWirePath(pathData, radius = 9) {
  if (typeof pathData !== 'string' || !Number.isFinite(radius) || radius <= 0) return pathData
  // Only transform the simple M/L paths emitted by buildWirePath.
  const matches = [...pathData.matchAll(/([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)]
  if (matches.length < 3 || matches[0][1] !== 'M' || matches.slice(1).some(m => m[1] !== 'L')) return pathData
  const points = matches.map(m => ({ x: Number(m[2]), y: Number(m[3]) }))
  if (points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return pathData
  const fmt = n => Number(n.toFixed(3))
  const out = [`M ${fmt(points[0].x)} ${fmt(points[0].y)}`]
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1]
    const ab = Math.hypot(b.x - a.x, b.y - a.y)
    const bc = Math.hypot(c.x - b.x, c.y - b.y)
    if (ab < 0.001 || bc < 0.001) {
      out.push(`L ${fmt(b.x)} ${fmt(b.y)}`)
      continue
    }
    const r = Math.min(radius, ab / 3, bc / 3)
    const start = { x: b.x + (a.x - b.x) * r / ab, y: b.y + (a.y - b.y) * r / ab }
    const end = { x: b.x + (c.x - b.x) * r / bc, y: b.y + (c.y - b.y) * r / bc }
    out.push(`L ${fmt(start.x)} ${fmt(start.y)} Q ${fmt(b.x)} ${fmt(b.y)} ${fmt(end.x)} ${fmt(end.y)}`)
  }
  const last = points[points.length - 1]
  out.push(`L ${fmt(last.x)} ${fmt(last.y)}`)
  return out.join(' ')
}
