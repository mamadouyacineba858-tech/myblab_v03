# Delivery Report — MB-BREADBOARD-003

## 1. Identité

| Champ | Valeur |
|---|---|
| Ticket | `MB-BREADBOARD-003` — Assembly Interaction V1 |
| Blueprint | `docs/pmo/blueprints/MB-BREADBOARD-003-assembly-interaction-blueprint.md` |
| Audit pré-implémentation | `docs/pmo/tickets/MB-BREADBOARD-003.md` §Note d'audit (Étape 1/2) |
| CSA Ruling autorisant l'implémentation | **CSA FINAL RULING — MB-BREADBOARD-003** (GO, sign-off/audit pré-implémentation levés explicitement pour la suite du ticket) |
| Statut de ce rapport | **STOP avant commit, conformément à l'instruction explicite de la CSA Ruling** : « Aucun commit. Aucun push. » — ce rapport est soumis à validation CSA post-implémentation |

## 2. Fichiers touchés

### Nouveaux

- `frontend/src/utils/breadboardPlacementAdapter.js` — fonction pure `computeBreadboardPlacement()` (Blueprint §2) : snapping d'un composant 2-pins sur le breadboard le plus proche, via `holeAt()` seul (aucune réimplémentation de la tolérance d'insertion — voir §3 point 3).
- `frontend/src/utils/__tests__/breadboardPlacementAdapter.test.js` (10 tests).
- `frontend/src/core/validation/rules/structural/BreadboardHoleCollisionRule.js` — règle `STR-007` (Blueprint §4, LOCK-12/AC-12/AC-13) : bloque toute commande `ADD_COMPONENT`/`MOVE_COMPONENT` qui ferait coïncider 2+ pins distinctes sur le même trou exact d'un breadboard.
- `frontend/src/core/validation/__tests__/rules/BreadboardHoleCollisionRule.test.js` (10 tests).
- `frontend/src/__tests__/BreadboardInsertionMutationChannel.integration.test.jsx` (5 tests) — preuve end-to-end réelle (Blueprint §9) : hook `CircuitProvider` complet, vrai `CommandRegistry`, vrai `ValidationEngine`, vrai flux pointer (`startDrag`/`window pointermove`/`window pointerup`), aucun Document construit à la main. Couvre UI-04/05/06/08/10/11/12/13 (placement, snapping, insertion, occupation, nets, simulation, retrait, rupture, réinsertion, reconstruction) et le rejet silencieux d'une collision (Q4).
- `docs/pmo/delivery-reports/MB-BREADBOARD-003-delivery-report.md` (ce document).

### Modifiés

- `frontend/src/config/componentDefinitions.js` (Blueprint §1) — `dx`/`width` corrigés de `90` → `84` pour `RESISTOR`/`LDR`/`THERMISTOR`/`DIODE`/`DC_MOTOR` (multiple exact de `BREADBOARD_PITCH=12`, condition nécessaire à ce que ces 5 types puissent avoir leurs deux pattes simultanément sur des trous valides — vérifié numériquement, cf. audit).
- `frontend/src/config/__tests__/componentDefinitionsBoundary.test.js` — assertion `width: 90` → `84` pour `RESISTOR`.
- `frontend/src/components/parts/ResistorPart.jsx` / `DiodePart.jsx` — SVG `viewBox`/`width`/patte droite ajustés de 90 → 84 en cohérence avec `componentDefinitions.js` (ces deux fichiers redéfinissaient indépendamment leurs dimensions, testé par `RealisticRenderers.test.jsx`).
- `frontend/src/utils/__tests__/breadboardConnectivity.test.js`, `frontend/src/simulator/__tests__/engineAdapter.test.js`, `frontend/src/simulator/__tests__/breadboardSimulationIntegration.test.js`, `frontend/src/measurement/__tests__/breadboardMeasurementIntegration.test.js`, `frontend/src/canvas/__tests__/Breadboard.test.jsx` — fixtures RESISTOR ajustées suite à la correction `dx: 90 → 84` (voir §3 point 1 pour le détail par fichier).
- `frontend/src/utils/breadboardPlacementAdapter.js` *(nouveau, déjà listé ci-dessus)*.
- `frontend/src/hooks/useCircuitState.js` (Blueprint §3/§6, + correctifs §3 points 2 et 4) :
  - `type` capturé dans `session.componentsStart` à `startDrag()` (nécessaire à `computeBreadboardPlacement()`).
  - `handlePointerMove` : snapping breadboard-aware par composant déplacé (repli strict sur `snapToGrid` si `breadboardActive` est faux — non-régression LOCK-13/AC-20).
  - Nouvel état `breadboardFeedback` (Presentation-only, même patron que `dragPreview`), nettoyé systématiquement dans `handlePointerUp`/`handlePointerCancel`/`handleBlur`/`clearCircuit`/`importCircuit`, exposé par le hook.
  - `exportCircuit()`/`importCircuit()` incluent/restaurent désormais `breadboard` (AC-23).
  - **Correctif disclosed (§3 point 4)** : le `coreDoc` construit localement par le `useMemo` `pinSignals` n'incluait pas `breadboard` — corrigé.
