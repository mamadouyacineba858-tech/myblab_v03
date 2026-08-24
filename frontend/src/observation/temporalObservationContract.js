import { observe, ObservationStatus, ObservationQuantity } from "./observationContract.js"
import { createRuntimeOrchestrator } from "../simulator/runtimeOrchestrator.js"
import { circuitRequiresRuntime } from "../simulator/simulationRuntimeIntegration.js"

/**
 * MB-OBS-002 — Temporal Observation Contract.
 *
 * Extension additive, jamais une réécriture, du contrat Observation
 * instantané (MB-OBS-001, `observationContract.js`) vers une série
 * temporelle déterministe :
 *
 *   SimulatedClock / Scheduler (existants, MB-SIM-009)
 *        ↓
 *   RuntimeOrchestrator (existant, MB-SIM-010/014)
 *        ↓
 *   externalSignals (existant, MB-SIM-012)
 *        ↓
 *   observe() — MB-OBS-001, inchangé dans son comportement à 3 arguments,
 *               étendu d'un 4ᵉ paramètre optionnel `externalSignals`
 *        ↓
 *   observeTemporal() ← ce module
 *        ↓
 *   Measurement / futurs instruments (hors périmètre de ce ticket)
 *
 * Traçabilité : docs/pmo/tickets/MB-OBS-002.md, docs/pmo/blueprints/
 * MB-OBS-002-temporal-observation-blueprint.md.
 *
 * Composition, jamais duplication :
 * - Aucune formule PWM n'est réimplémentée (`evaluatePwmSignal()`,
 *   `pwmSignal.js`, n'est ni importé ni référencé ici — seul le `Signal`
 *   déjà public que `ArduinoSimulator.tick()` retourne est consommé, via
 *   `RuntimeOrchestrator.advance()`, sans jamais lire un `PwmSignal` brut).
 * - Aucune logique de résolution de circuit n'est réimplémentée : chaque
 *   instant échantillonné délègue entièrement à `observe()` (MB-OBS-001),
 *   qui réutilise lui-même `prepareCircuit()`/`resolveSignals()` tels
 *   quels.
 * - La discipline « un seul Scheduler partagé avancé une seule fois par
 *   instant, même avec plusieurs composants Runtime » reproduit
 *   volontairement celle déjà éprouvée par
 *   `simulationRuntimeIntegration.js` (MB-SIM-014, invariant « GATE 1 »)
 *   — ce fichier n'est cependant PAS importé/modifié ici (décision de
 *   périmètre CSA MB-OBS-002 §14 : limiter l'impact à
 *   `frontend/src/observation/**`) ; seules les primitives publiques déjà
 *   existantes (`createRuntimeOrchestrator`, `RuntimeOrchestrator.advance`)
 *   sont recomposées, à l'identique dans leur usage.
 *
 * Horloge unique, jamais de temps réel :
 * - Ce module n'importe ni `clock.js` ni `pwmSignal.js` ni
 *   `ArduinoSimulator.js` directement — uniquement `createRuntimeOrchestrator`
 *   (qui possède déjà, en interne, sa propre référence à `SimulatedClock`/
 *   `ArduinoSimulator` par défaut si aucune n'est injectée).
 * - Aucune référence à `Date.now()`, `performance.now()`, `setTimeout()`,
 *   `setInterval()`, `requestAnimationFrame()` — voir
 *   `temporalObservationArchitecture.test.js` pour la preuve statique.
 * - Le(s) `RuntimeOrchestrator` utilisé(s) sont TOUJOURS soit créés
 *   localement pour la durée d'un seul appel `observeTemporal()` (par
 *   défaut), soit fournis explicitement par l'appelant via
 *   `options.orchestrators` (même contrat que
 *   `runSimulationWithRuntime(components, wires, { orchestrators })`) —
 *   jamais lus depuis un état global/ambiant. Aucune simulation « live »
 *   n'existe aujourd'hui dans l'application (`useCircuitState.js` ne
 *   référence ni Scheduler ni RuntimeOrchestrator — vérifié par audit
 *   pré-implémentation) : ce module ne peut donc pas la muter par
 *   construction ; le contrat interdit malgré tout explicitement toute
 *   lecture d'un Scheduler ambiant, pour rester vrai si un futur ticket
 *   câble un jour une simulation live sur ce même Scheduler.
 *
 * Document en lecture seule : `components`/`wires` ne sont jamais mutés
 * (chaque instant délègue à `observe()`, lui-même non-mutant).
 */

/** Réutilisation stricte de la sémantique MB-OBS-001 — aucune nouvelle catégorie. */
export const TemporalObservationStatus = ObservationStatus

/** Réutilisation stricte de la sémantique MB-OBS-001 — aucune nouvelle grandeur. */
export const TemporalObservationQuantity = ObservationQuantity

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

function isWellFormedTemporalRequest(request) {
  return Boolean(
    request &&
    typeof request === "object" &&
    request.target &&
    typeof request.target === "object" &&
    typeof request.target.kind === "string" &&
    typeof request.target.componentUid === "string" &&
    typeof request.target.pinId === "string" &&
    typeof request.quantity === "string" &&
    isFiniteNumber(request.startTime) && request.startTime >= 0 &&
    isFiniteNumber(request.endTime) && request.endTime >= request.startTime &&
    isFiniteNumber(request.samplePeriod) && request.samplePeriod > 0
  )
}

