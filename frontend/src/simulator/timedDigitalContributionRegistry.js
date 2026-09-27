/**
 * A7-C5-PREQ — Generic Timed Digital Output Runtime : Registry.
 *
 * Sibling registry to `digitalContributionRegistry.js` (A7-C3-PREQ), same
 * Open/Closed principle, but for STATEFUL, TIME-DEPENDENT digital producers
 * instead of stateless/synchronous ones : an association `type de composant
 * -> fonction qui reçoit le temps simulé courant et son propre état privé du
 * step précédent, et retourne zéro ou plusieurs sorties Signal.HIGH/LOW pour
 * ses propres pins, ainsi que son nouvel état privé`. Adding a future timed
 * producer (e.g. a component whose output depends on an elapsed simulated
 * duration) is done by adding ONE declarative entry here, never by modifying
 * a generic engine file (composition in `simulationRuntimeIntegration.js`,
 * resolution in `resolution.js` — both unmodified by this file).
 *
 * A7-C5-PREQ built ONLY the generic mechanism (production table
 * intentionally empty). A7-C5 (this ticket) registers the FIRST real
 * producer : HC_SR04 (ultrasonic distance sensor, TRIG -> ECHO timed
 * behaviour, see `hcSr04TimedDigital` below).
 *
 * Contrat d'une fonction de contribution temporelle :
 *
 *   ({ component, pins, params, pinSignals, currentTimeMs, previousState })
 *     => { state, outputs: Map<pinId, Signal> | null }
 *
 * - `component` : le composant EFFECTIF (post applyEnvironmentalStimuli),
 *   tel que reçu par la composition — jamais muté ici.
 * - `pins` : `component.pins` (définitions de pins persistantes de
 *   l'instance) — PAS un état de signal résolu.
 * - `params` : paramètres EFFECTIFS résolus (`resolveComponentParameters`,
 *   mêmes defaults canoniques + overrides d'instance validés que
 *   `digitalContributionRegistry.js`).
 * - `pinSignals` : `{ pinId: Signal }`, les propres pins du composant
 *   PRÉ-résolues UNIQUEMENT depuis les sources DC et la topologie physique
 *   (`resolveSourceDrivenPinSignals`, resolution.js — même primitive que
 *   `digitalContributionRegistry.js`, AVANT toute conduction passive, sortie
 *   numérique calculée, Runtime ou résolution complète) — jamais lu
 *   directement depuis un wire/DOM/Canvas.
 *   A9-SEQ-PREQ : dans `runSimulationWithRuntime`, ce contexte est le
 *   contexte d'ÉCHANTILLONNAGE du step : il inclut en plus les autorités
 *   Runtime courantes, les sorties timed MAINTENUES du step précédent et les
 *   sorties combinatoires qu'elles pilotent — jamais les nouvelles sorties
 *   timed du step courant (tous les producteurs échantillonnent le même
 *   contexte). Sans ces autorités, il reste identique au contexte historique.
 *   UNKNOWN/FLOATING sont transmis tels quels, jamais convertis.
 * - `currentTimeMs` : temps simulé courant, tel que retourné par le
 *   Scheduler partagé (scheduler.js — seule source de temps, voir
 *   `simulationRuntimeIntegration.js`). Un producteur ne possède jamais sa
 *   propre horloge et ne doit jamais reconstruire ce temps par accumulation
 *   indépendante de dt : `currentTimeMs` reste la référence absolue à
 *   chaque appel.
 * - `previousState` : état privé RUNTIME (volatile) retourné par ce même
 *   producteur au step précédent pour ce composant (`undefined` au premier
 *   step, ou après un reset/suppression du composant) — jamais lu depuis ni
 *   écrit dans le Document, `component.parameters`, History, Undo/Redo ou
 *   `canonicalRegistry.js`.
 * - Retour : un objet `{ state, outputs }`.
 *   - `state` : nouvel état privé à persister pour le prochain step (peut
 *     être `undefined`) — vit exclusivement dans le store runtime fourni par
 *     l'appelant (voir `computeTimedDigitalSignals`,
 *     `simulationRuntimeIntegration.js`), jamais dans le Document.
 *   - `outputs` : soit `null`/absence de sortie (rien à produire pour cet
 *     appel), soit une `Map<pinId, Signal>` — jamais un objet plain, même
 *     convention que `digitalContributionRegistry.js`.
 *
 * Aucun accès React/Canvas/Document/DOM/wires/breadboard ici, et aucune
 * horloge système (Date.now/performance.now/setTimeout/setInterval/
 * requestAnimationFrame) — cette fonction est synchrone et déterministe,
 * pilotée exclusivement par `currentTimeMs` et `previousState`.
 *
 * @typedef {(ctx: {
 *   component: object,
 *   pins: Array<object>,
 *   params: Record<string, number>,
 *   pinSignals: Record<string, string>,
 *   currentTimeMs: number,
 *   previousState: object | undefined,
 * }) => { state: object | undefined, outputs: Map<string, string> | null }} TimedDigitalContributionFn
 */

import { Signal } from "./signals.js"

/**
 * A7-C5 — HC_SR04 : durée ECHO par centimètre de distance (§16 du ticket),
 * approximation standard aller-retour du son :
 *
 *   echoDurationMs ≈ distanceCm × 0.058
 *
 * (2 cm -> ~0.116 ms ; 100 cm -> ~5.8 ms ; 400 cm -> ~23.2 ms). Cette
 * constante ne vit QUE dans le modèle HC_SR04 — jamais dans Scheduler,
 * jamais dans un fichier générique.
 */
