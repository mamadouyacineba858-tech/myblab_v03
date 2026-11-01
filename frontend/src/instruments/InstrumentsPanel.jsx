import React, { useEffect, useMemo, useRef, useState } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { getComponentDef } from "../config/componentDefinitions.js"
import { ReactDocumentMapper } from "../bridge/ReactDocumentMapper.js"
import { toEngineInput } from "../simulator/engineAdapter.js"
import { solveDcNetwork } from "../simulator/nodalDcSolver.js"
import { SIMULATION_STEP_MS } from "../simulator/simulationRuntimeIntegration.js"
import "./InstrumentsPanel.css"

const MAX_SAMPLES = 640
const WINDOWS_MS = [160, 1000, 5000, 10000]
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
      return solveDcNetwork(adapted.components, adapted.wires, { pinSignals })
    } catch (error) {
      console.error("MYBlab solver error:", error)
      return null
    }
  }, [adapted, pinSignals, simulationActive])
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
  const options = useMemo(() => pinOptions(components), [components])
  const [plus, setPlus] = useState("")
  const [minus, setMinus] = useState("")
  return (
    <div className="instruments-body" data-testid="voltmeter">
      <PinSelect id="voltmeter-plus" label="Borne +" options={options} value={plus} onChange={setPlus} />
      <PinSelect id="voltmeter-minus" label="Borne − (optionnel)" options={options} value={minus} onChange={setMinus} />
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

function Oscilloscope({ components, solution, pinSignals, simulationActive }) {
  const options = useMemo(() => pinOptions(components), [components])
  const [channel, setChannel] = useState("")
  const [windowMs, setWindowMs] = useState(5000)
  const [samples, setSamples] = useState([])
  const canvasRef = useRef(null)
  const target = splitPin(channel)
  const targetUid = target?.uid
  const targetPin = target?.pin

  // Une nouvelle `pinSignals` = un pas de simulation de SIMULATION_STEP_MS
  // (useCircuitState) ; l'axe temps est donc le temps simulé, pas l'horloge murale.
  // L'acquisition écrit dans une ref (pas de setState dans l'effet : évite la
  // boucle de mises à jour avec le pas de simulation) ; l'affichage est rafraîchi par un minuteur.
  const bufferRef = useRef([])
  useEffect(() => {
    if (!simulationActive || !pinSignals || pinSignals.size === 0) {
      bufferRef.current = []
      return
    }
    if (!solution || !targetUid) return
    const buffer = bufferRef.current
    const v = solution.pinVoltage(targetUid, targetPin)
    const t = (buffer.length ? buffer[buffer.length - 1].t : 0) + SIMULATION_STEP_MS
    buffer.push({ t, v })
    if (buffer.length > MAX_SAMPLES) buffer.splice(0, buffer.length - MAX_SAMPLES)
    // Un échantillon par nouveau pas de simulation uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinSignals, simulationActive])

  useEffect(() => {
    const id = setInterval(() => setSamples(bufferRef.current.slice()), 100)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext?.("2d")
    if (!ctx) return
    const { width, height } = canvas
    ctx.fillStyle = "#0b1a12"
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = "#1f4d34"
    ctx.lineWidth = 1
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo((width * i) / 10, 0); ctx.lineTo((width * i) / 10, height); ctx.stroke() }
    for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, (height * i) / 8); ctx.lineTo(width, (height * i) / 8); ctx.stroke() }
    const data = samples
    if (data.length < 2) return
    const tEnd = data[data.length - 1].t
    const tStart = tEnd - windowMs
    const visible = data.filter((s) => s.t >= tStart && s.v !== null)
    const vMax = Math.max(5, ...visible.map((s) => s.v)) * 1.1
    const vMin = Math.min(0, ...visible.map((s) => s.v))
    ctx.strokeStyle = "#4ade80"
    ctx.lineWidth = 2
    ctx.beginPath()
    visible.forEach((s, i) => {
      const x = ((s.t - tStart) / windowMs) * width
      const y = height - ((s.v - vMin) / (vMax - vMin)) * height
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [samples, windowMs])

  const data = samples
  const last = data.length ? data[data.length - 1] : null
  const visible = last ? data.filter((s) => s.t >= last.t - windowMs && s.v !== null) : []
  const stats = visible.length
    ? { min: Math.min(...visible.map((s) => s.v)), max: Math.max(...visible.map((s) => s.v)) }
    : null

  return (
    <div className="instruments-body" data-testid="oscilloscope">
      <PinSelect id="scope-channel" label="Voie 1 (nœud)" options={options}       value={channel} onChange={(value) => { setChannel(value); bufferRef.current = []; setSamples([]) }} />
      <label className="instruments-field">
        <span>Base de temps (fenêtre)</span>
        <select data-testid="scope-window" value={windowMs} onChange={(e) => setWindowMs(Number(e.target.value))}>
          {WINDOWS_MS.map((w) => <option key={w} value={w}>{w >= 1000 ? `${w / 1000} s` : `${w} ms`}</option>)}
        </select>
      </label>
      <canvas ref={canvasRef} width={320} height={140} className="instruments-scope" data-testid="scope-canvas" aria-label="Oscilloscope" />
      <div className="instruments-scope-stats" data-testid="scope-stats"
        data-samples={visible.length} data-vmin={stats?.min ?? ""} data-vmax={stats?.max ?? ""} data-tend={last?.t ?? ""}>
        {simulationActive
          ? (stats ? `Échantillons : ${visible.length} · Vmin ${stats.min.toFixed(2)} V · Vmax ${stats.max.toFixed(2)} V · t = ${(last.t / 1000).toFixed(2)} s`
            : target ? "Acquisition en attente…" : "Choisissez une voie")
          : "Simulation arrêtée : lancez ▶ pour acquérir"}
      </div>
    </div>
  )
}

const TABS = [
  { id: "voltmeter", label: "Voltmètre" },
  { id: "ammeter", label: "Ampèremètre" },
  { id: "multimeter", label: "Multimètre" },
  { id: "oscilloscope", label: "Oscilloscope" },
]

export function InstrumentsPanel({ onClose }) {
  const { solution, components, simulationActive, pinSignals } = useCircuitSolution()
  const [tab, setTab] = useState("multimeter")
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
      {tab === "oscilloscope" && <Oscilloscope components={components} solution={solution} pinSignals={pinSignals} simulationActive={simulationActive} />}
      {solution?.unqualifiedTypes?.length > 0 && (
        <p className="instruments-hint" data-testid="instruments-unqualified">
          Modèle DC non qualifié (ignoré dans la mesure) : {solution.unqualifiedTypes.join(", ")}
        </p>
      )}
    </aside>
  )
}