/**
 * Construit un TemporalObservationResult conforme au contrat (Ticket §F /
 * Blueprint §6) : target, quantity, unit, startTime, endTime, samplePeriod,
 * samples[], status, reason?
 */
function buildTemporalResult({ request, status, samples = [], unit = null, reason }) {
  const result = {
    target: request?.target ?? null,
    quantity: request?.quantity ?? null,
    unit,
    startTime: isFiniteNumber(request?.startTime) ? request.startTime : null,
    endTime: isFiniteNumber(request?.endTime) ? request.endTime : null,
    samplePeriod: isFiniteNumber(request?.samplePeriod) ? request.samplePeriod : null,
    samples,
    status,
  }
  if (reason) result.reason = reason
  return result
}

/**
 * Calcule la grille d'instants d'échantillonnage, par pure arithmétique,
 * AVANT tout accès à une quelconque horloge (Blueprint §5 « Sampling
 * points ») : startTime, startTime + samplePeriod, ... tant que <= endTime.
 *
 * Chaque instant est calculé indépendamment (`startTime + i*samplePeriod`),
 * jamais par addition cumulative de `samplePeriod` — élimine toute dérive
 * flottante accumulée sur une longue fenêtre.
 *
 * `endTime` n'est inclus que s'il tombe exactement sur la grille (à une
 * tolérance flottante relative près, nécessaire car `(endTime - startTime)
 * / samplePeriod` n'est pas toujours un entier exact en arithmétique
 * IEEE 754 même quand il l'est mathématiquement) — jamais un point
 * hors-grille n'est ajouté artificiellement pour "boucler" sur endTime
 * (Blueprint §5 : « MUST NOT silently invent an additional off-grid
 * endpoint sample »).
 *
 * @param {number} startTime
 * @param {number} endTime
 * @param {number} samplePeriod
 * @returns {number[]} Toujours au moins `[startTime]` pour une requête
 *   bien formée (startTime <= endTime, samplePeriod > 0 déjà garantis par
 *   isWellFormedTemporalRequest avant tout appel à cette fonction).
 */
function buildSampleTimes(startTime, endTime, samplePeriod) {
  const EPSILON = 1e-9
  const stepCount = (endTime - startTime) / samplePeriod
  const roundedStepCount = Math.round(stepCount)
  const endsOnGrid = Math.abs(stepCount - roundedStepCount) < EPSILON
  const lastIndex = endsOnGrid ? roundedStepCount : Math.floor(stepCount)

  const times = []
  for (let i = 0; i <= lastIndex; i++) {
    times.push(startTime + i * samplePeriod)
  }
  return times
}

/**
 * Obtient (ou crée) les RuntimeOrchestrator nécessaires pour ce circuit,
 * un par composant ARDUINO, tous partageant un unique Scheduler — même
 * discipline que `simulationRuntimeIntegration.js` (MB-SIM-014, GATE 1),
 * volontairement recomposée ici plutôt qu'importée (voir en-tête de
 * fichier, décision de périmètre).
 *
 * @param {Array<{uid, type}>} components
 * @param {Map<string, import('../simulator/runtimeOrchestrator.js').RuntimeOrchestrator>|undefined} existingOrchestrators
 *   Optionnel — même contrat que `runSimulationWithRuntime`'s
 *   `options.orchestrators` : permet à l'appelant de fournir un runtime
 *   déjà configuré (ex. un `analogWrite()` déjà effectué pour le scénario
 *   PWM de référence). Une nouvelle Map est utilisée si omise — jamais un
 *   état global/ambiant.
 */
function getOrCreateOrchestrators(components, existingOrchestrators) {
  const runtimeUids = (components || [])
    .filter((c) => c && c.type === "ARDUINO")
    .map((c) => c.uid)

  const orchestrators = existingOrchestrators instanceof Map ? existingOrchestrators : new Map()

  let sharedScheduler = null
  for (const existing of orchestrators.values()) {
    sharedScheduler = existing.getScheduler()
    break
  }

  for (const uid of runtimeUids) {
    if (!orchestrators.has(uid)) {
      const orchestrator = sharedScheduler
        ? createRuntimeOrchestrator({ scheduler: sharedScheduler })
        : createRuntimeOrchestrator()
      sharedScheduler = orchestrator.getScheduler()
      orchestrators.set(uid, orchestrator)
    }
  }

  return { runtimeUids, orchestrators, scheduler: sharedScheduler }
}

/**
 * Fait progresser tous les RuntimeOrchestrator de `runtimeUids` jusqu'à ce
 * même instant partagé, en n'avançant le Scheduler partagé qu'UNE SEULE
 * fois (jamais dt * N — même invariant que MB-SIM-014 §6), puis fusionne
 * les SignalMap obtenues en un unique `externalSignals` (clé "uid:pinId"),
 * exactement le format déjà consommé par `resolveSignals()`.
 */
