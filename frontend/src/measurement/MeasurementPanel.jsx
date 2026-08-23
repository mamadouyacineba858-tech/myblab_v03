import React, { useState } from "react"
import { measure, MeasurementMode, MeasurementStatus } from "./measurementContract.js"

/**
 * MB-MEASURE-001 — Minimal user-facing demonstration instrument.
 *
 * Proves the Ticket's "Minimal UI Demonstration Scope" (section H) and the
 * Blueprint's §C subsection of the same name: exactly the four required
 * interactions, nothing more.
 *
 *   1. select VOLTAGE or CURRENT;
 *   2. select a target among those the caller supplies as V1-supported;
 *   3. trigger/read the measurement;
 *   4. display value + unit + status/reason.
 *
 * This component is NOT wired into the live application (App.jsx,
 * Sidebar.jsx, useCircuitState.js are untouched by this ticket — see the
 * architecture test's "sens de dépendance" describe block). It receives
 * `components`/`wires`/`targets` as props from its caller rather than
 * discovering them itself, so that Measurement never grows circuit
 * introspection logic that belongs to a future integration ticket.
 *
 * Deliberately out of scope, per the Ticket §P / Blueprint §C: visual
 * polish, complex layout, a generic instrumentation panel, an oscilloscope,
 * measurement history, waveform display, 3D presentation.
 */
export function MeasurementPanel({ instrument = "measurement-panel-1", components, wires, time = 0, targets = [] }) {
  const [mode, setMode] = useState(MeasurementMode.VOLTAGE)
  const [targetIndex, setTargetIndex] = useState(0)
  const [result, setResult] = useState(null)

  const selectedTarget = targets[targetIndex] ?? null

  function handleMeasure() {
    if (!selectedTarget) return
    const request = {
      instrument,
      mode,
      target: { kind: selectedTarget.kind ?? "PIN", componentUid: selectedTarget.componentUid, pinId: selectedTarget.pinId },
      time,
    }
    setResult(measure(request, components, wires))
  }

  return (
    <div>
      <label>
        Mode
        <select aria-label="measurement-mode" value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value={MeasurementMode.VOLTAGE}>VOLTAGE</option>
          <option value={MeasurementMode.CURRENT}>CURRENT</option>
        </select>
      </label>

      <label>
        Target
        <select
          aria-label="measurement-target"
          value={targetIndex}
          onChange={(event) => setTargetIndex(Number(event.target.value))}
        >
          {targets.map((target, index) => (
            <option key={`${target.componentUid}:${target.pinId}`} value={index}>
              {target.label ?? `${target.componentUid}:${target.pinId}`}
            </option>
          ))}
        </select>
      </label>

      <button type="button" onClick={handleMeasure} disabled={!selectedTarget}>
        Measure
      </button>

      {result && (
        <dl aria-label="measurement-result">
          <dt>Target</dt>
          <dd>{result.target ? `${result.target.componentUid}:${result.target.pinId}` : "—"}</dd>
          <dt>Value</dt>
          <dd>{result.value ?? "—"}</dd>
          <dt>Unit</dt>
          <dd>{result.unit ?? "—"}</dd>
          <dt>Status</dt>
          <dd>{result.status}</dd>
          {result.status !== MeasurementStatus.VALID && result.reason && (
            <>
              <dt>Reason</dt>
              <dd>{result.reason}</dd>
            </>
          )}
        </dl>
      )}
    </div>
  )
}
