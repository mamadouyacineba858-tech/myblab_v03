import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { CircuitProvider } from '../../context/CircuitContext.jsx'
import { useCircuit } from '../../context/useCircuit.js'
import { useCircuitInteraction } from '../../context/useCircuitInteraction.js'
import { SimulationCanvas } from '../../canvas/SimulationCanvas.jsx'

afterEach(cleanup)

describe('MB-BREADBOARD-WIRE-CRASH-013 — real split context', () => {
  for (const reverse of [false, true]) {
    it(`${reverse ? 'hole → POWER' : 'POWER → hole'} renders without crashing and follows interaction geometry`, () => {
      let stable, interaction
      const canvasRef = { current: null }
      function Harness() {
        stable = useCircuit()
        interaction = useCircuitInteraction()
        return <SimulationCanvas />
      }
      const { container } = render(<CircuitProvider canvasRef={canvasRef}><Harness /></CircuitProvider>)
      act(() => { stable.addComponent('POWER', 900, 500); stable.addBreadboard(120, 120) })
      expect(stable).not.toHaveProperty('components')
      expect(stable).not.toHaveProperty('breadboard')
      expect(interaction.components).toHaveLength(1)
      expect(interaction.breadboard).not.toBeNull()
      const pin = container.querySelector('.myblab-pin')
      const hole = container.querySelector('.breadboard-wire-endpoints circle')
      expect(pin).not.toBeNull()
      expect(hole).not.toBeNull()
      fireEvent.click(reverse ? hole : pin)
      fireEvent.click(reverse ? pin : hole)
      expect(stable.wires).toHaveLength(1)
      const path = () => container.querySelector('.wires-layer--breadboard path[aria-label]')
      expect(path()).not.toBeNull()
      expect(path().getAttribute('stroke')).toBe('#f97316')
      expect(path().getAttribute('stroke-width')).toBe('3')
      const before = path().getAttribute('d')
      const count = stable.getUndoCount()
      fireEvent.mouseDown(container.querySelector('.circuit-component'), { button: 0, clientX: 910, clientY: 510 })
      fireEvent(window, new PointerEvent('pointermove', { clientX: 950, clientY: 550 }))
      expect(path().getAttribute('d')).not.toBe(before)
      expect(stable.getUndoCount()).toBe(count)
      fireEvent(window, new PointerEvent('pointerup', { clientX: 950, clientY: 550 }))
      expect(path()).not.toBeNull()
      act(() => stable.zoomIn())
      expect(path()).not.toBeNull()
      expect(container.querySelector('.simulation-canvas')).not.toBeNull()
    })
  }
})
