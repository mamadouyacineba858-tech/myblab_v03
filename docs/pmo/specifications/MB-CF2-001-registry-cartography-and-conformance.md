# Cartographie factuelle du Registry et vérification du contrat — MB-CF2-001 (GATE 1 / GATE 2)

**Nature de ce document :** livrable GATE 1 (cartographie) et GATE 2 (vérification du contrat) du Ticket `MB-CF2-001 — REGISTRY CANONIQUE`. Conformément au §8 (Principe de conservation) du ticket, ce document **observe et documente** l'état réel du dépôt ; il ne propose et n'introduit aucune réécriture de `canonicalRegistry.js`, `componentDefinitions.js` ou `simulationRegistry.js`, ces trois fichiers satisfaisant déjà, tels quels, les exigences vérifiées ci-dessous.

**Rôle exercé :** Claude — agent d'implémentation, sur GO CSA (MB-CF2-001, GATE 0-5).
**Baseline :** `5e2d016426e06255ab878264c511d648adcb45a0`.
**Méthode :** inspection directe du code source, `git log`/`git grep` réellement exécutés (voir `01_git_proofs.txt` du paquet de livraison pour la sortie brute).

**Légende** : `[FAIT OBSERVÉ]` = constaté directement (code ou historique git). `[CORRECTION FACTUELLE]` = corrige une description antérieure (dossier d'arbitrage CSA ou ticket historique) devenue inexacte au regard de l'état réel du dépôt.

---

## 1. Cartographie des 5 sources (GATE 1, §10 du ticket)

### 1.1 `frontend/src/simulator/canonicalRegistry.js` — 🟢 Registry canonique

`[FAIT OBSERVÉ]` Module purement déclaratif : cinq tables constantes gelées (`DECLARED_TYPES_PINS`, `DECLARED_TYPE_ORDER`, `DECLARED_PARAMETER_SCHEMA`, `DECLARED_DEFAULT_PARAMETERS`, `DECLARED_CAPABILITIES`, `DECLARED_MODEL_AVAILABLE`), 16 types déclarés. Toute entrée produite par `buildEntry()` est `Object.freeze()`-ée récursivement (pins, defaultParameters, capabilities, et l'entrée elle-même). Auto-validation au chargement du module (`selfCheck`, ligne 136-137) : le module lève une exception à l'import si ses propres données sont invalides.

API exportée (exhaustive) : `getAllCanonicalTypes()`, `hasCanonicalType(type)`, `getCanonicalEntry(type)`, `getAllCanonicalEntries()`, `validateCanonicalEntry(entry)`, `validateCanonicalEntrySet(entries)`. Aucune fonction de mutation, aucune fonction de calcul/résolution, aucune fonction de rendu.

**Mutabilité :** non — toutes les données sont gelées ; `canonicalRegistry.test.js` contient déjà 4 tests dédiés (« throws when mutating... ») qui le démontrent empiriquement.
**Calcul :** non — ne résout aucun circuit, n'importe aucun modèle exécutable (`canonicalRegistryArchitecture.test.js` le vérifie déjà par inspection de source).
**État :** aucun — toutes les structures sont des constantes au chargement du module, pas de state mutable.
**Statut :** canonique, confirmé.

### 1.2 `frontend/src/simulator/registry.js` — 🔴 absent (historique)

`[FAIT OBSERVÉ]` Ce fichier **n'existe pas** à la baseline. `git log --oneline -- frontend/src/simulator/registry.js` montre qu'il a été supprimé par le commit `015806b refactor(sim): remove parallel component registry`, lui-même ancêtre direct de `HEAD` (vérifié via `git merge-base --is-ancestor`). Sa suppression est donc déjà intégrée à `main`, antérieure à ce ticket. Conformément au §4 du GO CSA et au §5 du ticket : **il n'a pas été recréé.** Aucune référence de production ne l'importe (`git grep` sur `from.*registry\.js` ne retourne que `frontend/src/visualization/registry.js`, un fichier sans rapport — voir §1.5).

### 1.3 `frontend/src/core/ComponentRegistry.ts` — 🔴 absent (historique)

`[FAIT OBSERVÉ]` Ce fichier **n'existe pas** à la baseline. `git log --all` révèle son cycle de vie complet : créé par `cae7df7 feat(sim): implement ComponentRegistry (MB-SIM-001-B1)`, puis supprimé par `3a4af55 chore(debt): remove legacy B2 ComponentRegistry` (tests associés supprimés par `836b195` et `36a7343`). Les quatre commits sont ancêtres de `HEAD` — cette suppression fait donc partie de l'histoire intégrée de `main`, antérieure à ce ticket. `git grep "ComponentRegistry" -- frontend/src/` (hors tests) ne retourne **aucun résultat** : zéro référence de production restante.

`[CORRECTION FACTUELLE]` Le dossier d'arbitrage CSA précédent (« MB-CF2 — DOSSIER D'ARBITRAGE DU REGISTRY CANONIQUE », Option B) décrivait `ComponentRegistry.ts` comme un fichier **existant**, « utilisé uniquement à travers ses propres tests et fixtures ». Cette description était exacte à un état antérieur du dépôt mais est **factuellement dépassée** à la baseline `5e2d016` : le fichier a depuis été supprimé (nettoyage de dette technique). Ceci ne change pas le verdict de l'arbitrage (Option C reste correcte), mais la prémisse de l'Option B (« un registre TypeScript existe, inutilisé ») ne correspond plus à l'état réel du dépôt — il n'existe simplement plus.

### 1.4 `frontend/src/config/componentDefinitions.js` — 🟢 Presentation

`[FAIT OBSERVÉ]` Importe `getCanonicalEntry` depuis `canonicalRegistry.js` (ligne 2). Sa table locale `PIN_PRESENTATION_BY_TYPE` ne porte **que** des métadonnées de rendu (`label`, `dx`, `dy`), jointes par `id` — jamais une redéclaration de `role` ou d'identité de pin. La fonction `buildPins()` (lignes 83-116) réalise explicitement cette jointure : elle prend les pins canoniques comme référence, exige une correspondance exacte en nombre et en id avec la table de présentation, et lève une exception en cas de pin canonique orphelin ou de pin de présentation manquant.

Ce comportement est déjà couvert par 9 tests dédiés dans `componentDefinitionsBoundary.test.js`, sous le libellé **« MB-CF2-005 — Registry/Presentation pin boundary »** — un ticket antérieur à celui-ci, déjà intégré, qui avait explicitly pour objet cette frontière. Aucune modification n'a donc été nécessaire ni apportée à `componentDefinitions.js`.

**Consommateurs (hors tests) :** `canvas/CircuitComponent.jsx`, `components/Sidebar.jsx`, `hooks/useCircuitState.js`, `utils/circuitSelectors.js` — tous des consommateurs Presentation/UI, cohérents avec son rôle.

### 1.5 `frontend/src/simulator/simulationRegistry.js` — 🟢 pont/consommateur Simulation

`[FAIT OBSERVÉ]` `createSimulationRegistry()` reçoit `canonicalRegistry` en paramètre injecté (par défaut le module réel) et une liste de modèles exécutables. Il consulte `hasCanonicalType()`/`getCanonicalEntry()` pour vérifier la déclaration et la disponibilité, mais ne calcule jamais lui-même — il délègue tout comportement aux modèles (`./models/*.js`, propriété de Simulation, pas du Registry). Il ne mute jamais `canonicalRegistry`. Couvert par `simulationRegistry.test.js` (6 tests) et `registrySimulationCoherence.test.js` (2 tests, INV-REG-002/003 — cohérence Registry/Simulation, libellés antérieurs à ce ticket mais couvrant le même principe).

### 1.6 Note : `frontend/src/visualization/registry.js` — hors périmètre

`[FAIT OBSERVÉ]` Un fichier distinct, `RendererRegistry`, associe un type logique à un composant React de rendu (`VisualizationManager.js`, `factory.js`). Il partage le nom « registry.js » mais appartient à un domaine entièrement différent (rendu visuel, pas connaissance déclarative des composants) et n'a **aucun rapport** avec le Registry canonique de ce ticket. Il n'est pas concerné par MB-CF2-001 et n'a pas été touché.

---

## 2. Vérification du contrat (GATE 2, §11 du ticket)

Point par point, sur la base de la lecture intégrale de `canonicalRegistry.js` :

| Exigence GATE 2 | Vérifié | Preuve |
|---|---|---|
| Expose le contrat réel attendu | ✅ | `getCanonicalEntry`/`hasCanonicalType`/`getAllCanonicalTypes`/`getAllCanonicalEntries` — utilisés par tous les consommateurs identifiés en §1 |
| Ne calcule pas | ✅ | Aucune fonction de résolution ; `canonicalRegistryArchitecture.test.js` vérifie l'absence d'import de `./models/` |
| Ne possède pas de logique de simulation | ✅ | Idem |
| Ne devient pas un store | ✅ | Toutes les structures sont des constantes gelées au chargement, aucune fonction de mutation exportée |
| Ne possède pas de responsabilité Presentation | ✅ | Aucun champ `dx`/`dy`/`label`/couleur/icône dans `canonicalRegistry.js` — ces champs vivent exclusivement dans `componentDefinitions.js` |
| Reste déterministe | ✅ | Données constantes, fonctions pures ; voir §3 (nouveau test explicite INV-CF2-006) |
| Expose une connaissance déclarative cohérente | ✅ | Auto-validation au chargement (`selfCheck`) + `canonicalRegistry.test.js` (29 tests existants) |

**Aucune API supposée absente n'a été rencontrée.** Aucune invention n'a été nécessaire. Conformément au §8 (principe de conservation), **`canonicalRegistry.js` n'a pas été modifié.**

---

## 3. Tests déjà existants couvrant partiellement les invariants CF2 (non dupliqués)

| Invariant | Couverture existante | Fichier |
|---|---|---|
| INV-CF2-002 (ne calcule pas) | 2 tests | `canonicalRegistryArchitecture.test.js` |
| INV-CF2-003 (ne mute pas) | 4 tests (« throws when mutating... ») | `canonicalRegistry.test.js` |
| INV-CF2-004 (pas de logique Presentation dans Registry) | implicite (structure des données) | `canonicalRegistry.js` (absence de champs de rendu) |
| INV-CF2-007 (Simulation propriétaire du calcul) | 2 tests (INV-REG-002/003) | `registrySimulationCoherence.test.js` |
| INV-CF2-008 (Presentation propriétaire de la représentation) | 9 tests (MB-CF2-005) | `componentDefinitionsBoundary.test.js` |

Ces invariants sont donc **déjà démontrés** par des tests antérieurs à ce ticket — ils ne sont pas re-testés en double dans la livraison de GATE 3 (voir `frontend/src/simulator/__tests__/cf2RegistryConformance.test.js`, qui couvre uniquement les invariants réellement non couverts : INV-CF2-001, INV-CF2-005, INV-CF2-006 (forme explicite), INV-CF2-009, INV-CF2-010).

---

## 4. Réponse au §5 du ticket (tableau des sources)

| Source | Rôle CF2 constaté |
|---|---|
| `canonicalRegistry.js` | 🟢 Registry canonique — confirmé, inchangé |
| `registry.js` | 🔴 absent — supprimé avant baseline (`015806b`), non recréé |
| `ComponentRegistry.ts` | 🔴 absent — supprimé avant baseline (`3a4af55`/`836b195`/`36a7343`), non recréé ; correction apportée à la description du dossier d'arbitrage CSA (§1.3) |
| `componentDefinitions.js` | 🟢 Presentation — confirmé, inchangé |
| `simulationRegistry.js` | 🟢 pont/consommateur Simulation — confirmé, inchangé |

**Aucune quatrième source canonique n'a été créée.**