- `frontend/src/canvas/Breadboard.jsx` / `Breadboard.css` (Blueprint §5) — occupation `Set<"col:row">` → `Map<"col:row", Set<uid>>` ; nouveau prop `breadboardFeedback` ; nouvelles classes `.breadboard__hole--feedback-valid`/`--feedback-invalid` (vert/rouge, AC-08/AC-09).
- `frontend/src/canvas/SimulationCanvas.jsx` — transmission du nouveau prop `breadboardFeedback` à `<Breadboard>`.
- `frontend/src/core/validation/rules/index.js` — export + ajout de `BreadboardHoleCollisionRule` à `ALL_VALIDATION_RULES`.
- `frontend/src/__tests__/AddBreadboardMutationChannel.integration.test.jsx` — extension AC-23/UI-15 (4 nouveaux tests : export inclut breadboard, export sans breadboard reste `null`, round-trip export→import restaure breadboard, import sans breadboard réinitialise à `null`).
- **`frontend/src/utils/circuitModel.js` — fichier non prévu par le Blueprint §7, ajouté en cours d'implémentation (voir §3 point 2, déviation disclosed) : `normalizeComponent()` n'applique plus `snapToGrid()` à `x`/`y`.**

### Explicitement non touchés (conforme §7/§10 du Blueprint et à la CONTRAINTE MAJEURE de la CSA Ruling)

`simulator/**` (engine.js, preparation.js, resolution.js, simulationRuntimeIntegration.js, canonicalRegistry.js — `engineAdapter.js` non plus, déjà branché par MB-BREADBOARD-002), `core/validation/rules/shared/nets.js`, `core/validation/rules/shared/documentHelpers.js`, `frontend/src/utils/breadboardGeometry.js`/`breadboardConnectivity.js` (consommés tels quels), `core/handlers/breadboard/AddBreadboardHandler.js`, tout fichier Arduino/Runtime, Scheduler/Clock, `core/validation/createValidationRegistry.js` (itère déjà `ALL_VALIDATION_RULES`), MB-OBS-003.

## 3. Écarts par rapport au Blueprint (découvertes en cours d'implémentation, non silencieuses)

Trois écarts substantiels ont été trouvés en implémentant — chacun aurait, s'il n'avait pas été corrigé, rendu le scénario de preuve Canvas obligatoire du ticket (§9, LED insérée sur breadboard et allumée) silencieusement impossible ou incorrect. Aucun n'a été corrigé sans être d'abord vérifié et documenté ici, conformément à la discipline déjà appliquée pour le blocage géométrique RESISTOR/DIODE/LDR/THERMISTOR/DC_MOTOR (§1, déjà validé par la CSA avant cette implémentation).

### 3.1 Cascade du changement géométrique `dx: 90 → 84` (Blueprint §1, anticipé)

Conformément à ce que le Blueprint §1 annonçait explicitement comme conséquence à traiter : 6 fichiers de test cassaient après le changement `dx`/`width` (5 échecs de test + 1 mismatch SVG), tous corrigés en préservant l'intention originale de chaque test plutôt qu'en les faisant simplement repasser au vert :

