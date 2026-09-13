# MB-L1-PROP-005 — Execution Blueprint

## A. IDENTITÉ & TRAÇABILITÉ

| Champ | Valeur |
|---|---|
| Blueprint-ID | `MB-L1-PROP-005-capacitor-dynamic-marking-blueprint` |
| Ticket-ID | `MB-L1-PROP-005` |
| Base Git obligatoire | `c31626a6eda892f4c2f1f96eb8fa8ed7cbdba8f9` (HEAD validé de MB-L1-PROP-004) |
| Branche | `feat/MB-L1-PROP-005-capacitor-dynamic-marking` |
| Date | `2026-09-13` |
| Auteur | `CSA (ChatGPT) + CTO (Dr. Mamadou Yacine Ba) — blueprint/ticket ; Claude — implémentation` |
| Statut | `IMPLEMENTED — tests + build + lint + probe navigateur PASS ; PROJECT CANVAS GATE PENDING` |

## 1. Contexte

`MB-L1-PROP-004` a établi le patron « paramètre électrique unique -> projection visuelle dérivée » pour RESISTOR (bandes de couleur). `MB-L1-PROP-005` applique le même patron à CAPACITOR, en s'appuyant sur la R&D asset préalable (Candidate C, sélection CSA/CTO parmi 3 candidats générés) qui a validé le corps réaliste et sa zone de marquage.

## 2. Problème (P1-P4 confirmés par audit)

- **P1** : `CapacitorPart.jsx` (post `MB-L1-CONS-002`) est un renderer CSS/DOM (`radial-gradient`), pas raster.
- **P2** : le texte `"104"` est littéralement écrit dans le JSX (`<span>104</span>`).
- **P3** : ce texte ne dérive jamais de `component.parameters.capacitance`.
- **P4** : le rendu CSS n'atteint pas le niveau réaliste retenu pour MYBlab (cf. rapport R&D, candidats A/B/C).

Le pack raster historique (`capacitor.default.*`, `MB-VIS-PROTOTYPE-004`) existe toujours sur disque mais est orphelin (aucune référence dans le code) et représente un condensateur **axial** (mauvaise orientation de pattes pour le contrat mécanique radial actuel) — inutilisable tel quel, confirmé par inspection pixel.

## 3. Audit de base (`c31626a`)

- `canonicalRegistry.js` : `CAPACITOR.capacitance` — `unit:'F'`, `minimum:1e-12`, `maximum:1`, `defaultValue:0.0001` (100 µF — incohérent avec un boîtier céramique 104/100 nF).
- `componentDefinitions.js` : boîte canonique **70×40**, pins électriques `pinA(0,20)`/`pinB(70,20)`, contacts physiques `pinA(23,62)`/`pinB(47,62)` — **verrouillés, non modifiés**.
- `assemblyProfiles.js` : racines de pattes `pinA.root(23,27)`/`pinB.root(47,27)`, style `wire` — **verrouillées, non modifiées**.
- `defaultRegistrations.js` : `{ type:'CAPACITOR', component: CapacitorPart, visual:{ bareBody:true, markerless:true } }` — `backend:'raster'` avait été retiré par `MB-L1-CONS-002`.
- `PartRenderer.jsx`/`CircuitComponent.jsx` : transportent déjà `parameters` génériquement (`resolveComponentParameters(type, parameters)`, hérité de `MB-L1-PROP-004`) — **aucune modification nécessaire**, confirmé.

## 4. Candidate C — sélection

Corps céramique disque radial non polarisé, généré procéduralement (Pillow/numpy, silhouette superellipse) lors de la mission R&D `CAPACITOR-ASSET-RD-REPORT.md`. Recommandation Claude = Candidate C ; CSA + CTO ont approuvé Candidate C comme asset officiel après revue du package de preuve visuelle (`CAPACITOR-ASSET-CANDIDATES-COMPARISON.png`, `-3X.png`, `-CANVAS.png`).

Zone de marquage sûre mesurée (probe R&D, `safe_marking_zone_native3x = [74.0, 29.8, 135.0, 62.2]` sur canevas natif 210×120 = 3× la boîte 70×40) → reprise telle quelle, jamais réinventée.

## 5. Architecture cible

```
Document.component.parameters.capacitance (Farads, seule source de vérité)
  -> CircuitComponent.jsx (inchangé, transporte déjà `parameters`)
  -> PartRenderer.jsx (inchangé, resolveComponentParameters générique)
  -> CapacitorPart.jsx
       -> <picture>/<img> capacitor.base.* (identité physique, Candidate C)
       -> encodeCapacitorMarking(capacitance) -> <span> overlay DOM (valeur électrique)
  -> Canvas
```

