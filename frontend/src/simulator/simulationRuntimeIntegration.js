import { compileFirmware } from "../arduino/firmware/firmwareCompiler.js"
import { FirmwareExecutor } from "../arduino/firmware/firmwareExecutor.js"
import { FirmwareRuntimeController } from "../arduino/firmware/firmwareRuntimeController.js"

// Presentation frames advance this fixed simulated duration, never wall time.
export const SIMULATION_STEP_MS = 16

// A4-D-PREQ2 (I-A4-17) : GATE 0 n'appelle plus runSimulation() directement
// (elle recalculerait un second resolveSignals() interne rien que pour
// pinSignals, alors que ce fichier a besoin de dcAnalysis dans la MÊME
// résolution — voir computeElectricalStep() plus bas) — mais cet import
// reste requis tel quel : runtimeArchitecture.test.js (« GATE 1 »,
// MB-SIM-011) verrouille le fait que simulationRuntimeIntegration.js est le
// seul fichier du dépôt à importer à la fois engine.js et
// runtimeOrchestrator.js (frontière de composition SIM3). runSimulation()
// (engine.js) elle-même reste totalement inchangée et appelable directement
// par tout autre appelant (I-A4-19).
// eslint-disable-next-line no-unused-vars
import { runSimulation } from "./engine.js"
import { prepareCircuit } from "./preparation.js"
import { resolveSignals, resolveSourceDrivenPinSignals, resolveSourceDrivenVoltageFacts, signalMapsEqual, signalMapSignature } from "./resolution.js"
import { createRuntimeOrchestrator } from "./runtimeOrchestrator.js"
import { createScheduler } from "./scheduler.js"
import { applyEnvironmentalStimuli } from "./environmentalStimulus.js"
import { getDigitalContribution as defaultGetDigitalContribution, hasDigitalContribution as defaultHasDigitalContribution } from "./digitalContributionRegistry.js"
import { getTimedDigitalContribution as defaultGetTimedDigitalContribution, hasTimedDigitalContribution as defaultHasTimedDigitalContribution } from "./timedDigitalContributionRegistry.js"
import { getTransientContribution as defaultGetTransientContribution, hasTransientContribution as defaultHasTransientContribution, getTransientObservation as defaultGetTransientObservation, getTransientDriveTerminals as defaultGetTransientDriveTerminals } from "./transientContributionRegistry.js"
import { composeElectricalAnalysis } from "./electricalAnalysis.js"
import { resolveComponentParameters } from "./resolveComponentParameters.js"
import { getCanonicalEntry } from "./canonicalRegistry.js"
import { getDcSource } from "./dcSourceRegistry.js"
import { Signal } from "./signals.js"
import { clearDigitalTransitions, consumeDigitalTransitions, createDigitalTransitionStore, recordDigitalTransitions, retainDigitalTransitionUids } from "./digitalTransitions.js"
import { getDigitalEventContribution as defaultGetDigitalEventContribution, hasDigitalEventContribution as defaultHasDigitalEventContribution } from "./digitalEventContributionRegistry.js"
import { getMixedSignalContribution as defaultGetMixedSignalContribution, hasMixedSignalContribution as defaultHasMixedSignalContribution } from "./mixedSignalContributionRegistry.js"
import { composeSampleVoltageFacts, observeTransientVoltageFacts } from "./transientVoltageFactBridge.js"
import { getResistiveEdge as defaultGetResistiveEdge } from "./dcContributionRegistry.js"
import { collectResistiveEdges, composeDriveVoltageFacts, createResistiveDriveNetwork, resolveResistiveDriveContext } from "./resistiveDriveContext.js"

/**
 * MB-SIM-011 — Intégration Simulation ↔ Scheduler/Runtime (SIM3).
 *
 * Module d'intégration dédié, distinct de engine.js et de
 * runtimeOrchestrator.js, ni importé par ni ne les modifiant — c'est le
 * point d'orchestration identifié après inspection (voir rapport de
 * livraison MB-SIM-011) : les deux verrous architecturaux existants
 * (runtimeArchitecture.test.js) interdisent à engine.js d'importer
 * runtimeOrchestrator.js/ArduinoSimulator.js, et à runtimeOrchestrator.js
 * de référencer runSimulation/resolveSignals/prepareCircuit/
 * computeDcAnalysis. Ce fichier est le seul à composer les deux côtés,
 * sans modifier ni l'un ni l'autre.
 *
 * runSimulation() (engine.js) reste strictement inchangé et reste
 * utilisable directement, sans dépendance obligatoire au Scheduler ou à
 * ArduinoSimulator (GATE 0 — non-régression) : ce module ne fait
 * qu'ENVELOPPER runSimulation(), jamais le contraire.
 *
 * MB-SIM-012 : lorsqu'au moins un composant Runtime est présent, ce module
 * n'appelle plus runSimulation() (qui ne connaît pas externalSignals et ne
 * doit pas être modifié par défaut — §10 du ticket) mais compose
 * directement les deux mêmes briques que runSimulation() utilise en
 * interne : prepareCircuit() (preparation.js, importée telle quelle, non
 * modifiée, non dupliquée) puis resolveSignals(components, prepared,
 * externalSignals) (resolution.js, dont seule la signature a été étendue
 * d'un 3e paramètre optionnel — §4.1/§9 du ticket : aucune logique de
 * préparation/résolution/propagation/production n'est réimplémentée ici,
 * seules les fonctions existantes sont appelées avec un argument
 * supplémentaire). Le SignalMap du Runtime est ainsi transmis à la
 * résolution AVANT la propagation (externalSignals), et non plus fusionné
 * après coup dans le résultat final (ancien comportement MB-SIM-011,
 * remplacé — voir resolution.js pour le détail de l'injection).
 */

/**
 * Seul type canonique du Registry conçu pour un runtime embarqué
 * (ArduinoSimulator). Ce n'est pas une donnée dupliquée de
 * canonicalRegistry.js (aucune liste de pins/rôles/paramètres n'est
 * recopiée ici) : c'est la sélection, propre à ce module d'intégration,
 * du type qui déclenche l'activation conditionnelle du Runtime (Q3 du
 * mandat CSA-SIM3). Le rôle de pin "gpio" seul ne permettrait pas cette
 * discrimination : SERVO.signal est également "gpio" sans qu'un SERVO
 * nécessite d'ArduinoSimulator.
 */
const RUNTIME_COMPONENT_TYPE = "ARDUINO"

/**
 * Indique si le circuit contient au moins un composant nécessitant
 * l'activation du Runtime (Q3 : activation conditionnelle — un circuit
 * sans composant pertinent ne doit jamais instancier de Scheduler ni de
 * Runtime).
 * @param {Array<{ uid, type }>} components
 * @returns {boolean}
 */
export function circuitRequiresRuntime(components) {
  return Array.isArray(components) && components.some((c) => c && c.type === RUNTIME_COMPONENT_TYPE)
}

/**
 * A9-SEQ-PREQ2 — le circuit contient-il un producteur dont les sorties
 * numériques évoluent avec le temps simulé sans autre changement du Document
 * (Runtime embarqué ou producteur du Registry temporel) ? Registry-driven,
 * aucun nom de type autre que RUNTIME_COMPONENT_TYPE. Les contributeurs
 * électriques transitoires n'en font pas partie : ils n'alimentent pas
 * `pinSignals` (voir `computeTransientElectricalContributions`).
 *
 * A12-NEOPIXEL-PREQ-EVENT-CONSUMER-001 : un contributeur du Registry
 * événementiel (`digitalEventContributionRegistry.js`) en fait aussi partie —
 * ses transitions de sortie peuvent être dues à un temps simulé futur.
 *
 * A11-COMP4-PREQ3 : a stateful mixed-signal contributor
 * (`mixedSignalContributionRegistry.js`) is part of it as well — its state and
 * effects evolve with simulated time.
 *
 * @param {Array<{ type }>} components
 * @param {{ hasTimedDigitalContribution: (type: string) => boolean }} [timedDigitalRegistry]
 * @param {{ hasDigitalEventContribution: (type: string) => boolean }} [digitalEventRegistry]
 * @param {{ hasMixedSignalContribution: (type: string) => boolean }} [mixedSignalRegistry]
 * @returns {boolean}
 */
export function circuitRequiresContinuousStepping(components, timedDigitalRegistry = {
  hasTimedDigitalContribution: defaultHasTimedDigitalContribution,
}, digitalEventRegistry = {
  hasDigitalEventContribution: defaultHasDigitalEventContribution,
}, mixedSignalRegistry = {
  hasMixedSignalContribution: defaultHasMixedSignalContribution,
}) {
  return Array.isArray(components) && components.some((c) => c
    && (c.type === RUNTIME_COMPONENT_TYPE
      || timedDigitalRegistry.hasTimedDigitalContribution(c.type)
      || digitalEventRegistry.hasDigitalEventContribution(c.type)
      || mixedSignalRegistry.hasMixedSignalContribution(c.type)))
}

/**
 * A9-SEQ-PREQ2 — container runtime VOLATILE d'une simulation applicative :
 * états privés des producteurs temporels, états électriques transitoires et
 * autorité temporelle générique. La couche application possède le container
 * (sa durée de vie) ; ce module seul en connaît le contenu et crée le
 * Scheduler paresseusement au premier step qui en a besoin (voir
 * `computeElectricalStep`). Jamais dans le Document, jamais sérialisé,
 * jamais historisé.
 *
 * A12-NEOPIXEL-PREQ-EVENT-TIMING-001 : `digitalTransitions` porte les
 * transitions numériques horodatées sur l'axe de ce même Scheduler (voir
 * `digitalTransitions.js`) — même cycle de vie que les autres stores
 * (create / reset / retain). Aucun producteur par défaut ne l'alimente :
 * un circuit sans capacité événementielle le laisse vide.
 *
 * A12-NEOPIXEL-PREQ-EVENT-CONSUMER-001 : `digitalEventStates` (Map<uid, state>)
 * porte l'état privé des contributeurs événementiels
 * (`computeDigitalEventContributions`) — même cycle de vie create / reset /
 * retain, jamais dans le Registry, le Document ou l'historique.
 *
 * A11-COMP4-PREQ3 : `mixedSignalStates` (Map<uid, state>) is the single private
 * state store of the stateful mixed-signal contributors
 * (`computeMixedSignalContributions`) — same create / reset / retain life
 * cycle, never in the Registry, the Document or the history.
 *
 * @returns {{ timedDigitalStates: Map<string, object>, electricalTransientStates: Map<string, object>, digitalEventStates: Map<string, any>, mixedSignalStates: Map<string, any>, digitalTransitions: ReturnType<typeof createDigitalTransitionStore>, scheduler: import('./scheduler.js').Scheduler | null }}
 */