- `breadboardConnectivity.test.js` : `R1`/`R2` à la même position partagent désormais leurs DEUX pins (A et B, puisque `dx=84` est un multiple exact de `BREADBOARD_PITCH`) — les tests `TB-01`/`TB-07`/`TB-08` attendaient 1 arête, en attendent désormais 2 (comportement électriquement correct et attendu — avant la correction, le pin B d'un RESISTOR ne se connectait jamais réellement au breadboard).
- `engineAdapter.test.js` : même cause, `TB-01`/`TB-06` ajustés en conséquence.
- `breadboardSimulationIntegration.test.js`/`breadboardMeasurementIntegration.test.js`/`Breadboard.test.jsx` : la fixture RESISTOR positionnait `x` en supposant `dx=90` pour faire coïncider le pin B avec un trou cible précis ; `x` décalé de `+6` pour préserver exactement la même coïncidence de trou avec `dx=84`.
- `RealisticRenderers.test.jsx` (aucune modification de test nécessaire, seulement `ResistorPart.jsx`/`DiodePart.jsx`) : ces deux composants redéfinissaient indépendamment leurs dimensions SVG (`viewBox`/`width`), non dérivées de `componentDefinitions.js` — ajustés à l'identique (84, patte droite raccourcie en conséquence, corps inchangé).

### 3.2 Algorithme de snapping généralisé — LED/POWER auraient été structurellement insérables nulle part (Blueprint §2)

Le Blueprint §2 décrivait un algorithme en 2 étapes : aligner `pins[0]` EXACTEMENT sur le trou le plus proche (résidu 0 modulo `BREADBOARD_PITCH`), puis vérifier les pins restantes. Cet algorithme suppose implicitement que l'écart entre `pins[0]` et chaque autre pin est un multiple exact de `BREADBOARD_PITCH` — vrai pour les 5 types corrigés au §1 (écart 84) et pour BUTTON/BUTTON_LATCHING (écart 60), mais **faux pour LED** (écart `dx` 80 : distance 4 au multiple de 12 le plus proche, hors tolérance d'insertion) **et pour POWER** (écart `dy` 40 : même problème, distance 4, sur l'axe vertical). CAPACITOR (écart 70) et BUZZER (écart 50) fonctionnaient avec l'algorithme littéral, mais seulement à la limite exacte de la tolérance (distance 2 = tolérance 2) — un cas fragile, pas une garantie structurelle.

Avec l'algorithme littéral du Blueprint, **LED n'aurait jamais pu atteindre `valid:true`, à aucune position** — ce qui aurait rendu impossible le scénario de preuve Canvas obligatoire de la CSA Ruling elle-même (« 5V→Rail+→Résistance→LED→Rail−→GND »), qui exige explicitement une LED insérée avec succès sur breadboard.

Vérifié numériquement (brute-force sur les résidus modulo 12) que LED **est** géométriquement compatible : il existe des positions (ex. `componentX ≡ 2 (mod 12)`) où les deux pins résolvent un trou valide — seul l'algorithme « résidu de `pins[0]` forcé à 0 » ne les trouvait pas.

**Correction** : `computeBreadboardPlacement()` explore une fenêtre de positions entières autour de `candidatePosition` (rayon `BREADBOARD_PITCH`, largement suffisant pour couvrir une période complète de résidus valides en X ; en Y, la mise en évidence empirique montre qu'un pas adjacent suffit pour les composants concernés) et retient, via `holeAt()` comme SEUL oracle (jamais de réimplémentation de la tolérance d'insertion, qui reste privée à `breadboardGeometry.js`, non touché), la position valide la plus proche. Un sur-ensemble strict de l'algorithme d'origine : résultat identique pour tous les types déjà conformes à résidu 0 (RESISTOR/DIODE/LDR/THERMISTOR/DC_MOTOR/BUTTON/BUTTON_LATCHING), résultat corrigé pour LED/POWER. Contrat de la fonction (signature, forme du retour) strictement inchangé.

Preuve dédiée : `breadboardPlacementAdapter.test.js` inclut un cas explicite prouvant que LED atteint `valid:true` malgré l'écart non multiple de `BREADBOARD_PITCH`, y compris depuis une position où l'ancrage naïf (résidu 0) échouerait.

### 3.3 `normalizeComponent()` écrasait silencieusement toute position breadboard après chaque cycle de rendu (`frontend/src/utils/circuitModel.js`, non prévu par le Blueprint §7)

Découverte tardive, via `BreadboardInsertionMutationChannel.integration.test.jsx` (TEST 1) : le test attendait que le RESISTOR se pose exactement à `(58, 21)` après un drag réel — le Document réel le confirmait à ce point du pipeline, mais **le composant apparaissait finalement à `(60, 20)`**.

Cause : `normalizeComponent()` (`circuitModel.js`) applique inconditionnellement `snapToGrid()` (`GRID_SIZE=20`) à `x`/`y` — un comportement invisible jusqu'à ce ticket car **tout** appelant qui construit une position destinée à être persistée l'aligne déjà lui-même explicitement sur `GRID_SIZE` avant d'atteindre ce point (`addComponent()`, le repli de drag « hors breadboard » dans `useCircuitState.js`, `documentApi.updateComponentPositions()` pour le canal legacy `MoveCommand.js`) — un second alignement n'était donc jamais qu'une redondance sans effet observable. MB-BREADBOARD-003 introduit le premier cas où une position **persistée** est intentionnellement PAS un multiple de `GRID_SIZE` (alignée sur `BREADBOARD_PITCH=12`) : `normalizeComponent()`, appelé par `applyDocument()` (donc après **toute** commande CommandBus, pas seulement `MOVE_COMPONENT`) et par `importCircuit()`, écrasait silencieusement cet alignement au tour de rendu suivant — cassant à la fois l'affichage ET la connectivité électrique dérivée de la position (`holeAt()`), et empêchant AC-23 (export/import round-trip) de préserver fidèlement une position breadboard exportée.

Ce bug était invisible à MB-BREADBOARD-002 et à `breadboardSimulationIntegration.test.js`/`breadboardMeasurementIntegration.test.js` car ces derniers construisent leurs Documents Core directement (sans jamais passer par `applyDocument()`/le cycle React réel) — seul un test exerçant le cycle complet `CommandBus → applyDocument → rendu` pouvait le révéler.

**Correction** : `normalizeComponent()` ne fait plus que garantir un nombre fini (défaut `0`) — plus aucun alignement de grille, qui n'est de toute façon jamais de sa responsabilité (déjà décidé par l'appelant partout ailleurs). Non-régression vérifiée : aucun appelant existant ne dépendait de ce second snap (toutes les positions qui l'atteignaient étaient déjà des multiples de `GRID_SIZE` par construction — confirmé par la suite complète, 0 régression, y compris `MoveComponentMutationChannel.integration.test.jsx` TEST 9, qui asserte explicitement `% GRID_SIZE === 0` sur un drag hors-breadboard).

### 3.4 `pinSignals` ne voyait jamais la connectivité breadboard en simulation LIVE (`useCircuitState.js`, disclosed)

Deuxième découverte via le même test : après correction du point 3.3, les positions étaient exactes mais la LED restait éteinte en simulation. Cause : le `useMemo` `pinSignals` construit **son propre** Document Core localement (`ReactDocumentMapper.toCore({components, wires})`) — à la différence de `documentApi.getDocument()` (qui inclut `breadboard` depuis MB-BREADBOARD-002) — et **n'incluait jamais `breadboard`**. Conséquence : `toEngineInput()` ne recevait jamais de breadboard à cet endroit, donc `deriveBreadboardVirtualWiresBridge()` ne produisait jamais aucune arête pour la simulation **live** affichée à l'utilisateur, bien que la connectivité breadboard elle-même soit correcte et déjà prouvée par `breadboardSimulationIntegration.test.js` (MB-BREADBOARD-002) — sur un Document construit à la main, hors du hook, jamais sur le chemin réel du Canvas.

**Correction** : `breadboard` ajouté au `coreDoc` de `pinSignals`, et à son tableau de dépendances `useMemo`.

### 3.5 Id de règle corrigé : `STR-005` → `STR-007`

Le Blueprint §4 proposait l'id `STR-005` pour `BreadboardHoleCollisionRule`. Ce préfixe est déjà pris par `ReferenceCoherenceRule` (MB-CF4-001) ; `STR-006` est également pris (`WireWaypointsStructureRule`, MB-VIS-005). Utilisé `STR-007`, le prochain id structurel disponible — aucun autre changement de comportement.

Ces cinq écarts n'ont réduit aucune couverture fonctionnelle exigée par les LOCK/AC/UI du ticket ; au contraire, trois d'entre eux (§3.2, §3.3, §3.4) corrigent des défauts qui auraient rendu la fonctionnalité livrée silencieusement non opérationnelle malgré une apparence de conformité au niveau unitaire.

## 4. Tests exécutés et résultats

```
Après le lot de correction géométrique (§3.1, avant toute nouvelle fonctionnalité) :
npm run test:ci
  Test Files  99 passed (99)
  Tests       1031 passed (1031)

Après l'implémentation complète (adaptateur + règle STR-007 + snapping/feedback
useCircuitState.js + Presentation + AC-23 + correctifs §3.3/§3.4) :
npm run test:ci
  Test Files  102 passed (102)
  Tests       1064 passed (1064)
  Duration    ~40s

npm run build
  tsc -b && vite build → ✓ built in 1.06s, aucune erreur
```

Avant ce ticket (référence connue, commit `176b516`) : 99 fichiers / 1031 tests. Après ce ticket : **102 fichiers / 1064 tests** — soit **3 nouveaux fichiers de test / 33 nouveaux tests** (`breadboardPlacementAdapter.test.js` : 10, `BreadboardHoleCollisionRule.test.js` : 10, `BreadboardInsertionMutationChannel.integration.test.jsx` : 5, `Breadboard.test.jsx` : +4 sur 5 existants, `AddBreadboardMutationChannel.integration.test.jsx` : +4 sur 5 existants), **zéro régression** sur l'ensemble des 1031 tests préexistants.

`git diff --check` : comme pour MB-BREADBOARD-002, ce miroir cloud ne conserve pas l'historique Git complet (`git diff` échoue avec `fatal: unable to read <objet>`) — à exécuter côté poste local. **Note additionnelle** : `git status` sur ce miroir affiche également comme modifiés/non suivis plusieurs fichiers antérieurs à ce ticket (déjà commités et poussés par toi en `176b516` d'après notre échange précédent, ex. `breadboardConnectivity.js`, `Breadboard.jsx` MB-BREADBOARD-002, `MB-OBS-001*`, `cf1DocumentArchitecture.test.js`) — signe que l'index Git de ce miroir n'est pas synchronisé avec `origin/main` (jamais re-synchronisé depuis ton dernier push local). Le §5 ci-dessous liste donc explicitement, à la main, les seuls fichiers réellement touchés par CE ticket (§2) — ne te fie pas à un `git status`/`git diff` lancé depuis ce miroir pour vérifier le scope : vérifie plutôt localement, sur ton poste, où l'index Git est fiable.