const HC_SR04_ECHO_MS_PER_CM = 0.058

/**
 * État runtime initial déterministe (§17/§27 du ticket) : IDLE, aucun front
 * TRIG observé, aucune deadline ECHO en cours.
 */
function initialHcSr04State() {
  return { phase: "IDLE", previousTrig: Signal.UNKNOWN, echoEndMs: null }
}

/**
 * A7-C5 — HC_SR04 : sortie temporelle ECHO (§14 à §20 du ticket).
 *
 * Garde d'alimentation obligatoire (même patron exact que
 * `pirMotionSensorDigital`/`irReceiverDigital`, digitalContributionRegistry.js
 * — aucune seconde résolution, aucune branche HC_SR04 dans
 * resolution.js/simulationRuntimeIntegration.js) : un module non alimenté,
 * en polarité inversée, ou dont la source est en conflit ne produit jamais
 * de ECHO (pinSignals.VCC/GND ne sont jamais HIGH/LOW simultanément dans ces
 * trois cas). L'état privé est alors simplement PRÉSERVÉ tel quel (aucune
 * observation possible tant que le module n'est pas alimenté) — §19 du
 * ticket : absence de contribution, jamais un LOW inventé.
 *
 * Machine d'état à 2 phases (§17 du ticket) :
 *
 *   IDLE --front TRIG LOW->HIGH--> MEASURING --currentTimeMs>=echoEndMs--> IDLE
 *
 * Un front n'est détecté QUE depuis IDLE (`previousState.previousTrig !==
 * HIGH && pinSignals.TRIG === HIGH`) : TRIG maintenu HIGH ne redéclenche
 * jamais tant que la mesure en cours n'est pas terminée (§15 du ticket,
 * TD-26-style non-régression), et un retour LOW réarme naturellement le
 * front suivant (§15 : "retour LOW réarme correctement") — aucun compteur
 * de frame, uniquement `previousTrig` + `phase`, tous deux dans l'état
 * volatile retourné, jamais reconstruits par une horloge propre.
 *
 * echoEndMs est calculé UNE SEULE FOIS par front, à partir du
 * `params.distanceCm` EFFECTIF observé à cet instant (§38 : une nouvelle
 * mesure utilise la nouvelle DISTANCE effective) et de `currentTimeMs`
 * (jamais un accumulateur local) — préserve les fractions de milliseconde
 * (§18 du ticket, aucune quantification à SIMULATION_STEP_MS).
 */
function hcSr04TimedDigital({ params, pinSignals, currentTimeMs, previousState }) {
  if (pinSignals.VCC !== Signal.HIGH || pinSignals.GND !== Signal.LOW) {
    return { state: previousState, outputs: null }
  }

  const previous = previousState ?? initialHcSr04State()
  const trig = pinSignals.TRIG
  let { phase, echoEndMs } = previous

  if (phase === "IDLE" && previous.previousTrig !== Signal.HIGH && trig === Signal.HIGH) {
    phase = "MEASURING"
    echoEndMs = currentTimeMs + params.distanceCm * HC_SR04_ECHO_MS_PER_CM
  } else if (phase === "MEASURING" && currentTimeMs >= echoEndMs) {
    phase = "IDLE"
  }

  const echo = phase === "MEASURING" && currentTimeMs < echoEndMs ? Signal.HIGH : Signal.LOW

  return {
    state: { phase, previousTrig: trig, echoEndMs },
    outputs: new Map([["ECHO", echo]]),
  }
}

/**
 * A9-JK1 — 74HC73 : double bascule J-K, deux canaux INDÉPENDANTS (broches
 * nJ/nK/nCP/nR -> nQ/nNQ). Premier producteur SÉQUENTIEL réel du contrat
 * A9-SEQ-PREQ/PREQ2 : `currentTimeMs` n'est pas utilisé (aucune durée), le
 * mécanisme timed sert uniquement à l'état privé inter-step et à la
 * détection de front sur le contexte d'échantillonnage du step.
 */
const JK_74HC73_CHANNELS = Object.freeze([
  Object.freeze({ key: "channel1", j: "1J", k: "1K", clock: "1CP", reset: "1R", q: "1Q", nq: "1NQ" }),
  Object.freeze({ key: "channel2", j: "2J", k: "2K", clock: "2CP", reset: "2R", q: "2Q", nq: "2NQ" }),
])

const isDecisive = (level) => level === Signal.HIGH || level === Signal.LOW
const complement = (level) => (level === Signal.HIGH ? Signal.LOW : level === Signal.LOW ? Signal.HIGH : Signal.UNKNOWN)

/**
 * État initial (§14 du ticket) : Q indéterminé, aucun niveau d'horloge
 * observé. Un Q=LOW n'est jamais inventé au démarrage.
 */
function initialJkChannelState() {
  return { q: Signal.UNKNOWN, previousClock: Signal.UNKNOWN }
}

/** Table J-K au front descendant pour J/K décisifs (HOLD/RESET/SET/TOGGLE). */
function jkNext(j, k, q) {
  if (j === Signal.LOW && k === Signal.LOW) return q
  if (j === Signal.LOW && k === Signal.HIGH) return Signal.LOW
  if (j === Signal.HIGH && k === Signal.LOW) return Signal.HIGH
  return complement(q)
}