export function createSimulationRuntimeSession() {
  return {
    timedDigitalStates: new Map(),
    electricalTransientStates: new Map(),
    digitalEventStates: new Map(),
    mixedSignalStates: new Map(),
    digitalTransitions: createDigitalTransitionStore(),
    scheduler: null,
  }
}

/** Nouveau runtime : aucun état, transition ni temps simulé du runtime précédent ne survit. */
export function resetSimulationRuntimeSession(session) {
  session.timedDigitalStates.clear()
  session.electricalTransientStates.clear()
  session.digitalEventStates.clear()
  session.mixedSignalStates?.clear()
  clearDigitalTransitions(session.digitalTransitions)
  session.scheduler = null
}

/** Retire l'état runtime de tout uid absent de `liveUids` ; les autres sont conservés. */
export function retainSimulationRuntimeSessionUids(session, liveUids) {
  const stores = [session.timedDigitalStates, session.electricalTransientStates, session.digitalEventStates, session.mixedSignalStates]
  for (const states of stores.filter(Boolean)) {
    for (const uid of Array.from(states.keys())) {
      if (!liveUids.has(uid)) states.delete(uid)
    }
  }
  retainDigitalTransitionUids(session.digitalTransitions, liveUids)
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const nested of Object.values(value)) deepFreeze(nested)
  return value
}

/**
 * A10-DISP2 — projection LECTURE SEULE des états privés timed pour la
 * Presentation (Visual State Registry). Nouvelle Map uid -> état à chaque
 * appel (une nouvelle référence après chaque step, pour que React observe le
 * changement), dont les états sont gelés : aucun consommateur ne peut
 * modifier le runtime au travers. Générique (aucun type) ; jamais
 * sérialisée, jamais historisée, jamais relue par le moteur — le store
 * `timedDigitalStates` reste l'unique vérité. `liveUids` (optionnel) limite la
 * projection aux composants du step qui vient d'être résolu : un uid supprimé
 * n'y apparaît jamais, même avant la purge de la session.
 *
 * @param {{ timedDigitalStates: Map<string, object> }} session
 * @param {Iterable<string>} [liveUids]
 * @returns {Map<string, object>}
 */
export function snapshotTimedDigitalStates(session, liveUids) {
  const live = liveUids ? new Set(liveUids) : null
  const snapshot = new Map()
  for (const [uid, state] of session.timedDigitalStates) {
    if (!live || live.has(uid)) snapshot.set(uid, deepFreeze(state))
  }
  return snapshot
}

/**
 * A12-NEOPIXEL-FUNC-WS2812B-V6-001 — même projection lecture seule que
 * `snapshotTimedDigitalStates`, étendue aux états privés des contributeurs
 * événementiels (`digitalEventStates`) : la Presentation reçoit un unique
 * `runtimeState` par uid, quelle que soit la famille de runtime qui le porte.
 * Générique (aucun type). Un même uid ne peut appartenir qu'à une famille :
 * une collision est une erreur explicite, jamais un écrasement silencieux.
 *
 * @param {{ timedDigitalStates: Map<string, object>, digitalEventStates: Map<string, any> }} session
 * @param {Iterable<string>} [liveUids]
 * @returns {Map<string, object>}
 */
export function snapshotRuntimeComponentStates(session, liveUids) {
  const snapshot = snapshotTimedDigitalStates(session, liveUids)
  const live = liveUids ? new Set(liveUids) : null
  for (const [uid, state] of session.digitalEventStates) {
    if (live && !live.has(uid)) continue
    if (snapshot.has(uid)) {
      throw new Error(`snapshotRuntimeComponentStates: uid "${uid}" has both a timed and an event runtime state`)
    }
    snapshot.set(uid, deepFreeze(state))
  }
  return snapshot
}

/**
 * A7-C3-PREQ — Generic Computed Digital Output composition (§2/§5 du
 * ticket).
 *
 * Consulte, pour CHAQUE composant du circuit EFFECTIF, le Registry générique
 * `digitalContributionRegistry.js` (Open/Closed, ADR-006-like) — jamais un
 * `if (component.type === "...")` : la seule connaissance type -> production
 * vit dans le Registry, consultée ici uniquement par son API
 * `hasDigitalContribution`/`getDigitalContribution`.
 *
 * Produit une `Map<"uid:pinId", Signal>` destinée à être fusionnée dans
 * `externalSignals` (voir `mergeExternalSignals` ci-dessous), exactement le
 * même format de clé que les signaux Runtime (MB-SIM-012) — aucune seconde
 * convention introduite.
 *
 * Pure, synchrone : ne lit ni Scheduler ni Runtime, ne mute jamais
 * `effectiveComponents`.
 *
 * `pinSignals` contient les propres pins du composant dans le contexte
 * digital fourni. A9-LOGIC-PREQ appelle cet évaluateur une fois par round
 * avec sources DC, autorités du step et sorties du round précédent déjà
 * propagées. Cet évaluateur ne résout rien lui-même. Un contributeur peut
 * refuser de produire (retourner `null`) si son alimentation ou ses entrées
 * ne sont pas déterminées.
 * `sourceDrivenSignals` reste un 3e paramètre optionnel (défaut : Map vide,
 * donc `pinSignals` entièrement UNKNOWN) pour que tout appel historique de
 * cette fonction (§21 : PREQ tests existants) continue de fonctionner à
 * l'identique.
 *
 * @param {Array<{ uid, type, parameters? }>} effectiveComponents composants
 *   déjà soumis à `applyEnvironmentalStimuli()` (§8 du ticket : ce Registry
 *   ne reçoit donc jamais les paramètres persistants bruts).
 * @param {{ hasDigitalContribution: (type: string) => boolean, getDigitalContribution: (type: string) => import('./digitalContributionRegistry.js').DigitalContributionFn | null }} digitalRegistry
 *   Par défaut le Registry de production ;
 *   injectable pour test (§13 du ticket), sans jamais passer par
 *   `canonicalRegistry.js` ni polluer la table de production.
 * @param {Map<string, string>} [sourceDrivenSignals] Contexte digital du
 *   round, clé "uid:pinId" — défaut Map vide (comportement historique).
 * @returns {Map<string, string>}
 */
export function computeComponentDigitalSignals(effectiveComponents, digitalRegistry = {
  hasDigitalContribution: defaultHasDigitalContribution,
  getDigitalContribution: defaultGetDigitalContribution,
}, sourceDrivenSignals = new Map()) {
  const produced = new Map()
  if (!Array.isArray(effectiveComponents)) return produced

  for (const comp of effectiveComponents) {
    if (!comp || !digitalRegistry.hasDigitalContribution(comp.type)) continue

    const contribute = digitalRegistry.getDigitalContribution(comp.type)
    const params = resolveComponentParameters(comp.type, comp.parameters)
    const pinSignals = buildComponentSourceDrivenPinSignals(comp, sourceDrivenSignals)
    const outputs = contribute({ component: comp, pins: comp.pins, params, pinSignals })
    if (!outputs) continue

    for (const [pinId, signal] of outputs) {
      const key = `${comp.uid}:${pinId}`
      if (produced.has(key)) {
        throw new Error(
          `computeComponentDigitalSignals: component "${comp.uid}" (type "${comp.type}") produced the pin key "${key}" more than once — a single contribution must be internally consistent (one value per pin)`
        )
      }
      produced.set(key, signal)
    }
  }

  return produced
}

/**
 * A9-LOGIC-PREQ: compose the existing stateless contract on physical nets.
 * Each synchronous round reads one complete digital context and projects its
 * new outputs from the original sources + step authorities, never from prior
 * outputs. Only resolution.js owns net propagation; no passive or DC solving
 * takes place here. Runtime/timed authorities are data, not clocks to advance.
 *
 * The pin-count + 1 bound accommodates arbitrary acyclic cascade depth plus
 * its stability check. It is a work budget, not a proof that every possible
 * feedback circuit converges: repeated states or exhaustion discard ALL
 * provisional stateless outputs. The caller retains the base authorities.
 * No result or convergence history survives this call.
 */
export function computeCombinationalDigitalSignals(components, prepared, digitalRegistry, baseExternalSignals = new Map()) {
  const ordered = [...components].sort((a, b) => a.uid.localeCompare(b.uid))
  let previous = resolveSourceDrivenPinSignals(ordered, prepared, baseExternalSignals)
  const seen = new Set([signalMapSignature(previous, prepared.allKeys)])
  const maxIterations = prepared.allKeys.length + 1

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const outputs = computeComponentDigitalSignals(ordered, digitalRegistry, previous)
    const authorities = mergeExternalSignals([baseExternalSignals, outputs])
    const candidate = resolveSourceDrivenPinSignals(ordered, prepared, authorities)
    if (signalMapsEqual(candidate, previous, prepared.allKeys)) return outputs

    const signature = signalMapSignature(candidate, prepared.allKeys)
    if (seen.has(signature)) return new Map()
    seen.add(signature)
    previous = candidate
  }
  return new Map()
}

/**
 * A7-C5-PREQ — Generic Timed Digital Output composition (§6/§7/§22 du
 * ticket).
 *
 * Sibling de `computeComponentDigitalSignals` ci-dessus, même patron
 * Open/Closed (Registry consulté uniquement via `hasTimedDigitalContribution`/
 * `getTimedDigitalContribution`, jamais un `if (component.type === "...")`),
 * mais pour des producteurs STATEFUL et DÉPENDANTS DU TEMPS SIMULÉ : chaque
 * appel reçoit `currentTimeMs` (unique source de temps — le Scheduler partagé
 * de `runSimulationWithRuntime` ci-dessous, jamais une horloge propre au
 * producteur) et l'état privé RUNTIME du step précédent pour ce composant
 * (`timedDigitalStates`, Map<uid, state> — volatile, hors Document, fournie
 * par l'appelant pour persister entre plusieurs appels successifs, §22 du
 * ticket).
 *
 * Réutilise `buildComponentSourceDrivenPinSignals` (même primitive que
 * `computeComponentDigitalSignals`, §10/§11 du ticket : aucune seconde
 * résolution, le producteur observe uniquement les pins déjà déterminables
 * avant résolution via `resolveSourceDrivenPinSignals`).
 *
 * Pure hormis la mutation de `timedDigitalStates` (le store d'état runtime
 * fourni par l'appelant — jamais `effectiveComponents`, jamais le Document) :
 * ne lit ni Scheduler ni Runtime directement, ne lit jamais wires/DOM/Canvas.
 *
 * @param {Array<{ uid, type, parameters? }>} timedDigitalComponents composants
 *   EFFECTIFS déjà filtrés par le Registry temporel (voir
 *   `runSimulationWithRuntime`).
 * @param {{ hasTimedDigitalContribution: (type: string) => boolean, getTimedDigitalContribution: (type: string) => import('./timedDigitalContributionRegistry.js').TimedDigitalContributionFn | null }} timedDigitalRegistry
 * @param {Map<string, string>} sourceDrivenSignals contexte digital observé,
 *   clé "uid:pinId". A9-SEQ-PREQ : depuis `runSimulationWithRuntime`, c'est le
 *   contexte d'échantillonnage (`computeTimedDigitalSampleSignals`) — sources
 *   DC, Runtime courant, sorties timed maintenues et combinatoire dérivé —,
 *   identique au `resolveSourceDrivenPinSignals()` historique en l'absence
 *   de ces autorités.
 * @param {number} currentTimeMs Temps simulé courant, issu du Scheduler
 *   partagé (§4/§13 du ticket).
 * @param {Map<string, object>} timedDigitalStates Store d'état runtime
 *   (uid -> state), muté en place par cette fonction (nouvel état écrit
 *   après chaque contribution) — jamais lu/écrit ailleurs que par cette
 *   fonction et son appelant.
 * @returns {Map<string, string>} clé "uid:pinId" -> Signal, même format que
 *   `computeComponentDigitalSignals`.
 */