### Correspondance avec les tests obligatoires (§6 du ticket, Blueprint §8)

| Test | Statut | Où |
|---|---|---|
| UI-01 (rendu grille) | ✓ (déjà couvert MB-BREADBOARD-002) | `Breadboard.test.jsx` |
| UI-02/03/07/09 (snapping résistance/LED, rainure, déplacement) | ✓ | `breadboardPlacementAdapter.test.js` |
| UI-04/05/06/08/10/11/12/13 (insertion, occupation, nets, simulation, retrait, rupture, réinsertion, reconstruction) | ✓ | `BreadboardInsertionMutationChannel.integration.test.jsx` |
| UI-14 (preuve simulation atteignable par insertion réelle) | ✓ | `BreadboardInsertionMutationChannel.integration.test.jsx` TEST 1 (réutilise le patron `breadboardSimulationIntegration.test.js`, désormais via une insertion réelle) |
| UI-15 (export/import round-trip) | ✓ | `AddBreadboardMutationChannel.integration.test.jsx` TEST 6-9 |

## 5. Vérification du scope (fichiers réellement touchés par ce ticket)

Liste exhaustive, exactement celle du §2 ci-dessus — 5 nouveaux fichiers de production/test + 1 nouveau rapport, 11 fichiers modifiés (dont 5 fixtures de test ajustées suite à §3.1, et **1 fichier non prévu par le Blueprint §7** : `circuitModel.js`, §3.3, resté strictement dans le scope fonctionnel de MB-BREADBOARD-003 — un seul comportement changé, la suppression d'un double alignement de grille redondant qui cassait spécifiquement les positions breadboard). Aucun fichier de la liste « explicitement non touchés » (§2) n'a été modifié.

## 6. Preuve fonctionnelle réelle dans le Canvas (parcours manuel, `npm run dev`)

Conformément à l'arbitrage Q3 (Blueprint §0) et à la CSA Ruling (« PREUVE CANVAS OBLIGATOIRE ») : les tests automatisés ci-dessus (§4) constituent la preuve la plus proche du Canvas réel possible sans mock ni Document construit à la main. Le parcours manuel suivant reste la validation finale, à effectuer sur ta machine :

1. `npm run dev`, ouvrir l'application.
2. Poser un breadboard (via la commande `addBreadboard()` — **note disclosed, héritée de MB-BREADBOARD-002 §5.2, inchangée par ce ticket** : aucune affordance UI/bouton n'existe encore pour déclencher `addBreadboard()` depuis l'interface ; à défaut d'un tel bouton, l'appeler depuis la console DevTools via le contexte React, ou me signaler si tu veux que j'ajoute ce bouton dans un ticket séparé).
3. Déposer une résistance et une LED sur le canevas (Sidebar → Drag & Drop, comportement inchangé, Q2).
4. Faire glisser la résistance vers le breadboard : elle doit s'aligner (« snap ») visuellement sur deux trous adjacents dès qu'elle entre dans l'empreinte du breadboard, avec un retour vert pendant le drag.
5. Faire glisser la LED vers une colonne partageant un bus avec la patte B de la résistance (même colonne, rangée différente dans la même bande 3-7 ou 9-13) : retour vert également.
6. Câbler `POWER.5V → RESISTOR.A` et `LED.cathode → POWER.GND` (wires explicites, comme aujourd'hui).
7. Démarrer la simulation : la LED doit s'allumer, sans qu'aucun wire explicite ne relie `RESISTOR.B` à `LED.anode` — la connexion passe uniquement par le breadboard.
8. Retirer la LED du breadboard (drag hors de son empreinte) : la LED s'éteint.
9. La réinsérer au même endroit : elle se rallume.
10. Tenter d'insérer un second composant sur un trou déjà occupé (ex. la même colonne/rangée exacte que la patte A de la résistance) : le relâchement doit être silencieusement rejeté — le composant revient à sa position d'origine, sans message d'erreur (comportement volontaire, arbitrage Q4).

## 7. Invariants (LOCK-01 à LOCK-13) — statut

Tous respectés par la conception retenue : LOCK-01→11 hérités de MB-BREADBOARD-002, inchangés (aucun fichier de leur périmètre modifié — §2 « explicitement non touchés »). LOCK-12 (un trou = une seule patte) : appliqué par `BreadboardHoleCollisionRule` (STR-007), testé (`BreadboardHoleCollisionRule.test.js`, `BreadboardInsertionMutationChannel.integration.test.jsx` TEST 4). LOCK-13 (non-régression du canevas libre) : `computeBreadboardPlacement()` ne s'active que dans l'empreinte du breadboard pour un type 2-pins ; hors de ces conditions, `snapToGrid`/`GRID_SIZE` reste strictement le comportement d'avant ce ticket (testé, `BreadboardInsertionMutationChannel.integration.test.jsx` TEST 5).

Non-goals confirmés inchangés (Blueprint §10, CONTRAINTE MAJEURE de la CSA Ruling) : aucune commande CF3 nouvelle ; `buildNets()`/`prepareCircuit()`/`nets.js`/`preparation.js`/`resolution.js`/`engine.js` non modifiés ; `ADD_BREADBOARD` inchangé ; aucun feedback en direct pour le dépôt depuis la barre latérale (Q2) ; aucune détection de collision rétroactive lors d'un `ADD_BREADBOARD` sur un canevas déjà peuplé (non-goal disclosed du Blueprint §4, toujours vrai) ; Arduino/Runtime, Scheduler/Clock, MB-OBS-003 non touchés ; comportement des circuits sans breadboard strictement inchangé (coût nul, `document.breadboard` absent → toutes les nouvelles vérifications court-circuitent immédiatement).

## 8. Limites disclosed, non traitées par ce lot (héritées ou nouvelles)

- Aucune affordance UI pour poser un breadboard depuis l'interface (héritée de MB-BREADBOARD-002 §5.2, non demandée par ce ticket).
- `ADD_BREADBOARD` sur un canevas déjà peuplé ne détecte pas rétroactivement une collision préexistante (non-goal disclosed, Blueprint §4).
- Le dépôt initial depuis la barre latérale (Drag & Drop HTML5) ne bénéficie d'aucun feedback breadboard en direct — seul le repositionnement d'un composant déjà présent en bénéficie (arbitrage Q2, Blueprint §0).

## 9. Conclusion et demande

L'implémentation couvre l'intégralité du scénario mandaté par la CSA Ruling (placement, snapping, insertion, occupation, nets, simulation, retrait, rupture, réinsertion, reconstruction, export/import), avec preuve automatisée de bout en bout via le hook réel (§4) et un parcours manuel prêt à exécuter (§6). Trois défauts réels et matériels (§3.2 LED/POWER structurellement non insérables, §3.3 corruption silencieuse des positions breadboard après chaque rendu, §3.4 connectivité breadboard invisible à la simulation live) ont été trouvés et corrigés en cours d'implémentation — chacun aurait, seul, rendu le scénario de preuve Canvas obligatoire silencieusement impossible ou incorrect malgré des tests unitaires verts. Un id de règle a été corrigé (§3.5). Tous divulgués ici plutôt que corrigés silencieusement, conformément à la discipline déjà appliquée pour le blocage géométrique du §1.

Conformément à l'instruction explicite de la CSA Ruling : **aucun commit n'a été effectué, aucun push.** Ce rapport est soumis pour validation CSA post-implémentation.