/**
 * Prochain Q au front descendant. J/K UNKNOWN/FLOATING ne sont jamais
 * convertis : on évalue la table pour CHAQUE niveau possible de l'entrée
 * indéterminée ; Q n'est déterminé que si toutes les branches concordent
 * (même principe « valeur décisive » que andGateDigital/orGateDigital,
 * digitalContributionRegistry.js), sinon Q devient UNKNOWN.
 */
function jkNextAtFallingEdge(j, k, q) {
  const js = isDecisive(j) ? [j] : [Signal.LOW, Signal.HIGH]
  const ks = isDecisive(k) ? [k] : [Signal.LOW, Signal.HIGH]
  const outcomes = new Set()
  for (const jj of js) for (const kk of ks) outcomes.add(jkNext(jj, kk, q))
  if (outcomes.size !== 1) return Signal.UNKNOWN
  const [only] = outcomes
  return isDecisive(only) ? only : Signal.UNKNOWN
}

/**
 * Un canal : reset asynchrone actif LOW prioritaire (§9), puis front
 * descendant strict previousClock HIGH -> clock LOW (§10). UNKNOWN/FLOATING
 * sur l'horloge ne sont jamais un front. Un reset indéterminé ne laisse Q
 * déterminé que si le résultat hors reset est déjà LOW (même valeur que le
 * reset), sinon Q devient UNKNOWN.
 */
function jkChannelStep(channel, pinSignals, previous) {
  const clock = pinSignals[channel.clock]
  const reset = pinSignals[channel.reset]
  if (reset === Signal.LOW) return { q: Signal.LOW, previousClock: clock }

  const fallingEdge = previous.previousClock === Signal.HIGH && clock === Signal.LOW
  const clocked = fallingEdge ? jkNextAtFallingEdge(pinSignals[channel.j], pinSignals[channel.k], previous.q) : previous.q
  if (reset === Signal.HIGH) return { q: clocked, previousClock: clock }
  return { q: clocked === Signal.LOW ? Signal.LOW : Signal.UNKNOWN, previousClock: clock }
}

/**
 * A9-JK1 — 74HC73 : contribution timed/stateful.
 *
 * Garde d'alimentation (§8, même patron que `hcSr04TimedDigital`) : sans
 * VCC HIGH et GND LOW, aucune sortie (`outputs = null`, jamais un LOW
 * inventé). Un circuit non alimenté ne mémorise rien : l'état privé revient
 * à l'état initial (Q UNKNOWN), de sorte qu'une remise sous tension ne
 * restitue jamais un Q fantôme.
 *
 * État privé (volatile, store runtime PREQ2 uniquement, jamais le Document) :
 *   { channel1: { q, previousClock }, channel2: { q, previousClock } }
 *
 * Sorties : pour chaque canal dont Q est déterminé, nQ = Q et nNQ = NOT Q ;
 * un Q UNKNOWN ne pilote ni nQ ni nNQ (la résolution générique préserve
 * UNKNOWN). `null` si aucun canal n'est déterminé.
 */
function jkFlipFlop74HC73TimedDigital({ pinSignals, previousState }) {
  if (pinSignals.VCC !== Signal.HIGH || pinSignals.GND !== Signal.LOW) {
    return {
      state: { channel1: initialJkChannelState(), channel2: initialJkChannelState() },
      outputs: null,
    }
  }

  const state = {}
  const outputs = new Map()
  for (const channel of JK_74HC73_CHANNELS) {
    const next = jkChannelStep(channel, pinSignals, previousState?.[channel.key] ?? initialJkChannelState())
    state[channel.key] = next
    if (isDecisive(next.q)) {
      outputs.set(channel.q, next.q)
      outputs.set(channel.nq, complement(next.q))
    }
  }
  return { state, outputs: outputs.size > 0 ? outputs : null }
}

/**
 * A9-DFF1 — 74HC74 : double bascule D à front MONTANT, deux canaux
 * INDÉPENDANTS (broches nD/nCLK/nPRE/nCLR -> nQ/nNQ). Même contrat
 * A9-SEQ-PREQ/PREQ2 que le 74HC73 : `currentTimeMs` n'est pas utilisé, le
 * mécanisme timed sert uniquement à l'état privé inter-step et à la
 * détection de front sur le contexte d'échantillonnage du step.
 */
const D_74HC74_CHANNELS = Object.freeze([
  Object.freeze({ key: "channel1", d: "1D", clock: "1CLK", preset: "1PRE", clear: "1CLR", q: "1Q", nq: "1NQ" }),
  Object.freeze({ key: "channel2", d: "2D", clock: "2CLK", preset: "2PRE", clear: "2CLR", q: "2Q", nq: "2NQ" }),
])

/** Niveaux possibles d'une entrée : elle-même si décisive, sinon LOW et HIGH (jamais coercée). */
const possibleLevels = (level) => (isDecisive(level) ? [level] : [Signal.LOW, Signal.HIGH])

/** Valeur commune à toutes les interprétations si elle est décisive, sinon UNKNOWN. */
function agreedLevel(levels) {
  const distinct = new Set(levels)
  if (distinct.size !== 1) return Signal.UNKNOWN
  const [only] = distinct
  return isDecisive(only) ? only : Signal.UNKNOWN
}

/**
 * Une interprétation décisive (PRE, CLR, D) d'un canal : PRE/CLR asynchrones
 * actifs LOW prioritaires sur l'horloge ; PRE=CLR=LOW (condition non normale
 * du 74HC74) force Q=HIGH ET NQ=HIGH et laisse la mémoire UNKNOWN, de sorte
 * que sa libération ne restitue aucun Q déterminé ; sinon capture de D au
 * front montant, HOLD en l'absence de front.
 */
