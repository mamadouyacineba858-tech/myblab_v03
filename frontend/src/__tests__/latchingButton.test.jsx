import { describe, it, expect } from "vitest"
import { createComponent } from "../config/componentDefinitions.js"
import { normalizeComponent } from "../utils/circuitModel.js"
import { runSimulation } from "../simulator/engine.js"

describe("A2 - Latching Button Model", () => {
  describe("A2-T1 - createComponent", () => {
    it("creates a BUTTON_LATCHING with hydrated pins and 'off' state", () => {
      const button = createComponent("BUTTON_LATCHING", 100, 100)

      expect(button).toBeTruthy()
      expect(button.type).toBe("BUTTON_LATCHING")
      expect(button.x).toBe(100)
      expect(button.y).toBe(100)

      expect(button.pins).toEqual([
        { id: "pin1", label: "1", dx: 0, dy: 30, role: "switch" },
        { id: "pin2", label: "2", dx: 60, dy: 30, role: "switch" },
      ])

      expect(button.state).toBe("off")
    })
  })

  describe("A2-T2 - normalizeComponent", () => {
    it("preserves BUTTON_LATCHING pins and normalizes 'on' state", () => {
      const button = createComponent("BUTTON_LATCHING", 100, 100)
      button.state = "on"

      const normalized = normalizeComponent(button)

      expect(normalized.type).toBe("BUTTON_LATCHING")
      expect(normalized.state).toBe("on")
    })

    it("normalizes invalid BUTTON_LATCHING state to 'off'", () => {
      const button = createComponent("BUTTON_LATCHING", 100, 100)
      button.state = "invalid_state"

      const normalized = normalizeComponent(button)

      expect(normalized.state).toBe("off")
    })
  })

  describe("A2-T3 - Electrical behavior", () => {
    it("closes the circuit internally when BUTTON_LATCHING is 'on'", () => {
      const button = createComponent("BUTTON_LATCHING", 100, 100)
      button.state = "on"
      const power = createComponent("POWER", 0, 0)
      
      const wires = [
        { id: "w1", fromUid: power.uid, fromPin: "5V", toUid: button.uid, toPin: "pin1" }
      ]
      
      const signals = runSimulation([button, power], wires)
      
      const pin1Signal = signals.get(`${button.uid}:pin1`)
      const pin2Signal = signals.get(`${button.uid}:pin2`)
      
      expect(pin1Signal).toBe("HIGH")
      expect(pin2Signal).toBe("HIGH") // Court-circuité en interne car état 'on'
    })

    it("keeps the circuit open when BUTTON_LATCHING is 'off'", () => {
      const button = createComponent("BUTTON_LATCHING", 100, 100)
      button.state = "off"
      const power = createComponent("POWER", 0, 0)
      
      const wires = [
        { id: "w1", fromUid: power.uid, fromPin: "5V", toUid: button.uid, toPin: "pin1" }
      ]
      
      const signals = runSimulation([button, power], wires)
      
      const pin1Signal = signals.get(`${button.uid}:pin1`)
      const pin2Signal = signals.get(`${button.uid}:pin2`)
      
      expect(pin1Signal).toBe("HIGH")
      expect(pin2Signal).toBe("UNKNOWN") // Pas de court-circuit, reste isolé
    })
  })
})