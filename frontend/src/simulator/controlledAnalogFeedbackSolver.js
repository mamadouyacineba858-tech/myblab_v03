/**
 * A11-COMP3-PREQ2 — generic scalar feedback mathematics for controlled DC
 * voltage domains. Pure and stateless: no component knowledge, no clock, no
 * previous result, no seed. This is NOT a nodal, SPICE, AC or transient
 * solver: it only classifies dependency cycles and solves one bounded scalar
 * unknown x = F(x) for a contract that explicitly declares that class.
 */

/**
 * Engine-level residual tolerance in volts: a solution x is published only
 * when |F(x) - x| <= 1 µV. Far below any Level-1 displayed precision, and
 * well above the floating-point residual granularity of gains up to ~1e8.
 */
export const FEEDBACK_VOLTAGE_TOLERANCE = 1e-6

/** Engine-level budget of transfer-law evaluations for one scalar solve. */
export const FEEDBACK_MAX_EVALUATIONS = 128

/**
 * Tarjan strongly connected components of a directed graph given as an
 * adjacency list of node indices. Returns, per node, its component id, and
 * per component whether it is cyclic (more than one node, or a self-edge).
 */
export function stronglyConnectedComponents(adjacency) {
  const index = new Array(adjacency.length).fill(-1)
  const low = new Array(adjacency.length).fill(0)
  const onStack = new Array(adjacency.length).fill(false)
  const component = new Array(adjacency.length).fill(-1)
  const cyclic = []
  const stack = []
  let counter = 0
  const visit = (node) => {
    index[node] = low[node] = counter++
    stack.push(node)
    onStack[node] = true
    for (const next of adjacency[node]) {
      if (index[next] === -1) {
        visit(next)
        low[node] = Math.min(low[node], low[next])
      } else if (onStack[next]) low[node] = Math.min(low[node], index[next])
    }
    if (low[node] !== index[node]) return
    const id = cyclic.length
    const members = []
    let member
    do {
      member = stack.pop()
      onStack[member] = false
      component[member] = id
      members.push(member)
    } while (member !== node)
    cyclic.push(members.length > 1 || adjacency[node].includes(node))
  }
  for (let node = 0; node < adjacency.length; node++) if (index[node] === -1) visit(node)
  return { component, cyclic }
}

/** Declared bounds must be finite, non-negative and ordered; nothing is guessed. */
export function validFeedbackBounds(bounds) {
  return !!bounds && Number.isFinite(bounds.min) && Number.isFinite(bounds.max)
    && bounds.min >= 0 && bounds.max >= bounds.min
}

/** Engine-level number of equal intervals of the deterministic bracketing scan. */
export const FEEDBACK_SCAN_INTERVALS = 16

/**
 * Bounded bracketing + bisection on R(x) = F(x) - x over [min, max] for the
 * declared "single-root" class (restoring feedback). A fixed grid scan must
 * show residual signs non-increasing (+ … 0 … −) with at most one root
 * sample; the bracketing cell is then bisected. Returns x only after residual
 * validation |R(x)| <= FEEDBACK_VOLTAGE_TOLERANCE, else null: invalid bounds,
 * non-finite or negative F, no admissible root, several roots or a rising
 * residual (positive feedback), exhausted floating-point interval or budget.
 */
export function solveScalarFeedback(transfer, bounds) {
  if (!validFeedbackBounds(bounds)) return null
  let evaluations = 0
  const residual = (x) => {
    evaluations++
    const y = transfer(x)
    return typeof y === 'number' && Number.isFinite(y) && y >= 0 ? y - x : NaN
  }
  const sign = (r) => r > FEEDBACK_VOLTAGE_TOLERANCE ? 1 : r < -FEEDBACK_VOLTAGE_TOLERANCE ? -1 : 0
  const { min, max } = bounds
  const grid = min === max ? [min] : Array.from({ length: FEEDBACK_SCAN_INTERVALS + 1 },
    (_, i) => i === FEEDBACK_SCAN_INTERVALS ? max : min + (max - min) * i / FEEDBACK_SCAN_INTERVALS)
  const signs = []
  for (const x of grid) {
    const r = residual(x)
    if (!Number.isFinite(r)) return null
    signs.push(sign(r))
  }
  if (signs.some((s, i) => i > 0 && s > signs[i - 1]) || signs.filter((s) => s === 0).length > 1) return null
  if (signs.includes(0)) return grid[signs.indexOf(0)]
  const upper = signs.indexOf(-1)
  if (upper <= 0) return null
  let lo = grid[upper - 1]
  let hi = grid[upper]
  while (evaluations < FEEDBACK_MAX_EVALUATIONS) {
    const mid = lo + (hi - lo) / 2
    if (mid <= lo || mid >= hi) return null
    const r = residual(mid)
    if (!Number.isFinite(r)) return null
    if (sign(r) === 0) return mid
    if (r > 0) lo = mid
    else hi = mid
  }
  return null
}
