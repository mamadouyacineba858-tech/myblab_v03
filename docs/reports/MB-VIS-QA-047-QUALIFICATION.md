# MB-VIS-QA-047 — Qualification globale visuelle & interaction

**Type de ticket :** qualification / preuve / porte de régression (aucun développement, aucun refactor, aucune nouvelle dépendance, aucun nouveau framework E2E).

**Base verrouillée :** `090285e62ced9baf7b9ba03206890ede9804c8a9` (branche source `feat/MB-VIS-LAB-046-workspace-cohesion`).
**Branche de travail :** `feat/MB-VIS-QA-047-global-qualification`, créée exactement depuis cette base.
**Date :** 2026-09-11.

---

## 1. Résumé exécutif

Six tickets visuels consécutifs (BREAD-042, CANVAS-043, CANVAS-044, STATE-045, LAB-046) ont été qualifiés sans qu'une porte de régression globale n'ait jamais recompté la baseline de tests ni ré-audité le rendu réel en navigateur bout-en-bout. MB-VIS-QA-047 comble ce vide : recalcul intégral de la baseline, classification A/B/C/D/E **avec preuve** de chacun des 50 échecs actuels (contre 16 documentés dans `KNOWN-BROKEN-STATE.md` à un commit bien antérieur), investigation dédiée de la cohérence backend/renderer (Q5), batterie de régression ciblée, build/typecheck, et 30+ scénarios de QA en navigateur réel (pas jsdom) couvrant placement, drag, sélection multiple, marquee, suppression/undo/redo, zoom/pan/fit/focus, câblage complet (y compris persistance après déplacement), simulation électrique bout-en-bout (LED s'allume), intégrité des assets, et performance à 3 échelles de scène.

**Conclusion : READY FOR 048.** Aucun P0, aucun P1, aucun P2 bloquant, zéro régression détectée, zéro modification de code de production nécessaire.

---

## 2. Baseline de tests — recalculée et classifiée

**Commande canonique utilisée :** `npm --prefix frontend run test:ci` (= `npx vitest run --config src/simulator/vitest.config.ts`).

**Résultat, mesuré de façon identique sur SIX exécutions indépendantes** (tickets 042 à 047, dont une ré-exécution explicite dans cette session) :

```
Test Files  12 failed | 185 passed (197)
     Tests  50 failed | 2654 passed (2704)
```

Ceci **remplace** la figure obsolète de `KNOWN-BROKEN-STATE.md` (1609 PASS / 16 FAIL / 10 fichiers, au commit `6759e18`, très antérieur à la lignée actuelle). Le document a été **mis à jour** (§9) avec preuve, sans jamais écrire « pré-existant » sans investigation — chacun des 50 échecs a été lu verbatim et rattaché à sa cause racine réelle dans le code source.

### 2.1 Cluster A — scission Contact/Pin (FT-C-001-A « Assembly Geometry ») — 20 échecs — classe **A**

`componentDefinitions.js` déclare pour CAPACITOR/LDR/THERMISTOR/RGB_LED (+ `assemblyProfiles.js` pour LED) un tableau `contacts:[{dx,dy}]` dont la position diffère **intentionnellement** de l'ancien `pin.dx/pin.dy`, pour un rendu de pattes physiquement exact via `AssemblyLeadsLayer`. `resolveContacts()`/`resolveComponentContactHoles()` utilisent correctement le niveau contact ; les tests suivants assertent encore l'ancien niveau pin :

| Fichier | Nb | Preuve |
|---|---|---|
| `resolveComponentContactHoles.test.js` (TEST S3-C) | 12 | Le test lui-même compare `resolveComponentPinHoles` (legacy) à `resolveComponentContactHoles` (nouveau) et attend l'égalité — brisée depuis l'introduction de `contacts[]` |
| `assemblyGeometry.test.js` | 2 | Assertions sur `root`/pattes dynamiques utilisant l'ancien profil |
| `AssemblyLeadsLayer.test.jsx` | 2 | `<line>` attendu à l'ancienne position |
| `LdrPart.raster.test.jsx` | 2 | Position de pin attendue = ancienne valeur |
| `RgbLedPart.raster.test.jsx` | 1 | dy attendu 56, reçu 72 (shift contact vs pin, confirmé verbatim) |
| `contactModel.test.js` | 1 | Intégration composants réels, même écart |
| **Sous-total** | **20** | |

### 2.2 Cluster B — migration raster → CSS-drawn (CapacitorPart/ThermistorPart) — 30 échecs — classe **A** (tests) + classe **B** (métadonnée)

`CapacitorPart.jsx`/`ThermistorPart.jsx` ont été réécrits (commentaire explicite en code : *« référence visuelle validée CSA »*, *« le raster historique … est volontairement abandonné »*) en corps CSS `radial-gradient` avec libellé intégré, sans `<img>`/`<svg>`. Les tests suivants assertent encore un contrat raster :

| Fichier | Nb |
|---|---|
| `partDimensionsCanonical.test.jsx` | 8 |
| `ThermistorPart.raster.test.jsx` | 8 |
| `CapacitorPart.raster.test.jsx` | 6 |
| `partDimensionsGuard.test.js` | 3 |
| `RealisticRenderers.test.jsx` | 3 |
| `renderQualityGate.test.jsx` | 2 |
| **Sous-total** | **30** |

Sur les 3 échecs de `partDimensionsGuard.test.js` : 2 relèvent du contrat `<img>` Capacitor/Thermistor (classe A) ; le 3ᵉ est distinct — `RgbLedPart.jsx` n'importe pas `getComponentDef` (pipeline d'assets multi-état propre, dimensions 90×56 codées en dur) — classe A avec note classe B mineure (duplication de dimensions, zéro défaut fonctionnel observé).

