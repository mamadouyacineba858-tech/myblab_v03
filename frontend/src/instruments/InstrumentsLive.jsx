import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { getComponentDef } from "../config/componentDefinitions.js"
import {
  GENERATOR_LIMITS, SCOPE_WINDOWS_MS, WAVEFORMS_UI, armPinPick, cancelPinPick, getInstruments, getInstrumentsVersion,
  getPinPickLabel, subscribeInstruments, subscribePinPick, updateInstruments,
} from "./instrumentsStore.js"
import { getLiveStatus, liveVoltage, readScopeWindow } from "./liveSimulation.js"

const COLUMNS = 320
const CH_COLORS = ["#4ade80", "#facc15"]

const encode = (p) => (p ? `${p.uid}|${p.pin}` : "")
const decode = (value) => {
  const [uid, pin] = String(value || "").split("|")
  return uid && pin ? { uid, pin } : null
}

function useInstruments() {
  useSyncExternalStore(subscribeInstruments, getInstrumentsVersion)
  return getInstruments()
}

function usePickLabel() {
  return useSyncExternalStore(subscribePinPick, getPinPickLabel)
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

function formatSI(value, unit) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  const abs = Math.abs(value)
  if (unit === "A") return abs < 1e-9 ? "0.000 mA" : abs < 1 ? `${(value * 1000).toFixed(3)} mA` : `${value.toFixed(4)} A`
  return `${value.toFixed(3)} V`
}

/** Sélecteur de borne : liste déroulante + bouton « Pointer » qui capte le prochain clic sur une broche du canvas. */
function PinField({ id, label, options, value, onChange }) {
  const armed = usePickLabel()
  const mine = armed === label
  const known = value && options.some((o) => o.value === encode(value))
  return (
    <div className="instruments-field">
      <span>{label}</span>
      <div className="instruments-pinrow">
        <select data-testid={id} value={encode(value)} onChange={(e) => onChange(decode(e.target.value))}>
          <option value="">— choisir —</option>
          {value && !known && <option value={encode(value)}>{`${value.uid} · ${value.pin}`}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" data-testid={`${id}-pick`} aria-pressed={mine} className="instruments-pick"
          title="Cliquez ensuite sur une broche du canvas"
          onClick={() => (mine ? cancelPinPick() : armPinPick(label, onChange))}>
          {mine ? "Cliquez une broche…" : "🎯 Pointer"}
        </button>
      </div>
    </div>
  )
}

function useLiveTick(periodMs = 150) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => (n + 1) % 1e9), periodMs)
    return () => clearInterval(timer)
  }, [periodMs])
}

export function ProbesTab({ components, simulationActive }) {
  const instruments = useInstruments()
  useLiveTick()
  const options = useMemo(() => pinOptions(components), [components])
  const { voltmeter, ammeter } = instruments
  const set = (mutator) => updateInstruments(mutator)
  const live = getLiveStatus()
  const volts = simulationActive && voltmeter.plus ? liveVoltage(voltmeter.plus, voltmeter.minus) : null
  const note = !simulationActive ? "Simulation arrêtée"
    : !voltmeter.plus ? "Choisissez la sonde +"
      : volts === null ? "Nœud flottant ou non résolu" : voltmeter.minus ? "Tension entre les deux points" : "Référence : masse du circuit"
  const am = simulationActive && ammeter.a && ammeter.b ? live.ammeter : null
  const amNote = !simulationActive ? "Simulation arrêtée"
    : !(ammeter.a && ammeter.b) ? "Choisissez les bornes A et B"
      : !am ? "En attente…"
        : am.valid ? "Courant de A vers B (ampèremètre en série)"
          : ({ SAME_NET: "Branchement invalide : A et B sont déjà reliés (l'ampèremètre doit remplacer un fil, pas le doubler).", OPEN_TERMINAL: "Branchement invalide : une borne est en l'air.", NOT_SOLVED: "En attente…" }[am.reason] ?? "Branchement invalide")
  return (
    <div className="instruments-body" data-testid="probes">
      <h3 className="instruments-subtitle">Voltmètre (deux points)</h3>
      <PinField id="probe-v-plus" label="Sonde + (rouge)" options={options} value={voltmeter.plus} onChange={(p) => set((s) => { s.voltmeter.plus = p })} />
      <PinField id="probe-v-minus" label="Sonde − (noire)" options={options} value={voltmeter.minus} onChange={(p) => set((s) => { s.voltmeter.minus = p })} />
      <div className="instruments-reading">
        <output data-testid="probe-v-reading" data-raw={volts ?? ""}>{formatSI(volts, "V")}</output>
        <small>{note}</small>
      </div>
      <h3 className="instruments-subtitle">Ampèremètre en série</h3>
      <p className="instruments-hint">Laissez une coupure dans le circuit, puis pointez ses deux extrémités : la sonde ferme le circuit (0 V) et mesure le courant.</p>
      <PinField id="probe-a-a" label="Borne A" options={options} value={ammeter.a} onChange={(p) => set((s) => { s.ammeter.a = p })} />
      <PinField id="probe-a-b" label="Borne B" options={options} value={ammeter.b} onChange={(p) => set((s) => { s.ammeter.b = p })} />
      <div className="instruments-reading">
        <output data-testid="probe-a-reading" data-raw={am?.valid ? am.current : ""} data-valid={am ? String(am.valid) : ""}>{am?.valid ? formatSI(am.current, "A") : "—"}</output>
        <small role={am && !am.valid ? "alert" : undefined}>{amNote}</small>
      </div>
    </div>
  )
}

