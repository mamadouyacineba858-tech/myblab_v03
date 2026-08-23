import { prepareCircuit } from "../simulator/preparation.js"
import { resolveSignals } from "../simulator/resolution.js"
import { getCanonicalEntry } from "../simulator/canonicalRegistry.js"

/**
 * MB-OBS-001 — Observation Contract.
 *
 * Frontière canonique unique entre les résultats déjà produits par
 * Simulation (`pinSignals`, `dcAnalysis` — voir `../simulator/resolution.js`)
 * et tout futur consommateur (instrument de mesure, diagnostic,
 * `MB-MEASURE-001`, `MB-OBS-002`). Conformément au ticket et à son
 * blueprint :
 *
 *   Simulation (pinSignals, dcAnalysis)
 *        ↓
 *   Observation Contract  ← ce module
 *        ↓
 *   futurs instruments / diagnostics
 *        ↓
 *   Presentation
 *
 * Ce module ne construit AUCUN instrument utilisateur (§A du ticket) et
 * n'est câblé nulle part dans l'UI par MB-OBS-001 — il expose uniquement
 * le contrat `observe()`.
 *
 * Composition, jamais duplication (§A.3 de l'audit pré-implémentation) :
 * ce module compose `prepareCircuit()` + `resolveSignals()` en lecture
 * seule, exactement comme le fait déjà `simulationRuntimeIntegration.js`
 * (MB-SIM-011/012) pour les mêmes raisons — obtenir `dcAnalysis` et le
 * regroupement par net que `runSimulation()` (engine.js) n'expose pas.
 * AUCUNE modification de `preparation.js`, `resolution.js`, `engine.js` ou
 * `canonicalRegistry.js` n'est nécessaire ni effectuée : ces trois fonctions
 * sont uniquement consultées via leurs exports publics déjà existants.
 *
 * Non-mutation du Document (AC-09) : ce fichier n'importe rien de `core/`
 * (CommandBus, ValidationEngine, HistoryService, Handlers) — `observe()`
 * est une fonction pure qui lit `(components, wires)`, ne modifie jamais
 * son entrée, et ne persiste rien.
 *
 * Aucune nouvelle horloge (AC-08) : ce fichier n'importe ni `clock.js`, ni
 * `scheduler.js`, ni `runtimeOrchestrator.js`, ni
 * `simulationRuntimeIntegration.js`. `time` est un champ de la requête,
 * fourni par l'appelant (§F du ticket : « time is simulation time for an
 * instantaneous observation ») — Observation ne source ni n'interprète
 * jamais elle-même le temps, elle se contente de le restituer tel quel
 * dans le résultat.
 */

/** Statuts de résultat (§H du ticket). */
export const ObservationStatus = Object.freeze({
  VALID: "VALID",
  UNAVAILABLE: "UNAVAILABLE",
  INVALID: "INVALID",
})

/** Cibles supportées en V1 (§C du ticket). COMPONENT/BRANCH sont des
 * concepts futurs, explicitement non requis par MB-OBS-001. */
export const ObservationTargetKind = Object.freeze({
  PIN: "PIN",
  NET: "NET",
})

/** Grandeurs supportées en V1 (§C du ticket). */
export const ObservationQuantity = Object.freeze({
  LOGICAL_STATE: "LOGICAL_STATE",
  VOLTAGE: "VOLTAGE",
  CURRENT: "CURRENT",
})

const ObservationUnit = Object.freeze({
  LOGICAL_STATE: "LOGIC",
  VOLTAGE: "V",
  CURRENT: "A",
})

function unitFor(quantity) {
  return ObservationUnit[quantity] ?? null
}

/**
 * Construit un ObservationResult conforme au contrat (§G du ticket) :
 * target, quantity, value, unit, time, status, reason?
 * `reason` n'est présent que si explicitement fourni (jamais une chaîne
 * vide) — un résultat VALID n'a jamais de `reason`.
 */
function buildResult({ request, status, value = null, unit = null, reason }) {
  const result = {
    target: request?.target ?? null,
    quantity: request?.quantity ?? null,
    value,
    unit,
    time: typeof request?.time === "number" ? request.time : null,
    status,
  }
  if (reason) result.reason = reason
  return result
}

function isWellFormedRequest(request) {
  return Boolean(
    request &&
    typeof request === "object" &&
    request.target &&
    typeof request.target === "object" &&
    typeof request.target.kind === "string" &&
    typeof request.target.componentUid === "string" &&
    typeof request.target.pinId === "string" &&
    typeof request.quantity === "string" &&
    typeof request.time === "number" &&
    Number.isFinite(request.time)
  )
}

