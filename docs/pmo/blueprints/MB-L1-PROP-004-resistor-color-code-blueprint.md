# MB-L1-PROP-004 — Execution Blueprint

## A. IDENTITÉ & TRAÇABILITÉ

| Champ | Valeur |
|---|---|
| Blueprint-ID | `MB-L1-PROP-004-resistor-color-code-blueprint` |
| Ticket-ID | `MB-L1-PROP-004` |
| Base Git obligatoire | `5061f026506fdf9f2e9be46e2d0dd946aa2891da` (`fix(level1): clear MB-L1-ENV-001 lint regression`) |
| Branche | `feat/MB-L1-PROP-004-resistor-color-code` |
| Date | `2026-09-13` |
| Auteur | `CSA (ChatGPT) — blueprint/ticket ; Claude — implémentation` |
| Statut | `IMPLÉMENTÉ — tests + build + lint + probe visuel navigateur PASS` |

## B. OBJECTIF

Fermer le gap Product Model L1-A : la valeur électrique `component.parameters.resistance` d'une RESISTOR est éditable et pilote correctement la simulation, mais le Canvas affichait un code couleur **peint en dur** dans l'asset raster (`resistor.default.*`, marron/noir/rouge/or = 1 kΩ) — incohérent avec toute autre valeur (ex. 220 Ω par défaut). Ce ticket rend le code couleur **dérivé dynamiquement** de `resistance`, sans jamais persister de bande, sans jamais mentir visuellement sur une valeur non représentable.

## C. TERRAIN AUDITÉ — FAITS (à la base `5061f02`)

### C1 — Modèle électrique canonique
`frontend/src/simulator/canonicalRegistry.js` : `RESISTOR.resistance` — `unit: 'Ω'`, `minimum: 0.001`, `maximum: 1e9`, `defaultValue: 220`. Non modifié par ce ticket (interdit, §14 du ticket).

### C2 — Résolution des paramètres
`frontend/src/simulator/resolveComponentParameters.js` — primitive centrale unique (`resolveComponentParameters(type, instanceParameters)`) fusionnant defaults canoniques + overrides validés. Déjà utilisée par `ComponentInspector.jsx`. Réutilisée telle quelle par `PartRenderer.jsx` (ajout, §D2).

### C3 — Pipeline de rendu (avant ce ticket)
```
CircuitComponent.jsx --properties={component.properties}--> PartRenderer.jsx --manager.render(type,...)--> ResistorPart.jsx
```
`parameters` n'était PAS transmis à `PartRenderer`/au renderer — seul `properties` (identité) l'était (`L1-PROP-003`).

### C4 — Renderer RESISTOR (avant ce ticket)
`ResistorPart.jsx` (MB-VIS-PROTOTYPE-001C) : `<picture>` + `<source webp>` + `<img>` pointant vers `resistor.default.{1x,3x}.{png,webp}`, **statique**, aucune prop dynamique consommée.

### C5 — Assets historiques
`frontend/public/assets/components/resistor/` : `resistor.default.1x.png/.webp`, `resistor.default.3x.png/.webp` + `manifest.json` (SHA-256 figés, `originTicket: MB-VIS-PROTOTYPE-001B`, `csaVerdict: CSA VISUAL GO — RESISTOR`, `qaScore: 4.63`). **Vérifié en pixel** : `resistor.default.3x.png` peint marron/noir/rouge/or = 1 kΩ, fixe.

### C6 — Géométrie canonique
`componentDefinitions.js` : `RESISTOR.width=84, height=28`, pins `A: dx=0,dy=14`, `B: dx=84,dy=14`. Invariant, non touché.

## D. CONCEPTION

### D1 — Primitive de code couleur (`frontend/src/visualization/resistorColorCode.js`)
Fonction pure `encodeResistorColorCode(resistance, options={})`. Algorithme générique (aucune table `if (resistance === X)`) :

1. Rejette immédiatement toute valeur non `number`/non finie/`<= 0` → `{exact:false, bandCount, representedResistance:null, bands:[]}`.
2. Pour chaque exposant supporté `e ∈ [-2..9]` (argent…blanc) : mantisse `m = resistance / 10^e` ; si `round(m)` ∈ `[10,99]` ET que `round(m) * 10^e` reconstruit `resistance` à `1e-9` relatif près (tolérance **flottante uniquement**, jamais un arrondi de la valeur réelle), la représentation est exacte.
3. Sinon, après avoir épuisé tous les exposants : `exact:false`, `bands:[]`, `representedResistance:null` — jamais de mensonge visuel (ex. 1234 Ω → corps neutre, jamais « 1200 Ω »).

