import { describe, it, expect } from "vitest"
import { createComponent } from "../config/componentDefinitions.js"
import { normalizeComponent } from "../utils/circuitModel.js"
import { runSimulation, getLedState } from "../simulator/engine.js"
import { Signal } from "../simulator/signals.js"

describe("A1 - Button Model", () => {
  describe("A1-T1 - createComponent", () => {
    it("creates a BUTTON with hydrated pins and released state", () => {
      const button = createComponent("BUTTON", 100, 100)

      expect(button).toBeTruthy()
      expect(button.type).toBe("BUTTON")
      expect(button.x).toBe(100)
      expect(button.y).toBe(100)

      expect(button.pins).toEqual([
        {
          id: "pin1",
          label: "1",
          dx: 0,
          dy: 30,
          role: "switch",
        },
        {
          id: "pin2",
          label: "2",
          dx: 60,
          dy: 30,
          role: "switch",
        },
      ])

      expect(button.state).toBe("released")
    })
  })

  describe("A1-T2 - normalizeComponent", () => {
    it("preserves BUTTON pins and normalizes released state", () => {
      const button = createComponent("BUTTON", 100, 100)
      const normalized = normalizeComponent(button)

      expect(normalized).toBeTruthy()
      expect(normalized.type).toBe("BUTTON")
      expect(normalized.pins).toHaveLength(2)
      expect(normalized.pins.map((pin) => pin.id)).toEqual(["pin1", "pin2"])
      expect(normalized.state).toBe("released")
    })

    it("preserves pressed state", () => {
      const button = createComponent("BUTTON", 100, 100)
      button.state = "pressed"

      const normalized = normalizeComponent(button)

      expect(normalized.state).toBe("pressed")
    })

    it("normalizes invalid BUTTON state to released", () => {
      const button = createComponent("BUTTON", 100, 100)
      button.state = "invalid"

      const normalized = normalizeComponent(button)

      expect(normalized.state).toBe("released")
    })
  })

  describe("A1-T3 - Electrical behavior", () => {
    const createCircuit = (buttonState) => {
      const power = createComponent("POWER", 0, 0)
      const button = createComponent("BUTTON", 100, 0)
      const led = createComponent("LED", 200, 0)

      button.state = buttonState

      const wires = [
        {
          id: "wire-power-button",
          fromUid: power.uid,
          fromPin: "5V",
          toUid: button.uid,
          toPin: "pin1",
        },
        {
          id: "wire-button-led",
          fromUid: button.uid,
          fromPin: "pin2",
          toUid: led.uid,
          toPin: "anode",
        },
        {
          id: "wire-led-ground",
          fromUid: power.uid,
          fromPin: "GND",
          toUid: led.uid,
          toPin: "cathode",
        },
      ]

      return {
        components: [power, button, led],
        wires,
        power,
        button,
        led,
      }
    }

    it("keeps the circuit open when BUTTON is released", () => {
      const {
        components,
        wires,
        button,
        led,
      } = createCircuit("released")

      const pinSignals = runSimulation(components, wires)

      expect(pinSignals.get(`${button.uid}:pin1`)).toBe(Signal.HIGH)
      expect(pinSignals.get(`${button.uid}:pin2`)).toBe(Signal.UNKNOWN)

      const ledState = getLedState(led.uid, pinSignals)

      expect(ledState.on).toBe(false)
    })

    it("closes the circuit when BUTTON is pressed", () => {
      const {
        components,
        wires,
        button,
        led,
      } = createCircuit("pressed")

      const pinSignals = runSimulation(components, wires)

      expect(pinSignals.get(`${button.uid}:pin1`)).toBe(Signal.HIGH)
      expect(pinSignals.get(`${button.uid}:pin2`)).toBe(Signal.HIGH)

      const ledState = getLedState(led.uid, pinSignals)

      expect(ledState.on).toBe(true)
    })
  })
})
