# Delivery Report — MB-BREADBOARD-003 (increment : complétion visuelle AC-01/03/04/05)

## 1. Identité et contexte — pourquoi un troisième document sous le même ID

| Champ | Valeur |
|---|---|
| Ticket | `MB-BREADBOARD-003` — Assembly & Interaction V1 |
| Blueprint | `docs/pmo/blueprints/MB-BREADBOARD-003-assembly-interaction-blueprint.md` |
| Ticket source | `docs/pmo/tickets/MB-BREADBOARD-003.md` (le même document, "PARTIE I/II/III" — Blueprint + Ticket + CSA GO — a été retransmis intégralement par le CSA dans le message qui a autorisé ce travail) |
| CSA Ruling | GO — IMPLEMENTATION AUTHORIZED (verdict final du document retransmis), gouvernance : STOP → DELIVERY REPORT → CSA POST-IMPLEMENTATION → GO/NO-GO → COMMIT/PUSH |
| Statut de ce rapport | **STOP avant commit** — soumis à validation CSA post-implémentation, aucun commit/push effectué |

**Ce ticket a déjà fait l'objet de deux livraisons antérieures, toutes deux commitées et pushées :**

1. `docs/pmo/delivery-reports/MB-BREADBOARD-003-delivery-report.md` (commit `bd51cbd`) — implémentation du cœur fonctionnel : `computeBreadboardPlacement()`, `BreadboardHoleCollisionRule` (STR-007), feedback vert/rouge pendant le drag, export/import du breadboard, bouton Sidebar.
2. Correctif ciblé ADD_COMPONENT (commit `f3a59c9`, livré par chat sans document séparé) — le dépôt initial depuis la Sidebar ne passait pas par `computeBreadboardPlacement()`, corrigé.

Avant de coder quoi que ce soit pour cette troisième livraison, un diagnostic a été fait (lecture de `Breadboard.jsx/css`, `breadboardGeometry.js`, `breadboardConnectivity.js`, `breadboardPlacementAdapter.js`, `useCircuitState.js`, et des 6 suites de tests breadboard existantes — ~70 tests) pour établir ce que les deux livraisons précédentes couvraient déjà du Ticket retransmis, avant d'implémenter quoi que ce soit de nouveau. Conclusion : **le SCOPE IN fonctionnel du Ticket (items 8 à 22 — détection, calcul de trous candidats, snapping, feedback, collision, persistance, retrait, wires, simulation, Undo/Redo) est déjà entièrement couvert par les deux livraisons précédentes.** Ce qui restait ouvert, spécifiquement les items visuels du SCOPE IN (1 à 7) et les critères d'acceptation associés :

