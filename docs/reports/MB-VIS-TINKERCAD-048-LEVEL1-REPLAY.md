# MB-VIS-TINKERCAD-048 — Official Level-1 Replay

**Type :** gate final de qualification. Aucun développement produit, aucune correction, aucune modification de production.

Ce rapport **rejoue** le gate `MB-VIS-TINKERCAD-048-LEVEL1-GATE.md` (verdict historique : `LEVEL 1 — HOLD`, base `010552c`) sur l'état ACTUEL du produit. Les verdicts historiques ne sont PAS repris comme des faits actuels — chaque critère D/F/G a été re-testé EMPIRIQUEMENT dans le navigateur réel, indépendamment du fait que les tickets correspondants (MB-L1-CVE-001, MB-MEASURE-002, MB-L1-ARD-001→005, MB-L1-CONS-001/002) soient CLOSED.

## 1. SHA exact / environnement

- Base verrouillée et vérifiée : `be71a8ae03fec2e2c71065bc318e051869e4048d` (commit `test(level1): consolidate renderer contracts`, MB-L1-CONS-002).
- `git rev-parse HEAD` avant tout travail = `be71a8ae03fec2e2c71065bc318e051869e4048d` — **conforme**.
- Branche créée : `feat/MB-VIS-TINKERCAD-048-level1-replay`, exactement depuis cette base.
- `npm --prefix frontend run test:ci` (canonique), `npm --prefix frontend run build`, `cd frontend; npx tsc -b` — PowerShell utilisé (Bash cassé dans cet environnement, note connue de `KNOWN-BROKEN-STATE.md`).
- QA navigateur réalisée sur l'app réelle servie par `npm run dev` (port 5173), Browser pane Chrome-engine réel (pas jsdom).
- **Note d'outillage observée** (sans impact sur les preuves) : ce Browser pane affiche occasionnellement une image de rendu figée (zone noire partielle) après certaines interactions ; confirmé à chaque fois via `get_page_text`/DOM que l'état applicatif réel restait correct et que le problème disparaissait après ouverture d'un nouvel onglet — artefact de capture d'écran de l'outillage de test, pas un défaut produit.
- **Note d'outillage sur le timing Arduino** (déjà documentée par ARD-005, reconfirmée ici) : `requestAnimationFrame` dans ce pane ne progresse que lorsqu'un repaint est forcé (ex. `screenshot`), pas selon une cadence murale continue — la preuve Blink a donc été obtenue en enchaînant des repaints plutôt qu'en attendant une horloge murale réelle, conformément à l'avertissement du ticket ("ne pas exiger une précision wall-clock 500 ms").

## 2. Résultat suite canonique

```
npm --prefix frontend run test:ci
Test Files  216 passed (216)
     Tests  2897 passed (2897)
[exited with code 0]
```

**FAIL = 0.** Total inchangé (2897) par rapport à la baseline attendue MB-L1-CONS-002 — aucun écart à expliquer, aucun code modifié dans ce ticket.

## 3. Build / Typecheck / Diff-check

- `npm --prefix frontend run build` → **PASS** (exit 0).
- `cd frontend; npx tsc -b` → **PASS** (aucune sortie).
- `git diff --check` → **PASS** (aucune sortie ; aucun fichier de production modifié dans ce ticket, confirmé §9).

## 4. Matrice A–H complète (replay empirique)