export function GeneratorTab({ components }) {
  const { generator: g } = useInstruments()
  useLiveTick()
  const options = useMemo(() => pinOptions(components), [components])
  const live = getLiveStatus()
  const set = (key) => (value) => updateInstruments((s) => { s.generator[key] = value })
  const num = (key) => (e) => set(key)(e.target.value === "" ? NaN : Number(e.target.value))
  return (
    <div className="instruments-body" data-testid="generator">
      <label className="instruments-check">
        <input type="checkbox" data-testid="gen-enabled" checked={g.enabled} onChange={(e) => set("enabled")(e.target.checked)} />
        <span>Générateur actif</span>
      </label>
      <label className="instruments-field">
        <span>Forme d'onde</span>
        <select data-testid="gen-waveform" value={g.waveform} onChange={(e) => set("waveform")(e.target.value)}>
          {WAVEFORMS_UI.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
        </select>
      </label>
      <div className="instruments-grid">
        <label className="instruments-field"><span>Fréquence (Hz)</span>
          <input type="number" data-testid="gen-frequency" min={GENERATOR_LIMITS.minHz} max={GENERATOR_LIMITS.maxHz} step="1" value={Number.isFinite(g.frequencyHz) ? g.frequencyHz : ""} onChange={num("frequencyHz")} /></label>
        <label className="instruments-field"><span>Amplitude crête (V)</span>
          <input type="number" data-testid="gen-amplitude" min="0" max={GENERATOR_LIMITS.maxAmplitude} step="0.1" value={Number.isFinite(g.amplitude) ? g.amplitude : ""} onChange={num("amplitude")} /></label>
        <label className="instruments-field"><span>Offset (V)</span>
          <input type="number" data-testid="gen-offset" step="0.1" value={Number.isFinite(g.offset) ? g.offset : ""} onChange={num("offset")} /></label>
        <label className="instruments-field"><span>Rapport cyclique</span>
          <input type="number" data-testid="gen-duty" min="0.01" max="0.99" step="0.05" value={Number.isFinite(g.duty) ? g.duty : ""} disabled={g.waveform !== "square"} onChange={num("duty")} /></label>
      </div>
      <PinField id="gen-plus" label="Sortie + du générateur" options={options} value={g.plus} onChange={set("plus")} />
      <PinField id="gen-minus" label="Sortie − (masse du générateur)" options={options} value={g.minus} onChange={set("minus")} />
      <div className="instruments-reading">
        <output data-testid="gen-reading" data-raw={live.generator?.voltage ?? ""}>{g.enabled && live.generator ? formatSI(live.generator.voltage, "V") : "—"}</output>
        <small>Tension imposée par le moteur (source idéale, {GENERATOR_LIMITS.minHz}–{GENERATOR_LIMITS.maxHz} Hz).</small>
      </div>
      {g.enabled && !g.plus && <p className="instruments-alert" role="alert">Reliez la sortie + à une broche du circuit.</p>}
    </div>
  )
}

function estimateFrequency(columns, key, spanSeconds) {
  const mean = columns.map((c) => (Number.isFinite(c[`min${key}`]) ? (c[`min${key}`] + c[`max${key}`]) / 2 : null))
  const valid = mean.filter((v) => v !== null)
  if (valid.length < 8) return null
  const lo = Math.min(...valid); const hi = Math.max(...valid)
  if (hi - lo < 1e-3) return null
  const mid = (lo + hi) / 2
  const rises = []
  for (let i = 1; i < mean.length; i++) {
    if (mean[i - 1] !== null && mean[i] !== null && mean[i - 1] < mid && mean[i] >= mid) {
      rises.push(i - 1 + (mid - mean[i - 1]) / (mean[i] - mean[i - 1]))
    }
  }
  if (rises.length < 2) return null
  const period = ((rises[rises.length - 1] - rises[0]) / (rises.length - 1)) * (spanSeconds / mean.length)
  return period > 0 ? 1 / period : null
}

export function ScopeLive({ components, simulationActive }) {
  const { scope } = useInstruments()
  const options = useMemo(() => pinOptions(components), [components])
  const canvasRef = useRef(null)
  const [stats, setStats] = useState({ ch: [null, null], freq: null, t: 0 })
  const windowSeconds = scope.windowMs / 1000

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext?.("2d")
      if (!ctx) return
      const { width, height } = canvas
      const { columns, t1 } = readScopeWindow(windowSeconds, COLUMNS)
      const range = [Infinity, -Infinity]
      const chStats = [null, null]
      ;[1, 2].forEach((n, i) => {
        let min = Infinity; let max = -Infinity
        for (const c of columns) { min = Math.min(min, c[`min${n}`]); max = Math.max(max, c[`max${n}`]) }
        if (Number.isFinite(min)) { chStats[i] = { min, max }; range[0] = Math.min(range[0], min); range[1] = Math.max(range[1], max) }
      })
      ctx.fillStyle = "#0b1a12"
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = "#1f4d34"
      ctx.lineWidth = 1
      for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo((width * i) / 10, 0); ctx.lineTo((width * i) / 10, height); ctx.stroke() }
      for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, (height * i) / 8); ctx.lineTo(width, (height * i) / 8); ctx.stroke() }
      let lo = Math.min(0, range[0]); let hi = Math.max(range[1], lo + 1e-3)
      if (!Number.isFinite(lo)) { lo = 0; hi = 5 }
      const pad = (hi - lo) * 0.08
      lo -= pad; hi += pad
      const yOf = (v) => height - ((v - lo) / (hi - lo)) * height
      if (lo < 0 && hi > 0) { ctx.strokeStyle = "#2f6f4c"; ctx.beginPath(); ctx.moveTo(0, yOf(0)); ctx.lineTo(width, yOf(0)); ctx.stroke() }
      ;[1, 2].forEach((n, i) => {
        ctx.strokeStyle = CH_COLORS[i]
        ctx.lineWidth = 2
        ctx.beginPath()
        let started = false
        columns.forEach((c, k) => {
          const mn = c[`min${n}`]; const mx = c[`max${n}`]
          if (!Number.isFinite(mn)) return
          const x = (k / columns.length) * width
          if (!started) { ctx.moveTo(x, yOf(mn)); started = true } else ctx.lineTo(x, yOf(mn))
          if (mx - mn > 1e-9) ctx.lineTo(x, yOf(mx))
        })
        ctx.stroke()
      })
      setStats({ ch: chStats, freq: estimateFrequency(columns, "1", windowSeconds), t: t1 })
    }
    draw()
    const timer = setInterval(draw, 100)
    return () => clearInterval(timer)
  }, [windowSeconds])

  const set = (mutator) => updateInstruments(mutator)
  const fmt = (s) => (s ? `${s.min.toFixed(2)} → ${s.max.toFixed(2)} V` : "—")
  const raw = (s, key) => (s ? s[key] : "")
  return (
    <div className="instruments-body" data-testid="oscilloscope">
      <PinField id="scope-channel" label="Voie 1 (+)" options={options} value={scope.ch1.plus} onChange={(p) => set((s) => { s.scope.ch1.plus = p })} />
      <PinField id="scope-channel-ref" label="Voie 1 (− optionnel)" options={options} value={scope.ch1.minus} onChange={(p) => set((s) => { s.scope.ch1.minus = p })} />
      <PinField id="scope-channel2" label="Voie 2 (+)" options={options} value={scope.ch2.plus} onChange={(p) => set((s) => { s.scope.ch2.plus = p })} />
      <PinField id="scope-channel2-ref" label="Voie 2 (− optionnel)" options={options} value={scope.ch2.minus} onChange={(p) => set((s) => { s.scope.ch2.minus = p })} />
      <label className="instruments-field">
        <span>Base de temps (fenêtre)</span>
        <select data-testid="scope-window" value={scope.windowMs} onChange={(e) => set((s) => { s.scope.windowMs = Number(e.target.value) })}>
          {SCOPE_WINDOWS_MS.map((w) => <option key={w} value={w}>{w >= 1000 ? `${w / 1000} s` : `${w} ms`}</option>)}
        </select>
      </label>
      <canvas ref={canvasRef} width={320} height={160} className="instruments-scope" data-testid="scope-canvas" aria-label="Oscilloscope" />
      <div className="instruments-scope-stats" data-testid="scope-stats"
        data-vmin={raw(stats.ch[0], "min")} data-vmax={raw(stats.ch[0], "max")}
        data-vmin2={raw(stats.ch[1], "min")} data-vmax2={raw(stats.ch[1], "max")}
        data-freq={stats.freq ?? ""} data-tend={stats.t}>
        {simulationActive
          ? `CH1 ${fmt(stats.ch[0])} · CH2 ${fmt(stats.ch[1])}${stats.freq ? ` · f ≈ ${stats.freq.toFixed(1)} Hz` : ""} · t = ${stats.t.toFixed(3)} s`
          : "Simulation arrêtée : lancez ▶ pour acquérir"}
      </div>
      <p className="instruments-legend"><span style={{ color: CH_COLORS[0] }}>■ CH1</span> <span style={{ color: CH_COLORS[1] }}>■ CH2</span> · temps simulé, min/max par colonne</p>
    </div>
  )
}
