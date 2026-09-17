/**
 * A4-D-PREQ2 — Transient Electrical Resolution Integration : composition.
 *
 * Primitive générique unique qui rend une contribution électrique
 * transitoire du step courant (`transientContributionRegistry.js`,
 * `computeTransientElectricalContributions`, A4-D-PREQ1) OBSERVABLE aux
 * côtés de l'analyse DC steady-state historique (`computeDcAnalysis`,
 * resolution.js) — sans jamais fusionner les deux notions dans
 * `pinSignals` (I-A4-11, resolution.js/Signal.* reste exclusivement
 * logique) et sans créer une seconde vérité électrique concurrente
 * (I-A4-12).
 *
 * Contrat (§4 du ticket) :
 *   1. commence avec `dcAnalysis` (steady-state, référence de repli
 *      historique — I-A4-14) ;
 *   2. pour chaque `uid` présent dans `transientAnalysis`, la contribution
 *      transitoire du step courant REMPLACE l'entrée DC du même `uid`
 *      (I-A4-13 : transient > steady-state, règle explicite du contrat
 *      électrique — jamais un last-write-wins implicite entre producteurs
 *      arbitraires, contrairement à `mergeExternalSignals`) ;
 *   3. les composants purement DC (absents de `transientAnalysis`) restent
 *      inchangés ;
 *   4. aucune connaissance de type de composant ici (I-A4-15 : ni CAPACITOR
 *      ni POLARIZED_CAPACITOR ni aucun autre littéral de type) — cette
 *      primitive ne sait rien de plus que « deux Map<uid, {voltage,
 *      current}> indexées par uid, l'une prioritaire sur l'autre ».
 *
 * Pure : ne mute jamais `dcAnalysis` ni `transientAnalysis` (T5) — retourne
 * toujours une nouvelle Map.
 *
 * @param {Map<string, {voltage:number, current:number}>} dcAnalysis
 * @param {Map<string, {voltage:number, current:number}>} [transientAnalysis]
 *   Défaut : Map vide — `composeElectricalAnalysis(dcAnalysis)` retourne
 *   alors une copie de `dcAnalysis` (T1 : DC seul => résultat DC identique).
 * @returns {Map<string, {voltage:number, current:number}>}
 */
export function composeElectricalAnalysis(dcAnalysis, transientAnalysis = new Map()) {
  const composed = new Map(dcAnalysis)
  for (const [uid, contribution] of transientAnalysis) {
    composed.set(uid, contribution)
  }
  return composed
}