function dInterpretation(preset, clear, d, risingEdge, q) {
  if (preset === Signal.LOW && clear === Signal.LOW) return { q: Signal.UNKNOWN, outQ: Signal.HIGH, outNQ: Signal.HIGH }
  if (preset === Signal.LOW) return { q: Signal.HIGH, outQ: Signal.HIGH, outNQ: Signal.LOW }
  if (clear === Signal.LOW) return { q: Signal.LOW, outQ: Signal.LOW, outNQ: Signal.HIGH }
  const next = risingEdge ? d : q
  return { q: next, outQ: next, outNQ: complement(next) }
}

/**
 * Un canal : front montant strict previousClock LOW -> clock HIGH ;
 * UNKNOWN/FLOATING sur l'horloge ne sont jamais un front. PRE/CLR/D
 * indéterminés ne sont jamais convertis : chaque sortie (et la mémoire) n'est
 * déterminée que si toutes leurs interprétations possibles concordent.
 */
function dChannelStep(channel, pinSignals, previous) {
  const clock = pinSignals[channel.clock]
  const risingEdge = previous.previousClock === Signal.LOW && clock === Signal.HIGH
  const outcomes = []
  for (const preset of possibleLevels(pinSignals[channel.preset])) {
    for (const clear of possibleLevels(pinSignals[channel.clear])) {
      for (const d of risingEdge ? possibleLevels(pinSignals[channel.d]) : [Signal.UNKNOWN]) {
        outcomes.push(dInterpretation(preset, clear, d, risingEdge, previous.q))
      }
    }
  }
  return {
    state: { q: agreedLevel(outcomes.map((o) => o.q)), previousClock: clock },
    outQ: agreedLevel(outcomes.map((o) => o.outQ)),
    outNQ: agreedLevel(outcomes.map((o) => o.outNQ)),
  }
}

/** État initial : Q indéterminé, aucun niveau d'horloge observé. */
function initialDChannelState() {
  return { q: Signal.UNKNOWN, previousClock: Signal.UNKNOWN }
}

/**
 * A9-DFF1 — 74HC74 : contribution timed/stateful.
 *
 * Garde d'alimentation (même patron que le 74HC73) : sans VCC HIGH et GND
 * LOW, `outputs = null` et l'état privé revient à l'état initial (Q UNKNOWN).
 *
 * État privé (volatile, store runtime PREQ2 uniquement, jamais le Document) :
 *   { channel1: { q, previousClock }, channel2: { q, previousClock } }
 *
 * Sorties : nQ / nNQ pilotées indépendamment, chacune seulement si elle est
 * déterminée (NQ = NOT Q hors condition PRE=CLR=LOW, où Q = NQ = HIGH).
 */
function dFlipFlop74HC74TimedDigital({ pinSignals, previousState }) {
  if (pinSignals.VCC !== Signal.HIGH || pinSignals.GND !== Signal.LOW) {
    return {
      state: { channel1: initialDChannelState(), channel2: initialDChannelState() },
      outputs: null,
    }
  }

  const state = {}
  const outputs = new Map()
  for (const channel of D_74HC74_CHANNELS) {
    const next = dChannelStep(channel, pinSignals, previousState?.[channel.key] ?? initialDChannelState())
    state[channel.key] = next.state
    if (isDecisive(next.outQ)) outputs.set(channel.q, next.outQ)
    if (isDecisive(next.outNQ)) outputs.set(channel.nq, next.outNQ)
  }
  return { state, outputs: outputs.size > 0 ? outputs : null }
}

/**
 * A9-COUNTER1 — 74HC161 : compteur binaire SYNCHRONE 4 bits à front MONTANT,
 * chargement parallèle synchrone (PE actif LOW), validations CEP/CET, reset
 * MR ASYNCHRONE actif LOW. Même contrat A9-SEQ-PREQ/PREQ2 que 74HC73/74HC74 :
 * `currentTimeMs` n'est pas utilisé, le mécanisme timed sert uniquement à
 * l'état privé inter-step et à la détection de front sur le contexte
 * d'échantillonnage du step. Bits LSB d'abord : Q0 est le poids 1, Q3 le
 * poids 8 ; D0..D3 correspondent un à un.
 */
const COUNTER_74HC161_Q = Object.freeze(["Q0", "Q1", "Q2", "Q3"])
const COUNTER_74HC161_D = Object.freeze(["D0", "D1", "D2", "D3"])

/** Mots 0..15 compatibles avec des bits (LSB d'abord) : chaque bit indéterminé couvre LOW et HIGH. */
function possibleWords(bits) {
  let words = [0]
  bits.forEach((bit, i) => {
    words = words.flatMap((word) => possibleLevels(bit).map((level) => (level === Signal.HIGH ? word | (1 << i) : word)))
  })
  return words
}

const wordBit = (word, i) => ((word >> i) & 1 ? Signal.HIGH : Signal.LOW)

/**
 * Une interprétation décisive (MR, PE, CEP, CET, D) : MR LOW efface
 * immédiatement, sans front et avant tout le reste ; sans front montant le
 * mot est conservé ; au front, PE LOW charge D (indépendamment de CEP/CET),
 * sinon CEP ET CET HIGH incrémentent modulo 16, sinon HOLD.
 */
