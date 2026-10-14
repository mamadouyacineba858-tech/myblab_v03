import React, { useEffect, useState } from "react"
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

const BUILTIN_LED_EXAMPLE = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
`

// Bouton momentané entre D2 et GND ; LED externe D13 -> résistance -> LED -> GND.
const BUTTON_PULLUP_EXAMPLE = `void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(13, OUTPUT);
  int pressed = 0;
}

void loop() {
  pressed = digitalRead(2);
  if (pressed == 0) {
    digitalWrite(13, HIGH);
  } else {
    digitalWrite(13, LOW);
  }
  delay(16);
}
`

export function ArduinoCodeWorkspace({ onClose }) {
  const { selectedComponent, updateArduinoFirmware, firmwareDiagnostics } = useCircuit()
  if (selectedComponent?.type !== "ARDUINO") return null
  return <Editor key={selectedComponent.uid} component={selectedComponent}
    apply={updateArduinoFirmware} onClose={onClose} runtimeDiagnostics={firmwareDiagnostics?.[selectedComponent.uid]} />
}
function Editor({ component, apply, onClose, runtimeDiagnostics }) {
  const source = component.firmware?.source ?? ""
  const [draft, setDraft] = useState(source)
  const [compilation, setCompilation] = useState(null)
  // Keep the editor mounted after Apply so compilation feedback stays visible.
  // Synchronize external document changes (Undo/Redo/import) without erasing
  // a locally edited draft on ordinary rerenders.
  const [lastSavedSource, setLastSavedSource] = useState(source)
  useEffect(() => {
    if (source !== lastSavedSource) {
      setDraft(current => current === lastSavedSource ? source : current)
      setLastSavedSource(source)
    }
  }, [source, lastSavedSource])
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
    <p className="arduino-code-help">Programme Arduino D0 à D13 : pinMode(OUTPUT, INPUT, INPUT_PULLUP), digitalWrite(), digitalRead(), delay() et LED_BUILTIN. Pour le bouton : connecter D2 au bouton, puis le bouton à GND ; LED externe sur D13 avec résistance vers GND.</p>
    <label htmlFor="arduino-sketch">Sketch</label>
    <textarea id="arduino-sketch" spellCheck={false} value={draft} onChange={event => { setDraft(event.target.value); setCompilation(null) }} />
    <div className="arduino-code-actions">
      <button type="button" onClick={() => { setDraft(BLINK_EXAMPLE); setCompilation(null) }}>Exemple : LED clignotante D2</button>
      <button type="button" onClick={() => { setDraft(BUILTIN_LED_EXAMPLE); setCompilation(null) }}>Exemple : LED intégrée D13</button>
      <button type="button" onClick={() => { setDraft(BUTTON_PULLUP_EXAMPLE); setCompilation(null) }}>Exemple : Bouton D2 → LED D13 (INPUT_PULLUP)</button>
      <button type="button" disabled={draft === source} onClick={applyValidated}>Compiler et appliquer</button>
      <button type="button" onClick={compileDraft}>Compiler</button>
    </div>
    <div role="status" aria-live="polite">
      {compilation?.ok && <p>Compilation réussie</p>}
      {diagnostics.map((d, i) => <p key={i}>Ligne {d.line ?? "?"} / {d.code} / {d.message}</p>)}
    </div>
  </aside>
}
