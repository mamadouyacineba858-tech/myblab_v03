import React, { useState } from "react"
import { useCircuit } from "../../context/useCircuit.js"
import { compileFirmware } from "../firmware/firmwareCompiler.js"
import "./ArduinoCodeWorkspace.css"

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
  return <aside className="arduino-code-workspace" aria-label="Arduino Code">
    <div className="arduino-code-heading"><h2>Arduino Code</h2><button onClick={onClose} aria-label="Fermer Arduino Code">X</button></div>
    <small>Arduino {component.uid}</small>
    <label htmlFor="arduino-sketch">Sketch</label>
    <textarea id="arduino-sketch" spellCheck={false} value={draft} onChange={event => { setDraft(event.target.value); setCompilation(null) }} />
    <div className="arduino-code-actions">
      <button disabled={draft === source} onClick={() => { if (draft !== source) apply(component.uid, draft) }}>Appliquer</button>
      <button onClick={() => setCompilation(compileFirmware(draft))}>Compiler</button>
    </div>
    <div role="status" aria-live="polite">
      {compilation?.ok && <p>Compilation réussie</p>}
      {diagnostics.map((d, i) => <p key={i}>Ligne {d.line ?? "?"} / {d.code} / {d.message}</p>)}
    </div>
  </aside>
}
