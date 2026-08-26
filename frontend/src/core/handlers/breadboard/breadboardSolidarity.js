import { getComponentDef } from '../../../config/componentDefinitions.js';
import { holeAt } from '../../../utils/breadboardGeometry.js';

/**
 * breadboardSolidarity.js — MB-BREADBOARD-006 (CSA Ruling §4).
 *
 * Fonction pure, seule source de vérité pour « quels composants sont
 * solidaires du breadboard » (i.e. doivent le suivre lors d'un
 * MOVE_BREADBOARD). Consommée à l'IDENTIQUE par la Presentation
 * (useCircuitState.js, pour un aperçu de drag fidèle) et par le Core
 * (MoveBreadboardHandler, pour la mutation réelle) — jamais recalculée
 * différemment aux deux endroits (INV-06).
 *
 * Réutilise strictement holeAt() (breadboardGeometry.js, non modifié) comme
 * SEUL oracle de résolution, exactement comme breadboardPlacementAdapter.js
 * et breadboardConnectivity.js le font déjà. Aucune notion de sélection UI,
 * de proximité visuelle ni de bounding box n'intervient (CSA Ruling §4,
 * explicitement proscrit).
 *
 * Un composant est solidaire s'il a AU MOINS une pin actuellement résolue
 * sur un trou de CE breadboard. Pour tout composant compatible (exactement
 * 2 pins, seul cas géré par computeBreadboardPlacement) déjà correctement
 * inséré, les deux pins résolvent toujours simultanément (contrat de
 * breadboardPlacementAdapter.js, non modifié) — le critère "au moins une
 * pin" est donc un sur-ensemble sûr qui ne change rien au cas nominal, mais
 * évite qu'un état intermédiaire incohérent laisse un composant orphelin
 * (une seule pin sur trou) hors de la translation solidaire.
 *
 * Accepte indifféremment la forme Presentation ({uid, x, y}) et la forme
 * Core ({id, position:{x,y}}), puisque cette fonction est appelée des deux
 * côtés du pipeline.
 *
 * @param {{id:string, position:{x:number,y:number}}|null} breadboard
 * @param {Array<object>} components - forme Presentation OU Core, mixte non
 *   supportée au sein d'un même appel (chaque appelant utilise toujours sa
 *   propre forme constante).
 * @returns {Set<string>} identifiants (uid ou id selon la forme fournie) des
 *   composants solidaires.
 */
export function resolveSolidaryComponentIds(breadboard, components) {
  const solidary = new Set();
  if (!breadboard || !breadboard.position) return solidary;

  for (const component of components || []) {
    if (!component) continue;

    const componentId = component.uid ?? component.id;
    if (!componentId) continue;

    const x = Number.isFinite(component.x) ? component.x : component.position?.x;
    const y = Number.isFinite(component.y) ? component.y : component.position?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const def = getComponentDef(component.type);
    if (!def || !Array.isArray(def.pins)) continue;

    const anyPinOnHole = def.pins.some(
      (pin) => holeAt(breadboard, x + pin.dx, y + pin.dy) !== null
    );
    if (anyPinOnHole) solidary.add(componentId);
  }

  return solidary;
}