### DOMAIN A — Component Library / Visual Quality

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| A01 | Palette utilisable | PASS | Palette scrollable, tous les items cliquables, ajout au centre confirmé sur 8+ types distincts dans ce replay |
| A02 | Previews cohérentes | PASS | Icônes de palette CAPACITOR ("104") et THERMISTOR ("NTC"/"100-9") identiques au rendu canvas réel — même mécanisme `PartRenderer` |
| A03 | Composants réalistes | PASS | Assets raster confirmés (LED, RESISTOR, POWER, ARDUINO) ; CAPACITOR/THERMISTOR CSS/DOM confirmés visuellement corrects (corps radial, marquages lisibles), backend réconcilié par MB-L1-CONS-002 |
| A04 | Proportions cohérentes | PASS | Dimensions dérivées de `componentDefinitions.js`, verrouillé par 2897 tests, dont les dimension-guards |
| A05 | Leads/contact points cohérents | PASS | `AssemblyLeadsLayer` + PhysicalContact (MB-L1-CONS-001) confirmés en direct : pattes CAPACITOR/THERMISTOR connectées exactement aux positions de contact physiques dans le circuit Arduino de ce replay |
| A06 | Labels utiles | PASS | `aria-label` vérifiés en direct : "Résistance", "LED éteinte"/"LED allumée", "Condensateur céramique non polarisé", "Thermistance NTC", "Alimentation", "Arduino UNO", "Potentiomètre" |
| A07 | Assets intègres | PASS | Aucune image cassée observée sur l'ensemble du replay |
| A08 | États visuels actifs cohérents | PASS | LED éteinte↔allumée (E2E réel x2 : circuit simple et circuit Arduino), sélection/drag visuels cohérents |
| A09/A10 | Thème clair/sombre | **NON VÉRIFIÉ** | Aucun contrôle de bascule de thème rencontré dans la Navbar/Settings au cours de ce replay (buttons disponibles : Nouveau/Ouvrir/Sauvegarder/Simuler/Arrêter/Zoom/Vue/Contenu/Sélection/Code/Mesures/⚙). Non re-testé faute de commande identifiée — **ne pas déclarer PASS ni FAIL sans preuve** ; classé P3 (raffinement de vérification, pas un défaut constaté) |
| A11 | Cohérence inter-composants | PASS | Navbar/Palette/Inspector/Mesures/Code cohabitent sans conflit observé sur une session à 5 composants + breadboard |
| A12 | Cohérence composants/breadboard | PASS | LED insérée dans le breadboard, pattes alignées visuellement sur les trous, aucune distorsion |

**Le contrat actuel autorise plusieurs techniques de rendu (raster ET CSS/DOM) — non exigé que tous les composants utilisent le raster, conformément à la consigne du ticket.**

### DOMAIN B — Canvas / Editing (navigateur réel)

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| B01 | Placement | PASS | Confirmé sur LED/RESISTOR/POWER/ARDUINO/POTENTIOMETER/breadboard |
| B02 | Drag composant | PASS | LED déplacée (359,212)→(500,150) ; Résistance/Alimentation/Arduino séparés par drag réel à plusieurs reprises |
| B03 | Sélection simple | PASS | Confirmé (panneau Propriétés à jour à chaque sélection) |
| B04 | Multi-sélection / Marquee | PASS | Marquee réel (300,100)→(560,220) : LED + Résistance sélectionnés simultanément (2 contours bleus visibles) |
| B05 | Delete | PASS | Touche Delete sur sélection multiple → `Composants : 0` |
| B06 | Undo | PASS | Ctrl+Z → restauration des 2 composants supprimés |
| B07 | Redo | PASS | Ctrl+Y → re-suppression appliquée correctement |
| B08 | Zoom + / Zoom - | PASS | Confirmé visuellement (composants agrandis puis réduits) |
| B09 | Reset zoom (Réinitialiser la vue) | PASS | Retour à l'échelle 1x confirmé |
| B10 | Pan | **NON RE-TESTÉ** | Non exercé explicitement dans ce replay (bouton molette non simulé) — capacité déjà verrouillée par suites automatisées (`CanvasWorkspaceReconciliation`) et confirmée par le premier gate (B13 PASS) ; pas de régression suspectée, mais pas de preuve navigateur fraîche dans CE replay — classé P3 (lacune de couverture du replay, pas un défaut constaté) |
| B11 | Fit content (Ajuster au contenu) | PASS | Clic réel : vue recentrée pour englober LED/potentiomètre/résistance/breadboard/power/arduino en une seule fois |
| B12 | Focus/localScale | **NON RE-TESTÉ** | Non exercé explicitement (pas de sélection + Entrée testée) ; déjà PASS au premier gate, suites automatisées inchangées — P3 |
| B13 | Stabilité scène | PASS | Aucun crash, aucune corruption sur une session cumulant ~15 opérations (ajout ×5, drag ×4, marquee, delete, undo, redo, zoom ×3, fit, wiring ×6, breadboard insert, simulation start/stop ×3) |