export function computeTimedDigitalSignals(timedDigitalComponents, timedDigitalRegistry, sourceDrivenSignals, currentTimeMs, timedDigitalStates) {
  const produced = new Map()
  if (!Array.isArray(timedDigitalComponents)) return produced

  for (const comp of timedDigitalComponents) {
    if (!comp || !timedDigitalRegistry.hasTimedDigitalContribution(comp.type)) continue

    const contribute = timedDigitalRegistry.getTimedDigitalContribution(comp.type)
    const params = resolveComponentParameters(comp.type, comp.parameters)
    const pinSignals = buildComponentSourceDrivenPinSignals(comp, sourceDrivenSignals)
    const previousState = timedDigitalStates.get(comp.uid)
    const { state, outputs } = contribute({ component: comp, pins: comp.pins, params, pinSignals, currentTimeMs, previousState })
    timedDigitalStates.set(comp.uid, state)
    if (!outputs) continue

    for (const [pinId, signal] of outputs) {
      const key = `${comp.uid}:${pinId}`
      if (produced.has(key)) {
        throw new Error(
          `computeTimedDigitalSignals: component "${comp.uid}" (type "${comp.type}") produced the pin key "${key}" more than once — a single contribution must be internally consistent (one value per pin)`
        )
      }
      produced.set(key, signal)
    }
  }

  return produced
}

/**
 * A9-SEQ-PREQ — contexte d'échantillonnage des producteurs timed (phase
 * SAMPLE). `sampleAuthorities` = autorités Runtime du step courant + sorties
 * timed MAINTENUES du step précédent (jamais celles du step courant). Le
 * point fixe combinatoire existant dérive ce qu'elles pilotent, puis la même
 * projection digitale que A9-LOGIC-PREQ (`resolveSourceDrivenPinSignals`)
 * donne le contexte observé. Aucune `resolveSignals()`, aucune conduction
 * passive. Sans autorité ni contributeur, le résultat est exactement
 * `resolveSourceDrivenPinSignals(components, prepared)` : contexte historique
 * A7-C5-PREQ inchangé.
 */
function computeTimedDigitalSampleSignals(effectiveComponents, prepared, digitalRegistry, sampleAuthorities) {
  const sampleDigitalSignals = digitalRegistry
    ? computeCombinationalDigitalSignals(effectiveComponents, prepared, digitalRegistry, sampleAuthorities)
    : new Map()
  return resolveSourceDrivenPinSignals(effectiveComponents, prepared, mergeExternalSignals([sampleAuthorities, sampleDigitalSignals]))
}

/**
 * A9-SEQ-PREQ — dernières sorties timed, par store runtime. Clé : la Map
 * `timedDigitalStates` fournie par l'appelant ; valeur : Map<uid, Map<"uid:pinId",
 * Signal>>. La durée de vie suit donc exactement celle du store (nouvelle Map
 * = aucun historique ; un uid absent du store = aucune sortie maintenue).
 * Volatile, hors Document/History ; le contenu de `timedDigitalStates`
 * lui-même (état privé de chaque producteur) reste inchangé.
 */
const heldTimedDigitalOutputs = new WeakMap()

function readHeldTimedDigitalSignals(timedDigitalComponents, timedDigitalStates) {
  const held = new Map()
  const byUid = heldTimedDigitalOutputs.get(timedDigitalStates)
  if (!byUid) return held
  for (const comp of timedDigitalComponents) {
    if (!timedDigitalStates.has(comp.uid)) continue
    for (const [key, signal] of byUid.get(comp.uid) ?? []) held.set(key, signal)
  }
  return held
}

function rememberHeldTimedDigitalSignals(timedDigitalComponents, timedDigitalStates, timedDigitalSignals) {
  const byUid = new Map()
  for (const comp of timedDigitalComponents) {
    const outputs = new Map()
    for (const pin of getCanonicalEntry(comp.type)?.pins ?? []) {
      const key = `${comp.uid}:${pin.id}`
      if (timedDigitalSignals.has(key)) outputs.set(key, timedDigitalSignals.get(key))
    }
    byUid.set(comp.uid, outputs)
  }
  heldTimedDigitalOutputs.set(timedDigitalStates, byUid)
}

/**
 * A4-D-PREQ1 — Generic Transient Electrical Simulation : composition.
 *
 * Sibling de `computeTimedDigitalSignals` ci-dessus, même patron Open/Closed
 * (Registry consulté uniquement via `hasTransientContribution`/
 * `getTransientContribution`, jamais un `if (component.type === "...")`),
 * mais pour des contributeurs ÉLECTRIQUES (pas des sorties Signal
 * numériques) : chaque appel reçoit `dt`/`currentTimeMs` (Scheduler partagé,
 * même source unique de temps que `computeTimedDigitalSignals`, §6 du
 * ticket) et l'état électrique privé du step précédent pour ce composant
 * (`electricalTransientStates`, Map<uid, state> — volatile, hors Document,
 * fournie par l'appelant pour persister entre plusieurs appels successifs).
 *
 * Réutilise `buildComponentSourceDrivenPinSignals` (même primitive que
 * `computeComponentDigitalSignals`/`computeTimedDigitalSignals` : aucune
 * seconde résolution, un contributeur observe uniquement les pins déjà
 * déterminables avant résolution via `resolveSourceDrivenPinSignals`).
 *
 * Pure hormis la mutation de `electricalTransientStates` (le store d'état
 * runtime fourni par l'appelant — jamais `effectiveComponents`, jamais le
 * Document) : ne lit ni Scheduler ni Runtime directement, ne lit jamais
 * wires/DOM/Canvas.
 *
 * Le résultat `{voltage, current}` par composant n'est PAS injecté dans
 * `externalSignals`/`pinSignals` (ce n'est pas un Signal numérique — c'est
 * une grandeur électrique, comme une entrée de `dcAnalysis`) : cette
 * fonction produit et persiste uniquement l'état/la contribution
 * électriques transitoires, fondation consommée par un futur ticket
 * consommateur (§9 du ticket : scope le plus petit possible pour ce PREQ).
 *
 * @param {Array<{ uid, type, parameters? }>} transientComponents composants
 *   EFFECTIFS déjà filtrés par le Registry transitoire (voir
 *   `runSimulationWithRuntime`).
 * @param {{ hasTransientContribution: (type: string) => boolean, getTransientContribution: (type: string) => import('./transientContributionRegistry.js').TransientContributionFn | null }} transientRegistry
 * @param {Map<string, string>} sourceDrivenSignals `resolveSourceDrivenPinSignals()`
 *   (resolution.js), clé "uid:pinId" — même Map que celle transmise à
 *   `computeComponentDigitalSignals`/`computeTimedDigitalSignals` (une seule
 *   résolution pré-électrique par step).
 * @param {number | null} supplyVoltage Tension de la seule source DC du
 *   circuit lorsqu'il n'en existe qu'une (même restriction que
 *   `computeDcAnalysis`, resolution.js) ; `null` sinon.
 * @param {number} dt Pas de temps simulé explicite du step courant (jamais
 *   recalculé depuis `currentTimeMs`).
 * @param {number} currentTimeMs Temps simulé courant, issu du Scheduler
 *   partagé.
 * @param {Map<string, object>} electricalTransientStates Store d'état
 *   électrique runtime (uid -> state), muté en place par cette fonction —
 *   jamais lu/écrit ailleurs que par cette fonction et son appelant.
 * @param {Map<string, { targetVoltage: number, equivalentResistance: number, reference: string }>} [driveContexts]
 *   A11-COMP4-PREQ5 (optionnel) : contexte de drive résistif du step par uid
 *   (`computeTransientDriveContexts`) ; transmis au contributeur sous
 *   `driveContext` uniquement lorsqu'il existe (clé absente sinon).
 * @returns {Map<string, {voltage:number, current:number}>} clé uid ->
 *   contribution électrique (composants sans contribution pour ce step
 *   absents de la Map, même convention que `dcContributionRegistry.js`).
 */
export function computeTransientElectricalContributions(transientComponents, transientRegistry, sourceDrivenSignals, supplyVoltage, dt, currentTimeMs, electricalTransientStates, driveContexts = null) {
  const produced = new Map()
  if (!Array.isArray(transientComponents)) return produced

  for (const comp of transientComponents) {
    if (!comp || !transientRegistry.hasTransientContribution(comp.type)) continue

    const contribute = transientRegistry.getTransientContribution(comp.type)
    const params = resolveComponentParameters(comp.type, comp.parameters)
    const pins = buildComponentSourceDrivenPinSignals(comp, sourceDrivenSignals)
    const previousState = electricalTransientStates.get(comp.uid)
    const driveContext = driveContexts?.get(comp.uid)
    const { state, contribution } = contribute({ pins, params, supplyVoltage, dt, currentTimeMs, previousState,
      ...(driveContext ? { driveContext } : {}) })
    electricalTransientStates.set(comp.uid, state)
    if (contribution) produced.set(comp.uid, contribution)
  }

  return produced
}

/**
 * A11-COMP4-PREQ5 — resistive drive contexts of step n, computed AFTER the
 * mixed-signal SAMPLE[n] (its conduction pairs and voltage outputs are step
 * authorities) and BEFORE the transient update[n] / COMMIT[n] / the ONE
 * resolution. Not a resolution : `resistiveDriveContext.js` only reduces the
 * unique series chain seen from each storage terminal pair declared by the
 * transient Registry (`getTransientDriveTerminals`), never a type name here.
 *
 * Authorities : the DC-source facts and the step voltage outputs (never a
 * HIGH/LOW level, never a transient observation). Pins of mixed-signal
 * contributors are high impedance, except the digital outputs they drive in
 * this step (a driver without numeric value makes the chain ambiguous).
 *
 * @param {{
 *   transientComponents: Array<{ uid, type, parameters? }>,
 *   transientRegistry: { getTransientDriveTerminals?: (type: string) => { positivePin: string, referencePin: string } | null },
 *   components: Array<{ uid, type, parameters? }>,
 *   prepared: { uf, nets, allKeys },
 *   sourceVoltageFacts: Map<string, { voltage: number, reference: string } | null>,
 *   mixedSignalComponents?: Array<{ uid, type }>,
 *   mixedSignalStep?: { digitalSignals: Map<string, string>, electricalAuthorities: { voltageOutputs: Array<object>, conductionPairs: Array<object> } } | null,
 *   getResistiveEdge?: (type: string) => object | null,
 * }} input
 * @returns {Map<string, Readonly<{ targetVoltage: number, equivalentResistance: number, reference: string }>>} uid -> context
 */