Extension 5/6 bandes : `BAND_COUNT_STRATEGIES` (map `bandCount -> stratégie`) — ajouter une entrée future ne touche ni la signature publique ni `ResistorPart.jsx`.

### D2 — Propagation générique des paramètres
- `CircuitComponent.jsx` : ajoute `parameters={component.parameters}` au `<PartRenderer>` (symétrique à `properties`, déjà existant).
- `PartRenderer.jsx` : ajoute `parameters: resolveComponentParameters(type, parameters)` dans `rendererProps` — **même ligne de principe** que la résolution `properties` déjà en place (`L1-PROP-003`), aucun `if (type === "RESISTOR")`.

### D3 — Renderer RESISTOR
`ResistorPart.jsx` lit désormais `parameters.resistance`, appelle `encodeResistorColorCode`, bascule l'asset de base sur `resistor.base.*` (neutre, §E), et rend une couche `.part-resistor__bands` (DOM/CSS, jamais SVG plein) uniquement quand `exact === true`. Chaque bande est un `<span>` positionné en **pourcentage** de la boîte canonique (84×28) via `resistorBandLayout.js` — aucune correction JS de zoom (`transform: scale()` unique déjà posé par `CircuitComponent.jsx`, MB-VIS-CANVAS-052, s'applique uniformément à l'asset ET aux bandes).

