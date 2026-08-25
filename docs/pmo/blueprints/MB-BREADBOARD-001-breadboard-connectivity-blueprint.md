# MB-BREADBOARD-001 — Breadboard Connectivity Blueprint

**Statut :** PROPOSITION DE BLUEPRINT — sign-off fichiers requis avant écriture de code
**Rattaché à :** `docs/pmo/tickets/MB-BREADBOARD-001.md` (cadrage arbitré 2026-08-25) et `docs/pmo/tickets/MB-BREADBOARD-002.md` (ticket d'implémentation, CSA Ruling GO 2026-08-25)
**Objet :** fournir le contenu technique concret exigé par MB-BREADBOARD-001 §K (schéma de données, algorithme de fusion, commandes, erreurs de montage, scénario de preuve) avant toute écriture dans `frontend/src/`.

---

## 1. Découverte d'audit ayant corrigé le périmètre (2026-08-25)

L'audit en lecture seule (MB-BREADBOARD-002 §8 Étape 1) a établi que **deux implémentations de connectivité indépendantes** coexistent aujourd'hui :

- `frontend/src/core/validation/rules/shared/nets.js::buildNets(wires)` — Union-Find, forme Core `{pinA:{componentId,pinId}, pinB:{...}}`, consommé **uniquement** par `PowerGroundShortCircuitRule` (validation).
- `frontend/src/simulator/preparation.js::prepareCircuit(components, wires)` — second Union-Find indépendant, forme bridge `{fromUid,fromPin,toUid,toPin}`, consommé par le **solveur réel** via `engine.js` et `simulationRuntimeIntegration.js`.

`buildNets()` n'est donc PAS le mécanisme que la simulation utilise. Une fusion additive branchée uniquement sur `buildNets()` (comme le nommaient littéralement LOCK-04/05 de MB-BREADBOARD-002) rendrait le breadboard visible en validation mais invisible en simulation — violation directe de AC-13 et du principe §21 (« ne pas construire une breadboard purement décorative »).

**Décision (CSA, 2026-08-25) :** brancher la connectivité breadboard sur les deux mécanismes, sans modifier l'algorithme interne d'aucun des deux (LOCK-06 intact) — seule la liste de wires reçue en entrée de chacun est complétée.

## 2. Fait porteur : les positions de pins sont déjà purement dérivables

`frontend/src/config/componentDefinitions.js` déclare, pour chaque type de composant, un décalage géométrique fixe par pin (`{id, label, dx, dy}`), consommé par `frontend/src/utils/geometry.js::getPinPosition(component, pinDef) = component.{x,y} + pinDef.{dx,dy}`. Aucune mesure DOM n'intervient : la position absolue d'une pin est une fonction pure de `component.position` (Core) et du type du composant.

Conséquence directe : l'occupation d'un trou de breadboard peut être **entièrement dérivée** de `document.components` (position + type), sans aucun état d'occupation persisté — ce qui satisfait nativement AC-17 (« reconstructible à partir du Document seul ») et LOCK-07 (« aucun net calculé n'est persisté »).

## 3. Schéma Document (Core)

```js
// nouveau champ racine du Document, optionnel
document.breadboard = null | {
  id: string,            // identifiant stable, ex. "breadboard-1"
  position: { x, y },    // coin haut-gauche, en px canvas, snappé sur BREADBOARD_PITCH (pas GRID_SIZE)
  layout: "STANDARD_V1", // constante fixe unique en V1 (Q1 : un seul breadboard, une seule taille)
}
```

`document.components` et `document.wires` restent structurellement inchangés (Q2 : coexistence, aucune régression du canevas libre).

## 4. Géométrie breadboard (nouveau module `frontend/src/utils/breadboardGeometry.js`)

```js
export const BREADBOARD_PITCH = 12 // px — constante dédiée (Q4), découplée de GRID_SIZE=20

// Layout V1 fixe (constante unique tant que Q1 n'est pas rouvert) :
//   2 rails d'alimentation (haut: +/-, bas: +/-), chacun un groupe continu (AC-05)
//   30 colonnes, 2 blocs de 5 rangées (a-e / f-j) séparés par la rainure centrale (AC-04)
export const STANDARD_V1_LAYOUT = {
  columns: 30,
  rowsPerSide: 5,
  gutterAfterColumn: null, // rainure = séparation a-e / f-j, pas de coupure de colonnes en V1
}

// holeAt(breadboard, x, y) -> { kind: 'RAIL'|'STRIP', groupKey } | null
// - RAIL   : { kind: 'RAIL', groupKey: `${breadboard.id}:rail:top:+` | ':top:-' | ':bottom:+' | ':bottom:-' }
// - STRIP  : { kind: 'STRIP', groupKey: `${breadboard.id}:strip:col<N>:<top|bottom>` }
//   (col<N> = même groupe de 5 ; <top|bottom> = côté de la rainure — isole AC-04)
// Retourne null si (x,y) ne tombe sur aucun trou valide à la tolérance BREADBOARD_PITCH/2 (LOCK "hors grille" -> pas d'insertion, cf. §7 TB-09).
export function holeAt(breadboard, x, y) { /* ... */ }
```

