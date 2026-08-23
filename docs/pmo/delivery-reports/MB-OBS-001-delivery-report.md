# Delivery Report — MB-OBS-001

## A. Identité & Traçabilité

| Champ | Valeur |
|---|---|
| `Report-ID` | `MB-OBS-001-report` |
| `Ticket-ID` | `docs/pmo/tickets/MB-OBS-001.md` |
| `Blueprint-ID` | `docs/pmo/blueprints/MB-OBS-001-observation-contract-blueprint.md` |
| `Commit(s) produit(s)` | Deux commits constitutifs distincts — voir tableau ci-dessous |
| `Branche` | `main` (commits locaux, aucun push GitHub) |
| `Date d'exécution` | 2026-08-23 |
| `Autorisation` | CSA GO — MB-OBS-001 (message explicite « CSA GO — MB-OBS-001 »), faisant suite au ruling §R du ticket : « GO — MB-OBS-001 IMPLEMENTATION AUTHORIZED » |

### Chaîne des commits constitutifs

| # | SHA (complet) | SHA (court) | Rôle | Contenu |
|---|---|---|---|---|
| 1 | `081387e21fdc63e70e62f5e9f03a8634e1964b0c` | `081387e` | Commit d'implémentation | `feat(observation): MB-OBS-001 - contrat d'Observation canonique (V1)` — `observationContract.js` + 2 fichiers de test (856 insertions, 3 fichiers) |
| 2 | `e8da7c100796b7fdcb63e45c7b89d9837b431128` | `e8da7c1` | Commit documentaire / Delivery Report | `docs(pmo): MB-OBS-001 delivery report` — ajoute la version initiale du présent rapport (120 insertions, 1 fichier) |

Ces deux SHA ont été revérifiés par `git log --oneline` et `git show --stat <sha> --format='%H%n%s'` au moment de la présente correction (2026-08-23, suite à CSA REVIEW — MB-OBS-001) : les deux correspondent exactement au commit qu'ils prétendent identifier, sans ambiguïté.

**Note de traçabilité :** la version initiale de ce rapport (introduite par le commit #2) ne listait que le commit #1 en §A, alors que le rapport lui-même n'existait pas encore à ce moment-là — il n'a été ajouté qu'ensuite, par le commit #2. C'est exactement l'incohérence relevée par CSA REVIEW — MB-OBS-001. Le présent contenu corrige ce point en listant explicitement les deux commits constitutifs et leur rôle respectif, sans toucher à aucun fichier de code, de test, ni à l'implémentation elle-même (voir §F).

---

## B. Résumé d'exécution

Introduction de `frontend/src/observation/observationContract.js`, frontière canonique unique (`observe(request, components, wires)`) entre les résultats déjà produits par Simulation (`pinSignals`, `dcAnalysis`) et tout futur consommateur. Le module compose `prepareCircuit()` et `resolveSignals()` en lecture seule — exactement le précédent déjà établi par `simulationRuntimeIntegration.js` — sans modifier aucun fichier du solveur. Il supporte les cibles `PIN` (logique, tension, courant) et `NET` (logique uniquement, avec vérification explicite d'uniformité), les grandeurs `LOGICAL_STATE`/`VOLTAGE`/`CURRENT`, et les statuts `VALID`/`UNAVAILABLE`/`INVALID` sans jamais approximer silencieusement un résultat. 38 tests dédiés (27 comportementaux, 11 architecturaux) ont été ajoutés ; la suite complète du dépôt passe à 784/784 (baseline 746 + 38), sans aucune régression.

---

## C. Fichiers modifiés — `[FAIT]`

| Fichier | Nature |
|---|---|
| `frontend/src/observation/observationContract.js` | Créé — module unique du contrat d'Observation (`ObservationStatus`, `ObservationTargetKind`, `ObservationQuantity`, `observe()`) |
| `frontend/src/observation/__tests__/observationContract.test.js` | Créé — 27 tests comportementaux |
| `frontend/src/observation/__tests__/observationArchitecture.test.js` | Créé — 11 tests architecturaux (preuve statique de la frontière) |
| `docs/pmo/delivery-reports/MB-OBS-001-delivery-report.md` | Créé — le présent rapport (commit distinct, voir §I) |

**Aucun fichier existant n'a été modifié.** En particulier, aucun des fichiers explicitement interdits par le CSA GO n'a été touché : `resolution.js`, `preparation.js`, `engine.js`, `useCircuitState.js`, CF3/CommandBus, HistoryManager/HistoryService, Document, Registry, SimulatedClock/Scheduler. Confirmé par `git status --short` (aucune ligne `M`) avant et après le commit `081387e`, et par les tests architecturaux §C ci-dessus qui vérifient statiquement l'absence de toute référence croisée dans les deux sens.

---

## D. Preuves de validation — `[FAIT]`

| Champ | Description |
|---|---|
| `Tests exécutés — commande` | `npm run test:ci` (`vitest --config src/simulator/vitest.config.ts --run`) |
| `Tests exécutés — résultat` | **784/784 tests passants, 74/74 fichiers** (baseline pré-implémentation : 746/746, 72 fichiers ; delta exact : +38 tests / +2 fichiers, les deux nouveaux fichiers de test) |
| `Tests ciblés — commande` | `npx vitest --config src/simulator/vitest.config.ts --run src/observation/__tests__/observationContract.test.js src/observation/__tests__/observationArchitecture.test.js` |
| `Tests ciblés — résultat` | 38/38 passants (27 + 11) |
| `Lint — commande` | `npm run lint` (`eslint .`) |
| `Lint — résultat` | 0 erreur sur les 3 fichiers créés (`npx eslint src/observation/` → aucune sortie). 37 erreurs pré-existantes subsistent ailleurs dans le dépôt, sans rapport avec cette livraison et non introduites par elle (confirmé par comparaison : ces fichiers ne sont pas dans `frontend/src/observation/`) |
| `Build — commande` | `npm run build` (`tsc -b && vite build`) |
| `Build — résultat` | Succès — `✓ built in 897ms`, 143 modules transformés, aucune erreur TypeScript |
| `git diff --check` | Exécuté après `git add` des 3 fichiers de l'implémentation — aucune erreur d'espace blanc |

### Critères d'acceptation du Ticket (§O) — checklist point par point

| AC | Intitulé | Statut réel |
|---|---|---|
| AC-01 | Frontière canonique unique | **CONFORME** — un seul module, un seul export public `observe()` (vérifié statiquement : `export function observe` est la seule fonction exportée `export function`) |
| AC-02 | Isolation du solveur | **CONFORME** — `observe()` est le seul point d'accès ; aucun consommateur externe n'a besoin de `resolveSignals()`/`dcAnalysis`/`pinSignals`/registries. Le module lui-même les compose en interne (précédent `simulationRuntimeIntegration.js`), ce qui est explicitement autorisé par l'audit pré-implémentation |
| AC-03 | Observation logique PIN | **CONFORME** — testé (`LOGICAL_STATE` sur PIN connu et sur PIN non connecté/`UNKNOWN`) |
| AC-04 | Observation de tension PIN | **CONFORME AVEC LIMITATION DOCUMENTÉE** — testé et fonctionnel ; la valeur retournée est `dcAnalysis.voltage`, qui vaut systématiquement la tension d'alimentation (`supplyVoltage`) dans le modèle actuel, jamais un potentiel de nœud calculé indépendamment par pin (voir §E) |
| AC-05 | Observation de courant | **CONFORME AVEC LIMITATION DOCUMENTÉE** — testé ; convention existante (magnitude non signée) préservée sans transformation ; disponible uniquement pour les composants à 2 bornes couverts par `dcContributionRegistry.js` (voir §E) |
| AC-06 | Sémantique non supporté/indisponible | **CONFORME** — testé exhaustivement (grandeur inconnue, cible inconnue, cible malformée, résultat physique indisponible, NET+VOLTAGE/CURRENT, PIN+CURRENT à 3 bornes) ; aucune approximation silencieuse dans aucun cas |
| AC-07 | Déterminisme | **CONFORME** — testé (deux appels identiques → résultat `toEqual`) |
| AC-08 | Intégrité temporelle | **CONFORME** — testé statiquement (aucun import de `clock.js`/`scheduler.js`, aucun `Date.now()`/`performance.now()`/`new Date()`) ; `time` est restitué tel que fourni par l'appelant, jamais recalculé (testé) |
| AC-09 | Intégrité du Document | **CONFORME** — testé (non-mutation de `components`/`wires`/`request` en entrée) et statiquement (aucun import de `core/`, `CommandBus`, `HistoryManager`, `HistoryService`) |
| AC-10 | Compatibilité future | **STRUCTURELLEMENT CONFORME, NON DÉMONTRÉ EMPIRIQUEMENT** — la forme du contrat (`ObservationRequest`/`ObservationResult`) correspond à celle spécifiée aux §F/§G du ticket et est instrument-agnostique par construction ; aucune consommation réelle par `MB-MEASURE-001` ou `MB-OBS-002` n'existe dans le dépôt à ce jour (ces tickets ne sont pas encore implémentés), donc la compatibilité future ne peut être qu'analysée, pas prouvée par un test d'intégration réel |
| AC-11 | Preuve de tests | **CONFORME** — voir tableau ci-dessus ; commandes et résultats exacts enregistrés dans ce rapport |
| AC-12 | Intégrité du périmètre | **CONFORME** — voir §C ; aucun fichier non approuvé ni sous-système sans rapport n'a été modifié, vérifié par `git status --short` |

---

## E. Écarts par rapport au Blueprint — `[FAIT]` + `[ANALYSE]`

**[FAIT]** Deux points d'interprétation ont été nécessaires face à des zones non totalement explicitées par le ticket/blueprint. Aucun des deux ne requiert de nouvelle équation physique, de nouvelle convention de courant, de nouvelle horloge, ni de modification de CF3/History/Document/Registry/solveur — ils restent donc dans le périmètre du GO reçu, sans déclencher de STOP.

1. **Référence de tension (§5 du blueprint, §D du ticket).** Le blueprint exige que `VOLTAGE` soit « single-target potential relative to the simulation's canonical reference » et interdit d'exposer une valeur ambiguë sans référence explicite. Le modèle actuel (`dcAnalysis`, indexé par composant) ne calcule qu'une seule valeur de tension par composant, égale à la tension d'alimentation (`supplyVoltage`) — jamais un potentiel de nœud distinct par pin. **[ANALYSE]** L'implémentation restitue donc cette valeur telle quelle plutôt que d'inventer un calcul de potentiel par pin (ce qui aurait constitué une nouvelle équation physique, explicitement interdite). C'est une limitation réelle du V1 — utile uniquement pour distinguer alimenté/non-alimenté au niveau composant — mais elle respecte strictement la règle « préserver, jamais inventer ».

2. **Uniformité des NET (§11 du blueprint, non explicitement traité par le ticket).** Ni le ticket ni le blueprint ne précisent le comportement attendu si un NET contient des pins dont l'état logique diverge. **[ANALYSE]** Le repli ARDUINO→FLOATING (`resolution.js`, ligne ~85-89) écrit un pin individuellement, sans repasser par `propagate()` — un NET peut donc, dans certains circuits, contenir des membres non uniformes. L'implémentation vérifie explicitement cette uniformité (`values.size !== 1`) et retourne `UNAVAILABLE` plutôt que de choisir arbitrairement la valeur d'un membre. Ce cas est couvert par un test dédié (`divergentNetCircuit`).

3. **Classification INVALID vs UNAVAILABLE pour les combinaisons cible×grandeur non structurellement supportées (NET+VOLTAGE/CURRENT, PIN+CURRENT à 3 bornes).** **[ANALYSE]** Le tableau §H du ticket ne couvre pas nommément ces cas précis. L'implémentation les classe `UNAVAILABLE` (pas `INVALID`) : la requête est structurellement bien formée et la grandeur est reconnue, mais le modèle actuel ne peut pas produire de valeur non ambiguë pour cette combinaison précise — ce qui correspond exactement à la définition d'`UNAVAILABLE` du §H (« the request is structurally valid, but the current circuit/simulation cannot provide the requested quantity »), par opposition à `INVALID` réservé aux requêtes malformées ou aux cibles/kinds inconnus.

Aucun de ces trois points n'a nécessité de solliciter un nouveau ruling CSA : chacun reste une clarification d'implémentation dans le cadre déjà autorisé, pas une extension du périmètre.

---

## F. Stabilisation effectuée — `[FAIT]`

- Retrait de deux imports inutilisés (`ObservationTargetKind`, `ObservationQuantity`) dans `observationContract.test.js`, détectés par `npm run lint`, pour obtenir 0 erreur lint sur les fichiers livrés. Correction mécanique, sans impact sur le comportement testé (les tests utilisent des littéraux `"PIN"`/`"NET"`/`"LOGICAL_STATE"` etc., déjà conformes au contrat).
- Aucun autre conflit Git, import cassé, ou problème de formatage rencontré. Aucune stabilisation n'a été nécessaire sur un fichier préexistant.
- **Correction documentaire post-livraison (CSA REVIEW — MB-OBS-001) :** §A et §I ont été mis à jour pour lister explicitement les deux commits constitutifs (implémentation `081387e` et Delivery Report `e8da7c1`) avec leur rôle exact, corrigeant une incohérence de traçabilité relevée par le CSA (§A ne citait initialement que le commit d'implémentation, alors que le rapport lui-même n'existait qu'à partir du second commit). Correction strictement documentaire : aucun fichier de code, aucun test, aucune implémentation n'a été modifié.

---

## G. Réserves, limites & demandes d'arbitrage — `[FAIT]` uniquement

- **Limitation connue (AC-04) :** `VOLTAGE` retourne la tension d'alimentation du composant, pas un potentiel de nœud par pin. Une future extension qui exigerait un potentiel réellement différencié par pin nécessiterait une nouvelle capacité de calcul dans Simulation, hors périmètre de MB-OBS-001.
- **Limitation connue (AC-05) :** `CURRENT` n'est disponible qu'au niveau composant, et seulement pour les 8 types couverts par `dcContributionRegistry.js` (`RESISTOR, LDR, THERMISTOR, DC_MOTOR, DIODE, CAPACITOR, POTENTIOMETER, NPN_TRANSISTOR`) et seulement pour les composants à exactement 2 bornes (`RESISTOR, LDR, THERMISTOR, DC_MOTOR, DIODE, CAPACITOR`). Pour `POTENTIOMETER` et `NPN_TRANSISTOR` (3 bornes), le courant composant existe dans `dcAnalysis` mais n'est jamais exposé par pin en V1 — retour systématique `UNAVAILABLE`.
- **Dette technique :** aucune. Aucun raccourci, aucun `TODO`, aucune approximation silencieuse introduits.
- **Cas non couvert :** cibles `COMPONENT`/`BRANCH` (explicitement non-V1 par le ticket §C) — non implémentées, comme requis.
- **Divergence avec le Blueprint :** voir §E — trois points d'interprétation documentés, aucun ne modifiant la sémantique du contrat telle que spécifiée.
- **Décision nécessaire (pour une future ticket, pas pour celui-ci) :** si `MB-MEASURE-001` a besoin d'un potentiel de nœud par pin plutôt que de la tension d'alimentation, une nouvelle décision CSA sur une extension du modèle de calcul de Simulation sera nécessaire à ce moment-là — hors périmètre et hors urgence pour MB-OBS-001.

---

## H. Gestion PMO

| Champ | Valeur |
|---|---|
| Statut proposé par ce rapport | **TERMINÉ** (constat d'exécution ; la décision de clôture du Ticket appartient exclusivement au CSA/PMO, jamais à Claude) |
| Historique | Ticket créé (`df3326d`) → Audit pré-implémentation v1 (ticket/blueprint absents du dépôt à ce moment) → Sync `origin/main` → Audit pré-implémentation v2 (READY FOR IMPLEMENTATION) → CSA GO → Implémentation (`081387e`) → présent Delivery Report |
| Prochaine étape attendue | Revue CSA/PMO de ce rapport ; décision de clôture (`CLOS` / `RETOUR EN EXÉCUTION` / `ARBITRAGE`) |

---

## I. Traçabilité des livrables

- **Commit(s) :**
  - `081387e21fdc63e70e62f5e9f03a8634e1964b0c` (`081387e`) — implémentation (code + tests)
  - `e8da7c100796b7fdcb63e45c7b89d9837b431128` (`e8da7c1`) — ajout de la version initiale du présent Delivery Report
  - un troisième commit local, distinct et postérieur, porte uniquement la présente correction de traçabilité (§A/§I), sans aucune modification de code ni de test — voir §F
  - aucun de ces commits n'a été poussé sur GitHub, conformément à l'autorisation CSA GO
- **Pull Request :** aucune (aucun push GitHub effectué, conformément à l'autorisation CSA GO)
- **Documentation créée :** le présent rapport (`docs/pmo/delivery-reports/MB-OBS-001-delivery-report.md`)
- **Tests ajoutés :**
  - `frontend/src/observation/__tests__/observationContract.test.js` (27 tests)
  - `frontend/src/observation/__tests__/observationArchitecture.test.js` (11 tests)
- **Blueprint utilisé :** `docs/pmo/blueprints/MB-OBS-001-observation-contract-blueprint.md`
- **Ticket source :** `docs/pmo/tickets/MB-OBS-001.md`
