import { createTransientSession } from "../simulator/transientSolver.js"
import {
  ARDUINO_PWM_MAX_FREQUENCY_HZ,
  pinAverageLevel,
  setAnalogReader,
} from "../simulator/arduino/arduinoPinTelemetry.js"
import { getInstruments } from "./instrumentsStore.js"

/**
 * Simulation temporelle « vivante » (TINKERCAD-005) : possède la session du
 * solveur transitoire, l'avance du temps simulé fourni par la boucle de
 * simulation, et mémorise les échantillons des voies d'oscilloscope.
 * Tout ce qui est affiché provient du solveur ; rien n'est interpolé ni inventé.
 */

const MAX_SAMPLES = 1 << 17
const FRAME_FINE_STEPS = 160
const FRAME_COARSE_STEPS = 4
const STEPS_PER_PERIOD = 50
const MAX_STEPS_PER_FRAME = 800
const MIN_SAMPLE_INTERVAL = 20e-6
const DYNAMIC_TYPES = new Set(["CAPACITOR", "POLARIZED_CAPACITOR", "INDUCTOR"])

let session = null
let signature = ""
let circuitHasDynamics = false
let sampleTime = new Float64Array(MAX_SAMPLES)
let sampleCh1 = new Float32Array(MAX_SAMPLES).fill(NaN)
let sampleCh2 = new Float32Array(MAX_SAMPLES).fill(NaN)
let head = 0
let count = 0
let latestAmmeter = null
let latestGenerator = null
let lastError = null
let sessionStamp = 0
let currentStep = 0

const pinKey = (p) => (p ? `${p.uid}|${p.pin}` : "-")

function buildSignature(components, wires, instruments) {
  const comps = components.map((c) => `${c.uid}:${c.type}:${JSON.stringify(c.parameters ?? {})}:${c.state ?? ""}:${JSON.stringify(c.channelStates ?? {})}`).join(";")
  const links = wires.map((w) => `${w.fromUid}.${w.fromPin}-${w.toUid}.${w.toPin}`).join(";")
  const g = instruments.generator
  const gen = g.enabled && g.plus ? `${g.waveform}/${g.frequencyHz}/${g.amplitude}/${g.offset}/${g.duty}/${pinKey(g.plus)}/${pinKey(g.minus)}` : "off"
  return `${comps}#${links}#${gen}#${pinKey(instruments.ammeter.a)}>${pinKey(instruments.ammeter.b)}`
}

function resetBuffers() { head = 0; count = 0; sessionStamp += 1 }

/** Reconstruit la session si le circuit ou les réglages du générateur / de l'ampèremètre ont changé. */
export function configureLive(components, wires) {
  const instruments = getInstruments()
  const next = buildSignature(components, wires, instruments)
  if (next === signature && session) return false
  const initialConditions = session?.getInitialConditions()
  signature = next
  const g = instruments.generator
  const generators = g.enabled && g.plus ? [{ ...g }] : []
  const { a, b } = instruments.ammeter
  const ammeters = a && b ? [{ id: "series", a, b }] : []
  circuitHasDynamics = generators.length > 0 || components.some((c) => DYNAMIC_TYPES.has(c.type))
  try {
    session = createTransientSession(components, wires, {
      generators, ammeters, initialConditions, drive: (uid, pin, t) => pinAverageLevel(uid, pin, t - currentStep, t),
    })
    lastError = null
  } catch (error) {
    console.error("MYBlab transient solver error:", error)
    lastError = error instanceof Error ? error.message : String(error)
    session = null
  }
  latestAmmeter = null
  latestGenerator = null
  lastError = null
  resetBuffers()
  setAnalogReader((uid, pin) => (session ? session.pinVoltage(uid, pin) : null))
  return true
}

export function stopLive() {
  session = null
  signature = ""
  latestAmmeter = null
  latestGenerator = null
  resetBuffers()
  setAnalogReader(null)
}