export function computeTransientDriveContexts({ transientComponents, transientRegistry, components, prepared, sourceVoltageFacts,
  mixedSignalComponents = [], mixedSignalStep = null, getResistiveEdge = defaultGetResistiveEdge }) {
  const contexts = new Map()
  const storages = (transientComponents || [])
    .map((comp) => ({ comp, terminals: comp ? transientRegistry.getTransientDriveTerminals?.(comp.type) ?? null : null }))
    .filter(({ comp, terminals }) => terminals && typeof comp.uid === "string")
  if (storages.length === 0) return contexts

  const authorities = mixedSignalStep?.electricalAuthorities ?? { voltageOutputs: [], conductionPairs: [] }
  const highImpedanceKeys = new Set()
  for (const comp of mixedSignalComponents || []) {
    for (const pin of getCanonicalEntry(comp.type)?.pins ?? []) {
      const key = prepared.uf.key(comp.uid, pin.id)
      if (!mixedSignalStep?.digitalSignals.has(key)) highImpedanceKeys.add(key)
    }
  }
  const network = createResistiveDriveNetwork({
    prepared,
    voltageFacts: composeDriveVoltageFacts(sourceVoltageFacts, authorities.voltageOutputs, prepared),
    resistiveEdges: collectResistiveEdges(components, prepared, getResistiveEdge),
    conductionPairs: authorities.conductionPairs,
    highImpedanceKeys,
  })
  for (const { comp, terminals } of storages) {
    const context = resolveResistiveDriveContext(network,
      prepared.uf.key(comp.uid, terminals.positivePin), prepared.uf.key(comp.uid, terminals.referencePin))
    if (context) contexts.set(comp.uid, Object.freeze({ ...context, reference: terminals.referencePin }))
  }
  return contexts
}

/**
 * A11-COMP4-PREQ3 — Generic stateful mixed-signal step contract : SAMPLE.
 *
 * Same Open/Closed pattern as the other families (Registry consulted only via
 * `hasMixedSignalContribution` / `getMixedSignalContribution`, never a type
 * name). Every contributor of the step, in increasing uid order, observes the
 * SAME pre-commit snapshot : the digital context `sampleContext.pinSignals`,
 * the numeric context `sampleContext.voltageFacts`
 * (`resolveSourceDrivenVoltageFacts`), the same `dt` / `currentTimeMs` and the
 * state committed for its own uid by the previous step. Nothing produced here
 * is visible to another contributor of the same step, so the result does not
 * depend on the evaluation order.
 *
 * PURE with respect to `mixedSignalStates` : new states are only COLLECTED
 * (`states`) and published later by `commitMixedSignalStates`, once every
 * effect of the step has been validated and composed. Any contract violation
 * throws before anything is committed (no partially committed step).
 *
 * Effects are validated against the Registry declaration and the canonical
 * pins of the component (explicit error, never a silent drop) :
 * - digitalOutputs -> `digitalSignals` (Map "uid:pinId" -> Signal) ;
 * - voltageOutputs -> `electricalAuthorities.voltageOutputs` (volts relative to
 *   the declared reference pin ; an invalid number becomes null = unresolved) ;
 * - conductionPairs -> `electricalAuthorities.conductionPairs`.
 * `electricalAuthorities` is frozen plain data, the only thing resolution.js
 * receives : no time, no state, no Registry, no producer type.
 *
 * @param {Array<{ uid, type, parameters? }>} mixedSignalComponents
 * @param {{ hasMixedSignalContribution: (type: string) => boolean, getMixedSignalContribution: (type: string) => import('./mixedSignalContributionRegistry.js').MixedSignalContribution | null }} mixedSignalRegistry
 * @param {{ pinSignals: Map<string, string>, voltageFacts: Map<string, { voltage: number, reference: string } | null> }} sampleContext
 * @param {number} dt
 * @param {number} currentTimeMs
 * @param {Map<string, any>} mixedSignalStates read only here.
 * @returns {{ states: Map<string, any>, digitalSignals: Map<string, string>, electricalAuthorities: { voltageOutputs: Array<object>, conductionPairs: Array<object> } }}
 */
export function computeMixedSignalContributions(mixedSignalComponents, mixedSignalRegistry, sampleContext, dt, currentTimeMs, mixedSignalStates) {
  const states = new Map()
  const digitalSignals = new Map()
  const voltageOutputs = []
  const conductionPairs = []
  const ordered = (mixedSignalComponents || [])
    .filter((c) => c && typeof c.uid === "string" && mixedSignalRegistry.hasMixedSignalContribution(c.type))
    .sort((a, b) => a.uid.localeCompare(b.uid))

  for (const comp of ordered) {
    const entry = mixedSignalRegistry.getMixedSignalContribution(comp.type)
    const fail = (reason) => new Error(`computeMixedSignalContributions: component "${comp.uid}" (type "${comp.type}") ${reason}`)
    const canonicalPins = new Set((getCanonicalEntry(comp.type)?.pins ?? []).map((pin) => pin.id))
    const declared = [...entry.digitalOutputPins, ...entry.voltageOutputPins, ...(entry.voltageReferencePin === null ? [] : [entry.voltageReferencePin])]
    for (const pinId of declared) {
      if (!canonicalPins.has(pinId)) throw fail(`declares "${pinId}", which is not one of its canonical pins`)
    }

    const result = entry.contribute({
      component: comp,
      params: resolveComponentParameters(comp.type, comp.parameters),
      pinSignals: buildComponentSourceDrivenPinSignals(comp, sampleContext.pinSignals),
      pinVoltages: buildComponentVoltageFacts(comp, sampleContext.voltageFacts),
      dt,
      currentTimeMs,
      previousState: mixedSignalStates.get(comp.uid),
    })
    if (!result || typeof result !== "object") throw fail("returned no { state, effects } result")
    const effects = result.effects ?? {}
    const entriesOf = (value, name) => {
      if (value === undefined || value === null) return []
      if (value instanceof Map) return [...value]
      if (typeof value === "object" && !Array.isArray(value)) return Object.entries(value)
      throw fail(`returned an invalid ${name} effect`)
    }

    for (const [pinId, signal] of entriesOf(effects.digitalOutputs, "digitalOutputs")) {
      if (!entry.digitalOutputPins.includes(pinId)) throw fail(`drove "${pinId}", which is not one of its declared digitalOutputPins`)
      if (signal !== Signal.HIGH && signal !== Signal.LOW) throw fail(`drove "${pinId}" with an invalid digital level`)
      digitalSignals.set(`${comp.uid}:${pinId}`, signal)
    }
    for (const [pinId, voltage] of entriesOf(effects.voltageOutputs, "voltageOutputs")) {
      if (!entry.voltageOutputPins.includes(pinId)) throw fail(`drove "${pinId}", which is not one of its declared voltageOutputPins`)
      const valid = typeof voltage === "number" && Number.isFinite(voltage) && voltage >= 0
      voltageOutputs.push({ uid: comp.uid, pinId, referencePin: entry.voltageReferencePin, voltage: valid ? voltage : null })
    }
    const pairs = effects.conductionPairs ?? []
    if (!Array.isArray(pairs)) throw fail("returned an invalid conductionPairs effect")
    for (const pair of pairs) {
      if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1] || !pair.every((pinId) => canonicalPins.has(pinId))) {
        throw fail("returned a conduction pair that is not two distinct canonical pins")
      }
      conductionPairs.push({ uid: comp.uid, pinA: pair[0], pinB: pair[1] })
    }
    states.set(comp.uid, result.state)
  }

  return { states, digitalSignals, electricalAuthorities: deepFreeze({ voltageOutputs, conductionPairs }) }
}

/**
 * A11-COMP4-PREQ3 — COMMIT : publishes, all at once, the states collected by
 * `computeMixedSignalContributions`. A committed state is frozen : the next
 * step's contributor receives it read-only as `previousState`.
 */
export function commitMixedSignalStates(mixedSignalStates, pendingStates) {
  for (const [uid, state] of pendingStates) mixedSignalStates.set(uid, deepFreeze(state))
}

/**
 * Projection { pinId -> fact | null } of the component's canonical pins from
 * the numeric pre-resolution facts ; a pin without any fact is left out. Fresh
 * objects per call : no contributor can alter what another one observes.
 */
function buildComponentVoltageFacts(comp, voltageFacts) {
  const pinVoltages = {}
  for (const pin of getCanonicalEntry(comp.type)?.pins ?? []) {
    const fact = voltageFacts.get(`${comp.uid}:${pin.id}`)
    if (fact !== undefined) pinVoltages[pin.id] = fact && { voltage: fact.voltage, reference: fact.reference }
  }
  return pinVoltages
}