## 6. Source de vérité

`component.parameters.capacitance` uniquement. Aucune duplication dans `properties`. Aucun champ `marking` dans le Document, l'export, ou l'History.

## 7. Contrat de l'encodeur (`capacitorMarking.js`)

`encodeCapacitorMarking(capacitanceFarads) -> { exact, marking, picofarads, reason }`. Générique : recherche d'un exposant `e ∈ [0..9]` (en pF) tel que `round(pF / 10^e) ∈ [10,99]` reconstruise `pF` à `1e-9` relatif près. Domaine V1 : `10 pF..1 µF` inclus ; hors domaine ou non-représentable → `exact:false`.

## 8. Règle zéro-arrondi

Comme RESISTOR : la tolérance flottante (`1e-9` relatif) ne sert qu'à absorber les artefacts IEEE 754 sur `farads * 1e12`, jamais à altérer la valeur réelle. `123 nF` (3 chiffres significatifs) ne devient jamais `120 nF`/`124` — `exact:false`, `marking:null`, corps neutre.

## 9. Contrat d'asset

`capacitor.base.{1x,3x}.{png,webp}`, 70×40 / 210×120, alpha, corps neutre (aucune valeur cuite), silhouette Candidate C préservée sans déformation ni recadrage. `capacitor.default.*` (historique) byte-identiques, marqués `legacy:true` dans `manifest.json` (même mécanisme que `MB-L1-PROP-004`).

## 10. Contacts physiques préservés

`componentDefinitions.js` et `assemblyProfiles.js` **non modifiés**. Vérifié par tests (pins `(23,62)`/`(47,62)` inchangés après édition de capacitance) et par probe navigateur.

## 11. Correction du default capacitance

`canonicalRegistry.js` : `CAPACITOR.capacitance.defaultValue` **uniquement**, `0.0001` (100 µF) → `1e-7` (100 nF). `min`/`max`/`unit`/pins/role inchangés. `POLARIZED_CAPACITOR` (valeur identique par coïncidence) **non touché**. 4 tests dépendants mis à jour (assertions directement liées au default CAPACITOR uniquement) ; 2 tests utilisant `0.0001` comme valeur d'exercice arbitraire (non liée au default) laissés inchangés à raison.

## 12. Stratégie de tests

- `capacitorMarking.test.js` (35 tests) : 12 valeurs exactes documentées + jamais-de-mensonge + discipline flottante + pureté.
- `CapacitorPart.raster.test.jsx` (22 tests) : raster réel, marquage dynamique, pipeline réel, contacts inchangés.
- `MBL1PROP005CapacitorMarkingIntegration.test.jsx` (10 tests) : T1-T12 pipeline réel (`CircuitProvider`).
- `ComponentValueEditing.integration.test.jsx` (+2 tests) : default 1e-7 matérialisé, Undo/Redo depuis ce default.
- 4 gardes architecturales préexistantes (`visualContract.test.js`, `RealisticRenderers.test.jsx`, `partDimensionsCanonical.test.jsx`, `partDimensionsGuard.test.js`) codaient en dur l'ancien contrat CSS/DOM de CAPACITOR (`MB-L1-CONS-002`) — mises à jour pour refléter le retour légitime au raster, sans toucher aux assertions concernant les autres types (THERMISTOR reste `svg`, inchangé).

## 13. Gate navigateur

Playwright/Chromium réel : les 12 valeurs documentées (B-K) produisent le marquage attendu, `123 nF`/`2.2 µF` produisent un corps neutre sans marquage, Undo/Redo synchronisés, deux condensateurs indépendants, drag/sélection fonctionnels, 0 erreur console.

## 14. Périmètre interdit respecté

Aucune modification de `engine.js`/`resolution.js`/`preparation.js`/`production.js`/`dcContributionRegistry.js`, History, CommandBus, Arduino, Scheduler, Observation, Measurement, Breadboard, Wires. Aucune modification de LED/RESISTOR/LDR/THERMISTOR/POLARIZED_CAPACITOR ni de leurs assets. Aucune physique RC transitoire introduite.

## 15. Rollback / risques

Risque résiduel : aucun identifié techniquement. La seule dépendance externe restante est le **Project Canvas Gate** du CTO (Dr. Mamadou Yacine Ba), qui seul peut fermer le ticket. Rollback trivial si nécessaire : `git revert` du commit unique (aucune migration de données, aucun changement irréversible — les assets historiques restent intacts).

## 16. Critères d'acceptation

Voir `docs/pmo/tickets/MB-L1-PROP-005.md` §AC — les 30 critères (AC-01 à AC-30) sont vérifiés dans le delivery report.
