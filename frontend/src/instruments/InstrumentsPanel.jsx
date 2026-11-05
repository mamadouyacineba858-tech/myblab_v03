import React, { useMemo, useState, useSyncExternalStore } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { ReactDocumentMapper } from "../bridge/ReactDocumentMapper.js"
import { toEngineInput } from "../simulator/engineAdapter.js"
import { solveDcNetwork } from "../simulator/nodalDcSolver.js"
import { GeneratorTab, ProbesTab, ScopeLive } from "./InstrumentsLive.jsx"
import { getAmmeterBridgeWire, getInstruments, getInstrumentsVersion, subscribeInstruments, updateInstruments } from "./instrumentsStore.js"
import "./InstrumentsPanel.css"

const TWO_TERMINAL_TYPES = new Set(["RESISTOR", "LED", "DIODE", "POTENTIOMETER"])

function formatValue(value, unit) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  const abs = Math.abs(value)
  if (unit === "A") {
    if (abs < 1e-9) return "0.000 mA"
    return abs < 1 ? `${(value * 1000).toFixed(3)} mA` : `${value.toFixed(4)} A`
  }
  return `${value.toFixed(3)} V`
}

function useCircuitSolution() {
  const { wires, pinSignals, simulationActive } = useCircuit()
  const { components, breadboards } = useCircuitInteraction()
  const instrumentsVersion = useSyncExternalStore(subscribeInstruments, getInstrumentsVersion)
  const adapted = useMemo(() => {
    try {
      return toEngineInput(ReactDocumentMapper.toCore({ components, wires, breadboards }))
    } catch {
      return { components: [], wires: [] }
    }
  }, [components, wires, breadboards])
  const solution = useMemo(() => {
    if (!simulationActive) return null
    try {
      const bridge = getAmmeterBridgeWire()
      const engineWires = bridge ? [...adapted.wires, bridge] : adapted.wires
      return solveDcNetwork(adapted.components, engineWires, { pinSignals })
    } catch (error) {
      console.error("MYBlab solver error:", error)
      return null
    }
  }, [adapted, pinSignals, simulationActive, instrumentsVersion])
  return { solution, components, simulationActive, pinSignals }
}

function pinOptions(components) {
  const list = []
  for (const component of components) {
    const def = getComponentDef(component.type)
    for (const pin of def?.pins ?? []) {
      list.push({ value: `${component.uid}|${pin.id}`, label: `${def?.label ?? component.type} · ${pin.label ?? pin.id}` })
    }
  }
  return list
}

function splitPin(value) {
  const [uid, pin] = String(value || "").split("|")
  return uid && pin ? { uid, pin } : null
}

