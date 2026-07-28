import { getLedState, getRgbLedState } from "../../simulator/engine.js"
import { LedPart } from "./LedPart.jsx"
import { ResistorPart } from "./ResistorPart.jsx"
import { ArduinoPart } from "./ArduinoPart.jsx"
import { ButtonPart } from "./ButtonPart.jsx"
import { PowerPart } from "./PowerPart.jsx"
import { CapacitorPart } from "./CapacitorPart.jsx"
import { BuzzerPart } from "./BuzzerPart.jsx"
import { PotentiometerPart } from "./PotentiometerPart.jsx"
import { LdrPart } from "./LdrPart.jsx"
import { ThermistorPart } from "./ThermistorPart.jsx"
import { DiodePart } from "./DiodePart.jsx"
import { RgbLedPart } from "./RgbLedPart.jsx"
import { NpnTransistorPart } from "./NpnTransistorPart.jsx"
import { ServoPart } from "./ServoPart.jsx"
import { DcMotorPart } from "./DcMotorPart.jsx"

/**
 * Sélectionne le rendu SVG/HTML selon le type de composant.
 */
export function PartRenderer({
  type,
  uid,
  pinSignals,
  state,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onMouseDown,
}) {
  const signals = pinSignals instanceof Map ? pinSignals : new Map()

  switch (type) {
    case "LED": {
      const { on } = getLedState(uid ?? "", signals)
      return <LedPart isOn={on} />
    }
    case "RESISTOR":
      return <ResistorPart />
    case "ARDUINO":
      return <ArduinoPart />
    case "BUTTON":
      return (
        <ButtonPart
          state={state}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onLostPointerCapture={onLostPointerCapture}
          onMouseDown={onMouseDown}
        />
      )
    case "POWER":
      return <PowerPart />
    case "CAPACITOR":
      return <CapacitorPart />
    case "BUZZER":
      return <BuzzerPart />
    case "POTENTIOMETER":
      return <PotentiometerPart />
    case "LDR":
      return <LdrPart />
    case "THERMISTOR":
      return <ThermistorPart />
    case "DIODE":
      return <DiodePart />
    case "RGB_LED": {
      const { r, g, b } = getRgbLedState(uid ?? "", signals)
      return <RgbLedPart r={r} g={g} b={b} />
    }
    case "NPN_TRANSISTOR":
      return <NpnTransistorPart />
    case "SERVO":
      return <ServoPart />
    case "DC_MOTOR":
      return <DcMotorPart />
    default:
      return <div className="part-unknown">?</div>
  }
}
