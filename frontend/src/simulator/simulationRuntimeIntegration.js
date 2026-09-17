import { compileFirmware } from "../arduino/firmware/firmwareCompiler.js"
import { FirmwareExecutor } from "../arduino/firmware/firmwareExecutor.js"
import { FirmwareRuntimeController } from "../arduino/firmware/firmwareRuntimeController.js"

// Presentation frames advance this fixed simulated duration, never wall time.
export const SIMULATION_STEP_MS = 16

import { runSimulation } from "./engine.js"
import { prepareCircuit } from "./preparation.js"
import { resolveSignals, resolveSourceDrivenPinSignals } from "./resolution.js"
import { createRuntimeOrchestrator } from "./runtimeOrchestrator.js"
import { createScheduler } from "./scheduler.js"
import { applyEnvironmentalStimuli } from "./environmentalStimulus.js"
import { getDigitalContribution as defaultGetDigitalContribution, hasDigitalContribution as defaultHasDigitalContribution } from "./digitalContributionRegistry.js"
import { getTimedDigitalContribution as defaultGetTimedDigitalContribution, hasTimedDigitalContribution as defaultHasTimedDigitalContribution } from "./timedDigitalContributionRegistry.js"
import { resolveComponentParameters } from "./resolveComponentParameters.js"
import { getCanonicalEntry } from "./canonicalRegistry.js"
import { Signal } from "./signals.js"

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
 * A7-C3-PREQ2 (§6/§7 du ticket) : le contexte de contribution est étendu
 * d'un champ `pinSignals` — les propres pins du composant, PRÉ-résolues
 * uniquement depuis les sources DC et la topologie physique
 * (`resolveSourceDrivenPinSignals`, resolution.js — même primitive que
 * resolveSignals(), §5), AVANT toute conduction passive, sortie numérique
 * calculée, Runtime ou résolution complète. Un contributeur peut ainsi
 * refuser de produire (retourner `null`) si son composant n'est pas
 * correctement alimenté (ex. `pinSignals.VCC !== Signal.HIGH`).
 * `sourceDrivenSignals` reste un 3e paramètre optionnel (défaut : Map vide,
 * donc `pinSignals` entièrement UNKNOWN) pour que tout appel historique de
 * cette fonction (§21 : PREQ tests existants) continue de fonctionner à
 * l'identique.
 *
 * @param {Array<{ uid, type, parameters? }>} effectiveComponents composants
 *   déjà soumis à `applyEnvironmentalStimuli()` (§8 du ticket : ce Registry
 *   ne reçoit donc jamais les paramètres persistants bruts).
 * @param {{ hasDigitalContribution: (type: string) => boolean, getDigitalContribution: (type: string) => import('./digitalContributionRegistry.js').DigitalContributionFn | null }} digitalRegistry
 *   Par défaut le Registry de production (table vide dans ce ticket) ;
 *   injectable pour test (§13 du ticket), sans jamais passer par
 *   `canonicalRegistry.js` ni polluer la table de production.
 * @param {Map<string, string>} [sourceDrivenSignals] `resolveSourceDrivenPinSignals()`
 *   (résolution.js), clé "uid:pinId" — défaut Map vide (aucune pin connue
 *   comme alimentée, comportement historique PREQ1 inchangé).
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
 * @param {Map<string, string>} sourceDrivenSignals `resolveSourceDrivenPinSignals()`
 *   (resolution.js), clé "uid:pinId" — même Map que celle transmise à
 *   `computeComponentDigitalSignals` (une seule résolution pré-électrique
 *   par step).
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
 * @returns {Map<string, string>} pinSignals — même format que
 *   runSimulation() (clé "uid:pinId" → Signal), désormais calculé avec les
 *   signaux Runtime ET/OU les sorties numériques calculées comme entrées de
 *   la résolution le cas échéant.
 */