function PinSelect({ id, label, options, value, onChange }) {
  return (
    <label className="instruments-field">
      <span>{label}</span>
      <select data-testid={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— choisir —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function voltageReading(solution, plus, minus) {
  if (!solution || !plus) return { value: null, note: solution ? "Choisissez la borne +" : "Simulation arrêtée" }
  const a = solution.pinVoltage(plus.uid, plus.pin)
  if (a === null) return { value: null, note: "Nœud non relié / flottant" }
  if (!minus) return { value: a, note: "Référence : masse du circuit" }
  const b = solution.pinVoltage(minus.uid, minus.pin)
  return b === null ? { value: null, note: "Borne − flottante" } : { value: a - b, note: "" }
}

function currentOptions(components) {
  return components.filter((c) => TWO_TERMINAL_TYPES.has(c.type)).map((c) => ({
    value: c.uid, label: `${getComponentDef(c.type)?.label ?? c.type} (${c.uid})`,
  }))
}

function currentReading(solution, uid) {
  if (!solution || !uid) return { value: null, note: solution ? "Choisissez un composant" : "Simulation arrêtée" }
  const segments = solution.elementSegments(uid)
  if (segments.length === 0) return { value: null, note: "Aucun courant calculé (composant hors réseau)" }
  return { value: segments[0].current, note: "Sens : borne A/anode/gauche → borne B/cathode/droite" }
}

function Reading({ id, reading, unit }) {
  return (
    <div className="instruments-reading">
      <output data-testid={id} data-raw={reading.value ?? ""}>{formatValue(reading.value, unit)}</output>
      {reading.note && <small>{reading.note}</small>}
    </div>
  )
}

function Voltmeter({ components, solution }) {
  useSyncExternalStore(subscribeInstruments, getInstrumentsVersion)
  const { voltmeter } = getInstruments()
  const options = useMemo(() => pinOptions(components), [components])
  const plus = voltmeter.plus ? `${voltmeter.plus.uid}|${voltmeter.plus.pin}` : ""
  const minus = voltmeter.minus ? `${voltmeter.minus.uid}|${voltmeter.minus.pin}` : ""
  return (
    <div className="instruments-body" data-testid="voltmeter">
      <PinSelect id="voltmeter-plus" label="Borne +" options={options} value={plus} onChange={(value) => updateInstruments((s) => { s.voltmeter.plus = splitPin(value) })} />
      <PinSelect id="voltmeter-minus" label="Borne − (optionnel)" options={options} value={minus} onChange={(value) => updateInstruments((s) => { s.voltmeter.minus = splitPin(value) })} />
      <Reading id="voltmeter-reading" reading={voltageReading(solution, splitPin(plus), splitPin(minus))} unit="V" />
    </div>
  )
}

function Ammeter({ components, solution }) {
  const options = useMemo(() => currentOptions(components), [components])
  const [uid, setUid] = useState("")
  return (
    <div className="instruments-body" data-testid="ammeter">
      <label className="instruments-field">
        <span>Composant traversé</span>
        <select data-testid="ammeter-target" value={uid} onChange={(e) => setUid(e.target.value)}>
          <option value="">— choisir —</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <Reading id="ammeter-reading" reading={currentReading(solution, uid)} unit="A" />
    </div>
  )
}

function Multimeter({ components, solution }) {
  const [mode, setMode] = useState("V")
  const pins = useMemo(() => pinOptions(components), [components])
  const comps = useMemo(() => currentOptions(components), [components])
  const [plus, setPlus] = useState("")
  const [minus, setMinus] = useState("")
  const [uid, setUid] = useState("")
  const reading = mode === "V" ? voltageReading(solution, splitPin(plus), splitPin(minus)) : currentReading(solution, uid)
  return (
    <div className="instruments-body" data-testid="multimeter">
      <div className="instruments-mode" role="group" aria-label="Mode du multimètre">
        <button type="button" aria-pressed={mode === "V"} data-testid="multimeter-mode-v" onClick={() => setMode("V")}>V</button>
        <button type="button" aria-pressed={mode === "A"} data-testid="multimeter-mode-a" onClick={() => setMode("A")}>A</button>
      </div>
      {mode === "V" ? (
        <>
          <PinSelect id="multimeter-plus" label="Sonde rouge (+)" options={pins} value={plus} onChange={setPlus} />
          <PinSelect id="multimeter-minus" label="Sonde noire (−)" options={pins} value={minus} onChange={setMinus} />
        </>
      ) : (
        <label className="instruments-field">
          <span>Composant traversé</span>
          <select data-testid="multimeter-target" value={uid} onChange={(e) => setUid(e.target.value)}>
            <option value="">— choisir —</option>
            {comps.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      )}
      <Reading id="multimeter-reading" reading={reading} unit={mode} />
    </div>
  )
}

const TABS = [
  { id: "voltmeter", label: "Voltmètre" },
  { id: "ammeter", label: "Ampèremètre" },
  { id: "multimeter", label: "Multimètre" },
  { id: "oscilloscope", label: "Oscilloscope" },
  { id: "probes", label: "Sondes" },
  { id: "generator", label: "Générateur" },
]

export function InstrumentsPanel({ onClose }) {
  const { solution, components, simulationActive } = useCircuitSolution()
  const [tab, setTab] = useState("multimeter")
  const usesDcReading = tab === "voltmeter" || tab === "ammeter" || tab === "multimeter"
  return (
    <aside className="instruments-panel" data-testid="instruments-panel" aria-label="Instruments de mesure">
      <header className="instruments-header">
        <h2>Instruments</h2>
        <button type="button" onClick={onClose} aria-label="Fermer les instruments">✕</button>
      </header>
      <div className="instruments-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} data-testid={`tab-${t.id}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {!simulationActive && <p className="instruments-hint">Lancez la simulation (▶) pour mesurer.</p>}
      {solution?.status === "SHORT_CIRCUIT" && <p className="instruments-alert" role="alert">Court-circuit de source détecté.</p>}
      {tab === "voltmeter" && <Voltmeter components={components} solution={solution} />}
      {tab === "ammeter" && <Ammeter components={components} solution={solution} />}
      {tab === "multimeter" && <Multimeter components={components} solution={solution} />}
      {tab === "oscilloscope" && <ScopeLive components={components} simulationActive={simulationActive} />}
      {tab === "probes" && <ProbesTab components={components} simulationActive={simulationActive} />}
      {tab === "generator" && <GeneratorTab components={components} />}
      {usesDcReading && solution?.unqualifiedTypes?.length > 0 && (
        <p className="instruments-hint" data-testid="instruments-unqualified">
          Modèle DC non qualifié (ignoré dans la mesure) : {solution.unqualifiedTypes.join(", ")}
        </p>
      )}
    </aside>
  )
}