function counterNextWord(mr, pe, cep, cet, d, risingEdge, word) {
  if (mr === Signal.LOW) return 0
  if (!risingEdge) return word
  if (pe === Signal.LOW) return d
  if (cep === Signal.HIGH && cet === Signal.HIGH) return (word + 1) & 0xf
  return word
}

/**
 * Pas d'horloge : front montant strict previousClock LOW -> CP HIGH ;
 * UNKNOWN/FLOATING sur CP ne sont jamais un front. MR/PE/CEP/CET/D et les
 * bits mémorisés indéterminés ne sont jamais convertis : chaque bit n'est
 * déterminé que si toutes les interprétations possibles concordent, sinon
 * il devient UNKNOWN. Sans front, seul MR est pertinent.
 */
function counterStep(pinSignals, previous) {
  const clock = pinSignals.CP
  const risingEdge = previous.previousClock === Signal.LOW && clock === Signal.HIGH
  const onEdge = (level) => (risingEdge ? possibleLevels(level) : [Signal.UNKNOWN])
  const loads = risingEdge ? possibleWords(COUNTER_74HC161_D.map((pin) => pinSignals[pin])) : [0]
  const words = possibleWords(previous.q)
  const outcomes = new Set()
  for (const mr of possibleLevels(pinSignals.MR)) {
    for (const pe of onEdge(pinSignals.PE)) {
      for (const cep of onEdge(pinSignals.CEP)) {
        for (const cet of onEdge(pinSignals.CET)) {
          for (const d of loads) {
            for (const word of words) outcomes.add(counterNextWord(mr, pe, cep, cet, d, risingEdge, word))
          }
        }
      }
    }
  }
  return {
    q: COUNTER_74HC161_Q.map((_, i) => agreedLevel([...outcomes].map((word) => wordBit(word, i)))),
    previousClock: clock,
  }
}

/**
 * TC = CET · Q0 · Q1 · Q2 · Q3, COMBINATOIRE (jamais mémorisé) : CEP ne
 * l'influence pas. Un facteur LOW suffit à le déterminer LOW ; HIGH
 * seulement si tous les facteurs sont HIGH ; sinon UNKNOWN.
 */
function counterTerminalCount(cet, q) {
  const factors = [cet, ...q]
  if (factors.some((level) => level === Signal.LOW)) return Signal.LOW
  return factors.every((level) => level === Signal.HIGH) ? Signal.HIGH : Signal.UNKNOWN
}

/** État initial : quatre bits indéterminés, aucun niveau d'horloge observé (jamais un 0000 inventé). */
function initialCounter74HC161State() {
  return { q: [Signal.UNKNOWN, Signal.UNKNOWN, Signal.UNKNOWN, Signal.UNKNOWN], previousClock: Signal.UNKNOWN }
}

/**
 * A9-COUNTER1 — 74HC161 : contribution timed/stateful.
 *
 * Garde d'alimentation (même patron que 74HC73/74HC74/74HC75) : sans VCC
 * HIGH et GND LOW, `outputs = null` et l'état privé revient à l'état initial.
 *
 * État privé (volatile, store runtime PREQ2 uniquement, jamais le Document) :
 *   { q: [Q0, Q1, Q2, Q3], previousClock } — TC n'y figure pas.
 *
 * Sorties : chaque Qn seulement s'il est déterminé ; TC seulement s'il est
 * déterminé. `null` si aucune sortie n'est déterminée.
 */
function binaryCounter74HC161TimedDigital({ pinSignals, previousState }) {
  if (pinSignals.VCC !== Signal.HIGH || pinSignals.GND !== Signal.LOW) {
    return { state: initialCounter74HC161State(), outputs: null }
  }

  const state = counterStep(pinSignals, previousState ?? initialCounter74HC161State())
  const outputs = new Map()
  COUNTER_74HC161_Q.forEach((pin, i) => {
    if (isDecisive(state.q[i])) outputs.set(pin, state.q[i])
  })
  const tc = counterTerminalCount(pinSignals.CET, state.q)
  if (isDecisive(tc)) outputs.set("TC", tc)
  return { state, outputs: outputs.size > 0 ? outputs : null }
}

/**
 * A9-LATCH1 — 74HC75 : quadruple latch D TRANSPARENT SUR NIVEAU (aucun front),
 * quatre canaux nD -> nQ/nNQ, validation par paires : LE12 pilote les canaux
 * 1/2, LE34 les canaux 3/4. Même contrat A9-SEQ-PREQ/PREQ2 que 74HC73/74HC74 :
 * `currentTimeMs` n'est pas utilisé, le mécanisme timed sert uniquement à la
 * mémoire inter-step (LE LOW) ; aucun niveau d'enable précédent n'est mémorisé.
 */
const LATCH_74HC75_CHANNELS = Object.freeze([
  Object.freeze({ key: "channel1", d: "1D", enable: "LE12", q: "1Q", nq: "1NQ" }),
  Object.freeze({ key: "channel2", d: "2D", enable: "LE12", q: "2Q", nq: "2NQ" }),
  Object.freeze({ key: "channel3", d: "3D", enable: "LE34", q: "3Q", nq: "3NQ" }),
  Object.freeze({ key: "channel4", d: "4D", enable: "LE34", q: "4Q", nq: "4NQ" }),
])