## 5. Dérivation des connexions virtuelles (nouveau module `frontend/src/utils/breadboardConnectivity.js`)

```js
/**
 * Pure. Ne lit que document.breadboard + document.components (+ componentDefinitions.js
 * pour les décalages de pins). N'écrit rien. Reconstruite à chaque appel (LOCK-07).
 * @returns {Array<{ pinA: {componentId,pinId}, pinB: {componentId,pinId} }>} forme Core
 */
export function deriveBreadboardVirtualWires(document) { /* ... */ }
```

Algorithme : pour chaque composant × chaque pin canonique (offset `componentDefinitions.js`), calculer la position absolue, résoudre `holeAt()` ; grouper les pins occupant le même `groupKey` ; pour chaque groupe de taille ≥ 2, émettre une arête virtuelle en étoile vers un pin de référence (n−1 arêtes suffisent à l'Union-Find, pas de O(n²)). Une pin non résolue par `holeAt()` (hors grille, ou pas de breadboard) ne produit aucune arête — comportement neutre par défaut, condition de AC-14/TB-14/TB-15 (Document ou canevas sans breadboard strictement inchangé).

### Double branchement (§1)

- **Validation** (`PowerGroundShortCircuitRule` et tout futur consommateur) : au point d'appel de `buildNets(wires)`, remplacer par `buildNets([...document.wires, ...deriveBreadboardVirtualWires(document)])`. Aucune modification de `nets.js`.
- **Simulation** (`engine.js`, `simulationRuntimeIntegration.js`) : au point d'appel de `prepareCircuit(components, wires)`, ajouter les mêmes arêtes virtuelles converties en forme bridge (`pinA→{fromUid:pinA.componentId, fromPin:pinA.pinId}`, idem `pinB`→`to*`) à la liste `wires` passée en argument. Aucune modification de `preparation.js`.

Une seule fonction de conversion de forme (`toBridgeWire(coreWire)`) est ajoutée, réutilisée aux deux points d'appel — pas de duplication de logique.

## 6. Commande CF3 nécessaire

Constat : **aucune nouvelle commande d'insertion/retrait n'est nécessaire**. Puisque l'occupation d'un trou est dérivée uniquement de `component.position`, insérer un composant sur le breadboard consiste à le positionner (via `ADD_COMPONENT` ou `MOVE_COMPONENT`, déjà gouvernés CF3) de sorte que ses pins tombent sur des trous valides ; le retirer consiste à le déplacer hors de la grille. LOCK-02 (« la position détermine la connectivité ») est ainsi satisfait sans étendre la surface de mutation existante au-delà du strict nécessaire.

Une seule commande nouvelle est requise : **`ADD_BREADBOARD`**, pour placer l'entité `document.breadboard` elle-même (Q1 : une seule fois par Document — le Handler doit refuser une seconde insertion, AC-01).

```js
new Command("ADD_BREADBOARD", { position: { x, y } })
// Handler : frontend/src/core/handlers/breadboard/AddBreadboardHandler.js
// _applyMutation : si document.breadboard existe déjà -> HandlerError (LOCK-01)
//                  sinon : { ...document, breadboard: { id, position: snapToBreadboardPitch(position), layout: "STANDARD_V1" } }
```

`ADD_BREADBOARD` doit être enregistré dans `useCircuitState.js` (même patron que `ADD_WIRE`/`UPDATE_WIRE_WAYPOINTS`) et **nécessite l'amendement du verrou** `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js`, en suivant exactement le précédent déjà établi (`CSA-CF3-002-ADD-WIRE-001`, ruling `UPDATE_WIRE_WAYPOINTS` du 2026-08-21) : commentaire d'amendement citant explicitement le CSA Ruling de `MB-BREADBOARD-002` (2026-08-25) comme autorité.

## 7. Erreurs de montage V1 (nouvelles règles de validation, famille STRUCTURAL/ELECTRICAL existante)

| Règle | Détection | Niveau |
|---|---|---|
| `BreadboardSingletonRule` | `ADD_BREADBOARD` alors que `document.breadboard` existe déjà (LOCK-01) | ERROR (bloque le Handler, cohérent avec le Handler lui-même) |
| `BreadboardRailShortRule` | un même composant relie directement rail `+` et rail `-` (héritier direct de `PowerGroundShortCircuitRule`, réutilise `buildNets()` déjà étendu §5) | ERROR |
| Hors grille / patte non résolue | `holeAt()` retourne `null` pour une pin dont le composant chevauche visuellement le breadboard | pas de mutation refusée en V1 — la pin est simplement non connectée (résultat neutre, cf. TB-09 réinterprété comme « aucune arête », pas comme rejet de commande, puisque `ADD_COMPONENT`/`MOVE_COMPONENT` ne connaissent pas le breadboard) |

Composants à cheval sur la rainure (empattement large) restent hors périmètre V1 (Q5) — aucune règle dédiée à écrire pour ce cas.

## 8. Presentation V1 (rendu minimal, subordonné au modèle)

Nouveau composant `frontend/src/canvas/Breadboard.jsx` : rend les rails et la grille de trous à partir de `document.breadboard` + `STANDARD_V1_LAYOUT`/`BREADBOARD_PITCH` (§4) — lecture seule du Document, aucune logique de connectivité propre (LOCK-08). Un trou occupé (dérivé via `deriveBreadboardVirtualWires`/`holeAt`, pas d'état séparé) peut être visuellement distingué, sans dupliquer la vérité électrique.

## 9. Fichiers (périmètre exact soumis à sign-off)

**Nouveaux :**
- `frontend/src/utils/breadboardGeometry.js`
- `frontend/src/utils/breadboardConnectivity.js`
- `frontend/src/core/handlers/breadboard/AddBreadboardHandler.js`
- `frontend/src/canvas/Breadboard.jsx` (+ `.css` minimal)
- `frontend/src/core/validation/rules/structural/BreadboardSingletonRule.js`
- `frontend/src/core/validation/rules/electrical/BreadboardRailShortRule.js`
- Tests associés à chaque fichier ci-dessus (TB-01 à TB-15, répartis par module).
- `docs/pmo/delivery-reports/MB-BREADBOARD-002-delivery-report.md` (à la fin, étape 6)

**Modifiés (points d'appel uniquement, pas de logique interne touchée) :**
- `frontend/src/core/validation/rules/electrical/PowerGroundShortCircuitRule.js` (§5, branchement `buildNets`)
- `frontend/src/simulator/engine.js`, `frontend/src/simulator/simulationRuntimeIntegration.js` (§5, branchement `prepareCircuit`)
- `frontend/src/core/handlers/index.js`, `frontend/src/core/validation/rules/index.js` (exports)
- `frontend/src/hooks/useCircuitState.js` (enregistrement `ADD_BREADBOARD`)
- `frontend/src/bridge/tests/cf1DocumentArchitecture.test.js` (amendement du verrou, §6)

**Explicitement non touchés :** `simulator/preparation.js`, `simulator/resolution.js`, `core/validation/rules/shared/nets.js`, `simulator/canonicalRegistry.js`, tout fichier Arduino/runtime, tout fichier `observation`/`measurement`.

## 10. Correspondance tests obligatoires (MB-BREADBOARD-002 §6)

TB-01 à TB-05 → `breadboardConnectivity.test.js` (groupes/rails, pure). TB-06, TB-10 → idem + `AddWireHandler`/mutation existante inchangée (fusion wire explicite + trou). TB-07, TB-08, TB-09 → `breadboardConnectivity.test.js` (retrait/déplacement/hors-grille, purement par re-dérivation). TB-11 à TB-13 → nouveau test d'intégration simulateur (LED+résistance sur breadboard vs. câblé, `simulator/__tests__/`) + `observationContract` existant. TB-14, TB-15 → non-régression, réutilisent les suites existantes (`cf1DocumentArchitecture.test.js`, tests `nets.js`/`preparation.js` déjà en place) sans document/breadboard.

## 11. Rappel des non-goals (inchangés)

Aucune 3D, aucun second breadboard, aucun composant à cheval sur la rainure, aucune modification de `preparation.js`/`nets.js`/`resolution.js`/`canonicalRegistry.js`, aucun commit avant GO CSA post-implémentation (MB-BREADBOARD-002 §8 Étape 7).

---

## Sign-off requis

Ce Blueprint couvre MB-BREADBOARD-001 §K.2 à §K.6. Avant d'écrire un seul fichier de `frontend/src/`, confirmation demandée sur le périmètre fichiers §9 (en particulier : `AddBreadboardHandler`/`ADD_BREADBOARD` comme unique nouvelle commande, et l'amendement du verrou `cf1DocumentArchitecture.test.js`).