/**
 * A12-NEOPIXEL-PREQ-EVENT-CONSUMER-001 — Generic Timestamped Digital Event
 * Consumer / Producer composition.
 *
 * Sibling de `computeTimedDigitalSignals` (même patron Open/Closed : Registry
 * consulté uniquement via `hasDigitalEventContribution`/
 * `getDigitalEventContribution`, jamais un `if (component.type === "...")`),
 * mais sur le plan des ÉVÉNEMENTS : aucune lecture ni écriture de SignalMap,
 * aucune résolution, aucune horloge. Transport : le store `DigitalTransition`
 * existant (`digitalTransitions.js`), source unique ; état privé :
 * `digitalEventStates` (Map<uid, state>) de la session runtime.
 *
 * Convention du store (héritée de A12-NEOPIXEL-PREQ-EVENT-TIMING-001) : un
 * producteur enregistre ses transitions sur SA PROPRE pin (uid, pinId). Les
 * pins déclarées `inputPins` d'un contributeur événementiel sont les pins de
 * LIVRAISON (flux entrants, consommés par ce contributeur seul) ; toute autre
 * pin du circuit porte un flux sortant.
 *
 * Routage (topologie existante, aucune seconde) : une transition due
 * (`timeMs <= currentTimeMs`) d'un flux sortant est consommée puis copiée,
 * via `recordDigitalTransitions` (validations canoniques), sur chaque pin
 * d'entrée d'un contributeur appartenant au MÊME net physique
 * (`prepared.uf`/`prepared.nets` de `prepareCircuit`, déjà construit pour ce
 * step). Fan-out natif ; une transition due sans destination est consommée
 * et abandonnée (événement sans écouteur). Les nets seuls sont traversés :
 * aucune conduction passive (limite documentée).
 *
 * Ordonnancement, borné et déterministe (contributeurs par uid croissant) :
 *   route ; round 0 : chaque contributeur est appelé une fois (même sans
 *   transition entrante) ; puis, tant que le routage livre de nouvelles
 *   transitions et au plus `contributeurs + 1` rounds, seuls les
 *   contributeurs ayant reçu des transitions sont rappelés (A -> B -> C sur
 *   le même axe temporel). Au-delà de la borne (cycle), les transitions
 *   livrées restent en attente sur leurs pins d'entrée et sont consommées au
 *   step suivant : aucune boucle infinie, aucun événement perdu.
 *
 * Sorties : uniquement sur `outputPins` (sinon erreur explicite), enregistrées
 * ATOMIQUEMENT sous l'uid du contributeur ; l'état n'est commité qu'après
 * enregistrement réussi des sorties. Une transition future (> currentTimeMs)
 * reste en attente jusqu'au step qui l'atteint.
 *
 * @param {Array<{ uid, type, pins?, parameters? }>} effectiveComponents
 * @param {{ hasDigitalEventContribution: (type: string) => boolean, getDigitalEventContribution: (type: string) => import('./digitalEventContributionRegistry.js').DigitalEventContribution | null }} digitalEventRegistry
 * @param {{ uf: { find: (key: string) => string }, nets: Map<string, string[]> }} prepared
 * @param {number} currentTimeMs Temps simulé courant, issu du Scheduler partagé.
 * @param {ReturnType<typeof createDigitalTransitionStore>} transitionStore
 * @param {Map<string, any>} digitalEventStates muté en place (uid -> state).
 * @param {Map<string, string>} [sourceDrivenSignals] A12-NEOPIXEL-FUNC-WS2812B-V6-001 :
 *   contexte pré-résolution des sources DC du step (déjà calculé, aucune
 *   résolution supplémentaire), projeté par composant en `pinSignals` —
 *   même primitive que les contributeurs transitoires. Défaut : Map vide
 *   (toutes les pins UNKNOWN).
 */
export function computeDigitalEventContributions(effectiveComponents, digitalEventRegistry, prepared, currentTimeMs, transitionStore, digitalEventStates, sourceDrivenSignals = NO_SOURCE_DRIVEN_SIGNALS) {
  const ordered = (effectiveComponents || [])
    .filter((c) => c && typeof c.uid === "string")
    .sort((a, b) => a.uid.localeCompare(b.uid))
  const consumers = ordered.filter((c) => digitalEventRegistry.hasDigitalEventContribution(c.type))
  if (consumers.length === 0) return

  const entries = new Map(consumers.map((c) => [c.uid, digitalEventRegistry.getDigitalEventContribution(c.type)]))
  const pinRefs = new Map()
  for (const comp of ordered) {
    for (const pin of getCanonicalEntry(comp.type)?.pins ?? []) pinRefs.set(`${comp.uid}:${pin.id}`, { uid: comp.uid, pinId: pin.id })
  }
  const inputKeys = new Set()
  for (const comp of consumers) {
    for (const pinId of entries.get(comp.uid).inputPins) inputKeys.add(`${comp.uid}:${pinId}`)
  }

  routeDueDigitalTransitions(pinRefs, inputKeys, prepared, currentTimeMs, transitionStore)
  const maxRounds = consumers.length + 1
  for (let round = 0; round < maxRounds; round++) {
    for (const comp of consumers) {
      const entry = entries.get(comp.uid)
      const incoming = consumeDueInputTransitions(transitionStore, comp.uid, entry.inputPins, currentTimeMs)
      if (round > 0 && incoming.length === 0) continue

      const params = resolveComponentParameters(comp.type, comp.parameters)
      const pinSignals = buildComponentSourceDrivenPinSignals(comp, sourceDrivenSignals)
      const { state, transitions } = entry.contribute({
        component: comp, pins: comp.pins, params, pinSignals, currentTimeMs, previousState: digitalEventStates.get(comp.uid), transitions: incoming,
      })
      const outgoing = transitions ?? []
      for (const transition of outgoing) {
        if (!entry.outputPins.includes(transition?.pinId)) {
          throw new Error(
            `computeDigitalEventContributions: component "${comp.uid}" (type "${comp.type}") emitted a transition on "${transition?.pinId}", which is not one of its declared outputPins`
          )
        }
      }
      recordDigitalTransitions(transitionStore, comp.uid, outgoing)
      digitalEventStates.set(comp.uid, state)
    }
    if (routeDueDigitalTransitions(pinRefs, inputKeys, prepared, currentTimeMs, transitionStore) === 0) return
  }
}

/** Contexte pré-résolution vide par défaut (lecture seule) : toutes les pins UNKNOWN. */
const NO_SOURCE_DRIVEN_SIGNALS = Object.freeze(new Map())

/** Transitions dues des pins d'entrée, triées par temps (égalité : ordre des pins puis de production). */
function consumeDueInputTransitions(transitionStore, uid, inputPins, untilMs) {
  const due = inputPins.flatMap((pinId) => consumeDigitalTransitions(transitionStore, uid, pinId, { untilMs }))
  return due.sort((a, b) => a.timeMs - b.timeMs)
}

/**
 * Consomme les transitions dues de chaque flux sortant et les copie sur les
 * pins d'entrée du même net. Retourne le nombre de copies livrées.
 */
function routeDueDigitalTransitions(pinRefs, inputKeys, prepared, untilMs, transitionStore) {
  const deliveries = new Map()
  for (const [key, { uid, pinId }] of pinRefs) {
    if (inputKeys.has(key)) continue
    const due = consumeDigitalTransitions(transitionStore, uid, pinId, { untilMs })
    if (due.length === 0) continue
    for (const destination of prepared.nets.get(prepared.uf.find(key)) ?? []) {
      if (destination === key || !inputKeys.has(destination)) continue
      if (!deliveries.has(destination)) deliveries.set(destination, [])
      deliveries.get(destination).push(...due)
    }
  }
  let delivered = 0
  for (const [destination, transitions] of deliveries) {
    const { uid, pinId } = pinRefs.get(destination)
    transitions.sort((a, b) => a.timeMs - b.timeMs)
    recordDigitalTransitions(transitionStore, uid, transitions.map(({ timeMs, signal }) => ({ pinId, timeMs, signal })))
    delivered += transitions.length
  }
  return delivered
}

/**
 * A7-C3-PREQ2 (§6 du ticket) : projection `{ pinId -> Signal }` des SEULES
 * pins canoniques du composant, lues depuis `sourceDrivenSignals` (Map
 * "uid:pinId" -> Signal produite par `resolveSourceDrivenPinSignals`,
 * resolution.js). Consulte `canonicalRegistry.js` pour la liste des pins
 * déclarées du type — jamais un nom de type précis — exactement le même
 * principe générique que `buildPinSignalMap` (resolution.js, non exportée,
 * non dupliquée ici : le format de clé "uid:pinId" est déjà la convention
 * utilisée sans détour par cette fonction, cf. la clé construite plus haut
 * dans `computeComponentDigitalSignals`). Toute pin absente de
 * `sourceDrivenSignals` (composant non alimenté par une source DC connue,
 * ou `sourceDrivenSignals` vide — appel historique sans 3e argument) vaut
 * Signal.UNKNOWN, jamais une exception.
 *
 * @param {{ uid: string, type: string }} comp
 * @param {Map<string, string>} sourceDrivenSignals
 * @returns {Record<string, string>}
 */
function buildComponentSourceDrivenPinSignals(comp, sourceDrivenSignals) {
  const entry = getCanonicalEntry(comp.type)
  if (!entry) return {}
  const pinSignals = {}
  for (const pin of entry.pins) {
    pinSignals[pin.id] = sourceDrivenSignals.get(`${comp.uid}:${pin.id}`) ?? Signal.UNKNOWN
  }
  return pinSignals
}

/**
 * A7-C3-PREQ — Fusion déterministe de plusieurs producteurs de signaux
 * externes (§5/§9 du ticket) : Runtime (Arduino) + Computed Digital Outputs
 * aujourd'hui, tout futur producteur demain, TOUJOURS composés en un SEUL
 * `externalSignals` avant un UNIQUE appel à `resolveSignals()` — jamais une
 * seconde résolution, jamais une fusion après propagation.
 *
 * Politique de collision explicite (§9 du ticket, ruling CSA) : une même
 * pin ("uid:pinId") ne doit jamais avoir deux producteurs indépendants.
 * Contrairement à un "last write wins" silencieux, toute clé déjà présente
 * dans une Map précédente fait échouer la composition immédiatement et
 * explicitement — aucune valeur n'est jamais écrasée silencieusement.
 *
 * @param {Array<Map<string, string>>} signalMaps
 * @returns {Map<string, string>}
 */
export function mergeExternalSignals(signalMaps) {
  const merged = new Map()
  for (const signalMap of signalMaps) {
    if (!signalMap) continue
    for (const [key, signal] of signalMap) {
      if (merged.has(key)) {
        throw new Error(
          `mergeExternalSignals: pin key "${key}" was produced by more than one independent signal source — a pin must have exactly one producer (CSA ruling, A7-C3-PREQ §9)`
        )
      }
      merged.set(key, signal)
    }
  }
  return merged
}

