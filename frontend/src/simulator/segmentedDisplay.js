import { Signal } from "./signals.js"

/**
 * A10-DISP1 — Contrat déclaratif des afficheurs segmentés (lecture, phase
 * Production d'ADR-004 — même rôle que getLedState/getRgbLedState dans
 * production.js).
 *
 * La vérité fonctionnelle d'un afficheur segmenté est `segment -> pin` plus
 * une règle d'activation portée par la topologie du commun. Aucun chiffre
 * n'est stocké ni déduit : un motif est seulement l'ensemble des segments
 * allumés, quel qu'il soit (0..9, lettre, motif arbitraire, DP seul).
 *
 * Le composant est un CONSOMMATEUR : ce module ne produit aucun signal, ne
 * modifie aucun net et ne contribue pas à la résolution électrique. Il lit
 * uniquement `pinSignals` (clé "uid:pinId") déjà résolu par resolveSignals().
 *
 * Commun multi-broches : un commun exposé par plusieurs broches physiques
 * (SC56-11EWA : broches 3 et 8) est UN SEUL pin électrique canonique
 * portant plusieurs PhysicalContacts (convention H_BRIDGE GND4/5/12/13,
 * componentDefinitions.js). Les deux broches forment donc par construction
 * le même nœud : un fil ou un trou de breadboard sur l'une ou l'autre
 * alimente la même clé `uid:COM`.
 */

/**
 * Règle d'activation par topologie. Chaque segment est une LED
 * anode -> cathode ; un segment n'émet que si SA branche est polarisée en
 * direct (même sémantique numérique que getLedState : anode HIGH ET cathode
 * LOW). Un niveau UNKNOWN/FLOATING n'allume jamais rien.
 */
const ACTIVATION_RULES = Object.freeze({
  // Cathode commune : anode = broche du segment, cathode = commun.
  "common-cathode": (segmentSignal, commonSignal) =>
    segmentSignal === Signal.HIGH && commonSignal === Signal.LOW,
})

function freezeContract({ reference, topology, segments, common }) {
  return Object.freeze({
    reference,
    topology,
    segments: Object.freeze(Object.fromEntries(
      Object.entries(segments).map(([id, def]) => [id, Object.freeze({ ...def })]),
    )),
    common: Object.freeze({ ...common, physicalPins: Object.freeze([...common.physicalPins]) }),
  })
}

const CONTRACTS = Object.freeze({
  // Kingbright SC56-11EWA (datasheet DSAP6671), pinout CSA LOCKED :
  // 1=e 2=d 3=COM 4=c 5=DP 6=b 7=a 8=COM 9=f 10=g.
  SEVEN_SEGMENT_DISPLAY: freezeContract({
    reference: "Kingbright SC56-11EWA",
    topology: "common-cathode",
    segments: {
      a: { pin: "a", physicalPin: "7" },
      b: { pin: "b", physicalPin: "6" },
      c: { pin: "c", physicalPin: "4" },
      d: { pin: "d", physicalPin: "2" },
      e: { pin: "e", physicalPin: "1" },
      f: { pin: "f", physicalPin: "9" },
      g: { pin: "g", physicalPin: "10" },
      DP: { pin: "DP", physicalPin: "5" },
    },
    common: { pin: "COM", physicalPins: ["3", "8"] },
  }),
})

/**
 * @param {string} type
 * @returns {object|null} contrat gelé, ou null si le type n'est pas un afficheur segmenté
 */
export function getSegmentedDisplayContract(type) {
  return typeof type === "string" && Object.prototype.hasOwnProperty.call(CONTRACTS, type)
    ? CONTRACTS[type]
    : null
}

/**
 * État de chaque segment d'après les signaux résolus. Toujours un objet
 * complet (un booléen par segment déclaré) ; toute entrée invalide
 * (contrat/topologie inconnus, pinSignals absent) donne tous les segments
 * éteints — jamais d'exception, jamais de segment allumé par défaut.
 *
 * @param {object} contract
 * @param {string} uid
 * @param {Map<string, string>} pinSignals
 * @returns {Record<string, boolean>}
 */
export function resolveSegmentStates(contract, uid, pinSignals) {
  if (!contract || typeof contract.segments !== "object") return Object.freeze({})
  const segmentIds = Object.keys(contract.segments)
  const rule = ACTIVATION_RULES[contract.topology]
  const signals = pinSignals instanceof Map ? pinSignals : null
  const common = signals?.get(`${uid}:${contract.common?.pin}`)

  return Object.freeze(Object.fromEntries(segmentIds.map((id) => [
    id,
    !!rule && !!signals && rule(signals.get(`${uid}:${contract.segments[id].pin}`), common),
  ])))
}

/**
 * @param {string} type
 * @param {string} uid
 * @param {Map<string, string>} pinSignals
 * @returns {Record<string, boolean>} {} si le type n'est pas un afficheur segmenté
 */
export function getSegmentedDisplayState(type, uid, pinSignals) {
  return resolveSegmentStates(getSegmentedDisplayContract(type), uid, pinSignals)
}