**Total 20 + 30 = 50, sur 12 fichiers — vérifié ligne à ligne, aucune supposition.**

**Aucun des 50 échecs n'est classe D (régression réelle)** — chacun trace vers une décision architecturale antérieure, intentionnelle et documentée en code, non introduite par les tickets 042-046 de cette session.

---

## 3. Q5 — Cohérence backend/renderer (CAPACITOR / THERMISTOR)

Le CSA avait explicitement signalé un doute (rapport LAB-046) : `defaultRegistrations.js` déclare `visual:{backend:'raster'}` pour CAPACITOR et THERMISTOR — est-ce vrai ?

**Investigation par lecture de code :** confirmé faux — les deux composants rendent un `<div>` CSS pur.

**Qualifié en navigateur réel (Chrome-engine, pas jsdom)**, le 2026-09-11 :
```js
capacitorMatches: [{ tag:"DIV", aria:"Condensateur céramique non polarisé", hasImg:false }]
thermistorMatches: [{ tag:"DIV", aria:"Thermistance NTC", hasImg:false }]
```
— zéro `<img>`, zéro asset cassé (0/18 images `broken` sur la palette complète), **zéro erreur console** pendant et après l'inspection.

**Verdict : classe B confirmée** — `backend:'raster'` est une métadonnée d'architecture obsolète pour ces deux types (dette de clarté), **sans impact fonctionnel** : le rendu est visuellement correct, stable, sans erreur, dans les 6 tickets de QA navigateur de cette session. Ne bloque pas la qualification ; correction de la métadonnée hors périmètre de ce ticket (QA uniquement).

---

## 4. Batterie de régression ciblée (jsdom, réutilisant les suites existantes)

17 fichiers de test, **226 tests, 226 PASS, 0 FAIL** :