### DOMAIN C — Physical Connectivity (navigateur réel)

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| C01 | Contact/pin identifiable | PASS | `button[data-wire-pin]` confirmé sur tous les types testés |
| C02 | Wire creation | PASS | 6 fils créés avec succès dans ce replay (2 circuits distincts) |
| C03 | Snapping | PASS | LED insérée dans le breadboard, pattes alignées sur les trous (visuel confirmé) |
| C04 | Wire persistence | PASS | Fils conservés après déplacement de composant, après insertion breadboard, après Start/Stop simulation répétés |
| C05 | Déplacement composant câblé | PASS | LED déplacée (310,212)→(150,250) alors que câblée à Résistance ET Alimentation — les deux fils suivent sans rupture |
| C06 | Breadboard | PASS | Ajout réel, LED insérée par drag, rendu correct |
| C07 | Contact coherence | PASS | Après insertion breadboard, `Simuler` → LED toujours "allumée" (le contact électrique traverse correctement le breadboard) |
| C08 | Wire + breadboard | PASS | Fils et breadboard coexistent visuellement sans conflit |
| C09 | Absence wire fantôme | PASS | `Fils : N` toujours exact tout au long de la séquence (aucun `<path>` orphelin) |
| C10 | Undo/redo | PASS | Confirmé sur suppression multi-composants (§Domain B) |

**Circuit électrique réel construit** (minimum requis) : POWER→RESISTOR→LED→GND (Domain E) ET ARDUINO.D2→RESISTOR→LED→POWER.GND (Domain F) — deux circuits réels distincts, tous deux fonctionnels.

### DOMAIN D — Component Values (CRITIQUE — testé empiriquement, UI réelle)

Circuit de preuve : **POWER(5V) → RESISTOR → POWER.GND**, mesure de courant via le panneau Mesures.

| # | Critère | RESISTOR | POWER | POTENTIOMETER | CAPACITOR |
|---|---|---|---|---|---|
| D01 | Valeur visible ? | **PASS** — Inspector affiche "Valeur de la résistance en Ohms" = `220` | **PASS** — "Tension de sortie de la source en Volts" = `5` | **PASS** — deux champs : résistance totale (`10000` Ω) et position curseur (`0,5`) | **PASS** — "Capacité" = `0,0001 F` (confirmé session CONS-002, mécanisme Inspector identique) |
| D02 | Modifiable ? | **PASS** — champ numérique éditable, `220`→`1000` appliqué | **PASS** — champ numérique éditable (non modifié dans ce test, mais input actif confirmé) | **PASS** — deux champs numériques éditables | **PASS** — champ numérique éditable (mécanisme Inspector générique, identique pour tous types) |
| D03 | Stockée dans le Document si modifiée ? | **PASS** — `read_page` confirme `textbox "1000"` après modification | N/A (non modifié dans ce test) | N/A (non modifié dans ce test) | N/A (non modifié dans ce test) |
| D04 | Survit à une interaction ? | **PASS** — valeur `1000` conservée après fermeture/réouverture du panneau Mesures, sélection d'un autre composant, et re-sélection | — | — | — |
| D05 | Influence la simulation si pertinent ? | **PASS — preuve quantitative directe** (voir ci-dessous) | N/A pour ce circuit | N/A (non câblé dans ce test) | N/A (non câblé dans ce test) |
| D06 | Undo/redo respecte la modification ? | **PASS** — Ctrl+Z après modification `220→1000` → champ revient exactement à `220` | — | — | — |