/**
 * Point d'entrée SIM3 : pour un circuit sans composant Runtime (ARDUINO),
 * délègue intégralement à runSimulation() (chemin historique, inchangé —
 * GATE 0). Dès qu'au moins un composant Runtime est présent, obtient
 * d'abord le SignalMap de chaque Runtime (Scheduler.advance(dt) TOUJOURS
 * avant ArduinoSimulator.tick(currentTimeMs), hérité de
 * RuntimeOrchestrator.advance() — MB-SIM-014 : le Runtime reçoit désormais
 * le currentTimeMs absolu retourné par le Scheduler, jamais dt lui-même,
 * et TOUS les Runtime d'un même appel partageant un Scheduler reçoivent
 * exactement le même currentTimeMs, voir sharedCurrentTimeMs ci-dessous),
 * les convertit en `externalSignals` (même format de clé "uid:pinId" que
 * pinSignals — aucune conversion conceptuelle, §5 du ticket), puis appelle
 * prepareCircuit() + resolveSignals(components, prepared, externalSignals) :
 * le signal Runtime participe ainsi réellement à la résolution (nets,
 * propagation), avant que pinSignals ne soit calculé — et non plus fusionné
 * après coup (MB-SIM-011).
 *
 * GATE 0 (non-régression) : pour un circuit sans composant Runtime, cette
 * fonction retourne exactement runSimulation(components, wires) — même
 * référence de Map, aucun Scheduler ni Runtime créé, aucun paramètre
 * supplémentaire requis.
 *
 * Déterminisme : aucune dépendance à Date.now()/setTimeout()/
 * setInterval()/performance.now() ; dt est fourni explicitement par
 * l'appelant, comme pour Scheduler.advance()/SimulatedClock.advance().
 *
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {Array<{ fromUid, fromPin, toUid, toPin }>} wires
 * @param {{ dt?: number, orchestrators?: Map<string, import('./runtimeOrchestrator.js').RuntimeOrchestrator>, environmentalStimuli?: {LIGHT?: number}|null, digitalContributionRegistry?: { hasDigitalContribution: Function, getDigitalContribution: Function } }} [options]
 *   `dt` : délégué tel quel à RuntimeOrchestrator.advance() pour chaque
 *   composant Runtime (0 par défaut — aucune progression temporelle si
 *   omis). `orchestrators` : Map optionnelle uid → RuntimeOrchestrator,
 *   à fournir par l'appelant pour conserver un état Runtime persistant
 *   entre plusieurs appels successifs (déterminisme, cycles de
 *   simulation répétés) ; une nouvelle Map est utilisée si omise. Tous
 *   les RuntimeOrchestrator créés automatiquement par un même appel
 *   partagent un unique Scheduler (une seule source de temps, GATE 1).
 *   `environmentalStimuli` [MB-L1-ENV-001] : état environnemental volatile
 *   optionnel (§13 du ticket), transmis tel quel à
 *   `applyEnvironmentalStimuli()` (environmentalStimulus.js, seule primitive
 *   productrice des paramètres électriques effectifs — ENV-15/ENV-16).
 *   `null`/omis -> comportement historique strictement inchangé (ENV-18) :
 *   `applyEnvironmentalStimuli` retourne alors la MÊME référence
 *   `components`, donc GATE 0 ci-dessous reste vrai à l'identique.
 *   `digitalContributionRegistry` [A7-C3-PREQ] : Registry optionnel injecté
 *   pour test (§13 du ticket) — défaut : Registry de production
 *   (`digitalContributionRegistry.js`, table vide dans ce ticket). Jamais
 *   utilisé pour enregistrer un faux type de production.
 *   `transientContributionRegistry`/`electricalTransientStates` [A4-D-PREQ1] :
 *   même convention exacte que `timedDigitalContributionRegistry`/
 *   `timedDigitalStates` ci-dessus, pour les contributeurs ÉLECTRIQUES
 *   transitoires (CAPACITOR/POLARIZED_CAPACITOR, §5 du ticket) — Registry
 *   optionnel injecté pour test (défaut : Registry de production,
 *   `transientContributionRegistry.js`) ; `electricalTransientStates`
 *   (Map<uid, state>) est le store d'état électrique runtime volatile,
 *   fourni par l'appelant pour persister entre appels successifs — une
 *   nouvelle Map par défaut si omise.
 * @returns {{ pinSignals: Map<string, string>, electricalAnalysis: Map<string, {voltage:number, current:number}> }}
 *   `pinSignals` — même format que runSimulation() (clé "uid:pinId" →
 *   Signal), désormais calculé avec les signaux Runtime ET/OU les sorties
 *   numériques calculées comme entrées de la résolution le cas échéant.
 *   `electricalAnalysis` [A4-D-PREQ2] : `composeElectricalAnalysis(dcAnalysis,
 *   transientContributions)` (electricalAnalysis.js) — l'analyse DC
 *   steady-state historique (`computeDcAnalysis`, resolution.js), avec
 *   remplacement par la contribution électrique transitoire du step
 *   courant pour tout `uid` qui en possède une valide (I-A4-13/I-A4-14).
 *   Cette fonction interne n'est jamais exportée directement : voir
 *   `runSimulationWithRuntime()` (ne garde que `pinSignals`, contrat
 *   historique strictement inchangé — I-A4-19) et `runSimulationStep()`
 *   (nouvelle surface publique minimale qui expose aussi
 *   `electricalAnalysis`) ci-dessous, toutes deux de simples projections de
 *   ce même résultat calculé UNE SEULE FOIS (I-A4-17).
 */

/**
 * A4-D-PREQ2 (I-A4-17, "ONE RESOLUTION") : point d'appel textuel UNIQUE à
 * `resolveSignals()` dans ce fichier. GATE 0 (circuit sans ARDUINO/timed/
 * transient) et le chemin composé (Runtime/timed/transient) ci-dessous
 * appellent tous deux CETTE fonction plutôt que `resolveSignals()`
 * directement — les deux sites d'appel sont mutuellement exclusifs (GATE 0
 * retourne avant d'atteindre l'autre), donc l'invariant runtime réel
 * ("exactement une résolution exécutée par step") reste vrai ; centraliser
 * le SITE d'appel préserve en plus, telle quelle, la preuve structurelle
 * déjà verrouillée par `poweredDigitalContext.test.js` (P20) et
 * `timedDigitalRuntimeIntegration.test.js` (TD-37) : "simulationRuntimeIntegration.js
 * appelle resolveSignals(...) exactement une fois (hors commentaires/JSDoc)".
 */
function resolveElectricalSignals(effectiveComponents, prepared, externalSignals = null, stepAuthorities = null) {
  return resolveSignals(effectiveComponents, prepared, externalSignals, stepAuthorities)
}

