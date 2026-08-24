import React, { useState } from "react"
import { observeTemporal, TemporalObservationStatus, TemporalObservationQuantity } from "./temporalObservationContract.js"

/**
 * MB-OBS-003 — Temporal Observation Presentation Instrument.
 *
 * Reproduit exactement le patron déjà validé par MB-MEASURE-001
 * (`../measurement/MeasurementPanel.jsx`) : un composant de présentation
 * mince, sans logique physique ni temporelle propre, qui :
 *
 *   1. laisse l'utilisateur choisir target / quantity / startTime / endTime
 *      / samplePeriod ;
 *   2. délègue l'intégralité du calcul à `observeTemporal()`
 *      (`./temporalObservationContract.js`, MB-OBS-002) ;
 *   3. affiche le `TemporalObservationResult` reçu tel quel — timestamps,
 *      valeurs, unité et statuts ne sont ni recalculés, ni convertis, ni
 *      approximés.
 *
 * Conformément au Blueprint MB-OBS-003 (§2 "Responsabilités", §9
 * "Architecture obligatoire", verrous LOCK-OBS003-01 à 08) et au Ticket
 * (contraintes absolues 1-6, AC-01 à AC-12) :
 *
 * - AUCUNE grille temporelle n'est construite ici (`buildSampleTimes()`
 *   reste interne à `temporalObservationContract.js`, jamais importé) ;
 * - AUCUN sample n'est généré, interpolé ou modifié par ce composant —
 *   `samples[]` est rendu strictement tel que retourné ;
 * - AUCUN accès direct à `clock.js`, `scheduler.js`,
 *   `runtimeOrchestrator.js`, `ArduinoSimulator.js`, `pwmSignal.js`,
 *   `resolution.js`, `preparation.js` ou `canonicalRegistry.js` : le seul
 *   import applicatif de ce fichier est `./temporalObservationContract.js`
 *   (voir `__tests__/TemporalObservationPanelArchitecture.test.js` pour la
 *   preuve statique) ;
 * - AUCUNE horloge : ni `Date.now()`, ni `performance.now()`, ni
 *   `setTimeout`/`setInterval`/`requestAnimationFrame` — le rendu est
 *   strictement synchrone, déclenché par le clic "Observe", jamais rafraîchi
 *   en continu (pas d'oscilloscope temps réel, hors périmètre V1) ;
 * - AUCUNE mutation de `components`/`wires` : ce composant, comme
 *   `MeasurementPanel`, reçoit le circuit en **props** plutôt que de le
 *   découvrir lui-même via `useCircuit()`/`useCircuitState.js`, et ne les
 *   transmet qu'en lecture à `observeTemporal()`.
 *
 * `options` (optionnel) est transmis tel quel au 4ᵉ paramètre de
 * `observeTemporal()` — permet à un appelant (ou à un test, pour le
 * scénario PWM de référence) de fournir un `{ orchestrators }` déjà
 * configuré, exactement le même contrat que `observeTemporal()` lui-même ;
 * ce composant ne construit ni n'interprète jamais cette valeur.
 *
 * Ce composant n'est PAS câblé dans l'application live (`App.jsx`,
 * `Sidebar.jsx`, `useCircuitState.js` restent inchangés par ce ticket) —
 * décision CSA explicite (feu vert Phase 3), même précédent que
 * `MeasurementPanel`. La preuve du scénario PWM de référence (Blueprint
 * §8/§14) est apportée par les tests de ce module, pas par une intégration
 * visible dans l'application.
 *
 * Hors périmètre V1 (Blueprint §7, Ticket "Hors périmètre") : zoom, pan,
 * trigger, autoscale intelligent, curseurs, FFT, export, historique,
 * comparaison de séries, multi-channel, persistence, acquisition continue,
 * oscilloscope temps réel. La représentation graphique ci-dessous est une
 * primitive visuelle minimale (mise à l'échelle linéaire fixe sur l'étendue
 * des échantillons reçus, relier deux points réels par un segment) — elle
 * ne constitue jamais une mesure intermédiaire (Blueprint §5).
 *
 * [Correction CSA — réserve "waveform"] `toPlotLevel()` ci-dessous est une
 * transformation de PRÉSENTATION pure, appliquée uniquement à la
 * représentation graphique : elle ne modifie ni ne recalcule jamais
 * `sample.value` lui-même (`sample.value` reste affiché tel quel dans la
 * liste `temporal-observation-samples`, inchangé). Pour `LOGICAL_STATE`,
 * les deux seules valeurs déjà possibles dans le contrat MB-OBS-001/002
 * (`"HIGH"`/`"LOW"`, voir `observationContract.js`) sont associées à deux
 * niveaux visuels fixes (haut/bas) — aucune troisième valeur n'est
 * inventée, aucune valeur intermédiaire n'est calculée entre deux samples
 * réels (toujours pas d'interpolation), et un sample dont la valeur n'est
 * ni un nombre fini ni `"HIGH"`/`"LOW"` (typiquement `UNAVAILABLE`/`INVALID`,
 * `value: null`) reste exclu du tracé, exactement comme avant cette
 * correction.
 */