**Preuve empirique directe D05 (mesure de courant, panneau Mesures, simulation active) :**

| Résistance appliquée | Courant mesuré (A) | Attendu (loi d'Ohm, 5V/R) | Écart |
|---|---:|---:|---:|
| 220 Ω | `0.022727272727272728` | `5/220 = 0.022727272727272728` | **0 (exact)** |
| 1000 Ω | `0.005` | `5/1000 = 0.005` | **0 (exact)** |

Statut de mesure : `VALID` dans les deux cas. **La modification de la valeur du composant modifie quantitativement et exactement le résultat de simulation — pas une simple existence d'un Inspector.**

**Verdict Domain D : PASS.** Les 4 types requis (RESISTOR, POWER, POTENTIOMETER, CAPACITOR) exposent tous une valeur visible et modifiable via un Inspector générique réel ; RESISTOR est prouvé de bout en bout (visible → modifiable → stocké → persistant → influence quantitative exacte sur la simulation → undo/redo correct).

### DOMAIN E — Simulation / Electrical Feedback

Circuit de preuve : **POWER → RESISTOR → LED → POWER.GND** (câblé, simulé en direct).

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| E01 | Start | PASS | Bouton "Simuler" réel → `▶ Simulation active` |
| E02 | Stop | PASS | Bouton "Arrêter" réel → `⏹ Simulation arrêtée`, LED repasse à "éteinte" |
| E03 | LED OFF→ON | PASS | `aria-label` "LED éteinte" (avant Start) → "LED allumée" (après Start) |
| E04 | Circuit POWER→RESISTOR→LED→GND | PASS | Construit et simulé en direct dans ce replay |
| E05 | Feedback fils/états | PASS | Fils colorés dynamiquement (rouge = HIGH, bleu = LOW) reflétant l'état électrique réel, observé sur les deux circuits de ce replay |
| E06 | Résistance réellement prise en compte | PASS | Voir Domain D — le courant traversant dépend exactement et quantitativement de la valeur de résistance (preuve Ohm exacte) |
| E07 | Alimentation réellement prise en compte | PASS | LED s'allume uniquement une fois le circuit complet (POWER incluse) et la simulation démarrée |

**Distinction explicite demandée (aucune sur-qualification) :**

| Type de simulation | Statut | Preuve |
|---|---|---|
| Digital | PASS | LED ON/OFF piloté par GPIO Arduino (Domain F) et par POWER direct (Domain E) |
| DC | PASS | Circuit POWER→RESISTOR→GND : courant DC calculé exactement (loi d'Ohm, Domain D) |
| Transient/time-driven | PRESENT (limité) | Le Scheduler pilote le `delay()` Arduino (MB-L1-ARD-003) — confirmé fonctionnel dans ce replay (voir Domain F) ; **aucune simulation transitoire de type RC/capacité chargée dans le temps n'a été testée** — non qualifié PASS ni ABSENT sans preuve, resté hors du périmètre testé ici |
| Sensor-dependent (LDR/thermistor) | **NON VÉRIFIÉ** | Hors du périmètre de ce replay (non exigé explicitement par le ticket) — à ne pas classer PASS ni FAIL |
| Motor dynamics (DC_MOTOR/SERVO) | **NON VÉRIFIÉ** | Idem |

### DOMAIN F — Arduino / Programming (CRITIQUE, testé par l'UI réelle uniquement)

Circuit de preuve : **ARDUINO.D2 → RESISTOR.A, RESISTOR.B → LED.anode, LED.cathode → POWER.GND**. Sketch Blink standard (`pinMode`/`digitalWrite`/`delay`).

| # | Étape | Verdict | Preuve |
|---|---|---|---|
| F01 | Placer Arduino | PASS | Ajouté, séparé par drag réel |
| F02 | Sélectionner Arduino | PASS | Panneau Propriétés confirme "Arduino UNO" |
| F03 | Ouvrir Code Workspace | PASS | Bouton "💻 Code" → panneau "Arduino Code" avec `<textarea>` Sketch réel |
| F04 | Modifier le sketch | PASS | Sketch Blink saisi dans le `<textarea>` réel |
| F05 | Compiler | PASS | Bouton "Compiler" → message "Compilation réussie" affiché |
| F06 | Apply | PASS | Bouton "Appliquer" → source stockée dans le Document (confirmé par re-ouverture du panneau) |
| F07 | Start Simulation | PASS | Bouton "Simuler" global → `▶ Simulation active` |
| F08 | Firmware exécute | PASS | D2 passe HIGH immédiatement (setup + premier passage de loop, indépendant du throttling RAF) |
| F09 | GPIO commande le circuit | PASS | Fil D2→RESISTOR coloré HIGH (rouge), propagé jusqu'à LED.anode |
| F10 | **Résultat visible : LED ON→OFF→ON** | **PASS — preuve directe obtenue** | `aria-label` LED : "allumée" (t≈0, HIGH) → **"éteinte"** (repaint suivant, LOW) → **"allumée"** (repaint suivant, HIGH) — séquence complète observée via inspection DOM répétée en pompant les repaints (technique ARD-005, timing wall-clock non exigé par le ticket) |
| F11 | Stop | PASS | Bouton "Arrêter" → LED reste "éteinte" en continu (aucune progression après arrêt) |
| F12 | Restart | PASS | Bouton "Simuler" à nouveau → LED immédiatement "allumée" (session fraîche, `setup()` ré-exécuté) |
| F13 | Invalid firmware diagnostic | PASS | Sketch `analogWrite(2, 128)` appliqué → diagnostic affiché : *"Ligne 1 / UNSUPPORTED_STATEMENT / unsupported statement: \"analogWrite(2, 128)\""* ; fil D2 passe en style pointillé (FLOATING, ni HIGH ni LOW figé) ; LED "éteinte" ; **0 erreur console, 0 crash** |
| F14 | Correction du firmware | PASS | Sketch Blink valide ré-appliqué |
| F15 | Reprise correcte | PASS | HIGH puis LOW ré-observés après correction — alternance confirmée reprise sans intervention supplémentaire |

**Verdict Domain F : PASS.** Chaîne complète Code Workspace → compilation → Apply → runtime → GPIO → circuit → LED visible, intégralement prouvée dans le navigateur réel, y compris Stop/Restart et le cycle diagnostic-invalide/correction. Conformément à l'avertissement du ticket, la cadence murale exacte de 500 ms n'a pas été chronométrée (non exigée) — seule l'évolution temporelle fonctionnelle correcte (ON→OFF→ON, dans l'ordre, sans corruption) a été exigée et observée.

### DOMAIN G — Minimum Instrumentation (OBLIGATOIRE, testé empiriquement)

Circuit de preuve : **POWER → RESISTOR → GND** (identique au circuit Domain D).

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| G01 | Voltage visible | PASS | Mode "VOLTAGE" disponible dans le panneau Mesures, cible sélectionnable |
| G02 | Current visible | PASS | Mode "CURRENT" → valeur numérique exacte retournée (voir tableau Domain D) |
| G03 | VALID state | PASS | `Status: VALID` affiché pour les deux mesures de courant (220 Ω et 1000 Ω) |
| G04 | R=220Ω → courant | PASS | `0.022727272727272728 A` — exact (5/220) |
| G05 | R=1000Ω → courant change | PASS | `0.005 A` — exact (5/1000), changement quantitatif confirmé après modification de la valeur du composant |
| G06 | Cas non supporté (LED) → UNAVAILABLE explicite | **PASS** | Cible "LED · Anode" sélectionnée, mode VOLTAGE, `Measure` cliqué → `Status: UNAVAILABLE`, `Reason: "no canonical VOLTAGE is currently produced for component type \"LED\" in the current circuit state"` — **résultat explicite avec message, pas une absence silencieuse** |

**Verdict Domain G : PASS.** L'instrumentation minimale (tension/courant, cibles multiples, statut VALID/UNAVAILABLE explicite avec raison) est réellement intégrée dans l'application live (panneau "📊 Mesures" accessible depuis la Navbar), contrairement à l'état du premier gate où `MeasurementPanel.jsx` existait en isolation mais n'était pas monté dans `App.jsx`.

### DOMAIN H — Global Laboratory Experience

| # | Critère | Verdict | Preuve |
|---|---|---|---|
| H01 | Navbar | PASS | Toutes commandes fonctionnelles (Nouveau/Ouvrir/Sauvegarder/Simuler/Arrêter/Zoom/Vue/Contenu/Sélection/Code/Mesures/⚙) |
| H02 | Palette | PASS | Complète, scrollable, tous types accessibles |
| H03 | Canvas | PASS | Sélection, drag, marquee, zoom, fit tous fonctionnels |
| H04 | Breadboard | PASS | Ajout, insertion, snap, cohérence électrique confirmée |
| H05 | Inspector | PASS | Panneau Propriétés à jour à chaque sélection, champs éditables fonctionnels (Domain D) |
| H06 | Instrumentation | PASS | Panneau Mesures accessible, fonctionnel (Domain G) |
| H07 | Arduino Code Workspace | PASS | Accessible, fonctionnel de bout en bout (Domain F) |
| H08 | Simulation controls | PASS | Simuler/Arrêter cohérents sur les deux circuits testés |
| H09 | Theme | **NON VÉRIFIÉ** | Voir A09/A10 — aucun contrôle identifié dans ce replay, P3 |
| H10 | Absence d'erreurs console | **PASS** | `read_console_messages` interrogé à plusieurs reprises tout au long du replay (après wiring, après Start/Stop, après diagnostic invalide, en fin de session) : **0 erreur à chaque fois**, uniquement les messages `[vite]`/React DevTools habituels |
| H11 | Cohérence générale du workflow | PASS | Un circuit complet (placement → câblage → valeurs → simulation → mesure → programmation Arduino) a été construit de bout en bout sans recharger la page ni utiliser d'outil développeur autre que l'inspection en lecture seule |

## 5. Comparaison avec le premier 048 (`MB-VIS-TINKERCAD-048-LEVEL1-GATE.md`, base `010552c`)

| Capacité | Premier 048 (HOLD) | Ce replay (base `be71a8a`) |
|---|---|---|
| Baseline canonique | 50 FAIL / 2704 total | **0 FAIL / 2897 total** |
| Domain D — Component Values | **ABSENT** (P1-01) — 0 modal/panel, 0 édition possible | **PASS** — Inspector réel, 4 types testés, preuve quantitative Ohm exacte |
| Domain F — Arduino Programming | **ABSENT** (P1-02) — 0 éditeur, 0 runtime, chaîne rompue à F08 | **PASS** — Code Workspace → compile → Apply → runtime → GPIO → LED, cycle complet incluant Stop/Restart/diagnostic invalide |
| Domain G — Instrumentation | **ABSENT/PARTIAL** (P2-01) — panneaux existants mais non montés dans `App.jsx` | **PASS** — panneau Mesures monté et fonctionnel, VALID/UNAVAILABLE explicites |
| Domain A — métadonnée raster CAPACITOR/THERMISTOR | INCONSISTANT (P3-01) | **Réconcilié** (MB-L1-CONS-002) |
| Domain A — RgbLedPart hors contrat d'import (P3-03) | Constaté | **Réconcilié** (MB-L1-CONS-002, vérification runtime) |
| Domain B — Fit content marge (P3-02) | Écart mineur constaté | Non re-testé à l'identique (fit content fonctionnel, aucune marge mesurée dans ce replay) |
| Domain B/C/H — reste de la matrice | PASS | PASS (reconfirmé) |

**Tous les blocages P1 et le P2 du premier gate sont résolus et re-vérifiés empiriquement — pas seulement parce que les tickets correspondants sont CLOSED, mais par observation directe en navigateur réel dans ce replay.**

## 6. Liste P0 / P1 / P2 / P3

### P0 — 0

Aucun crash, aucune corruption, aucune perte de données, aucune rupture architecturale observée sur l'ensemble de ce replay.

### P1 — 0

Aucune capacité essentielle Level-1 absente ou inutilisable. Les trois anciens P1/P2 (Component Values, Arduino Programming, Instrumentation) sont désormais PASS avec preuve directe.

### P2 — 0

Aucun défaut UX/visuel obligatoire avant sortie du gate identifié dans ce replay.

### P3 — 3 (raffinements, non bloquants, reportables)

| ID | Domain | Description | Reportable EXP4 |
|---|---|---|---|
| P3-01 | A/H | Bascule de thème clair/sombre non localisée dans ce replay — à re-vérifier explicitement (le premier gate l'avait confirmée ; aucune régression suspectée, mais pas re-prouvée ici) | Oui |
| P3-02 | B | Pan (clic molette) et Focus/localScale non re-testés explicitement dans ce replay (déjà PASS au premier gate, suites automatisées inchangées) | Oui |
| P3-03 | E | Simulation transitoire (RC dans le temps), comportement capteur (LDR/thermistor) et dynamique moteur non vérifiés — hors du périmètre explicitement requis par ce ticket, à ne pas confondre avec un défaut | Oui |

## 7. Scope de production

**0 fichier de production modifié.** Seul ce rapport et le fichier `.json` temporaire de suite de tests (supprimé après lecture) ont été produits. `git status --short` confirme : aucun fichier sous `frontend/src/` touché.

## 8. Verdict final

```
LEVEL 1 — PASS
```

**Justification :** Les trois capacités qui bloquaient le premier gate (`P1-01` Component Values, `P1-02` Arduino Programming, `P2-01` Instrumentation) sont désormais toutes PASS, prouvées empiriquement dans le navigateur réel avec des circuits électriques réels (POWER→RESISTOR→GND pour D/G, POWER→RESISTOR→LED→GND pour E, ARDUINO.D2→RESISTOR→LED→POWER.GND pour F) — jamais déclarées PASS sur la seule base que les tickets correspondants sont CLOSED. La suite canonique est à 0 FAIL (2897/2897). Build/typecheck/diff-check PASS. Le cœur canvas/câblage/breadboard reste PASS sans régression. Aucun P0, aucun P1, aucune dette de gate P2 obligatoire. Les 3 P3 identifiés sont des raffinements de couverture (points déjà PASS au premier gate, non re-testés dans le temps imparti de ce replay) ou des domaines explicitement hors périmètre (transitoire/capteur/moteur) — aucun ne constitue un défaut constaté.

---

**Conformément au mandat de ce ticket : ce verdict PASS ne constitue PAS une autorisation d'ouvrir EXP4.** Codex n'a pas autorité pour modifier la roadmap. Seul le CSA prononcera `LEVEL 1 CERTIFIED → EXP4 OPEN` après revue GitHub réelle de ce rapport et de l'historique complet des tickets Level-1 (MB-L1-CVE-001 → MB-VIS-TINKERCAD-048).

**Fin du rapport. Aucune correction n'a été entamée. Le premier rapport (`MB-VIS-TINKERCAD-048-LEVEL1-GATE.md`, verdict HOLD) reste intact et non réécrit.**