function channelValue(channel) {
  if (!session || !channel.plus) return NaN
  const v = channel.minus ? session.voltageBetween(channel.plus, channel.minus) : session.pinVoltage(channel.plus.uid, channel.plus.pin)
  return v === null || v === undefined ? NaN : v
}

/** Avance le temps simulé de `dtSeconds` (une trame de simulation) et enregistre les voies du scope. */
export function advanceLive(dtSeconds, pwmActive = false) {
  if (!session) return
  const { scope, generator } = getInstruments()
  // Pas ≤ période/100 pour la source la plus rapide (la méthode d'Euler arrière suramortit sinon).
  let dtTarget = circuitHasDynamics || pwmActive ? dtSeconds / FRAME_FINE_STEPS : dtSeconds / FRAME_COARSE_STEPS
  if (generator.enabled && generator.plus) dtTarget = Math.min(dtTarget, 1 / (generator.frequencyHz * STEPS_PER_PERIOD))
  if (pwmActive) dtTarget = Math.min(dtTarget, 1 / (ARDUINO_PWM_MAX_FREQUENCY_HZ * STEPS_PER_PERIOD))
  const steps = Math.min(MAX_STEPS_PER_FRAME, Math.max(1, Math.ceil(dtSeconds / dtTarget)))
  const dt = dtSeconds / steps
  currentStep = dt
  const every = Math.max(1, Math.round(MIN_SAMPLE_INTERVAL / dt))
  for (let i = 0; i < steps; i++) {
    session.step(dt)
    if (i % every !== 0) continue
    sampleTime[head] = session.time
    sampleCh1[head] = channelValue(scope.ch1)
    sampleCh2[head] = channelValue(scope.ch2)
    head = (head + 1) % MAX_SAMPLES
    count = Math.min(MAX_SAMPLES, count + 1)
  }
  const { a, b } = getInstruments().ammeter
  latestAmmeter = a && b ? session.ammeter("series") : null
  const g = getInstruments().generator
  latestGenerator = g.enabled && g.plus ? session.generator(g.id) : null
}

export function getLiveStatus() {
  return {
    available: Boolean(session),
    time: session?.time ?? 0,
    status: session?.status ?? "NO_SESSION",
    nonConverged: session?.nonConverged ?? 0,
    unqualifiedTypes: session?.unqualifiedTypes ?? [],
    error: lastError,
    ammeter: latestAmmeter,
    generator: latestGenerator,
    stamp: sessionStamp,
  }
}

export function liveVoltage(plus, minus) {
  if (!session || !plus) return null
  return minus ? session.voltageBetween(plus, minus) : session.pinVoltage(plus.uid, plus.pin)
}

/**
 * Fenêtre glissante des `windowSeconds` dernières secondes simulées, réduite
 * à `columns` colonnes (min/max par colonne pour ne perdre aucun pic).
 */
export function readScopeWindow(windowSeconds, columns) {
  if (count === 0) return { columns: [], t0: 0, t1: 0 }
  const lastIndex = (head - 1 + MAX_SAMPLES) % MAX_SAMPLES
  const t1 = sampleTime[lastIndex]
  const t0 = t1 - windowSeconds
  const cols = Array.from({ length: columns }, () => ({ min1: Infinity, max1: -Infinity, min2: Infinity, max2: -Infinity }))
  for (let k = 0; k < count; k++) {
    const idx = (lastIndex - k + MAX_SAMPLES) % MAX_SAMPLES
    const t = sampleTime[idx]
    if (t < t0) break
    const col = Math.min(columns - 1, Math.max(0, Math.floor(((t - t0) / windowSeconds) * columns)))
    const c = cols[col]
    const v1 = sampleCh1[idx]; const v2 = sampleCh2[idx]
    if (!Number.isNaN(v1)) { c.min1 = Math.min(c.min1, v1); c.max1 = Math.max(c.max1, v1) }
    if (!Number.isNaN(v2)) { c.min2 = Math.min(c.min2, v2); c.max2 = Math.max(c.max2, v2) }
  }
  return { columns: cols, t0, t1 }
}