function toPlotLevel(quantity, value) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (quantity === TemporalObservationQuantity.LOGICAL_STATE) {
    if (value === "HIGH") return 1
    if (value === "LOW") return 0
  }
  return null
}

export function TemporalObservationPanel({
  instrument = "temporal-observation-panel-1",
  components,
  wires,
  targets = [],
  options,
}) {
  const [quantity, setQuantity] = useState(TemporalObservationQuantity.VOLTAGE)
  const [targetIndex, setTargetIndex] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(10)
  const [samplePeriod, setSamplePeriod] = useState(1)
  const [result, setResult] = useState(null)

  const selectedTarget = targets[targetIndex] ?? null

  function handleObserve() {
    if (!selectedTarget) return
    const request = {
      instrument,
      target: { kind: selectedTarget.kind ?? "PIN", componentUid: selectedTarget.componentUid, pinId: selectedTarget.pinId },
      quantity,
      startTime: Number(startTime),
      endTime: Number(endTime),
      samplePeriod: Number(samplePeriod),
    }
    setResult(observeTemporal(request, components, wires, options))
  }

  const plottable = result && Array.isArray(result.samples)
    ? result.samples
        .map((sample) => ({ sample, level: toPlotLevel(result.quantity, sample.value) }))
        .filter((entry) => entry.level !== null)
    : []

  return (
    <div>
      <label>
        Target
        <select
          aria-label="temporal-observation-target"
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

      <label>
        Quantity
        <select
          aria-label="temporal-observation-quantity"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        >
          {Object.values(TemporalObservationQuantity).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label>
        Start
        <input
          aria-label="temporal-observation-start"
          type="number"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
        />
      </label>

      <label>
        End
        <input
          aria-label="temporal-observation-end"
          type="number"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
        />
      </label>

      <label>
        Sample period
        <input
          aria-label="temporal-observation-sample-period"
          type="number"
          value={samplePeriod}
          onChange={(event) => setSamplePeriod(event.target.value)}
        />
      </label>

      <button type="button" onClick={handleObserve} disabled={!selectedTarget}>
        Observe
      </button>

      {result && (
        <div aria-label="temporal-observation-result">
          <svg
            aria-label="temporal-observation-waveform"
            viewBox="0 0 200 60"
            width="200"
            height="60"
            preserveAspectRatio="none"
          >
            {plottable.length > 0 && (() => {
              const times = plottable.map((entry) => entry.sample.time)
              const levels = plottable.map((entry) => entry.level)
              const minTime = Math.min(...times)
              const maxTime = Math.max(...times)
              const minLevel = Math.min(...levels)
              const maxLevel = Math.max(...levels)
              const timeSpan = maxTime - minTime || 1
              const levelSpan = maxLevel - minLevel || 1
              const positioned = plottable.map((entry) => {
                const x = ((entry.sample.time - minTime) / timeSpan) * 200
                // y inversé : le niveau le plus haut (valeur numérique, ou HIGH pour
                // LOGICAL_STATE) doit apparaître en haut du SVG.
                const y = 60 - ((entry.level - minLevel) / levelSpan) * 60
                return { ...entry, x, y }
              })
              return (
                <>
                  <polyline
                    points={positioned.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  {positioned.map((p) => (
                    <circle
                      key={`temporal-observation-waveform-point-${p.sample.time}`}
                      data-testid="temporal-observation-waveform-point"
                      data-time={p.sample.time}
                      data-level={p.sample.value}
                      cx={p.x}
                      cy={p.y}
                      r="1.5"
                    />
                  ))}
                </>
              )
            })()}
          </svg>

          <dl aria-label="temporal-observation-summary">
            <dt>Quantity</dt>
            <dd>{result.quantity ?? "—"}</dd>
            <dt>Unit</dt>
            <dd>{result.unit ?? "—"}</dd>
            <dt>Status</dt>
            <dd>{result.status}</dd>
            {result.status !== TemporalObservationStatus.VALID && result.reason && (
              <>
                <dt>Reason</dt>
                <dd>{result.reason}</dd>
              </>
            )}
          </dl>

          <ul aria-label="temporal-observation-samples">
            {result.samples.map((sample, index) => (
              <li key={`${sample.time}-${index}`}>
                <span>{sample.time}</span>
                <span>{sample.value ?? "—"}</span>
                <span>{sample.status}</span>
                {sample.reason && <span>{sample.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