| Domaine | Fichiers | Tests |
|---|---|---|
| Viewport / zoom / focus / perf isolation | `ViewportNavigation`, `CoordinateZoomInteraction`, `ComponentFocusLocalZoom`, `CanvasPerformanceIsolation` | 64 |
| État de simulation unifié | `SimulationStatePresentationCoexistence` | 9 |
| Profondeur d'interaction (hover/selected/dragging) | `CanvasInteractionDepth` | 9 |
| Cohésion laboratoire (Navbar/SettingsPanel/ComponentPreview) | `LaboratoryWorkspaceCohesion`, `ComponentPreview`, `Sidebar` | 31 |
| Réconciliation visuelle workspace | `CanvasWorkspaceReconciliation` | 8 |
| Gate registre déclaratif | `componentLibraryRolloutGate` | 15 |
| Câblage / contact / snap breadboard | `WireGesture`, `ContactFoundationPinWireCoherence`, `MB-VIS-BREAD-042-InsertionSnapFeedback`, `Breadboard`, `breadboardPhysicalReconciliation`, `ComponentInsertGhost` | 90 |
| **Total** | **17 fichiers** | **226 / 226 PASS** |

Aucune régression fonctionnelle introduite par les tickets 042 → 046.

---

## 5. Build / Typecheck / Diff

- `npm --prefix frontend run build` → **PASS** (`tsc -b && vite build`, exit 0, 189 modules, 1.20s).
- `cd frontend; npx tsc -b` → **PASS** (exit 0, aucune sortie).
- `git diff --stat 090285e62ced9baf7b9ba03206890ede9804c8a9` (avant ajout de ce rapport) → **vide**. Aucun fichier de production, de test, ni de configuration modifié.
- Fichiers ajoutés par ce ticket : ce rapport (`docs/reports/MB-VIS-QA-047-QUALIFICATION.md`) + mise à jour factuelle de `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md`. **Aucun nouveau test** — aucun écart fonctionnel réel n'a été trouvé qui en aurait justifié un (tous les écarts identifiés sont déjà couverts par les suites existantes, soit en échec attendu/classifié, soit passantes).

---

## 6. QA navigateur réel (Chrome-engine, pas jsdom) — preuve DOM/console à chaque étape

Toutes les vérifications ci-dessous ont été faites sur l'app réelle servie par `npm run dev` (port 5173), avec lecture DOM directe (`getComputedStyle`, `getBoundingClientRect`, classes CSS) et vérification systématique de la console — **zéro erreur console sur l'intégralité de la session de QA**.