export function runSimulationWithRuntime(components, wires, options = {}) {
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

  // A7-C3-PREQ (§2/§6/§7 du ticket) : le Registry générique de sorties
  // numériques calculées est consulté pour TOUS les composants, Runtime ou
  // non — un futur capteur environnemental producteur de logique calculée
  // (humidité du sol, mouvement, inclinaison, récepteur infrarouge, ...)
  // produit un signal externe même en
  // l'ABSENCE de tout ARDUINO dans le circuit (contrairement au mécanisme
  // Runtime, câblé en dur sur ARDUINO ci-dessus). Calculé AVANT le GATE 0 :
  // sa taille conditionne, au même titre que runtimeComponents, si le
  // chemin historique `runSimulation()` peut encore être emprunté tel quel.
  // A7-C3-PREQ2 : reçoit désormais `sourceDrivenSignals` (§6/§7 du ticket) —
  // chaque contributeur peut consulter son propre état alimenté AVANT de
  // produire (ou refuser de produire) sa sortie.
  const computedDigitalSignals = computeComponentDigitalSignals(effectiveComponents, options.digitalContributionRegistry, sourceDrivenSignals)

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

  // GATE 0 (§7/§15 du ticket, non-régression stricte) : pour un circuit sans
  // ARDUINO, sans aucun composant enregistré dans le Registry de sorties
  // numériques calculées, ET sans aucun composant enregistré dans le
  // Registry temporel (tables de production vides dans ce ticket — donc
  // TOUJOURS vrai aujourd'hui pour tout circuit réel), le comportement
  // historique est préservé À L'IDENTIQUE — même référence de Map que
  // `runSimulation()`, aucun Scheduler ni Runtime instancié.
  if (runtimeComponents.length === 0 && computedDigitalSignals.size === 0 && timedDigitalComponents.length === 0) {
    return runSimulation(effectiveComponents, wires)
  }

  // A7-C3-PREQ (§12 du ticket) / A7-C5-PREQ (§14 du ticket) : la construction
  // d'une source de temps simulé (Scheduler) est conditionnée à la présence
  // d'au moins un ARDUINO OU d'au moins un timed digital producer — un
  // circuit qui n'a QUE des sorties numériques calculées (stateless, sans
  // ARDUINO ni timed producer) n'instancie ni Scheduler ni Runtime, exactement
  // comme avant ce ticket pour un tel circuit. Un ArduinoSimulator, lui,
  // n'est JAMAIS créé uniquement à cause d'un timed producer (§14, §32 du
  // ticket) : seul un Scheduler générique (scheduler.js, inchangé) est requis
  // dans ce cas.
  let runtimeSignals = new Map()
  let timedDigitalSignals = new Map()
  if (runtimeComponents.length > 0 || timedDigitalComponents.length > 0) {
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
    if (!sharedScheduler) {
      sharedScheduler = options.scheduler ?? createScheduler()
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

    if (runtimeComponents.length > 0) {
      for (const comp of runtimeComponents) {
        options.firmwareSessions?.get(comp.uid)?.controller?.resumeAtCurrentTime()
      }
      for (const comp of runtimeComponents) {
        const signalMap = orchestrators.get(comp.uid).getRuntime().tick(currentTimeMs)
        for (const [pinId, signal] of signalMap) runtimeSignals.set(`${comp.uid}:${pinId}`, signal)
      }
    }

    if (timedDigitalComponents.length > 0) {
      // A7-C5-PREQ (§22 du ticket) : store d'état runtime volatile, fourni
      // par l'appelant pour persister entre plusieurs appels successifs
      // (même convention que `options.orchestrators` pour l'Embedded
      // Runtime) — une nouvelle Map par défaut si omis (comportement
      // déterministe, sans persistance, §22).
      const timedDigitalStates = options.timedDigitalStates instanceof Map ? options.timedDigitalStates : new Map()
      timedDigitalSignals = computeTimedDigitalSignals(
        timedDigitalComponents,
        timedDigitalRegistry,
        sourceDrivenSignals,
        currentTimeMs,
        timedDigitalStates
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
  const externalSignals = mergeExternalSignals([runtimeSignals, computedDigitalSignals, timedDigitalSignals])
  const { pinSignals } = resolveSignals(effectiveComponents, prepared, externalSignals)
  return pinSignals
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