function advanceAllOrchestrators(runtimeUids, orchestrators, dt) {
  const externalSignals = new Map()
  let advancedThisTick = false
  let sharedCurrentTimeMs = null

  for (const uid of runtimeUids) {
    const orchestrator = orchestrators.get(uid)
    let signalMap
    if (!advancedThisTick) {
      const result = orchestrator.advance(dt)
      signalMap = result.signalMap
      sharedCurrentTimeMs = result.time
      advancedThisTick = true
    } else {
      signalMap = orchestrator.getRuntime().tick(sharedCurrentTimeMs)
    }
    for (const [pinId, signal] of signalMap) {
      externalSignals.set(`${uid}:${pinId}`, signal)
    }
  }

  return { externalSignals, time: sharedCurrentTimeMs }
}

/**
 * Point d'entrée public unique de l'extension temporelle (AC-01).
 *
 * @param {{ target: object, quantity: string, startTime: number, endTime: number, samplePeriod: number }} request
 * @param {Array<object>} components
 * @param {Array<object>} wires
 * @param {{ orchestrators?: Map<string, import('../simulator/runtimeOrchestrator.js').RuntimeOrchestrator> }} [options]
 *   `orchestrators` optionnel : permet de fournir un runtime déjà
 *   configuré (scénario PWM de référence, AC-05) — voir
 *   `getOrCreateOrchestrators`. Le Scheduler qu'il porte doit être à un
 *   temps <= `request.startTime`, sans quoi la requête est rejetée
 *   explicitement (ce module ne "rembobine" jamais un Scheduler partagé).
 * @returns {{ target: object, quantity: string, unit: string|null, startTime: number|null, endTime: number|null, samplePeriod: number|null, samples: Array<{time:number, value:*, status:string, reason?:string}>, status: "VALID"|"UNAVAILABLE"|"INVALID", reason?: string }}
 */
export function observeTemporal(request, components, wires, options = {}) {
  if (!isWellFormedTemporalRequest(request)) {
    return buildTemporalResult({
      request: request && typeof request === "object" ? request : {},
      status: TemporalObservationStatus.INVALID,
      reason:
        "malformed temporal observation request: target.kind/componentUid/pinId (strings), " +
        "quantity (string), startTime/endTime/samplePeriod (finite numbers, startTime >= 0, " +
        "endTime >= startTime, samplePeriod > 0) are required",
    })
  }

  if (!Array.isArray(components) || !Array.isArray(wires)) {
    return buildTemporalResult({
      request,
      status: TemporalObservationStatus.INVALID,
      reason: "malformed circuit context: components and wires arrays are required",
    })
  }

  const { target, quantity, startTime, endTime, samplePeriod } = request
  const times = buildSampleTimes(startTime, endTime, samplePeriod)

  const needsRuntime = circuitRequiresRuntime(components)
  let runtimeUids = []
  let orchestrators = null
  let scheduler = null
  if (needsRuntime) {
    const setup = getOrCreateOrchestrators(components, options.orchestrators)
    runtimeUids = setup.runtimeUids
    orchestrators = setup.orchestrators
    scheduler = setup.scheduler
  }

  const samples = []
  let unit = null

  for (const t of times) {
    let externalSignals = null

    if (needsRuntime && runtimeUids.length > 0) {
      const dt = t - scheduler.getCurrentTime()
      if (dt < 0) {
        // Le Scheduler fourni via options.orchestrators est déjà à un
        // temps postérieur à `t` : ce module ne rembobine jamais un
        // Scheduler partagé (ce serait une seconde source de vérité
        // temporelle implicite). Rejeté explicitement, sans série
        // partielle.
        return buildTemporalResult({
          request,
          status: TemporalObservationStatus.INVALID,
          reason:
            `the supplied runtime state is already at simulation time ${scheduler.getCurrentTime()}ms, ` +
            `past the requested sample time ${t}ms; observeTemporal() never rewinds a shared Scheduler`,
        })
      }
      const advanced = advanceAllOrchestrators(runtimeUids, orchestrators, dt)
      externalSignals = advanced.externalSignals
    }

    const instantRequest = { target, quantity, time: t }
    const result = observe(instantRequest, components, wires, externalSignals)

    if (samples.length === 0 && result.status === TemporalObservationStatus.INVALID) {
      // target/quantity sont fixes sur toute la fenêtre temporelle : si le
      // tout premier instant est INVALID, tous les suivants le seraient
      // identiquement (même target, même quantity, même circuit) — rapporté
      // une seule fois, au niveau de la requête entière, sans série
      // partielle (Ticket §E : "invalid temporal requests ... MUST NOT
      // partially mutate state" — et, par cohérence de contrat, ne
      // produisent pas non plus une série partielle constituée uniquement
      // d'échantillons INVALID identiques).
      return buildTemporalResult({ request, status: TemporalObservationStatus.INVALID, reason: result.reason })
    }

    if (unit === null) unit = result.unit

    const sample = { time: t, value: result.value, status: result.status }
    if (result.reason) sample.reason = result.reason
    samples.push(sample)
  }

  return buildTemporalResult({ request, status: TemporalObservationStatus.VALID, samples, unit })
}