/**
 * Résout une observation PIN pour LOGICAL_STATE. Toujours VALID dès lors
 * que le pin existe : `resolveSignals()` assigne systématiquement un
 * `Signal` (potentiellement `UNKNOWN`) à chaque pin réel du circuit — il
 * n'existe donc jamais d'« absence » de résultat logique pour un pin
 * valide, seulement une valeur `UNKNOWN` légitime.
 */
function observePinLogicalState(request, pinKey, pinSignals) {
  const value = pinSignals.get(pinKey)
  return buildResult({ request, status: ObservationStatus.VALID, value, unit: unitFor(ObservationQuantity.LOGICAL_STATE) })
}

/**
 * Résout une observation PIN pour VOLTAGE ou CURRENT.
 *
 * `dcAnalysis` (produit par `computeDcAnalysis()`, resolution.js) est
 * indexé par composant, jamais par pin : la valeur retournée pour VOLTAGE
 * est donc, telle qu'elle existe déjà dans le modèle, la tension
 * d'alimentation (`supplyVoltage`) — jamais un potentiel de nœud calculé
 * différemment par pin (le modèle actuel ne le calcule pas ; en inventer un
 * violerait l'interdiction de nouvelle équation physique). Documenté
 * explicitement dans le Delivery Report (§ Écarts).
 *
 * Pour CURRENT, la convention existante (magnitude non signée, jamais de
 * direction) est préservée telle quelle — aucune convention n'est inventée
 * ici. Pour un composant à plus de deux bornes (NPN_TRANSISTOR,
 * POTENTIOMETER), `dcAnalysis` ne porte qu'une seule valeur de courant pour
 * le composant entier, ambiguë par rapport à un pin particulier : V1 ne
 * devine jamais laquelle s'applique à quel pin et retourne `UNAVAILABLE`.
 */
function observePinElectrical(request, quantity, comp, dcAnalysis) {
  const contribution = dcAnalysis.get(comp.uid)

  if (!contribution) {
    return buildResult({
      request,
      status: ObservationStatus.UNAVAILABLE,
      unit: unitFor(quantity),
      reason: `no canonical ${quantity} is currently produced for component type "${comp.type}" in the current circuit state`,
    })
  }

  if (quantity === ObservationQuantity.VOLTAGE) {
    return buildResult({ request, status: ObservationStatus.VALID, value: contribution.voltage, unit: unitFor(ObservationQuantity.VOLTAGE) })
  }

  // CURRENT
  const entry = getCanonicalEntry(comp.type)
  const terminalCount = Array.isArray(entry?.pins) ? entry.pins.length : null
  if (terminalCount !== 2) {
    return buildResult({
      request,
      status: ObservationStatus.UNAVAILABLE,
      unit: unitFor(ObservationQuantity.CURRENT),
      reason: `current is defined at the whole-component level for multi-terminal component type "${comp.type}" (${terminalCount ?? "unknown"} pins); no unambiguous per-pin current exists in V1`,
    })
  }

  return buildResult({ request, status: ObservationStatus.VALID, value: contribution.current, unit: unitFor(ObservationQuantity.CURRENT) })
}

/**
 * Résout une observation NET. Seul LOGICAL_STATE est supporté en V1 (§C du
 * ticket : « NET is supported only where the current model exposes an
 * unambiguous net-level value ») — `dcAnalysis` étant indexé par composant
 * et non par net, aucune valeur de tension/courant de net n'existe dans le
 * modèle actuel ; l'inventer par agrégation violerait l'interdiction
 * d'arithmétique ad-hoc (§11 du blueprint).
 *
 * Même pour LOGICAL_STATE, l'uniformité du net n'est jamais supposée : elle
 * est vérifiée. `propagate()`/`propagatePassiveConduction()` (resolution.js)
 * assignent en général la même valeur à tous les membres d'un net, mais le
 * repli FLOATING d'ARDUINO (D2/D3) écrit un pin individuellement, sans
 * repasser par la propagation de net — un net contenant un tel pin peut
 * donc, dans certains circuits, ne pas être uniforme. Ce cas retourne
 * `UNAVAILABLE`, jamais une valeur choisie arbitrairement parmi les
 * membres.
 */