function computeElectricalStep(components, wires, options = {}) {
  // MB-L1-ENV-001 (§9 du ticket) : les composants EFFECTIFS (paramètres
  // électriques soumis à l'environnement, ex. résistance LDR sous LIGHT)
  // sont calculés AVANT prepareCircuit()/resolveSignals() et avant
  // runSimulation() — jamais après. `effectiveComponents === components`
  // (même référence) tant qu'aucun stimulus valide n'est actif : GATE 0
  // (non-régression, ci-dessous) reste donc exactement vraie.
  const effectiveComponents = applyEnvironmentalStimuli(components, options.environmentalStimuli)
  const runtimeComponents = (effectiveComponents || []).filter((c) => c && c.type === RUNTIME_COMPONENT_TYPE)

  // A7-C3-PREQ2 (§7 du ticket) : `prepared` est désormais construit ICI,
  // avant le GATE 0 — un peu plus tôt que MB-SIM-011/A7-C3-PREQ, uniquement
  // pour pouvoir dériver `sourceDrivenSignals` (contexte alimenté
  // pré-résolution) ci-dessous. prepareCircuit() est une fonction PURE de
  // (effectiveComponents, wires) : l'appeler une fois de plus tôt ne change
  // aucune valeur observable — GATE 0 (non-régression, plus bas) continue de
  // retourner exactement runSimulation(effectiveComponents, wires), qui
  // reconstruit son propre `prepared` en interne, identique par construction
  // (§8 du ticket : "prove no semantic change").
  const prepared = prepareCircuit(effectiveComponents, wires)

  // A7-C3-PREQ2 (§4/§5/§7 du ticket) : contexte générique pré-résolution —
  // seules les pins déterministement établies par une source DC et la
  // topologie physique (POWER/BATTERY.../GND propagés par net), AVANT toute
  // conduction passive, sortie numérique calculée, Runtime ou résolution
  // complète. Consulte resolution.js — resolveSourceDrivenPinSignals — SEULE
  // primitive partagée avec resolveSignals() (§5 : source unique de vérité).
  const sourceDrivenSignals = resolveSourceDrivenPinSignals(effectiveComponents, prepared)

  // Detect contributors without evaluating them before the step authorities
  // exist. A registered contributor may initially return no output and still
  // become driven by another contributor later in this same step.
  const digitalRegistry = options.digitalContributionRegistry ?? {
    hasDigitalContribution: defaultHasDigitalContribution,
    getDigitalContribution: defaultGetDigitalContribution,
  }
  const hasDigitalComponents = effectiveComponents.some((c) => c && digitalRegistry.hasDigitalContribution(c.type))

  // A7-C5-PREQ (§6/§14 du ticket) : le Registry générique de sorties
  // numériques TEMPORELLES (stateful, dépendantes du temps simulé) est
  // consulté pour TOUS les composants, exactement comme
  // `computeComponentDigitalSignals` ci-dessus — jamais un
  // `if (component.type === "...")`. Sa taille conditionne, au même titre
  // que `runtimeComponents`/`computedDigitalSignals`, si le chemin
  // historique `runSimulation()` peut encore être emprunté (GATE 0) et si
  // une source de temps simulé doit exister pour ce step (§14 : un timed
  // producer doit fonctionner SANS aucun ARDUINO dans le circuit).
  const timedDigitalRegistry = options.timedDigitalContributionRegistry ?? {
    hasTimedDigitalContribution: defaultHasTimedDigitalContribution,
    getTimedDigitalContribution: defaultGetTimedDigitalContribution,
  }
  const timedDigitalComponents = (effectiveComponents || []).filter(
    (c) => c && timedDigitalRegistry.hasTimedDigitalContribution(c.type)
  )

  // A4-D-PREQ1 (§6 du ticket) : le Registry générique de contributions
  // ÉLECTRIQUES TRANSITOIRES est consulté pour TOUS les composants,
  // exactement comme `timedDigitalRegistry` ci-dessus — jamais un
  // `if (component.type === "...")`. Sa taille conditionne, au même titre
  // que `runtimeComponents`/`timedDigitalComponents`, si le chemin
  // historique `runSimulation()` peut encore être emprunté (GATE 0) et si
  // une source de temps simulé doit exister pour ce step (§6 du ticket : la
  // seule présence d'un composant transitoire suffit à activer le chemin
  // temporel générique, même sans aucun ARDUINO).
  const transientRegistry = options.transientContributionRegistry ?? {
    hasTransientContribution: defaultHasTransientContribution,
    getTransientContribution: defaultGetTransientContribution,
    getTransientObservation: defaultGetTransientObservation,
    getTransientDriveTerminals: defaultGetTransientDriveTerminals,
  }
  const transientComponents = (effectiveComponents || []).filter(
    (c) => c && transientRegistry.hasTransientContribution(c.type)
  )

  // A12-NEOPIXEL-PREQ-EVENT-CONSUMER-001 : Registry événementiel consulté pour
  // TOUS les composants (jamais un nom de type). Sa présence active, comme
  // timed/transient, le chemin temporel générique (Scheduler partagé) ; son
  // absence laisse GATE 0 strictement historique.
  const digitalEventRegistry = options.digitalEventContributionRegistry ?? {
    hasDigitalEventContribution: defaultHasDigitalEventContribution,
    getDigitalEventContribution: defaultGetDigitalEventContribution,
  }
  const digitalEventComponents = (effectiveComponents || []).filter(
    (c) => c && digitalEventRegistry.hasDigitalEventContribution(c.type)
  )

  // A11-COMP4-PREQ3 : stateful mixed-signal Registry, consulted for EVERY
  // component (never a type name). Its presence activates the generic timed
  // path (shared Scheduler) ; its absence leaves GATE 0 strictly historical.
  const mixedSignalRegistry = options.mixedSignalContributionRegistry ?? {
    hasMixedSignalContribution: defaultHasMixedSignalContribution,
    getMixedSignalContribution: defaultGetMixedSignalContribution,
  }
  const mixedSignalComponents = (effectiveComponents || []).filter(
    (c) => c && mixedSignalRegistry.hasMixedSignalContribution(c.type)
  )

  // GATE 0 (§7/§15 du ticket A7-C5-PREQ, étendu §7 A4-D-PREQ1, non-régression
  // stricte) : pour un circuit sans ARDUINO, sans aucun composant enregistré
  // dans le Registry de sorties numériques calculées, sans aucun composant
  // enregistré dans le Registry temporel, ET sans aucun composant enregistré
  // dans le Registry transitoire électrique, le comportement historique est
  // préservé À L'IDENTIQUE — aucun Scheduler ni Runtime instancié.
  //
  // A4-D-PREQ2 (§4.1/I-A4-17 du ticket) : `pinSignals` n'est PLUS obtenu par
  // délégation littérale à `runSimulation(effectiveComponents, wires)`
  // (qui calcule un `dcAnalysis` interne mais ne l'expose jamais — voir
  // engine.js, MB-SIM-007) : cette branche appelle directement
  // `resolveSignals(effectiveComponents, prepared)` — EXACTEMENT la même
  // composition que `runSimulation()` utilise en interne (`prepared` déjà
  // construit ci-dessus, aucun second `prepareCircuit()`, aucun
  // `externalSignals` — comportement historique de resolveSignals()
  // strictement inchangé), donc une valeur de `pinSignals` identique
  // (§8 A7-C3-PREQ2 : "prove no semantic change"), tout en récupérant
  // `dcAnalysis` dans la MÊME et UNIQUE résolution du step (I-A4-17 : jamais
  // une deuxième `resolveSignals()` pour produire `electricalAnalysis`).
  // `runSimulation()` (engine.js) elle-même reste totalement inchangée et
  // continue d'être appelable directement (I-A4-19).
  if (
    runtimeComponents.length === 0
    && !hasDigitalComponents
    && timedDigitalComponents.length === 0
    && transientComponents.length === 0
    && digitalEventComponents.length === 0
    && mixedSignalComponents.length === 0
  ) {
    const { pinSignals, dcAnalysis } = resolveElectricalSignals(effectiveComponents, prepared)
    return { pinSignals, electricalAnalysis: composeElectricalAnalysis(dcAnalysis) }
  }

  // A7-C3-PREQ (§12 du ticket) / A7-C5-PREQ (§14 du ticket) / A4-D-PREQ1 (§6
  // du ticket) : la construction d'une source de temps simulé (Scheduler)
  // est conditionnée à la présence d'au moins un ARDUINO, OU d'au moins un
  // timed digital producer, OU d'au moins un composant transitoire
  // électrique — un circuit qui n'a QUE des sorties numériques calculées
  // (stateless, sans ARDUINO/timed/transient) n'instancie ni Scheduler ni
  // Runtime, exactement comme avant ce ticket pour un tel circuit. Un
  // ArduinoSimulator, lui, n'est JAMAIS créé uniquement à cause d'un timed
  // producer ou d'un composant transitoire (§14/§32 A7-C5-PREQ, §6
  // A4-D-PREQ1) : seul un Scheduler générique (scheduler.js, inchangé) est
  // requis dans ce cas.
  let runtimeSignals = new Map()
  let timedDigitalSignals = new Map()
  // A4-D-PREQ2 : store le résultat de `computeTransientElectricalContributions`
  // (jusqu'ici calculé pour son seul effet de bord sur `electricalTransientStates`,
  // A4-D-PREQ1 — sa valeur de retour était silencieusement ignorée) afin de
  // le composer avec `dcAnalysis` ci-dessous (§3 du ticket : "la
  // contribution est donc calculée mais non observable").
  let transientContributions = new Map()
  // A11-COMP4-PREQ3 : sampled mixed-signal step (pending states + effects),
  // committed only once every authority of the step has been composed.
  let mixedSignalStep = null
  let mixedSignalStates = null
  // A11-COMP4-PREQ5 : numeric DC-source facts of the step, computed at most
  // once and shared by the mixed-signal SAMPLE and the transient drive contexts.
  let sourceVoltageFacts = null
  if (runtimeComponents.length > 0 || timedDigitalComponents.length > 0 || transientComponents.length > 0 || digitalEventComponents.length > 0 || mixedSignalComponents.length > 0) {
    const dt = options.dt ?? 0
    const orchestrators = options.orchestrators instanceof Map ? options.orchestrators : new Map()

    let sharedScheduler = null
    for (const existing of orchestrators.values()) {
      sharedScheduler = existing.getScheduler()
      break
    }
    // A7-C5-PREQ (§13/§14 du ticket) : aucun orchestrateur Arduino existant
    // (persisté) ne fournit encore de Scheduler pour cet appel — soit parce
    // qu'aucun ARDUINO n'est présent, soit parce que ses orchestrateurs
    // seront créés plus bas dans ce même appel. Un Scheduler explicitement
    // fourni par l'appelant (`options.scheduler`, persistance inter-appels
    // pour un circuit SANS ARDUINO, §14/§22 du ticket) est réutilisé en
    // priorité ; à défaut, un Scheduler générique est créé (comportement
    // historique inchangé pour le chemin Arduino : un nouvel orchestrateur
    // sans Scheduler injecté créait déjà, en interne, exactement le même
    // Scheduler par défaut).
    // A9-SEQ-PREQ2 : une session runtime applicative (voir
    // `createSimulationRuntimeSession`) conserve l'autorité temporelle
    // générique créée paresseusement ici, pour qu'elle survive d'un step à
    // l'autre sans ARDUINO. Elle adopte l'autorité effectivement retenue pour
    // ce step (Scheduler d'orchestrateur, explicite ou nouveau) : une seule
    // autorité par session, jamais deux Scheduler concurrents.
    const runtimeSession = options.runtimeSession ?? null
    if (!sharedScheduler) {
      sharedScheduler = options.scheduler ?? runtimeSession?.scheduler ?? createScheduler()
    }
    if (runtimeSession) {
      if (runtimeSession.scheduler && runtimeSession.scheduler !== sharedScheduler) {
        throw new Error("A simulation runtime session must keep one Scheduler")
      }
      runtimeSession.scheduler = sharedScheduler
    }

    // Une seule source de temps (GATE 1) : lorsque plusieurs composants
    // Runtime partagent un même Scheduler (créés automatiquement au sein
    // d'un même appel), ce Scheduler ne doit être avancé qu'UNE SEULE fois
    // par appel — pas une fois par composant, ce qui le ferait dériver
    // (dt * nombre de composants). Le premier composant traité avance le
    // Scheduler (via RuntimeOrchestrator.advance(), qui préserve l'ordre
    // Scheduler -> Runtime) ; les suivants, partageant déjà ce Scheduler
    // désormais à jour, ne font progresser que leur propre Runtime.
    //
    // MB-SIM-014 §4/§6 : le Scheduler reste l'unique source de temps — tous
    // les Runtime d'un même appel doivent recevoir EXACTEMENT le même
    // currentTimeMs (jamais dt, une simple durée). A7-C5-PREQ (§13 du
    // ticket) étend cet invariant aux timed digital producers : ils
    // observent exactement le même `currentTimeMs`, calculé UNE SEULE fois
    // ci-dessous par `sharedScheduler.advance(dt)`, jamais une seconde
    // avance ni une horloge indépendante.
    if (runtimeComponents.length > 0) {
      // Resolve every runtime before advancing the one shared clock.
      for (const comp of runtimeComponents) {
        if (!orchestrators.has(comp.uid)) {
          orchestrators.set(comp.uid, createRuntimeOrchestrator({ scheduler: sharedScheduler }))
        }
      }
      for (const comp of runtimeComponents) {
        if (orchestrators.get(comp.uid).getScheduler() !== sharedScheduler) {
          throw new Error("Live Arduino runtimes must share one Scheduler")
        }
      }
      if (options.firmwareSessions) {
        synchronizeFirmware(options.firmwareComponents ?? components, orchestrators, options.firmwareSessions)
      }
    }

    sharedScheduler.advance(dt)
    const currentTimeMs = sharedScheduler.getCurrentTime()

    // A4-D-PREQ1 : store d'état électrique runtime volatile, fourni par
    // l'appelant pour persister entre plusieurs appels successifs (même
    // convention exacte que `options.timedDigitalStates`/`options.orchestrators`)
    // — une nouvelle Map par défaut si omise (reset déterministe). Résolu une
    // seule fois ici (A11-COMP4-PREQ4) : l'observation du SAMPLE mixed-signal
    // et la mise à jour transitoire du step lisent/écrivent le MÊME store.
    const electricalTransientStates = options.electricalTransientStates instanceof Map
      ? options.electricalTransientStates
      : options.runtimeSession?.electricalTransientStates ?? new Map()

    if (runtimeComponents.length > 0) {
      for (const comp of runtimeComponents) {
        options.firmwareSessions?.get(comp.uid)?.controller?.resumeAtCurrentTime()
      }
      for (const comp of runtimeComponents) {
        const signalMap = orchestrators.get(comp.uid).getRuntime().tick(currentTimeMs)
        for (const [pinId, signal] of signalMap) runtimeSignals.set(`${comp.uid}:${pinId}`, signal)
      }
    }

    if (mixedSignalComponents.length > 0) {
      // A11-COMP4-PREQ3 : SAMPLE. ONE snapshot built before the first
      // contributor : digital pre-resolution context (DC sources + Runtime
      // authorities of this step) and numeric DC-source facts. No step output
      // (timed, combinational or mixed-signal) exists yet, and no resolution
      // is run to obtain it.
      mixedSignalStates = options.mixedSignalStates instanceof Map
        ? options.mixedSignalStates
        : options.runtimeSession?.mixedSignalStates ?? new Map()
      // A11-COMP4-PREQ4 : the numeric snapshot also carries the transient
      // facts OBSERVED from the states committed by step n-1 (this step's
      // transient update runs later, after SAMPLE). Only the Registry
      // observers read the private transient store ; contributors receive
      // composed facts, whatever their origin.
      const transientFacts = observeTransientVoltageFacts(transientComponents, transientRegistry, electricalTransientStates)
      sourceVoltageFacts = resolveSourceDrivenVoltageFacts(effectiveComponents, prepared)
      mixedSignalStep = computeMixedSignalContributions(
        mixedSignalComponents,
        mixedSignalRegistry,
        {
          pinSignals: resolveSourceDrivenPinSignals(effectiveComponents, prepared, runtimeSignals),
          voltageFacts: composeSampleVoltageFacts(sourceVoltageFacts, transientFacts, prepared),
        },
        dt,
        currentTimeMs,
        mixedSignalStates
      )
    }

    if (timedDigitalComponents.length > 0) {
      // A7-C5-PREQ (§22 du ticket) : store d'état runtime volatile, fourni
      // par l'appelant pour persister entre plusieurs appels successifs
      // (même convention que `options.orchestrators` pour l'Embedded
      // Runtime) — une nouvelle Map par défaut si omis (comportement
      // déterministe, sans persistance, §22).
      const timedDigitalStates = options.timedDigitalStates instanceof Map
        ? options.timedDigitalStates
        : options.runtimeSession?.timedDigitalStates ?? new Map()
      // A9-SEQ-PREQ : SAMPLE puis COMMIT. Tous les producteurs timed du step
      // observent le MÊME contexte d'échantillonnage (voir
      // `computeTimedDigitalSampleSignals`), construit avant qu'aucune de
      // leurs nouvelles sorties n'existe — simultanéité logique.
      const sampleSignals = computeTimedDigitalSampleSignals(
        effectiveComponents,
        prepared,
        hasDigitalComponents ? digitalRegistry : null,
        mergeExternalSignals([runtimeSignals, readHeldTimedDigitalSignals(timedDigitalComponents, timedDigitalStates)])
      )
      timedDigitalSignals = computeTimedDigitalSignals(
        timedDigitalComponents,
        timedDigitalRegistry,
        sampleSignals,
        currentTimeMs,
        timedDigitalStates
      )
      rememberHeldTimedDigitalSignals(timedDigitalComponents, timedDigitalStates, timedDigitalSignals)
    }

    if (digitalEventComponents.length > 0) {
      // A12-NEOPIXEL-PREQ-EVENT-CONSUMER-001 : plan des ÉVÉNEMENTS, après les
      // producteurs du step (Runtime, timed) et sur le même `currentTimeMs`.
      // Store de transitions et états privés de la session runtime (nouveaux
      // à chaque appel sans session : aucune persistance, déterministe).
      // N'alimente pas `externalSignals` : SignalMap reste le plan du niveau.
      computeDigitalEventContributions(
        effectiveComponents,
        digitalEventRegistry,
        prepared,
        currentTimeMs,
        options.runtimeSession?.digitalTransitions ?? createDigitalTransitionStore(),
        options.runtimeSession?.digitalEventStates ?? new Map(),
        sourceDrivenSignals
      )
    }

    if (transientComponents.length > 0) {
      // A4-D-PREQ1 (§4 du ticket) : store d'état électrique runtime
      // volatile, fourni par l'appelant pour persister entre plusieurs
      // appels successifs (même convention exacte que
      // `options.timedDigitalStates`/`options.orchestrators`) — une nouvelle
      // Map par défaut si omise (reset déterministe, §5/T6 du ticket).
      //
      // Le contrat transitoire n'accepte qu'une tension de bus UNIQUE
      // (`supplyVoltage`), même restriction déjà existante que
      // `computeDcAnalysis` (resolution.js) : au-delà d'une seule source DC
      // dans le circuit, aucune tension de bus commune n'est définie dans ce
      // modèle simplifié — un contributeur reçoit alors `null` et se
      // comporte comme un composant non alimenté (voir
      // `transientContributionRegistry.js`).
      const dcSources = effectiveComponents.map((c) => getDcSource(c)).filter((source) => source !== null)
      const supplyVoltage = dcSources.length === 1 ? dcSources[0].voltage : null

      // A11-COMP4-PREQ5 : drive contexts of step n, after the mixed effects[n]
      // (conduction pairs, voltage outputs) and before the transient update[n].
      const driveContexts = computeTransientDriveContexts({
        transientComponents,
        transientRegistry,
        components: effectiveComponents,
        prepared,
        sourceVoltageFacts: sourceVoltageFacts ?? resolveSourceDrivenVoltageFacts(effectiveComponents, prepared),
        mixedSignalComponents,
        mixedSignalStep,
      })

      transientContributions = computeTransientElectricalContributions(
        transientComponents,
        transientRegistry,
        sourceDrivenSignals,
        supplyVoltage,
        dt,
        currentTimeMs,
        electricalTransientStates,
        driveContexts
      )
    }
  }

  // A7-C3-PREQ (§5 du ticket) : UNE SEULE composition, UNE SEULE résolution
  // — jamais une seconde résolution, jamais une fusion après propagation.
  // A7-C3-PREQ2 (§7 du ticket) : réutilise le `prepared` déjà construit
  // ci-dessus (pour sourceDrivenSignals) — jamais un second prepareCircuit()
  // sur ce chemin, la topologie physique ne change pas entre-temps.
  // A7-C5-PREQ (§30 du ticket) : `timedDigitalSignals` compose au même titre
  // que `runtimeSignals`/`computedDigitalSignals`, avec la même politique de
  // collision explicite (`mergeExternalSignals`, aucun last-write-wins
  // silencieux).
  // A11-COMP4-PREQ3 : mixed-signal digital outputs compose as step
  // authorities too, under the same explicit collision refusal.
  const baseExternalSignals = mergeExternalSignals([runtimeSignals, timedDigitalSignals, mixedSignalStep?.digitalSignals])
  const computedDigitalSignals = hasDigitalComponents
    ? computeCombinationalDigitalSignals(effectiveComponents, prepared, digitalRegistry, baseExternalSignals)
    : new Map()
  const externalSignals = mergeExternalSignals([baseExternalSignals, computedDigitalSignals])
  // A11-COMP4-PREQ3 : COMMIT, once every authority of the step is composed
  // (a refused composition leaves no new mixed-signal state), then the ONE
  // resolution consumes the pure electrical authorities of the step.
  if (mixedSignalStep) commitMixedSignalStates(mixedSignalStates, mixedSignalStep.states)
  const { pinSignals, dcAnalysis } = resolveElectricalSignals(effectiveComponents, prepared, externalSignals,
    mixedSignalStep?.electricalAuthorities ?? null)
  // A4-D-PREQ2 (§4 du ticket) : `electricalAnalysis` compose `dcAnalysis`
  // (steady-state, cette MÊME résolution — I-A4-17) avec
  // `transientContributions` (step courant, I-A4-13 : transient > DC pour un
  // même uid) — jamais une branche par type de composant ici (I-A4-15,
  // même interdiction que pour CAPACITOR/POLARIZED_CAPACITOR ailleurs dans
  // ce fichier) : `composeElectricalAnalysis` ne connaît que deux
  // Map<uid, {voltage, current}>, jamais un type de composant.
  return { pinSignals, electricalAnalysis: composeElectricalAnalysis(dcAnalysis, transientContributions) }
}

