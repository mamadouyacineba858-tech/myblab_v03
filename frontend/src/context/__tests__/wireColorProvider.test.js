import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const provider = fs.readFileSync(path.join(here, '..', 'CircuitContext.jsx'), 'utf8')
const state = fs.readFileSync(path.join(here, '..', '..', 'hooks', 'useCircuitState.js'), 'utf8')

describe('WIRE-014 — production color action bridge', () => {
  it('exposes the real color mutation in the stable provider and its dependencies', () => {
    expect(provider).toContain('updateWireColor: state.updateWireColor')
    expect(provider).toContain('state.updateWireWaypoints, state.updateWireColor, state.startWaypointDrag')
  })
  it('returns the action from circuit state and routes it via the command bus', () => {
    expect(state).toContain('const updateWireColor = useCallback(')
    expect(state).toContain('new Command("UPDATE_WIRE_COLOR"')
    expect(state).toContain('registry.register("UPDATE_WIRE_COLOR"')
  })
})