/**
 * Un canal : LE HIGH -> transparent (Q = D) ; LE LOW -> mémoire (Q conservé).
 * LE/D UNKNOWN/FLOATING ne sont jamais convertis : Q n'est déterminé que si
 * toutes les interprétations possibles concordent (même principe que le
 * 74HC74), sinon Q (et la mémoire) devient UNKNOWN.
 */
function latchChannelStep(channel, pinSignals, previousQ) {
  const outcomes = []
  for (const enable of possibleLevels(pinSignals[channel.enable])) {
    if (enable === Signal.LOW) outcomes.push(previousQ)
    else outcomes.push(...possibleLevels(pinSignals[channel.d]))
  }
  return agreedLevel(outcomes)
}

/** État initial : les quatre mémoires sont indéterminées (jamais un LOW inventé). */
function initialLatch74HC75State() {
  return { channel1: { q: Signal.UNKNOWN }, channel2: { q: Signal.UNKNOWN }, channel3: { q: Signal.UNKNOWN }, channel4: { q: Signal.UNKNOWN } }
}

/**
 * A9-LATCH1 — 74HC75 : contribution timed/stateful.
 *
 * Garde d'alimentation (même patron que 74HC73/74HC74) : sans VCC HIGH et
 * GND LOW, `outputs = null` et l'état privé revient à l'état initial.
 *
 * État privé (volatile, store runtime PREQ2 uniquement, jamais le Document) :
 *   { channel1: { q }, channel2: { q }, channel3: { q }, channel4: { q } }
 *
 * Sorties : pour chaque canal dont Q est déterminé, nQ = Q et nNQ = NOT Q ;
 * un Q UNKNOWN ne pilote ni nQ ni nNQ. `null` si aucun canal n'est déterminé.
 */
function dLatch74HC75TimedDigital({ pinSignals, previousState }) {
  if (pinSignals.VCC !== Signal.HIGH || pinSignals.GND !== Signal.LOW) {
    return { state: initialLatch74HC75State(), outputs: null }
  }

  const state = {}
  const outputs = new Map()
  for (const channel of LATCH_74HC75_CHANNELS) {
    const q = latchChannelStep(channel, pinSignals, previousState?.[channel.key]?.q ?? Signal.UNKNOWN)
    state[channel.key] = { q }
    if (isDecisive(q)) {
      outputs.set(channel.q, q)
      outputs.set(channel.nq, complement(q))
    }
  }
  return { state, outputs: outputs.size > 0 ? outputs : null }
}

/**
 * A10-DISP2 — Winstar WH1602B (16x2, 5x8) : contrôleur ST7066U, interface
 * parallèle 6800 en écriture seule (V1). Même contrat A9-SEQ-PREQ/PREQ2 que
 * les producteurs séquentiels ci-dessus, mais AUCUNE sortie : le bus
 * DB0..DB7 n'est jamais piloté (lecture parallèle, busy flag sur DB7 et
 * lecture de l'address counter hors scope). L'état privé retourné est
 * l'UNIQUE vérité du contrôleur (DDRAM comprise) ; la Presentation n'en lit
 * qu'une projection (voir `snapshotTimedDigitalStates`,
 * simulationRuntimeIntegration.js).
 *
 * Temps d'exécution (fiche ST7066U, fosc = 270 kHz) : Clear Display et
 * Return Home 1.52 ms ; toute autre instruction et l'écriture de donnée
 * 37 µs. Mesurés exclusivement sur `currentTimeMs` (Scheduler partagé).
 */
const ST7066U_LONG_EXECUTION_MS = 1.52
const ST7066U_SHORT_EXECUTION_MS = 0.037
const ST7066U_DATA_BUS = Object.freeze(["DB0", "DB1", "DB2", "DB3", "DB4", "DB5", "DB6", "DB7"])
const ST7066U_UPPER_NIBBLE = Object.freeze(["DB4", "DB5", "DB6", "DB7"])
const ST7066U_BLANK = 0x20

/**
 * DDRAM indexée par l'adresse 7 bits (0x00..0x7F). En mode 2 lignes, seules
 * 0x00..0x27 (ligne 1) et 0x40..0x67 (ligne 2) existent ; une écriture
 * ailleurs n'est pas mémorisée. Initialisée à des espaces (0x20).
 */
const ST7066U_BLANK_DDRAM = Object.freeze(new Array(0x80).fill(ST7066U_BLANK))
const isSt7066uDdramAddress = (address) => address <= 0x27 || (address >= 0x40 && address <= 0x67)

/** Address counter après une écriture/un déplacement : ligne 1 et ligne 2 s'enchaînent (0x27 <-> 0x40, 0x67 <-> 0x00). */
function st7066uNextAddress(address, increment) {
  if (increment) return address === 0x27 ? 0x40 : address === 0x67 ? 0x00 : (address + 1) & 0x7f
  return address === 0x40 ? 0x27 : address === 0x00 ? 0x67 : (address - 1) & 0x7f
}

/**
 * État initial déterministe MYBlab : DDRAM en espaces, AC 0x00, incrément,
 * affichage/curseur/clignotement éteints, bus 8 bits, aucun niveau E observé,
 * aucun nibble en attente, contrôleur libre. `ramTarget` indique la RAM visée
 * par les écritures de donnée (DDRAM, ou CGRAM après Set CGRAM Address — le
 * contenu CGRAM n'est pas modélisé : ces écritures ne touchent jamais la DDRAM).
 */