function observeNetLogicalState(request, pinKey, prepared, pinSignals) {
  const root = prepared.uf.find(pinKey)
  const members = prepared.nets.get(root) ?? [pinKey]

  const values = new Set(members.map((key) => pinSignals.get(key)))
  if (values.size !== 1) {
    return buildResult({
      request,
      status: ObservationStatus.UNAVAILABLE,
      unit: unitFor(ObservationQuantity.LOGICAL_STATE),
      reason: "the net containing this pin does not currently resolve to a single unambiguous logical state",
    })
  }

  const [value] = values
  return buildResult({ request, status: ObservationStatus.VALID, value, unit: unitFor(ObservationQuantity.LOGICAL_STATE) })
}

/**
 * Point d'entrée public unique de l'Observation Contract (AC-01).
 *
 * @param {{ target: { kind: "PIN"|"NET", componentUid: string, pinId: string }, quantity: "LOGICAL_STATE"|"VOLTAGE"|"CURRENT", time: number }} request
 *   `target.pinId` identifie, pour `kind: "NET"`, le net auquel appartient
 *   ce pin (V1 n'introduit pas d'identifiant de net indépendant — un net
 *   n'a pas d'identité stable exposée ailleurs dans le dépôt).
 * @param {Array<{ uid: string, type: string, x: number, y: number, pins?: object }>} components
 * @param {Array<{ fromUid: string, fromPin: string, toUid: string, toPin: string }>} wires
 * @returns {{ target: object, quantity: string, value: *, unit: string|null, time: number|null, status: "VALID"|"UNAVAILABLE"|"INVALID", reason?: string }}
 */
export function observe(request, components, wires) {
  if (!isWellFormedRequest(request)) {
    return buildResult({
      request: request && typeof request === "object" ? request : {},
      status: ObservationStatus.INVALID,
      reason: "malformed observation request: target.kind, target.componentUid, target.pinId, quantity (strings) and a finite time (number) are required",
    })
  }

  const { target, quantity } = request

  if (target.kind !== ObservationTargetKind.PIN && target.kind !== ObservationTargetKind.NET) {
    return buildResult({
      request,
      status: ObservationStatus.INVALID,
      reason: `unsupported target kind "${target.kind}": MB-OBS-001 V1 supports only PIN and NET`,
    })
  }

  if (
    quantity !== ObservationQuantity.LOGICAL_STATE &&
    quantity !== ObservationQuantity.VOLTAGE &&
    quantity !== ObservationQuantity.CURRENT
  ) {
    return buildResult({
      request,
      status: ObservationStatus.INVALID,
      reason: `unsupported quantity "${quantity}": MB-OBS-001 V1 supports only LOGICAL_STATE, VOLTAGE, CURRENT`,
    })
  }

  if (!Array.isArray(components) || !Array.isArray(wires)) {
    return buildResult({
      request,
      status: ObservationStatus.INVALID,
      reason: "malformed circuit context: components and wires arrays are required",
    })
  }

  const prepared = prepareCircuit(components, wires)
  const pinKey = prepared.uf.key(target.componentUid, target.pinId)
  const validKeys = new Set(prepared.allKeys)

  if (!validKeys.has(pinKey)) {
    return buildResult({
      request,
      status: ObservationStatus.INVALID,
      reason: `unknown target: no pin "${target.pinId}" on component "${target.componentUid}" in the current circuit`,
    })
  }

  const { pinSignals, dcAnalysis } = resolveSignals(components, prepared)

  if (target.kind === ObservationTargetKind.NET) {
    if (quantity !== ObservationQuantity.LOGICAL_STATE) {
      return buildResult({
        request,
        status: ObservationStatus.UNAVAILABLE,
        unit: unitFor(quantity),
        reason: `NET target does not provide an unambiguous ${quantity} value in V1 (only LOGICAL_STATE is supported at NET granularity)`,
      })
    }
    return observeNetLogicalState(request, pinKey, prepared, pinSignals)
  }

  // target.kind === PIN
  if (quantity === ObservationQuantity.LOGICAL_STATE) {
    return observePinLogicalState(request, pinKey, pinSignals)
  }

  const comp = components.find((c) => c && c.uid === target.componentUid)
  // Défensif : le pin a déjà été validé comme réel (validKeys), donc `comp`
  // devrait toujours exister ici ; conservé pour ne jamais throw sur une
  // incohérence de données inattendue plutôt que de renvoyer un résultat
  // silencieusement approximé.
  if (!comp) {
    return buildResult({
      request,
      status: ObservationStatus.INVALID,
      reason: "unknown target: component not found in the current circuit",
    })
  }

  return observePinElectrical(request, quantity, comp, dcAnalysis)
}
