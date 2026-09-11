# MB-VIS-TINKERCAD-048 — Tinkercad Level-1 Comparative Gate

**Type :** gate comparatif de qualification. Aucun développement, aucune correction, aucune modification de production.

## 1. SHA exact

- Base verrouillée et vérifiée : `010552c88d92b8dd4a5505f0284859adb73f3e12` (commit `test(qa): qualify global visual and interaction baseline`).
- `git rev-parse HEAD` avant tout travail = `010552c88d92b8dd4a5505f0284859adb73f3e12` — **conforme**.
- Branche créée : `feat/MB-VIS-TINKERCAD-048-level1-gate`, exactement depuis cette base.
- Aucun fichier non suivi préexistant nettoyé ou modifié.

## 2. Environnement

- `npm --prefix frontend run test:ci` (canonique), `npm --prefix frontend run build`, `cd frontend; npx tsc -b` — PowerShell utilisé (Bash cassé dans cet environnement, note connue de `KNOWN-BROKEN-STATE.md`).
- QA navigateur réalisée sur l'app réelle servie par `npm run dev` (port 5173), Chrome-engine réel (pas jsdom), via geste `mousedown` (déclencheur réel de `startDrag`/`handleBodyMouseDown`) suivi de `pointermove`/`pointerup` sur `window` (canal réel de continuation de tous les gestes de cet UI — drag, pan, wire gesture), technique validée empiriquement dans ce gate.

## 3. Sources lues