const ST7066U_INITIAL_STATE = Object.freeze({
  ddram: ST7066U_BLANK_DDRAM,
  addressCounter: 0x00,
  entryIncrement: true,
  displayOn: false,
  cursorOn: false,
  blinkOn: false,
  dataLength: 8,
  ramTarget: "DDRAM",
  previousE: Signal.UNKNOWN,
  pendingNibble: null,
  busyUntilMs: 0,
})

/**
 * Décodage d'un octet complet (RS décisif) en opération. N/F du Function Set
 * sont reçus mais ignorés (le matériel reste WH1602B 16x2 5x8) ; le bit S de
 * l'Entry Mode (décalage automatique de l'affichage) et le Display Shift ne
 * sont pas modélisés en V1 (opération acceptée, sans effet).
 */
function decodeSt7066uOperation(rs, byte) {
  if (rs === Signal.HIGH) return { kind: "WRITE_DATA", code: byte }
  if (byte & 0x80) return { kind: "SET_DDRAM_ADDRESS", address: byte & 0x7f }
  if (byte & 0x40) return { kind: "SET_CGRAM_ADDRESS" }
  if (byte & 0x20) return { kind: "FUNCTION_SET", dataLength: byte & 0x10 ? 8 : 4 }
  if (byte & 0x10) return byte & 0x08 ? { kind: "DISPLAY_SHIFT" } : { kind: "CURSOR_SHIFT", right: (byte & 0x04) !== 0 }
  if (byte & 0x08) return { kind: "DISPLAY_CONTROL", displayOn: (byte & 0x04) !== 0, cursorOn: (byte & 0x02) !== 0, blinkOn: (byte & 0x01) !== 0 }
  if (byte & 0x04) return { kind: "ENTRY_MODE", entryIncrement: (byte & 0x02) !== 0 }
  if (byte & 0x02) return { kind: "RETURN_HOME" }
  if (byte & 0x01) return { kind: "CLEAR_DISPLAY" }
  return { kind: "NONE" }
}

/** Champs d'état modifiés par une opération (jamais de mutation de `state`). */
function executeSt7066uOperation(state, op) {
  switch (op.kind) {
    case "CLEAR_DISPLAY":
      return { ddram: ST7066U_BLANK_DDRAM, addressCounter: 0x00, entryIncrement: true, ramTarget: "DDRAM" }
    case "RETURN_HOME":
      return { addressCounter: 0x00, ramTarget: "DDRAM" }
    case "ENTRY_MODE":
      return { entryIncrement: op.entryIncrement }
    case "DISPLAY_CONTROL":
      return { displayOn: op.displayOn, cursorOn: op.cursorOn, blinkOn: op.blinkOn }
    case "CURSOR_SHIFT":
      return { addressCounter: st7066uNextAddress(state.addressCounter, op.right) }
    case "FUNCTION_SET":
      return { dataLength: op.dataLength }
    case "SET_CGRAM_ADDRESS":
      return { ramTarget: "CGRAM" }
    case "SET_DDRAM_ADDRESS":
      return { addressCounter: op.address, ramTarget: "DDRAM" }
    case "WRITE_DATA": {
      if (state.ramTarget !== "DDRAM") return {}
      const address = state.addressCounter
      let ddram = state.ddram
      if (isSt7066uDdramAddress(address)) {
        ddram = [...state.ddram]
        ddram[address] = op.code
        ddram = Object.freeze(ddram)
      }
      return { ddram, addressCounter: st7066uNextAddress(address, state.entryIncrement) }
    }
    default:
      return {}
  }
}

const st7066uExecutionMs = (op) =>
  op.kind === "CLEAR_DISPLAY" || op.kind === "RETURN_HOME" ? ST7066U_LONG_EXECUTION_MS : ST7066U_SHORT_EXECUTION_MS

/**
 * Octet complet : DB bits indéterminés jamais convertis — chaque octet
 * possible est décodé et l'opération n'est exécutée que si TOUTES les
 * interprétations donnent la même opération (ex. Function Set 8 bits reçu
 * avec DB0..DB3 flottants). Sinon la transaction est indéterminée : aucune
 * commande, aucune donnée, contrôleur non occupé.
 */
function st7066uCompleteTransaction(state, rs, bytes, currentTimeMs) {
  const operations = new Map(bytes.map((byte) => {
    const op = decodeSt7066uOperation(rs, byte)
    return [JSON.stringify(op), op]
  }))
  if (operations.size !== 1) return {}
  const [op] = operations.values()
  return { ...executeSt7066uOperation(state, op), busyUntilMs: currentTimeMs + st7066uExecutionMs(op) }
}

/**
 * Une transaction d'écriture acceptée au front descendant de E. R/W HIGH
 * (lecture, hors scope V1) n'écrit rien ; R/W ou RS indéterminés ne
 * produisent aucune transaction. Dans les deux cas une séquence 4 bits en
 * cours est rompue (aucun octet fabriqué). En 4 bits, le premier front
 * mémorise le nibble haut (DB7..DB4) avec son RS ; le second, avec le même
 * RS, fournit le nibble bas — un RS incohérent abandonne la séquence.
 */
