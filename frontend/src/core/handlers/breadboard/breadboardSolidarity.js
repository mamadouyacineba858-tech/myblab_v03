import { getComponentDef } from '../../../config/componentDefinitions.js';
import { resolveComponentContactHoles } from '../../../utils/breadboardGeometry.js';
import { resolveComponentBreadboardAssociation } from '../../../utils/breadboardAssociation.js';

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
 * FT-C-BREAD-MULTI-001-C : 3ᵉ argument OPTIONNEL `breadboards`. Quand il est
 * fourni (MoveBreadboardHandler, aperçu de drag breadboard côté hook), la
 * solidarité devient l'OWNERSHIP CANONIQUE D1 : un composant est solidaire de
 * `breadboard` SEULEMENT si `resolveComponentBreadboardAssociation(... mode:
 * "ownership" ...)` désigne CE breadboard — donc un seul propriétaire, même en
 * cas de chevauchement (I-C2/I-C9). Sans ce 3ᵉ argument (appelants legacy /
 * tests mono-breadboard), le comportement historique « au moins un contact
 * physique enfichable résout un trou de CE breadboard » est strictement
 * préservé — équivalent à D1 quand `breadboards === [breadboard]`.
 *
 * @param {{id:string, position:{x:number,y:number}}|null} breadboard
 * @param {Array<object>} components - forme Presentation OU Core, mixte non
 *   supportée au sein d'un même appel.
 * @param {Array<{id:string, position:{x:number,y:number}}>} [breadboards] -
 *   collection canonique multi-breadboard ; active la résolution d'ownership D1.
 * @returns {Set<string>} identifiants (uid ou id selon la forme fournie) des
 *   composants solidaires.
 */
export function resolveSolidaryComponentIds(breadboard, components, breadboards) {
  const solidary = new Set();
  if (!breadboard || !breadboard.position) return solidary;

  const boards =
    Array.isArray(breadboards) && breadboards.length > 0 ? breadboards.filter((b) => b && b.position) : null;

  for (const component of components || []) {
    if (!component) continue;

    const componentId = component.uid ?? component.id;
    if (!componentId) continue;

    const x = Number.isFinite(component.x) ? component.x : component.position?.x;
    const y = Number.isFinite(component.y) ? component.y : component.position?.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const def = getComponentDef(component.type);
    if (!def || !Array.isArray(def.pins)) continue;

    if (boards) {
      // Ownership canonique D1 : UN SEUL breadboard propriétaire.
      const assoc = resolveComponentBreadboardAssociation({
        breadboards: boards,
        componentType: component.type,
        position: { x, y },
        mode: 'ownership',
      });
      if (assoc.breadboardId === breadboard.id) solidary.add(componentId);
      continue;
    }

    // FT-B-001-S3 (legacy 2 arguments) : au moins un CONTACT physique enfichable
    // résout un trou de CE breadboard. Un composant multi-contacts (BUTTON) est
    // solidaire dès qu'une seule de ses pattes est enfichée.
    const { anyResolved } = resolveComponentContactHoles(breadboard, def.pins, { x, y });
    if (anyResolved) solidary.add(componentId);
  }

  return solidary;
}