### D4 — Géométrie des bandes (`frontend/src/visualization/resistorBandLayout.js`)
Contrat unique, gelé, en **pourcentage** de la boîte 84×28 — dérivé par mesure pixel de `resistor.base.3x.png` (occupant exactement l'emplacement des anciennes bandes peintes retirées) :

| Bande | left % | width % | top % | height % |
|---|---|---|---|---|
| digit1 | 35.88 | 4.70 | 28.64 | 40.93 |
| digit2 | 43.14 | 4.51 | 28.64 | 40.93 |
| multiplier | 51.76 | 4.90 | 28.64 | 40.93 |
| tolerance | 60.79 | 3.92 | 28.64 | 40.93 |

`top`/`height` communs = intersection (jamais un dépassement) de l'emprise alpha réelle du corps sur les 4 plages de colonnes mesurées — garantit qu'aucune bande ne peut jamais déborder du corps ni recouvrir les fils, à n'importe quel zoom/`localScale`.

## E. ASSETS NEUTRES (`resistor.base.*`)

### E1 — Méthode
Génération programmatique (Python, Pillow + numpy) à partir de `resistor.default.3x.png`, **jamais** un nouvel asset dessiné :
1. Détection pixel par pixel des 4 plages de colonnes peintes (distance colorimétrique à la référence beige du corps) : brun `x=[183,206]`, noir `x=[220,242]`, rouge `x=[264,288]`, or `x=[310,329]` (colonnes 3x, image 510×171).
2. Pour chaque plage retirée, reconstruction ligne-par-ligne : interpolation linéaire entre la colonne flanquante gauche et la colonne flanquante droite, **par ligne** (donc le dégradé lumière/ombre vertical du corps réaliste est préservé, jamais aplati en une couleur plate).
3. `resistor.base.3x.png` sauvegardé ; `resistor.base.1x.png` dérivé par downsampling LANCZOS ; variantes WebP (lossless) générées pour les deux résolutions.

### E2 — Validation programmatique (exécutée, PASS)
- Dimensions exactes : 1x = 170×57, 3x = 510×171.
- Diff pixel-à-pixel avec `resistor.default.3x.png` **hors** des colonnes retirées : `0` (aucune modification en dehors des 4 bandes — fils/corps/ombres/lumière intacts).
- Coins transparents : alpha = 0 aux 4 coins.
- Aucune couleur de bande résiduelle : distance colorimétrique minimale résiduelle dans chaque plage ≥ 29 (pixels de bord d'ombre naturelle du corps, jamais une teinte de bande).
- Fils (`x<119` ou `x>390`) : diff = `0`.

### E3 — Hashes générés (extension `manifest.json`, `state: "base"`)

| Fichier | Octets | SHA-256 |
|---|---|---|
| `resistor.base.1x.png` | 7658 | `b758c4d8f42fb661dcb6d902fddf3bbc3eebacffe981d98b4a471cf496340960` |
| `resistor.base.1x.webp` | 5964 | `0dcb5b31439cc817d72f7ade30999235f3064fc22feecf25c168ddabd36718e0` |
| `resistor.base.3x.png` | 21374 | `940a73ab13309651db617979d4b32596ba15ced574ee493dc9d414c9f9e1262b` |
| `resistor.base.3x.webp` | 17824 | `eac36769631102cb8108b0dda593e66379bc692b8306c18687da09e3485275d6` |

### E4 — Historique préservé
`resistor.default.*` (4 fichiers) : SHA-256 vérifiés **byte-identiques** avant/après (voir rapport de livraison). Marqués `"legacy": true` dans `manifest.json` (mécanisme déjà prévu par la garde `renderQualityGate.test.jsx` TEST T10 pour distinguer un paquet actif d'un paquet historique préservé) — aucune donnée d'intégrité (bytes/sha256/dimensions) modifiée sur ces 4 entrées.

## F. INVARIANTS (vérifiés)

| ID | Invariant | Statut |
|---|---|---|
| PROP04-01 | `resistance` seule source de vérité | PASS |
| PROP04-02/03 | Aucune bande persistée (Document/History/export) | PASS (test T6) |
| PROP04-04 | Solver non touché | PASS (aucun fichier `simulator/{engine,resolution,preparation,production,dcContributionRegistry}.js` modifié) |
| PROP04-05 | Aucun branchement par type dans `PartRenderer.jsx` | PASS (vérifié : recherche `type ===` absente de la nouvelle ligne) |
| PROP04-06/07 | Box 84×28, pins A(0,14)/B(84,14) inchangés | PASS (tests) |
| PROP04-08 | `resistor.default.*` byte-identiques | PASS (SHA-256 revérifiés) |
| PROP04-09 | Aucun asset par valeur | PASS (un seul `resistor.base.*`, bandes en CSS) |
| PROP04-10 | Undo/Redo change la projection | PASS (test) |
| PROP04-11 | Export/import ne transporte aucune bande | PASS (test, assertions `not.toHaveProperty('bands')` etc.) |
| PROP04-12 | Valeur non représentable jamais menteuse | PASS (1234 Ω → corps neutre, test + probe navigateur) |
| PROP04-13 | Raster réaliste + projection dynamique | PASS |
| PROP04-14 | Interaction souris inchangée | PASS (tests + probe navigateur : drag/select/zoom) |
| PROP04-15 | Zoom/localScale cohérents sans correction JS | PASS (layout en %, probe navigateur zoomé) |

## G. TESTS

- `frontend/src/visualization/__tests__/resistorColorCode.test.js` — 45 tests (28 valeurs exactes documentées + jamais-de-mensonge + discipline flottante + pureté).
- `frontend/src/components/parts/__tests__/ResistorPart.raster.test.jsx` — 15 tests (raster neutre, projection dynamique, pipeline réel).
- `frontend/src/__tests__/MBL1PROP004ResistorColorCodeIntegration.test.jsx` — 7 tests (T1/T2/T3/T4/T5/T6/T7/T8/T9/T10 du ticket, pipeline `CircuitProvider` réel).

Suite complète (`npm run test:ci`) : 3125/3128 PASS. Les 3 échecs restants (`BatteryParts.raster.test.jsx`, hash SHA-256 BATTERY_AA/BATTERY_9V/COIN_CELL_CR2032) sont **préexistants sur la base `5061f02` elle-même** (vérifié par `git stash` + re-run avant toute modification) — aucun rapport avec ce ticket, aucun fichier batterie touché.

## H. PROBE VISUEL NAVIGATEUR (Claude, pré-livraison)

Serveur Vite réel + Chromium headless (Playwright). Vérifié : 220 Ω (rouge/rouge/marron/or), 1000 Ω, 4700 Ω, 10 000 Ω, 100 000 Ω, 1 000 000 Ω — toutes correctes ; 1234 Ω → corps neutre sans bande ; zoom (molette) ; drag ; deux résistances simultanées avec projections indépendantes, l'édition de l'une ne modifiant pas l'autre. Aucune erreur console. **Ce probe technique ne remplace pas le Canvas Gate du Project Lead (Mamadou Ba, §17/§23 du ticket).**