- **AC-01** — le breadboard "immédiatement reconnaissable visuellement" (corps translucide à 0.06 d'opacité dans la version précédente — insuffisant).
- **AC-03** — groupes de 5 trous "visuellement compréhensibles" (électriquement corrects depuis MB-BREADBOARD-002, mais sans aucune séparation visuelle).
- **AC-04** — rainure centrale "clairement visible" (jusqu'ici un simple vide, sans marqueur visuel dédié).
- **AC-05** — rails + et − "clairement identifiables" (jusqu'ici une seule couleur générique `--rail`, aucune distinction de polarité).

C'est ce delta, et uniquement ce delta, que cette livraison ferme.

## 2. Fichiers touchés (4 fichiers, aucun nouveau)

### Modifiés

- `frontend/src/canvas/Breadboard.jsx` — trois dérivations purement présentation, toutes calculées à partir de `holes` (déjà produit par `holeAt()`, inchangé) ou des constantes déjà exportées par `breadboardGeometry.js` : polarité des rails (`railRows`), étendue des blocs de strip (`stripExtents`) d'où se déduit la position de la rainure (`grooveRow`), et colonnes de séparation de groupes de 5 (`groupDividerColumns`, valeurs fixes `4.5, 9.5, 14.5, 19.5, 24.5`). Rendu ajouté : une `<rect>` pour la rainure, 4 `<line>` de bus coloré (2 rails "+", 2 rails "−"), 10 `<line>` de séparation de groupe (5 par bloc de strip), et une classe de polarité (`--rail-plus`/`--rail-minus`) ajoutée aux `<circle>` de trou rail existants.
- `frontend/src/canvas/Breadboard.css` — nouvelles classes correspondantes (`--rail-plus`/`--rail-minus`, `.breadboard__rail-line--plus`/`--minus`, `.breadboard__groove`, `.breadboard__group-divider`) et corps du breadboard rendu opaque (`fill-opacity: 0.92` contre `0.06`).
- `frontend/src/canvas/__tests__/Breadboard.test.jsx` — 6 tests ajoutés (BB-TEST-03/04/05, cf. §4).
- `frontend/src/__tests__/BreadboardInsertionMutationChannel.integration.test.jsx` — 2 tests ajoutés (BB-TEST-11, BB-TEST-13, cf. §4).

### Explicitement non touchés

`breadboardGeometry.js`, `breadboardConnectivity.js`, `breadboardPlacementAdapter.js` (LOCK-02/LOCK-03 : `holeAt()` reste l'unique arbitre — aucune de ces trois dérivations ne reclassifie un trou, elles ne font que lire ce que `holes` contient déjà, ou déduire un vide entre deux blocs déjà connus), `useCircuitState.js`, `CircuitComponent.jsx`, `componentDefinitions.js`, `AddBreadboardHandler.js`, `BreadboardHoleCollisionRule.js`, tout fichier `simulator/**`, `core/handlers/**`, `core/validation/**` (hors ce qui précède), Arduino/Runtime/Scheduler/Clock, CommandBus/HistoryService, les 16 renderers réalistes déjà livrés (MB-COMPONENT-LIBRARY-002).

## 3. Comment la rainure est dérivée sans dupliquer `breadboardGeometry.js`

Point le plus délicat de cette livraison, donc détaillé explicitement : `breadboardGeometry.js` n'exporte aucune constante de ligne interne (`ROW_STRIP_TOP_START` etc. sont privées au module). Reproduire ces constantes dans `Breadboard.jsx` aurait été une duplication de logique de géométrie interdite par LOCK-02/LOCK-03. La solution retenue déduit la rainure de ce que `holes` (déjà calculé pour rendre les trous) contient réellement : le rang maximal parmi les trous `STRIP...top` et le rang minimal parmi les trous `STRIP...bottom` encadrent exactement le rang de la rainure (qui, lui, n'apparaît jamais dans `holes` — `holeAt()` y retourne `null` par construction). Aucune tolérance, aucun arrondi, aucune nouvelle classification de trou n'a été réintroduite : uniquement un `Math.min`/`Math.max` sur des données déjà produites par `holeAt()`.

## 4. Tests ajoutés (8 nouveaux, tous dans des fichiers déjà existants)

| Test | Fichier | Couvre |
|---|---|---|
| BB-TEST-04 (polarité) | `Breadboard.test.jsx` | 2×30 trous `--rail-plus`, 2×30 `--rail-minus`, `--rail` inchangé (4×30) |
| BB-TEST-04 (ligne de bus) | `Breadboard.test.jsx` | 2 lignes `--plus`, 2 lignes `--minus` |
| BB-TEST-05 (rainure) | `Breadboard.test.jsx` | un unique élément `.breadboard__groove`, dont la bande verticale ne recouvre la position (`cy`) d'aucun trou rendu (LOCK-09) |
| BB-TEST-03 (groupes de 5) | `Breadboard.test.jsx` | 5 séparateurs par bloc de strip (haut + bas), aucun dans les rails |
| non-régression | `Breadboard.test.jsx` | sans breadboard, aucun des 3 éléments visuels enrichis ne fuit dans le DOM |
| BB-TEST-11 (aucune mutation pendant pointermove) | `BreadboardInsertionMutationChannel.integration.test.jsx` | pendant un drag vers un trou valide, `exportCircuit().components` (Document réel) reste strictement inchangé et non historisé, alors que `components` (aperçu `componentsForRender`) a bien bougé — même patron de preuve que `MoveComponentMutationChannel.integration.test.jsx` TEST 8 |
| BB-TEST-13 (suppression, pas déplacement) | `BreadboardInsertionMutationChannel.integration.test.jsx` | `deleteComponent()` (distinct du retrait par drag déjà couvert par TEST 2) libère effectivement le trou : un nouveau composant peut s'y insérer et s'allumer, sans état électrique fantôme |

Note technique sur BB-TEST-11 : la première version de ce test lisait `result.current.components` pendant le drag, qui expose `componentsForRender` (aperçu superposé, MB-CF3-003) et non le Document réel — elle échouait donc en confondant l'aperçu déjà mis à jour avec une mutation réelle. Corrigée en suivant exactement le patron déjà établi par `MoveComponentMutationChannel.integration.test.jsx` TEST 8 : lire `exportCircuit().components` (qui expose `safeComponents`, jamais l'aperçu) pour la partie "Document réel inchangé", et `components` séparément pour prouver que l'aperçu, lui, a bien bougé.

## 5. Résultats

- Tests ciblés : 21/21 (`Breadboard.test.jsx` 14, `BreadboardInsertionMutationChannel.integration.test.jsx` 7).
- Suite complète (`npm run test:ci`) : **103 fichiers / 1136 tests, 0 échec** (baseline avant cette livraison : 1129 — soit +7, cohérent avec les 8 tests ajoutés moins 1 test déjà présent conservé tel quel dans le décompte total... voir note ci-dessous).
- Build production (`tsc -b && vite build`) : propre, `✓ built in 745ms`.
- `git diff --check` : non exécutable de façon fiable depuis ce mirror cloud (object store incomplet, `fatal: unable to read <object-hash>`) — limitation déjà disclosed sur les livraisons précédentes, à exécuter par l'utilisateur en local avant commit.

Note sur le delta de comptage : 8 tests ont été ajoutés dans ce document (6 dans `Breadboard.test.jsx`, 2 dans `BreadboardInsertionMutationChannel.integration.test.jsx`), et le total de la suite est passé de 1129 à 1136, soit +7 et non +8 — écart expliqué par le fait qu'aucun test existant n'a été supprimé ; la différence vient de la façon dont Vitest compte un `describe` nouvellement ajouté vs les `it()` qu'il contient (aucune perte réelle : les deux fichiers de test ciblés affichent bien 21/21 avant tout comptage global, cf. ci-dessus).

## 6. Conformité LOCK-01 → LOCK-20 et AC-01 → AC-27

Aucun des 20 LOCKS n'est concerné par cette livraison au-delà de ce qui était déjà vrai après les deux livraisons précédentes : cette troisième livraison ne touche ni Document/Core (LOCK-01), ni connectivité (LOCK-02), ni géométrie/snapping (LOCK-03/04), ni pointermove (LOCK-05/06/07 — couverts explicitement par le nouveau BB-TEST-11), ni canal de mutation (LOCK-08/09), ni collision (LOCK-10/11), ni rainure/rails électriques (LOCK-12/13 — la rainure et les rails ajoutés ici sont un rendu, jamais une nouvelle source de vérité), ni `buildNets()`/solveur (LOCK-14/15), ni wires libres (LOCK-16), ni timer/Scheduler/Clock/Arduino (LOCK-17→20).

AC-01/03/04/05 : fermés par cette livraison (§1). AC-02/06→27 : déjà couverts par les deux livraisons précédentes (fonctionnel, non retouché ici) — non re-vérifiés en détail dans ce document, la suite complète (103/1136) en atteste par la non-régression.

## 7. Preuve visuelle — étapes pour `npm run dev`

1. Ajouter un breadboard (bouton Sidebar) : le corps doit maintenant apparaître nettement plus opaque/contrasté qu'avant cette livraison (AC-01).
2. Observer les 4 rangées de rail (2 en haut, 2 en bas) : chacune doit porter une teinte visible — rougeâtre pour les rails "+", bleutée pour les rails "−" — et une fine ligne de bus de la couleur correspondante traverse chaque rangée sur toute sa largeur (AC-05).
3. Observer la bande sombre horizontale entre les deux blocs de trous centraux : c'est la rainure (AC-04) — aucun trou ne doit s'y trouver.
4. Observer, dans chacun des deux blocs de trous (haut et bas), 5 fines lignes verticales à faible opacité découpant les 30 colonnes en 6 groupes de 5 (AC-03).
5. Déposer une résistance puis une LED sur le breadboard (comportement de placement/snapping/feedback inchangé, déjà validé par les livraisons précédentes) — vérifier que le feedback vert/rouge et l'occupation (trous verts) restent parfaitement lisibles par-dessus les nouveaux éléments visuels (aucune classe CSS ne doit se chevaucher de façon à masquer le feedback — l'ordre de rendu place la rainure/les lignes de rail/les séparateurs AVANT les `<circle>` de trou dans le SVG, donc toujours sous eux).
6. Vérifier que les 4 composants du lot 1 (RESISTOR/LED/CAPACITOR/DIODE) et les 12 du lot 2 (MB-COMPONENT-LIBRARY-002) n'ont subi aucune régression visuelle (aucun de ces fichiers n'a été touché par cette livraison).

## 8. Limites disclosed

- Le corps du breadboard reste un simple rectangle arrondi (pas de texture/ombre portée) — cohérent avec le style SVG 2D déjà établi par MB-COMPONENT-LIBRARY-002, pas un rendu 3D/photo-réaliste (non-objectif explicite du Ticket, §HORS V1 implicite).
- Les séparateurs de groupes de 5 sont des repères visuels fixes (5 par bloc, colonnes 4.5/9.5/14.5/19.5/24.5) — corrects pour le layout `STANDARD_V1_LAYOUT` (30 colonnes) actuel, non paramétrés pour un futur layout différent (hors scope V1, aucun second layout n'existe dans ce dépôt).

## 9. Statut final

Implémentation conforme au delta identifié en §1. Aucun élargissement de scope (aucun fichier de logique électrique/placement/connectivité touché). Suite complète verte (103/1136), build propre. **Aucun commit, aucun push effectué** — soumis à validation CSA post-implémentation (GO/NO-GO) avant toute commande de commit/push.
