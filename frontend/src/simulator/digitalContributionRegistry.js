/**
 * A7-C3-PREQ — Generic Computed Digital Output Registry.
 *
 * Sibling registry to `dcContributionRegistry.js` (ADR-006), but for
 * DRIVEN DIGITAL LOGIC LEVELS instead of analog voltage/current : an
 * association `type de composant -> fonction pure qui calcule zéro ou
 * plusieurs sorties Signal.HIGH/Signal.LOW pour ses propres pins`. Exactement
 * le même principe Open/Closed que dcContributionRegistry.js : ajouter un
 * futur composant producteur (capteur d'humidité, détecteur de mouvement,
 * détecteur d'inclinaison, récepteur en lumière infrarouge, ...) se fait en
 * ajoutant UNE entrée déclarative ici, jamais en modifiant un fichier
 * générique (composition dans `simulationRuntimeIntegration.js`, résolution
 * dans `resolution.js`).
 *
 * Ce ticket (A7-C3-PREQ) construit UNIQUEMENT le mécanisme générique : la
 * table de production reste volontairement VIDE — aucun composant ni kind
 * de stimulus spécifique n'est enregistré ici, voir le rapport de livraison.
 *
 * Contrat d'une fonction de contribution :
 *
 *   ({ component, pins, params }) => Map<pinId, Signal> | null
 *
 * - `component` : le composant EFFECTIF (post applyEnvironmentalStimuli),
 *   tel que reçu par la composition — jamais muté ici.
 * - `pins` : `component.pins` (définitions de pins persistantes de
 *   l'instance), PAS un état de signal résolu — au moment où ce Registry
 *   est consulté (composition, AVANT resolveSignals()/propagate()), aucun
 *   pin du circuit n'a encore de valeur HIGH/LOW connue (voir
 *   simulationRuntimeIntegration.js pour la raison architecturale : les
 *   valeurs calculées ici DEVIENNENT elles-mêmes une entrée de
 *   `externalSignals`, appliquées avant la propagation). Un futur
 *   contributeur qui a besoin de connaître l'état d'alimentation de son
 *   propre composant (ex. "VCC=HIGH et GND=LOW requis") ne peut donc PAS le
 *   lire ici de façon générique avec l'architecture actuelle — c'est une
 *   limitation documentée, pas une omission (voir le rapport de livraison,
 *   section Écarts).
 * - `params` : paramètres EFFECTIFS résolus (`resolveComponentParameters`,
 *   mêmes defaults canoniques + overrides d'instance validés que
 *   `dcContributionRegistry.js`).
 * - Retour : soit `null`/absence de sortie (composant présent dans le
 *   Registry mais rien à produire pour cet appel), soit une `Map<pinId,
 *   Signal>` — jamais un objet plain, pour rester cohérent avec le format
 *   `Map` déjà utilisé par `pinSignals`/`externalSignals` partout ailleurs
 *   dans `resolution.js`/`simulationRuntimeIntegration.js`.
 *
 * Aucun accès React/Canvas/Document/Scheduler/DOM/breadboard ici — cette
 * fonction est pure, synchrone, sans effet de bord, exactement comme
 * `dcContributionRegistry.js`.
 *
 * @typedef {(ctx: { component: object, pins: Array<object>, params: Record<string, number> }) => Map<string, string> | null} DigitalContributionFn
 */

/**
 * Fabrique un Registry isolé — même patron que `createSimulationRegistry`
 * (`simulationRegistry.js`) : permet à un test d'injecter une table de
 * contributions FIXTURE, sans jamais enregistrer de faux type de production
 * dans la table par défaut ni dans `canonicalRegistry.js` (§13 du ticket).
 *
 * @param {{ contributions?: Map<string, DigitalContributionFn> }} [options]
 */
export function createDigitalContributionRegistry({ contributions = new Map() } = {}) {
  const store = contributions instanceof Map ? contributions : new Map(Object.entries(contributions))

  /** @param {string} type @returns {DigitalContributionFn | null} */
  function getDigitalContribution(type) {
    return store.get(type) ?? null
  }

  /** @param {string} type @returns {boolean} */
  function hasDigitalContribution(type) {
    return store.has(type)
  }

  /** @returns {string[]} */
  function getAllDigitalContributionTypes() {
    return Object.freeze([...store.keys()])
  }

  return { getDigitalContribution, hasDigitalContribution, getAllDigitalContributionTypes }
}

/**
 * Registry de production — table VOLONTAIREMENT VIDE dans ce ticket
 * (A7-C3-PREQ). Chaque futur ticket producteur ajoute UNE entrée ici, sans
 * jamais toucher `simulationRuntimeIntegration.js` ni `resolution.js`.
 */
const defaultRegistry = createDigitalContributionRegistry({ contributions: new Map() })

export const getDigitalContribution = defaultRegistry.getDigitalContribution
export const hasDigitalContribution = defaultRegistry.hasDigitalContribution
export const getAllDigitalContributionTypes = defaultRegistry.getAllDigitalContributionTypes
