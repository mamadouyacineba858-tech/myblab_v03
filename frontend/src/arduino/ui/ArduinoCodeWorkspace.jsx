import React, { useState } from "react"
import { useCircuit } from "../../context/useCircuit.js"
import { compileFirmware } from "../firmware/firmwareCompiler.js"
import "./ArduinoCodeWorkspace.css"

// Exemple compatible avec le compilateur Arduino V1 de MYBlab.
const BLINK_EXAMPLE = `void setup() {
  pinMode(2, OUTPUT);
}

void loop() {
  digitalWrite(2, HIGH);
  delay(500);
  digitalWrite(2, LOW);
  delay(500);
}
`

export function ArduinoCodeWorkspace({ onClose }) {
  const { selectedComponent, updateArduinoFirmware, firmwareDiagnostics } = useCircuit()
  if (selectedComponent?.type !== "ARDUINO") return null
  return <Editor key={`${selectedComponent.uid}:${selectedComponent.firmware?.source}`} component={selectedComponent}
    apply={updateArduinoFirmware} onClose={onClose} runtimeDiagnostics={firmwareDiagnostics?.[selectedComponent.uid]} />
}
function Editor({ component, apply, onClose, runtimeDiagnostics }) {
  const source = component.firmware?.source ?? ""
  const [draft, setDraft] = useState(source)
  const [compilation, setCompilation] = useState(null)
  const diagnostics = compilation?.diagnostics ?? runtimeDiagnostics ?? []
  const compileDraft = () => {
    const result = compileFirmware(draft)
    setCompilation(result)
    return result
  }
  const applyValidated = () => {
    const result = compileDraft()
    if (result.ok && draft !== source) apply(component.uid, draft)
  }
  return <aside className="arduino-code-workspace" aria-label="Arduino Code">
    <div className="arduino-code-heading"><h2>Arduino Code</h2><button onClick={onClose} aria-label="Fermer Arduino Code">X</button></div>
    <small>Arduino {component.uid}</small>
    <p className="arduino-code-help">Programme Arduino — sorties numériques D0 à D13. Le moteur actuel accepte pinMode(…, OUTPUT), digitalWrite(…) et delay(…).</p>
    <label htmlFor="arduino-sketch">Sketch</label>
    <textarea id="arduino-sketch" spellCheck={false} value={draft} onChange={event => { setDraft(event.target.value); setCompilation(null) }} />
    <div className="arduino-code-actions">
      <button type="button" onClick={() => { setDraft(BLINK_EXAMPLE); setCompilation(null) }}>Exemple : LED clignotante D2</button>
      <button type="button" disabled={draft === source} onClick={applyValidated}>Compiler et appliquer</button>
      <button type="button" onClick={compileDraft}>Compiler</button>
    </div>
    <div role="status" aria-live="polite">
      {compilation?.ok && <p>Compilation réussie</p>}
      {diagnostics.map((d, i) => <p key={i}>Ligne {d.line ?? "?"} / {d.code} / {d.message}</p>)}
    </div>
  </aside>
}