/**
 * API historique (I-A4-19, GATE 0) : ne retourne QUE `pinSignals`, même
 * contrat exact que le PREQ1/A7-C5-PREQ/A7-C3-PREQ/MB-SIM-011 (clé
 * "uid:pinId" → Signal) — aucun appelant existant (`useCircuitState.js`,
 * tests) n'est affecté par A4-D-PREQ2 : cette fonction est désormais une
 * simple projection `.pinSignals` de `computeElectricalStep()` ci-dessus,
 * calculée par la même et unique résolution (I-A4-17), jamais un second
 * appel indépendant.
 *
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {Array<{ fromUid, fromPin, toUid, toPin }>} wires
 * @param {object} [options] Voir `computeElectricalStep()` ci-dessus pour le
 *   détail complet des options acceptées (dt, orchestrators,
 *   environmentalStimuli, *ContributionRegistry, *States, scheduler,
 *   firmwareSessions/firmwareComponents).
 * @returns {Map<string, string>} pinSignals.
 */
export function runSimulationWithRuntime(components, wires, options = {}) {
  return computeElectricalStep(components, wires, options).pinSignals
}

/**
 * A4-D-PREQ2 — nouvelle surface publique MINIMALE (§5/§11 du ticket :
 * "ne créer cette nouvelle surface publique que si l'audit des appelants
 * confirme qu'elle est nécessaire"). Audit : le seul appelant de production
 * de `runSimulationWithRuntime()` est `useCircuitState.js`, qui ne consomme
 * que `pinSignals` (jamais `dcAnalysis`/`electricalAnalysis`) — modifier son
 * contrat de retour aurait cassé cet appelant silencieusement (§5 du
 * ticket). Aucune primitive existante n'expose déjà `electricalAnalysis`
 * pour le chemin RUNTIME composé (Scheduler/Runtime/timed/transient) :
 * `resolveSignals()` seule l'expose, mais l'appeler une seconde fois
 * ici violerait I-A4-17. `runSimulationStep()` est donc la plus petite
 * extension additive possible : même composition, même résolution unique
 * que `runSimulationWithRuntime()`, mais expose en plus `electricalAnalysis`
 * pour tout futur consommateur (Inspector, Measurement) qui voudrait
 * observer la contribution électrique transitoire du step courant — aucun
 * tel câblage n'est fait par ce ticket (§12 du ticket : scope le plus petit
 * possible).
 *
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {Array<{ fromUid, fromPin, toUid, toPin }>} wires
 * @param {object} [options] Voir `computeElectricalStep()` ci-dessus.
 * @returns {{ pinSignals: Map<string, string>, electricalAnalysis: Map<string, {voltage:number, current:number}> }}
 */
export function runSimulationStep(components, wires, options = {}) {
  return computeElectricalStep(components, wires, options)
}

export function stopFirmwareSimulation(orchestrators, sessions) {
  for (const session of sessions.values()) session.controller?.stop()
  for (const orchestrator of orchestrators.values()) orchestrator.getRuntime().stop()
  sessions.clear()
  orchestrators.clear()
}

function synchronizeFirmware(components, orchestrators, sessions) {
  const live = new Set(components.filter(c => c.type === "ARDUINO").map(c => c.uid))
  for (const [uid, session] of sessions) {
    if (!live.has(uid)) {
      session.controller?.stop()
      orchestrators.get(uid)?.getRuntime().stop()
      sessions.delete(uid)
      orchestrators.delete(uid)
    }
  }
  for (const comp of components) {
    if (comp.type !== "ARDUINO") continue
    const source = comp.firmware?.source
    const previous = sessions.get(comp.uid)
    if (previous && previous.source === source) continue
    previous?.controller?.stop()
    const orchestrator = orchestrators.get(comp.uid)
    const runtime = orchestrator.getRuntime()
    runtime.stop()
    runtime.loadCode(source)
    const compiled = compileFirmware(source)
    const session = { source, diagnostics: compiled.ok ? [] : compiled.diagnostics }
    sessions.set(comp.uid, session)
    if (!compiled.ok) continue
    session.executor = new FirmwareExecutor(compiled.ir, runtime)
    session.controller = new FirmwareRuntimeController({ scheduler: orchestrator.getScheduler(), executor: session.executor })
    runtime.start()
    session.controller.start()
  }
}