function st7066uTransaction(state, pinSignals, currentTimeMs) {
  const rs = pinSignals.RS
  if (pinSignals.RW !== Signal.LOW || !isDecisive(rs)) return { pendingNibble: null }
  if (state.dataLength === 8) {
    return st7066uCompleteTransaction(state, rs, possibleWords(ST7066U_DATA_BUS.map((pin) => pinSignals[pin])), currentTimeMs)
  }
  const nibbles = possibleWords(ST7066U_UPPER_NIBBLE.map((pin) => pinSignals[pin]))
  if (state.pendingNibble === null) return { pendingNibble: Object.freeze({ rs, highNibbles: Object.freeze(nibbles) }) }
  if (state.pendingNibble.rs !== rs) return { pendingNibble: null }
  const bytes = state.pendingNibble.highNibbles.flatMap((high) => nibbles.map((low) => (high << 4) | low))
  return { ...st7066uCompleteTransaction(state, rs, bytes, currentTimeMs), pendingNibble: null }
}

/**
 * A10-DISP2 — ST7066U : contribution timed/stateful, sans sortie.
 *
 * Garde d'alimentation (même patron que les A9) : sans VDD HIGH et VSS LOW,
 * `outputs = null`, aucune transaction, et l'état revient à l'état initial —
 * une remise sous tension ne restitue jamais une DDRAM fantôme. VO, A et K
 * sont des broches physiques sans modèle analogique (contraste,
 * rétroéclairage) en V1.
 *
 * Transaction UNIQUEMENT sur le front descendant strict previousE HIGH ->
 * E LOW ; E stable, LOW -> HIGH ou UNKNOWN/FLOATING ne sont jamais un front.
 * Un front reçu pendant que le contrôleur est occupé
 * (`currentTimeMs < busyUntilMs`) est ignoré.
 *
 * État privé (volatile, store runtime PREQ2 uniquement, jamais le Document),
 * gelé : { ddram, addressCounter, entryIncrement, displayOn, cursorOn,
 * blinkOn, dataLength, ramTarget, previousE, pendingNibble, busyUntilMs }.
 */
function st7066uTimedDigital({ pinSignals, currentTimeMs, previousState }) {
  if (pinSignals.VDD !== Signal.HIGH || pinSignals.VSS !== Signal.LOW) {
    return { state: ST7066U_INITIAL_STATE, outputs: null }
  }

  const previous = previousState ?? ST7066U_INITIAL_STATE
  const e = pinSignals.E
  const fallingEdge = previous.previousE === Signal.HIGH && e === Signal.LOW
  if (!fallingEdge || currentTimeMs < previous.busyUntilMs) {
    const state = previous.previousE === e ? previous : Object.freeze({ ...previous, previousE: e })
    return { state, outputs: null }
  }
  return {
    state: Object.freeze({ ...previous, ...st7066uTransaction(previous, pinSignals, currentTimeMs), previousE: e }),
    outputs: null,
  }
}

/**
 * Fabrique un Registry isolé — même patron que
 * `createDigitalContributionRegistry` (`digitalContributionRegistry.js`) :
 * permet à un test d'injecter une table de contributions FIXTURE, sans
 * jamais enregistrer de faux type de production dans la table par défaut ni
 * dans `canonicalRegistry.js`.
 *
 * @param {{ contributions?: Map<string, TimedDigitalContributionFn> }} [options]
 */
export function createTimedDigitalContributionRegistry({ contributions = new Map() } = {}) {
  const store = contributions instanceof Map ? contributions : new Map(Object.entries(contributions))

  /** @param {string} type @returns {TimedDigitalContributionFn | null} */
  function getTimedDigitalContribution(type) {
    return store.get(type) ?? null
  }

  /** @param {string} type @returns {boolean} */
  function hasTimedDigitalContribution(type) {
    return store.has(type)
  }

  /** @returns {string[]} */
  function getAllTimedDigitalContributionTypes() {
    return Object.freeze([...store.keys()])
  }

  return { getTimedDigitalContribution, hasTimedDigitalContribution, getAllTimedDigitalContributionTypes }
}

/**
 * Registry de production — vide en A7-C5-PREQ (§16/§24 du ticket PREQ).
 * A7-C5 (ce ticket) ajoute la PREMIÈRE entrée réelle : HC_SR04, sans jamais
 * toucher `simulationRuntimeIntegration.js` (PROTECTED pour A7-C5, §33 du
 * ticket) ni `resolution.js`.
 */
const defaultRegistry = createTimedDigitalContributionRegistry({
  contributions: new Map([
    ["HC_SR04", hcSr04TimedDigital],
    // A9-JK1 : premier producteur séquentiel réel (état inter-step + front descendant).
    ["JK_FLIP_FLOP_74HC73", jkFlipFlop74HC73TimedDigital],
    // A9-DFF1 : double bascule D à front montant (même contrat séquentiel).
    ["D_FLIP_FLOP_74HC74", dFlipFlop74HC74TimedDigital],
    // A9-LATCH1 : quadruple latch D transparent sur niveau (même contrat séquentiel, aucun front).
    ["D_LATCH_74HC75", dLatch74HC75TimedDigital],
    // A9-COUNTER1 : compteur binaire synchrone 4 bits (même contrat séquentiel, front montant).
    ["BINARY_COUNTER_74HC161", binaryCounter74HC161TimedDigital],
    // A10-DISP2 : contrôleur ST7066U du LCD WH1602B (état DDRAM runtime, front descendant de E, aucune sortie).
    ["LCD_16X2_WH1602B", st7066uTimedDigital],
  ]),
})

export const getTimedDigitalContribution = defaultRegistry.getTimedDigitalContribution
export const hasTimedDigitalContribution = defaultRegistry.hasTimedDigitalContribution
export const getAllTimedDigitalContributionTypes = defaultRegistry.getAllTimedDigitalContributionTypes