- `docs/roadmaps/ROADMAP_PLATFORM.md` — lu intégralement.
- `docs/reports/MB-VIS-QA-047-QUALIFICATION.md` — lu et réutilisé (auteur : cette même lignée d'agent, ticket immédiatement antérieur).
- `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md` — lu et réutilisé (mis à jour par MB-VIS-QA-047 avec preuve).
- Fichiers de production inspectés pour vérifier les capacités de la matrice : `CircuitComponent.jsx`, `Pin.jsx`, `ButtonPart.jsx`, `PartRenderer.jsx`, `ArduinoSimulator.js`, `canonicalRegistry.js`, `SettingsPanel.jsx`, `Navbar.jsx`, `App.jsx`, `defaultRegistrations.js`, `componentDefinitions.js`, `MeasurementPanel.jsx`, `TemporalObservationPanel.jsx`, `useCircuitState.js` (startDrag/startWireGesture/pan/undo-redo).

## 4. Matrice A–H complète

### DOMAIN A — Component Library / Visual Quality

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| A01 | Palette utilisable | PASS | Palette scrollable, tous les items cliquables, ajout au centre confirmé (navigateur réel, QA-047 + ce gate) |
| A02 | Previews cohérentes | PASS | `ComponentPreview.jsx` générique (MB-VIS-LAB-046), même mécanisme `PartRenderer` que le canvas |
| A03 | Composants réalistes | PASS | Assets raster réalistes confirmés (LED, résistance, Arduino, breadboard, bouton) ; CAPACITOR/THERMISTOR rendus CSS-drawn avec référence visuelle CSA-validée (voir §10 pour l'écart de métadonnée) |
| A04 | Proportions cohérentes | PASS | Dimensions dérivées de `componentDefinitions.js`, source canonique unique, aucune valeur dupliquée |
| A05 | Leads/contact points cohérents | PASS | `AssemblyLeadsLayer` + contrat FT-B (contact physique = hit target = pin = endpoint), suites `WireGesture`/`ContactFoundationPinWireCoherence` 100 % PASS |
| A06 | Labels utiles | PASS | `aria-label` vérifiés en direct : "Résistance", "LED éteinte"/"LED allumée", "Condensateur céramique non polarisé", "Thermistance NTC", "Alimentation", "Arduino UNO" |
| A07 | Assets intègres | PASS | 0/18 image cassée (chargement initial + palette scrollée), confirmé deux sessions consécutives |
| A08 | États visuels actifs cohérents | PASS | LED éteinte→allumée (E2E réel), bouton momentané/latching (suites automatisées 100 % PASS), hover/selected/dragging (CANVAS-044) |
| A09 | Thème clair | PASS | Défaut confirmé (`theme-light`) |
| A10 | Thème sombre | PASS | Bascule réelle confirmée, `#1e293b` correct |
| A11 | Cohérence inter-composants | PASS | LAB-046 (Navbar/SettingsPanel/ComponentPreview cohésion), 12 tests dédiés PASS |
| A12 | Cohérence composants/breadboard | PASS | Rendu photoréaliste confirmé, composants posés visuellement cohérents avec la grille de trous |

### DOMAIN B — Canvas / Editing (exécuté en navigateur réel)

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| B01 | Placement par clic | PASS | Confirmé à chaque composant testé |
| B02 | Placement par drag | N/A justifié | Aucun mécanisme de "drag depuis palette" distinct du clic n'existe dans ce produit — le placement est exclusivement par clic (comportement produit constant, pas un défaut) |
| B03 | Drag composant | PASS | Geste réel `mousedown`→`pointermove`→`pointerup`, confirmé sur 6+ composants distincts |
| B04 | Sélection simple | PASS | Confirmé |
| B05 | Multi-sélection | PASS | Ctrl+clic, 2 composants sélectionnés simultanément |
| B06 | Marquee | PASS | Rectangle réel sur fond de canvas, sélection multiple confirmée |
| B07 | Suppression | PASS | Touche Delete, composants sélectionnés supprimés |
| B08 | Undo | PASS | Ctrl+Z confirmé (restauration) |
| B09 | Redo | PASS | Ctrl+Y confirmé (ré-application) |
| B10 | Zoom + | PASS | `scale(1.1)` confirmé |
| B11 | Zoom - | PASS | `scale(0.8)` confirmé |
| B12 | Reset zoom | PASS | `scale(1)` confirmé |
| B13 | Pan | PASS | Clic molette réel, `translate` change |
| B14 | Fit content | PASS (écart mineur) | Fonctionne ; léger débordement (~20-70px) observé avec composants très écartés — classe E, non bloquant (déjà documenté MB-VIS-QA-047) |
| B15 | Focus | PASS | Sélection + Entrée → `transform:scale(1.5); z-index:20` |
| B16 | Sortie focus | PASS | Échap → transform/z-index retirés |
| B17 | localScale | PASS | Confirmé via le même mécanisme que B15 |
| B18 | Stabilité scène après interactions combinées | PASS | Scène M (23 composants) : ajout, drag, pan continu — 23/23 préservés, 0 erreur ; Scène L (120 composants, `CanvasPerformanceIsolation.test.jsx`) : 0/119 re-renders parasites en drag, 0/120 en pan |

### DOMAIN C — Physical Connectivity

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| C01 | Pin/contact identifiable | PASS | `button.myblab-pin[data-wire-pin][data-wire-contact]`, confirmé sur tous les types testés |
| C02 | Wire creation | PASS | Geste réel complet (`pointerdown` source → `pointermove` → `pointerup` sur `elementFromPoint` cible), 6 fils créés avec succès dans ce gate |
| C03 | Endpoint snapping | PASS | Suites automatisées dédiées 100 % PASS (`MB-VIS-BREAD-042-InsertionSnapFeedback`, `Breadboard.test.jsx`, `breadboardPhysicalReconciliation.test.jsx`) |
| C04 | Wire persistence | PASS | Fil conservé après navigation/redraw, confirmé |
| C05 | Déplacement composant câblé | PASS | LED déplacée pendant qu'elle est câblée — le `d` du `<path>` du fil se met à jour correctement, confirmé deux fois (QA-047 et ce gate) |
| C06 | Breadboard insertion | PASS | Rendu photoréaliste confirmé + suites automatisées |
| C07 | Breadboard contact coherence | PASS | Suite `Breadboard.test.jsx` (27 tests), `breadboardPhysicalReconciliation.test.jsx` (25 tests) 100 % PASS |
| C08 | Wire + breadboard coexistence | PASS | `CanvasWorkspaceReconciliation` T5/T6 (multi-breadboard + ghost BREAD-042 dans la même scène transformée) |
| C09 | Circuit POWER→RESISTOR→LED→GND | PASS | **Construit et simulé en direct dans ce gate** : POWER.5V→RESISTOR.A, RESISTOR.B→LED.anode, LED.cathode→POWER.GND, `Simuler` cliqué → `aria-label` LED "LED éteinte"→"**LED allumée**" |
| C10 | Circuit conservé après drag/zoom/pan | PASS | Après déplacement LED + zoom avant + pan + undo + redo : 3/3 fils intacts, 4/4 composants intacts, 0 erreur console |
| C11 | Undo/redo sur opérations pertinentes | PASS | Confirmé sur suppression multi-composants (QA-047) et sur déplacement de composant câblé (ce gate) — round-trip position correct |
| C12 | Absence de wire fantôme/cassé | PASS | `wireCount` stable à 3 sur toute la séquence (câblage → sélection → déplacement → zoom → pan → undo → redo → simulation), aucun `<path>` orphelin observé |

### DOMAIN D — Component Values (CRITIQUE)

Testé pour RESISTOR, POWER, POTENTIOMETER, CAPACITOR — **empiriquement, via l'UI réelle** (clic, double-clic, clic droit), **pas par lecture de registre seule**.

| # | Critère | RESISTOR | POWER | POTENTIOMETER | CAPACITOR |
|---|---|---|---|---|---|
| D01 | Valeur visible ? | PARTIAL (convention visuelle des bandes de couleur physiques, aucune lecture numérique explicite) | ABSENT | ABSENT | ABSENT |
| D02 | Modifiable ? | **ABSENT** | **ABSENT** | **ABSENT** | **ABSENT** |
| D03 | Stockée dans le Document si modifiée ? | N/A (D02 absent) | N/A | N/A | N/A |
| D04 | Survit à une interaction ? | N/A | N/A | N/A | N/A |
| D05 | Influence la simulation si pertinent ? | Valeur par défaut utilisée en interne (`canonicalRegistry.js` : `resistance` 220 Ω, min/max déclarés) mais **aucune UI ne permet de la faire varier** — effet non observable par l'utilisateur | N/A | N/A | N/A |
| D06 | Undo/redo respecte la modification si la fonction existe ? | N/A (fonction inexistante) | N/A | N/A | N/A |

**Preuve empirique directe (ce gate) :** clic simple, double-clic et clic droit réels sur un RESISTOR placé → **0 modal, 0 popup, 0 panneau d'inspection, 0 élément `[role="dialog"]`** créé dans le DOM ; la chaîne `"220"` (valeur par défaut) est **absente de tout le DOM rendu**. Recherche de code confirmant : aucun fichier `PropertyPanel`/`Inspector`/`ValueEditor` n'existe dans `frontend/src` ; `SettingsPanel.jsx` (seul panneau réellement monté) n'expose que grille et thème.

**Verdict Domain D : ABSENT — aucune UI utilisateur ne permet de voir ni modifier une valeur de composant électrique.** Une metadata interne (`canonicalRegistry.js`) n'est pas une capacité utilisateur — ceci a été respecté (aucune mutation JS/console utilisée pour simuler artificiellement une capacité).

### DOMAIN E — Simulation / Electrical Feedback

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| E01 | Démarrage simulation | PASS | Bouton "Simuler" réel |
| E02 | Arrêt simulation | PASS | Bouton "Arrêter" réel |
| E03 | POWER→LED→GND | PASS | Confirmé (§C09) |
| E04 | LED OFF→ON | PASS | `aria-label` "LED éteinte"→"LED allumée" |
| E05 | Wire/state feedback | PASS | Classes de feedback CANVAS-044/BREAD-042 (`feedback-valid`/`feedback-invalid`), confirmées par suites automatisées |
| E06 | RGB LED si pertinent | PRESENT | `SimulationStatePresentationCoexistence.test.jsx` (9 tests, PASS) couvre la résolution d'état RGB via le Visual State Registry |
| E07 | Bouton momentané si réellement fonctionnel | PRESENT | `ButtonInteraction008.integration.test.jsx` (5 tests) + `ButtonDragInteraction.integration.test.jsx` (12 tests), 100 % PASS — cycle press/release réel vérifié par geste automatisé équivalent à un geste utilisateur réel |
| E08 | Interrupteur latching si réellement fonctionnel | PRESENT | Mêmes suites, paramétrées `BUTTON`/`BUTTON_LATCHING` |
| E09 | Résistance réellement prise en compte si observable | **PARTIAL** | Valeur utilisée en interne par `dcContributionRegistry`/`dcAnalysis` (déclarations confirmées), mais **aucun effet observable par l'utilisateur** (pas de gradient de luminosité LED, pas de lecture de courant) — cohérent avec l'absence d'instrumentation (Domain G) |
| E10 | Alimentation réellement prise en compte si observable | PRESENT | Le circuit E2E confirme que la LED reste éteinte sans POWER câblé et s'allume une fois POWER intégré au circuit et la simulation démarrée |
| E11 | Modèles DC disponibles | PRESENT | Confirmé (E2E + `dcContributionRegistry`/`canonicalRegistry` établis lors de MB-VIS-QA-047) |
| E12 | Erreurs électriques utilisateur visibles si disponibles | ABSENT | Aucune bannière/indicateur d'erreur électrique (court-circuit, surcharge) observé dans l'UI sur l'ensemble de ce gate et de MB-VIS-QA-047 |

**Distinction explicite demandée :**

| Type de simulation | Statut |
|---|---|
| Digital simulation | PRESENT (LED on/off confirmé) |
| DC simulation | PRESENT (confirmé) |
| Transient simulation | ABSENT — `SIM2 — Scheduler / temps simulé` est déclaré "Planifié" (non commencé) dans `ROADMAP_PLATFORM.md` §5.2 ; limitation **volontaire et documentée**, pas un bug |
| Sensor-dependent simulation (LDR/thermistor) | **NON VÉRIFIÉ** dans le temps imparti de ce gate — rendu visuel qualifié par FT-A, effet électrique dynamique non testé ici ; à ne pas classer PASS ni FAIL sans preuve |
| Motor dynamics (DC_MOTOR/SERVO) | **NON VÉRIFIÉ** dans le temps imparti de ce gate — même remarque |

### DOMAIN F — Arduino / Programming (CRITIQUE, testé par l'UI réelle uniquement)

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| F01 | Arduino présent dans palette | PASS | Confirmé |
| F02 | Arduino visuellement correct | PASS | Asset raster réaliste (carte bleue, port USB, puce) |
| F03 | Arduino plaçable | PASS | Confirmé |
| F04 | Arduino déplaçable | PASS | Geste réel confirmé, déplacé de 200,180 à 500,80 dans ce gate |
| F05 | Pins Arduino câblables | PASS | Pins D2/D3/GND/5V confirmés câblables (fil réel créé D2→anode dans MB-VIS-QA-047) |
| F06 | Alimentation Arduino | PASS | Pins 5V/GND présents et câblables |
| F07 | GPIO disponibles | PASS | D2/D3 exposés comme pins câblables |
| F08 | Interface de programmation disponible | **ABSENT** | Recherche exhaustive `frontend/src` : 0 fichier `CodeEditor`/`Blockly`/`monaco` ; `ArduinoPart.jsx` rend **exclusivement** une image statique (aucun gestionnaire, aucune prop dynamique) |
| F09 | Éditeur code disponible | **ABSENT** | Idem |
| F10 | Programmation blocs disponible | **ABSENT** | Idem — aucune référence Blockly nulle part dans le dépôt |
| F11 | Programmation texte disponible | **ABSENT** | Idem |
| F12 | Programme utilisateur stockable | **ABSENT** | `ArduinoSimulator.js.loadCode(source)` existe mais n'est appelé par **aucune** UI ; stocke une chaîne brute jamais relue par `tick()` |
| F13 | Programme exécutable | **ABSENT** | Aucun parseur/interpréteur — le commentaire du code lui-même dit *"futur : transpilation / interprétation"* |
| F14 | Firmware/runtime effectif | **ABSENT** | `tick()` ne lit que `pinOutputs`, alimenté exclusivement par des appels directs `digitalWrite()`/`analogWrite()` (API interne, jamais déclenchée par une UI) |
| F15 | GPIO pilotable par programme | **ABSENT** | Découle de F12-F14 |
| F16 | Comportement circuit piloté par firmware | **ABSENT** | Découle de F12-F15 |
| F17 | Erreurs programme visibles | **ABSENT** | Aucun éditeur ⇒ aucune erreur de programme possible à afficher |
| F18 | Serial monitor si disponible | **ABSENT** | Confirmé absent (recherche "serial"/"moniteur" dans tout le texte UI rendu = 0 résultat) |

**Preuve empirique directe (ce gate) :** clic simple et double-clic réels sur un Arduino placé → 0 `<textarea>`, 0 élément `[class*="editor"]`/`[class*="code"]`/`[class*="blockly"]`, 0 `.monaco-editor`, 0 `<iframe>`, 0 modal. Recherche plein texte de l'UI rendue (Navbar/Sidebar/StatusBar) pour "programme", "code", "sketch", "upload", "compiler", "serial", "moniteur", "blockly", "firmware" → **0 correspondance**.

**Verdict Domain F : un Arduino graphique et câblable ne constitue PAS un Arduino programmable — confirmé factuellement. Chaîne rompue exactement à F08 (interface de programmation).**

### DOMAIN G — Instrumentation

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| G01 | Mesure de tension | ABSENT | Aucune UI dans l'app réelle |
| G02 | Mesure de courant | ABSENT | Idem |
| G03 | Multimètre | ABSENT | Aucun composant nommé `Multimeter` nulle part dans le dépôt |
| G04 | Oscilloscope | ABSENT | Aucun composant nommé `Oscilloscope`; un commentaire de code désavoue explicitement construire "un oscilloscope" |
| G05 | Serial monitor | ABSENT | Confirmé (voir F18) |
| G06 | Sonde ou feedback électrique | PARTIAL | Le changement d'état visuel LED (éteinte/allumée) et les classes de feedback de fil constituent un retour électrique qualitatif, mais aucune lecture numérique (V/A) |
| G07 | Autres instruments réellement disponibles | PARTIAL (construit, non intégré) | `frontend/src/measurement/MeasurementPanel.jsx` et `frontend/src/observation/TemporalObservationPanel.jsx` existent et fonctionnent en isolation, mais leurs propres en-têtes déclarent explicitement : *"n'est PAS câblé dans l'application live (App.jsx, Sidebar.jsx, useCircuitState.js non touchés)"* — confirmé via lecture de `App.jsx` : ni l'un ni l'autre n'y est importé |

### DOMAIN H — Product Cohesion / Pedagogical Lab

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| H01 | Navbar | PASS | Toutes commandes fonctionnelles (Nouveau/Ouvrir/Sauvegarder/Simuler/Arrêter/Zoom/Vue/Contenu/Sélection/Paramètres) |
| H02 | Sidebar | PASS | Palette complète, scrollable, tous types accessibles |
| H03 | Canvas | PASS | Grille discrète, sélection, drag, marquee, zoom/pan tous fonctionnels |
| H04 | Breadboard | PASS | Rendu photoréaliste, insertion, snap |
| H05 | StatusBar | PASS | "Composants : N", "Fils : N", statut Prêt/Simulation, confirmé visible |
| H06 | Settings | PASS | Ouverture/fermeture, thème, grille |
| H07 | Simulation controls | PASS | Play/Stop fonctionnels, disabled cohérent |
| H08 | Cohérence light/dark | PASS | Bascule réelle bidirectionnelle sans reload |
| H09 | Absence d'erreurs console | PASS | **0 erreur console sur l'intégralité des deux sessions de QA** (MB-VIS-QA-047 + ce gate), vérifiée après quasiment chaque étape |
| H10 | Absence de ressources cassées | PASS | 0/18 image cassée, confirmé deux fois |
| H11 | Compréhension des actions principales | PASS | Labels français clairs, icônes cohérentes, titres explicites (`title="Zoom avant"`, etc.) |
| H12 | Capacité de construire un circuit sans outils développeur | PASS | Le circuit E2E complet de ce gate a été construit avec des gestes équivalents à des interactions utilisateur réelles (clic, drag, câblage pin-à-pin), sans mutation directe du Document |
| H13 | Capacité de simuler sans outils développeur | PASS | Bouton Simuler réel, résultat observable (LED) |
| H14 | Capacité de comprendre visuellement le résultat | PASS | LED éteinte/allumée directement visible, sans instrumentation requise pour ce niveau basique |
| H15 | Cohérence générale d'un laboratoire pédagogique | PASS | Confirmée par l'ensemble des points ci-dessus |

## 5. Scénario E2E principal

Construit exclusivement via gestes UI réels (aucune mutation directe du Document) :

1. **Placement** — RESISTOR, ARDUINO (non utilisé dans ce circuit), POWER, LED placés par clic palette. 0 erreur.
2. **Alignement** — chaque composant déplacé par geste réel (`mousedown`→`pointermove`→`pointerup`) vers une position dégagée. Positions finales confirmées par lecture DOM.
3. **Câblage** — POWER.5V→RESISTOR.A, RESISTOR.B→LED.anode, LED.cathode→POWER.GND : 3 gestes de câblage réels, 3 fils créés (`svg.wires-layer` contient 3 `<path>` visibles + 3 hitzones).
4. **Sélection** — LED sélectionnée par clic réel (`circuit-component--selected` appliqué).
5. **Déplacement** — LED déplacée alors que câblée : le `d` du fil correspondant se met à jour (`M 95 187 L 147.5 187 L 147.5 134 L 200 134`), aucune rupture.
6. **Zoom** — Zoom avant réel (`scale(1.1)`).
7. **Pan** — clic molette réel, `translate` modifié, zoom inchangé.
8. **Undo** — Ctrl+Z réel : composants et fils intacts après.
9. **Redo** — Ctrl+Y réel : position finale ré-appliquée correctement (378,156 → 378,156, round-trip cohérent).
10. **Simuler** — bouton "Simuler" cliqué réellement.
11. **Observer** — `aria-label` de la LED : **"LED éteinte" → "LED allumée"**.

**Résultat : aucun crash, aucune corruption, wire cohérent tout au long de la séquence (3/3 fils intacts), LED observable, 0 nouvelle erreur console critique.** Scénario entièrement PASS.

## 6. Scénario Arduino

| Étape | Résultat |
|---|---|
| Arduino placeable | PASS |
| Arduino déplaçable | PASS |
| GPIO wireable | PASS |
| Éditeur de programme | **ABSENT** |
| Runtime firmware | **ABSENT** |
| GPIO piloté par firmware | **ABSENT** |

**La chaîne s'arrête exactement à l'étape "éditeur de programme" (F08).** Aucune modification de code source, aucun DevTools, aucune mutation directe du Document n'a été utilisée pour cette conclusion — recherche exhaustive de l'UI réelle uniquement.

## 7. Scénario Component Value

Résistance placée, recherche exhaustive dans l'UI réelle (clic, double-clic, clic droit) :

| Élément | Statut |
|---|---|
| Schéma interne (`canonicalRegistry.js`) | PRESENT (métadonnée `resistance`, 220 Ω par défaut, min/max déclarés) |
| Valeur visible UI | PARTIAL (convention visuelle des bandes de couleur physiques uniquement, aucune lecture numérique) |
| Édition UI | **ABSENT** |
| Persistance Document (si modifiable) | N/A |
| Effet simulation (si modifiable) | N/A |

**Scénario stoppé à l'étape "édition UI" — aucune modification de code effectuée, conformément à la consigne.**

## 8. Baseline tests

```
npm --prefix frontend run test:ci
Test Files  12 failed | 185 passed (197)
     Tests  50 failed | 2654 passed (2704)
```

**Identique, sans aucune différence**, à la baseline établie et classifiée par `MB-VIS-QA-047-QUALIFICATION.md`. Aucune divergence à expliquer — la baseline est stable sur cette nouvelle branche.

- `npm --prefix frontend run build` → **PASS** (exit 0, 189 modules, 1.15s).
- `cd frontend; npx tsc -b` → **PASS** (exit 0, aucune sortie).
- `git diff --check` → **PASS** (aucune sortie, aucun problème d'espace).

## 9. Analyse des 50 FAIL — réconciliation (sans correction)

| Cluster | Contrat actuel | Ancienne assertion | Régression réelle ? | Réconciliation requise avant Level-1 PASS ? | Verdict |
|---|---|---|---|---|---|
| **A — Contact/Pin split** (20 fails : `resolveComponentContactHoles`×12, `assemblyGeometry`×2, `AssemblyLeadsLayer`×2, `LdrPart.raster`×2, `RgbLedPart.raster`×1, `contactModel`×1) | `contacts:[{dx,dy}]` = position physique réelle des pattes (FT-C-001-A) | Position `pin.dx/dy` legacy | NON — décision architecturale intentionnelle et documentée en code | NON | **NON-BLOCKING (DEBT)** — tests obsolètes, produit fonctionnellement correct (confirmé par 226+ tests de régression ciblée PASS et QA navigateur réelle sur ces mêmes types) |
| **B — Capacitor/Thermistor CSS-drawn migration** (30 fails : `partDimensionsCanonical`×8, `ThermistorPart.raster`×8, `CapacitorPart.raster`×6, `partDimensionsGuard`×3, `RealisticRenderers`×3, `renderQualityGate`×2) | Corps CSS `radial-gradient` avec référence visuelle CSA-validée | Contrat `<img>`/raster | NON — réécriture intentionnelle documentée en commentaire de code ("référence visuelle validée CSA") | NON | **NON-BLOCKING (DEBT)** — rendu visuellement correct et stable (confirmé en navigateur réel deux fois), mais la métadonnée `backend:'raster'` doit être corrigée **hors de ce gate** |
| **C — RGB LED dimension/import duplication** (inclus dans le sous-total de `partDimensionsGuard`, 1/3 des échecs de ce fichier) | `RgbLedPart.jsx` gère son propre pipeline d'assets multi-état, dimensions 90×56 codées en dur, n'importe pas `getComponentDef` | Contrat d'import universel `getComponentDef` | NON — le composant fonctionne correctement (confirmé RGB via suite automatisée PASS) | NON | **NON-BLOCKING (DEBT)** — duplication mineure, aucun défaut fonctionnel observé |

**Décision du gate : les 50 FAIL peuvent être tolérés pour la sortie Niveau 1.** Aucun n'est une régression réelle ; tous sont des tests obsolètes après évolution architecturale intentionnelle et documentée, sans impact fonctionnel observable en navigateur réel. Cette réconciliation ne modifie, ne supprime, ni n'affaiblit aucun test.

## 10. Metadata / Documentation Consistency

| Élément | Valeur |
|---|---|
| CAPACITOR — actual renderer | CSS-drawn (`<div>` avec `radial-gradient`), confirmé en navigateur réel, **0 `<img>`** |
| CAPACITOR — declared backend (`defaultRegistrations.js`) | `raster` |
| THERMISTOR — actual renderer | CSS-drawn, confirmé en navigateur réel, **0 `<img>`** |
| THERMISTOR — declared backend | `raster` |
| Roadmap statement (`ROADMAP_PLATFORM.md` §7.2.2/§7.4) | *"16 composants sur 16 ... sont rasterisés"*, CAPACITOR et THERMISTOR explicitement nommés dans la liste des 16 |
| Consistency | **INCONSISTANT.** Le renderer réel de 2 des 16 composants déclarés "rasterisés" par la roadmap ne l'est pas (CSS-drawn). Confirmé par lecture de code **et** inspection DOM en navigateur réel. Déjà documenté et classifié (classe B, MB-VIS-QA-047) — **aucune correction effectuée dans ce gate**, conformément à l'interdiction explicite. |

## 11. Liste P0 / P1 / P2 / P3

### P0 — 0

Aucun crash, aucune corruption, aucune perte de données, aucune rupture architecturale observée sur l'ensemble de ce gate.

### P1 — 2

| ID | Domain | Description | Evidence | Level-1 blocking | Recommended capability correction |
|---|---|---|---|---|---|
| P1-01 | D | Aucune UI ne permet de voir (au-delà d'une convention visuelle non numérique) ni de modifier la valeur électrique d'un composant (RESISTOR/POWER/POTENTIOMETER/CAPACITOR testés) | Clic/double-clic/clic droit réels sur RESISTOR → 0 modal/popup/panel ; recherche de code confirmant l'absence de tout fichier `PropertyPanel`/`Inspector`/`ValueEditor` | **OUI** | Capacité d'édition de valeur de composant (UI + persistance Document) — décision de découpage laissée au CSA |
| P1-02 | F | Aucune interface de programmation Arduino (éditeur, blocs, texte), aucun runtime firmware, aucun pilotage GPIO par programme | Clic/double-clic réels sur Arduino → 0 éditeur/textarea/Blockly/Monaco/modal ; recherche plein texte UI → 0 correspondance programme/code/sketch/serial ; `ArduinoSimulator.loadCode()` jamais appelé par une UI, jamais relu par `tick()` | **OUI** | Capacité de programmation Arduino (éditeur + runtime + pilotage GPIO) — relève des Épics EMB1/SIM3 de la roadmap, décision de découpage laissée au CSA |

### P2 — 1

| ID | Domain | Description | Evidence | Level-1 blocking | Recommended capability correction |
|---|---|---|---|---|---|
| P2-01 | G | Aucun instrument réellement intégré à l'application live (voltmètre, ampèremètre, multimètre, oscilloscope, serial monitor) — deux composants d'instrumentation existent en source mais sont explicitement non câblés | `MeasurementPanel.jsx`/`TemporalObservationPanel.jsx` non importés dans `App.jsx`, disclaimers explicites dans leurs propres en-têtes | Non-bloquant pour la parité **basique** (le retour visuel LED reste compréhensible sans instrument), mais gênant pour une parité Tinkercad complète | Intégration des panneaux d'instrumentation déjà construits — décision de priorisation CSA |

### P3 — 3

| ID | Domain | Description | Reportable EXP4 |
|---|---|---|---|
| P3-01 | A/9 | Métadonnée `backend:'raster'` incorrecte pour CAPACITOR/THERMISTOR, contredisant la déclaration roadmap "16/16 rasterisés" | Oui |
| P3-02 | B | Marge de `fitToContent` potentiellement insuffisante pour scènes à fort écart de taille/position | Oui |
| P3-03 | A | `RgbLedPart.jsx` hors contrat d'import canonique `getComponentDef`, dimensions dupliquées | Oui |

## 12. Matrice synthétique Tinkercad Level-1

| Capacité de référence Tinkercad | État MYBlab |
|---|---|
| Placement / drag / sélection / undo-redo / zoom / pan | PASS |
| Câblage / routage / snapping breadboard | PASS |
| Simulation digitale de base (LED on/off) | PASS |
| Édition de valeur de composant en un clic | **ABSENT (P1)** |
| Programmation Arduino (blocs ou texte) + exécution | **ABSENT (P1)** |
| Instrumentation (multimètre minimal) | **ABSENT (P2)** |
| Qualité visuelle / cohérence du laboratoire | PASS |
| Stabilité / absence d'erreur / performance à l'échelle | PASS |

## 13. Écarts réellement bloquants

- **P1-01** — Component Value Editing totalement absent.
- **P1-02** — Arduino Programming totalement absent.

Ces deux écarts empêchent de déclarer honnêtement que MYBlab a atteint la parité fonctionnelle Tinkercad de Niveau 1 : l'édition de valeur et la programmation Arduino sont des piliers de l'expérience Tinkercad Circuits de référence, pas des détails secondaires.

## 14. Écarts reportables EXP4

- P2-01 (instrumentation non intégrée — les composants existent déjà, décision d'intégration relève du CSA, potentiellement avant même EXP4 si jugé nécessaire pour la parité).
- P3-01, P3-02, P3-03 (dette de métadonnée et cas limites mineurs).

## 15. Verdict final

```
LEVEL 1 — HOLD
```

**Justification :** MYBlab est stable, ne présente aucune régression, aucun crash, aucune corruption sur l'ensemble de ce gate et du précédent (MB-VIS-QA-047). Le scénario E2E principal (POWER→RESISTOR→LED→GND, placement→câblage→sélection→déplacement→zoom→pan→undo→redo→simulation→observation) est intégralement PASS. Cependant, **2 P1 confirmés empiriquement** (édition de valeur de composant totalement absente ; programmation Arduino totalement absente) empêchent de déclarer honnêtement le niveau Tinkercad atteint — ces deux capacités sont centrales à l'expérience Tinkercad Circuits de référence. HOLD signifie que le gate a correctement identifié les capacités restantes avant certification Niveau 1 ; ce n'est pas un échec du projet.

---

**Fin du rapport. Aucune correction n'a été entamée. Le CSA doit statuer sur le découpage des P1/P2 avant toute nouvelle unité d'exécution.**