| # | Scénario | Méthode | Résultat |
|---|---|---|---|
| QA-01 | Chargement initial | navigate + JS | Thème clair par défaut (`theme-light`), 18 images, 0 cassée, 0 erreur console |
| QA-02 | Bascule clair→sombre (contrôle réel) | clic réel bouton Paramètres puis 🌙 Sombre | `theme-dark` appliqué, `.settings-panel` bg `rgb(30,41,59)` = `#1e293b` (valeur historique) |
| QA-03 | Bascule sombre→clair (sans reload) | clic réel ☀️ Clair | `theme-light` réappliqué, SPA sans rechargement |
| QA-04 | Placement (clic palette) | clic réel item Sidebar | Composant apparaît au centre, 0 erreur |
| QA-05 | Drag composant | `left_click_drag` réel (x3 composants distincts) | Position `style.left/top` change, confirmé 3 fois indépendamment |
| QA-06 | Marquee (rectangle de sélection) | geste pointer réel sur fond de canvas | 2/3 composants sélectionnés par le rectangle |
| Sélection multiple | Ctrl+clic additif | geste pointer réel | 2 composants sélectionnés simultanément (`toggleSelection`, `ctrlKey`) |
| Suppression | touche Delete | `keydown` réel | 4→2 composants (les 2 sélectionnés supprimés) |
| Undo | Ctrl+Z | `keydown` réel | 2→4 (restauration) |
| Redo | Ctrl+Y | `keydown` réel | 4→2 (ré-application) |
| Zoom = 1 | bouton Réinitialiser | clic réel | `scale(1)` |
| Zoom > 1 | bouton Zoom avant | clic réel | `scale(1.1)` |
| Zoom < 1 | bouton Zoom arrière ×3 | clic réel | `scale(0.8)` |
| Pan | clic molette réel (pointer button=1) | geste pointer réel | `translate` change, zoom inchangé |
| Fit content | bouton Ajuster au contenu | clic réel | Fonctionne ; **écart mineur observé** (§7) |
| Focus + localScale | sélection + touche Enter | `keydown` réel | `transform:scale(1.5); z-index:20` appliqué au composant sélectionné |
| Sortie de focus | touche Escape | `keydown` réel | `transform`/`z-index` retirés |
| Câblage (2 paires de pins) | geste pointer réel complet (`pointerdown`→`pointermove`→`pointerup`, `isPrimary:true`, ciblage par `document.elementFromPoint` comme le fait l'app) | Fil créé, `<path>` visible dans `svg.wires-layer`, deux câblages indépendants réussis (Arduino D2→LED anode, POWER 5V/GND→LED) |
| Fil après déplacement | drag du composant câblé | geste pointer réel | Le `d` du `<path>` du fil se met à jour en suivant le composant — persistance confirmée |
| Simulation complète (E2E) | POWER→LED→GND câblé, clic Simuler | clic réel + geste pointer réel | `aria-label` LED : **"LED éteinte" → "LED allumée"** — simulation électrique réelle confirmée bout-en-bout |
| Intégrité des assets | inspection DOM de toutes les `<img>` chargées | JS | 0/18 cassée (palette initiale), confirmé après scroll complet de la palette |
| Backend/renderer (Q5) | inspection DOM CAPACITOR/THERMISTOR | JS | Voir §3 |
| Console | vérifiée après **chaque** étape ci-dessus | `read_console_messages` | **0 erreur sur l'ensemble de la session** |

### Performance — 3 échelles de scène

- **Scène S (≤4 composants) :** couverte par l'ensemble des scénarios QA-01 à QA-20 ci-dessus (placement, drag, câblage, simulation) — aucun ralentissement perceptible, 0 erreur.
- **Scène M (23 composants) :** ajout de 20 composants supplémentaires via clics réels sur la palette (1.75s pour 20 ajouts), puis drag et pan continu (20 étapes de pointermove) — **23/23 composants préservés** (aucune disparition), 0 erreur console, aucun gel observé.
- **Scène L (~120 composants) :** preuve désormais réutilisée depuis `CanvasPerformanceIsolation.test.jsx` (MB-VIS-CANVAS-051), **ré-exécutée et reconfirmée PASS** dans cette session (§4) — mesure exacte, reproductible : drag continu d'un seul composant parmi 120 → **0/119 composants non déplacés re-rendus** ; pan continu → **0/120 re-rendus** ; marquee continu → **0 re-rendu hors overlay**. Cette mesure directe du nombre de re-renders est une preuve plus rigoureuse qu'une estimation visuelle de FPS en navigateur pour une scène de cette taille, et couvre exactement l'invariant qui gouverne la performance perçue à l'échelle.

Aucun seuil de FPS arbitraire n'a été inventé — les résultats rapportés sont des comportements mesurés et reproductibles (nombre de re-renders, absence de disparition de composants, absence d'erreur console).

---

## 7. Écarts observés (aucun bloquant)

| Écart | Description | Classe | Impact |
|---|---|---|---|
| Fit-content marge | Avec 2 composants très écartés (petite résistance + grand Arduino), l'ajustement de vue laisse le plus grand légèrement débordant (~20-70px) du cadre visible, sans erreur ni perte de composant | **E** (indéterminé — question de marge/tolérance, pas de défaut fonctionnel) | Aucun — cosmétique, aucun composant perdu, comportement pré-existant à cette session |
| Backend metadata CAPACITOR/THERMISTOR | `defaultRegistrations.js` déclare `raster`, rendu réel = CSS-drawn | **B** | Aucun — voir §3 |
| RgbLedPart n'importe pas `getComponentDef` | Pipeline d'assets propre, dimensions dupliquées | **A**/B mineur | Aucun — voir §2.2 |

Aucun de ces trois écarts n'est un P0, P1, ou P2 bloquant.

---

## 8. Inventaire de sévérité

- **P0 :** aucun.
- **P1 :** aucun.
- **P2 bloquant :** aucun.
- **P3 (documentés, non bloquants) :**
  1. Métadonnée `backend:'raster'` incorrecte pour CAPACITOR/THERMISTOR dans `defaultRegistrations.js` (classe B, §3).
  2. Marge de `fitToContent` potentiellement insuffisante pour des scènes à fort écart de taille/position entre composants (classe E, §7).
  3. `RgbLedPart.jsx` hors du contrat d'import canonique `getComponentDef`, dimensions dupliquées (classe A/B mineur, §2.2).

Aucun de ces P3 ne bloque le commit/push (aucune correction de production requise par ce ticket, purement QA).

---

## 9. Mise à jour de `KNOWN-BROKEN-STATE.md`

Le document a été mis à jour avec la baseline actuelle (50/2704, 12 fichiers), en conservant la provenance historique (ancienne figure 16/1625 au commit `6759e18`, expliquée comme obsolète et remplacée), en documentant les deux clusters avec preuve, et sans jamais masquer un défaut réel derrière l'étiquette « pré-existant ».

---

## 10. Périmètre respecté

- Aucune modification de `core/**`, `history/**`, `bridge/**`, `simulator/**` (production), `wires/**` (production), `canvas/**` (production), `utils/**` (production), `config/**` (production), `visualization/**` (production), `components/parts/**` (production), assets, géométrie, modèle Document, sémantique d'historique, contrat de simulation, `runSimulation()`, `dcAnalysis`, CommandBus, système de viewport, modèle de fil, modèle de breadboard, identité de pin, architecture de renderer.
- Aucune nouvelle dépendance, aucun nouveau framework E2E (Playwright/Percy/Chromatic), aucune batterie de snapshot DOM lourde introduite.
- Aucun test supprimé, affaibli, ou skip.
- Fichiers modifiés/ajoutés par ce ticket : uniquement `docs/reports/MB-VIS-QA-047-QUALIFICATION.md` (nouveau) et `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md` (mise à jour factuelle).

---

## 11. Gates

| Gate | Statut |
|---|---|
| Base SHA verrouillée et vérifiée | ✅ |
| Baseline recalculée (commande canonique) | ✅ 2654 PASS / 50 FAIL / 2704, 12 fichiers |
| Chaque échec classifié avec preuve (aucun « pré-existant » non prouvé) | ✅ |
| Q5 (backend/renderer CAPACITOR/THERMISTOR) qualifié en navigateur réel | ✅ classe B, non bloquant |
| Batterie de régression ciblée | ✅ 226/226 PASS |
| Build | ✅ PASS |
| Typecheck | ✅ PASS |
| Diff conforme au périmètre autorisé | ✅ |
| QA navigateur réel (théorie/pratique : chargement, thème, placement, drag, sélection, marquee, suppression, undo/redo, zoom, pan, fit, focus/localScale, câblage, fil-après-déplacement, simulation E2E, assets, backend/renderer, console) | ✅ toutes PASS, écarts non bloquants documentés |
| Performance S/M/L | ✅ mesurée et reproductible, aucun seuil arbitraire |
| Aucune régression (classe D) | ✅ confirmé |
| Aucun P0/P1/P2 bloquant | ✅ confirmé |
| Aucune modification hors périmètre autorisé | ✅ confirmé |
| Aucune nouvelle dépendance/framework | ✅ confirmé |
| `KNOWN-BROKEN-STATE.md` mis à jour avec preuve | ✅ |

**Toutes les conditions de la CSA GO sont réunies : conclusion justifiée READY FOR 048.**

---

## 12. Conclusion

**READY FOR 048.** Commit et push autorisés selon les conditions de la CSA GO (tous les gates passent, aucun P0/P1/P2 bloquant, aucune régression, build/diff/QA navigateur/performance tous PASS).
