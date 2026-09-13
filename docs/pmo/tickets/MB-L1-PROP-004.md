# MB-L1-PROP-004 — Dynamic resistor color-code projection

**Statut : PASS — bandes RESISTOR dérivées dynamiquement de `parameters.resistance`, plus de code couleur figé.**
**Programme / Épic :** Level 1 → Product Model (gap Canvas L1-A).
**Antécédents :** `MB-VIS-PROTOTYPE-001B/C` (backend raster RESISTOR), `MB-L1-CVE-001` (`resolveComponentParameters`, `ComponentInspector.jsx`), `MB-VIS-CANVAS-052` (zoom/`localScale` par `transform: scale()` unique).
**Base Git obligatoire :** `5061f026506fdf9f2e9be46e2d0dd946aa2891da`.
**Branche :** `feat/MB-L1-PROP-004-resistor-color-code`.

## 0. Gap fermé

Avant ce ticket : `component.parameters.resistance` (défaut 220 Ω, canonique) était correctement édité et utilisé par la simulation, mais `ResistorPart.jsx` rendait toujours l'asset `resistor.default.*` peint en dur marron/noir/rouge/or (= 1 kΩ), quelle que soit la valeur réelle — incohérence Product Model L1-A.

Après ce ticket : les bandes sont calculées à chaque rendu depuis `resistance` seule, jamais persistées, et une valeur électrique non exactement représentable en 4 bandes (2 chiffres significatifs) ne produit jamais de bande — le corps neutre est rendu tel quel plutôt que de mentir visuellement.

## 1. Fichiers livrés

### Nouveaux
- `frontend/src/visualization/resistorColorCode.js` — `encodeResistorColorCode(resistance, options)`, primitive pure.
- `frontend/src/visualization/resistorBandLayout.js` — contrat géométrique unique des bandes (% de la boîte 84×28).
- `frontend/src/visualization/__tests__/resistorColorCode.test.js` — 45 tests.
- `frontend/src/__tests__/MBL1PROP004ResistorColorCodeIntegration.test.jsx` — 7 tests d'intégration pipeline réel.
- `frontend/public/assets/components/resistor/resistor.base.{1x,3x}.{png,webp}` — 4 assets neutres (voir §3).

### Modifiés
- `frontend/src/canvas/CircuitComponent.jsx` — transmet `parameters={component.parameters}` à `PartRenderer`.
- `frontend/src/components/parts/PartRenderer.jsx` — résout `parameters` génériquement via `resolveComponentParameters(type, parameters)` (même principe que `properties`, `L1-PROP-003` ; aucun `if (type === "RESISTOR")`).
- `frontend/src/components/parts/ResistorPart.jsx` — consomme `parameters.resistance`, appelle `encodeResistorColorCode`, bascule sur `resistor.base.*`, rend les bandes en DOM/CSS quand `exact === true`.
- `frontend/src/canvas/CircuitComponent.css` — `.part-resistor` `position: relative` + `.part-resistor__bands`/`.part-resistor__band` (couche absolue, `pointer-events: none`) ; suppression des règles mortes SVG `.part-resistor__lead`/`.part-resistor__body`/`.part-resistor__band` (héritées de MB-VIS-LED-010, ciblaient des primitives qui n'existent plus depuis MB-VIS-PROTOTYPE-001C — collision de nom avec la nouvelle `.part-resistor__band` résolue en remplaçant la règle).
- `frontend/src/components/parts/__tests__/ResistorPart.raster.test.jsx` — mis à jour pour `resistor.base.*` + projection dynamique (220 Ω ≠ 1000 Ω, 1234 Ω → aucune bande).
- `frontend/public/assets/components/resistor/manifest.json` — 4 nouvelles entrées `state: "base"` ; les 4 entrées `state: "default"` marquées `"legacy": true` (mécanisme déjà supporté par `renderQualityGate.test.jsx` T10) — SHA-256/bytes/dimensions de ces 4 entrées **inchangés**.

### Documentation
- `docs/pmo/blueprints/MB-L1-PROP-004-resistor-color-code-blueprint.md`
- `docs/pmo/tickets/MB-L1-PROP-004.md` (ce fichier)

## 2. Algorithme (`encodeResistorColorCode`)

Générique — aucune table par valeur. Pour `resistance` (Ω, `number` fini `> 0`) :

1. Pour `exponent ∈ {-2,-1,0,1,…,9}` (argent → blanc) : `mantissa = resistance / 10^exponent` ; `rounded = round(mantissa)`.
2. Si `10 ≤ rounded ≤ 99` et `|rounded·10^exponent − resistance| / resistance ≤ 1e-9` (tolérance **flottante uniquement**) : représentation exacte trouvée. `digit1 = ⌊rounded/10⌋`, `digit2 = rounded mod 10`.
3. Sinon (après épuisement des 12 exposants) : `{exact:false, representedResistance:null, bands:[]}`.

Tolérance V1 : bande 4 toujours `or` / `±5 %` (pas un nouveau paramètre électrique).

### Table couleur
Digits : `0` noir … `9` blanc (standard). Multiplicateur : `-2` argent, `-1` or, `0..9` noir→blanc (standard).

## 3. Assets neutres — méthode et preuve

`resistor.base.{1x,3x}.{png,webp}` générés par script Python (Pillow/numpy) à partir de `resistor.default.3x.png` — jamais un nouveau dessin :

1. Détection pixel des 4 plages de colonnes peintes (écart colorimétrique à la référence beige du corps, image 3x 510×171) : brun `x∈[183,206]`, noir `x∈[220,242]`, rouge `x∈[264,288]`, or `x∈[310,329]`.
2. Reconstruction ligne-par-ligne : pour chaque ligne `y`, interpolation linéaire entre la colonne flanquante gauche et la colonne flanquante droite — préserve le dégradé de lumière/ombre vertical du corps réaliste (pas un remplissage plat).
3. `1x` dérivé de `3x` par downsampling LANCZOS ; variantes WebP lossless.

Preuves (scripts exécutés, résultats vérifiés) :
- Diff pixel-à-pixel avec l'original **hors** des 4 plages retirées : `0` sur les 510×171 pixels (fils/corps/ombres intacts, aucune régression de silhouette).
- 4 coins transparents (`alpha=0`).
- Distance colorimétrique minimale résiduelle aux anciennes couleurs de bande : `brun≥34.8`, `noir≥177.8`, `rouge≥102.2`, `or≥29.3` — aucune trace de bande, seuls des pixels d'ombre naturelle de bord de corps.
- `resistor.default.*` (4 fichiers) : SHA-256 **inchangés** avant/après génération (vérifié explicitement, cf. §4).

## 4. Vérification des historiques (obligatoire, PROP04-08)

```
b5eae0cc87abf5ea0efd92f2020c9a42eb83405a494dbefe112f94076be1b670  resistor.default.1x.png
115b56ab6e544288a5cbf042767a8f2d03c8a42a91746213471a84088ddcaa57  resistor.default.3x.png
e6b8550329eec9ed04686a6a4517a2d1d4a81989ae2209842050c0b2713dcdf7  resistor.default.1x.webp
c6ff40ceccba6a124c9cc60ca8380afe9f2b254db7d9bbd2c34d8e943ee87548  resistor.default.3x.webp
```
Identiques avant toute modification et après livraison complète.

## 5. Nouveaux assets (SHA-256)

```
b758c4d8f42fb661dcb6d902fddf3bbc3eebacffe981d98b4a471cf496340960  resistor.base.1x.png   (7658 octets, 170×57)
0dcb5b31439cc817d72f7ade30999235f3064fc22feecf25c168ddabd36718e0  resistor.base.1x.webp  (5964 octets, 170×57)
940a73ab13309651db617979d4b32596ba15ced574ee493dc9d414c9f9e1262b  resistor.base.3x.png   (21374 octets, 510×171)
eac36769631102cb8108b0dda593e66379bc692b8306c18687da09e3485275d6  resistor.base.3x.webp  (17824 octets, 510×171)
```

## 6. Tests

| Fichier | Tests | Résultat |
|---|---|---|
| `resistorColorCode.test.js` | 45 | PASS (28 valeurs documentées + jamais-de-mensonge + flottant + pureté) |
| `ResistorPart.raster.test.jsx` | 15 | PASS (raster neutre + projection dynamique + pipeline réel) |
| `MBL1PROP004ResistorColorCodeIntegration.test.jsx` | 7 | PASS (T1-T10 du ticket, `CircuitProvider` réel) |
| Suite complète `npm run test:ci` | 3128 | 3125 PASS / 3 échecs **préexistants sur la base `5061f02`** (`BatteryParts.raster.test.jsx`, hors périmètre, non liés à RESISTOR, confirmés par `git stash` + re-run sur base propre avant toute modification) |

## 7. Gates techniques

| Gate | Résultat |
|---|---|
| `npm run build` | PASS |
| `npx eslint` (fichiers touchés) | +1 par rapport à la baseline repo (143→144 erreurs) — **même classe d'erreur préexistante** (`'React' is defined but never used`, présente dans 76/78 fichiers `.test.jsx` du repo par convention documentée : import requis pour la config vitest secondaire sans plugin React) sur le nouveau fichier de test ; aucune nouvelle catégorie d'erreur introduite ; `ResistorPart.jsx`/`ResistorPart.raster.test.jsx` portent exactement les mêmes 3 erreurs qu'à la base `5061f02` (vérifié par diff avant/après) |
| `git diff --check` | PASS (aucun problème d'espace blanc) |
| SHA-256 `resistor.default.*` | Inchangés (§4) |
| Fichiers modifiés hors périmètre autorisé | Aucun (`package-lock.json` régénéré par `npm install` local a été explicitement rétabli à l'identique avant commit) |

## 8. Probe visuel navigateur (Claude, pré-livraison — ne remplace PAS le Canvas Gate du Project Lead)

Vite réel + Chromium headless (Playwright), aucune erreur console :
- 220 Ω → rouge/rouge/marron/or ; 1000 Ω → marron/noir/rouge/or ; 4700 Ω → jaune/violet/rouge/or ; 10 000 Ω → marron/noir/orange/or ; 100 000 Ω → marron/noir/jaune/or ; 1 000 000 Ω → marron/noir/vert/or — toutes correctes.
- 1234 Ω (non représentable) → corps neutre, **aucune bande**, aucun mensonge visuel.
- Zoom (molette), drag, sélection : bandes solidaires du corps, aucune distorsion, aucun débordement.
- Deux résistances simultanées, valeurs différentes → projections indépendantes ; éditer l'une ne modifie pas l'autre.

## 9. Statut final

`MB-L1-PROP-004` : **implémentation complète, gates techniques PASS**. Le Canvas Gate final (§17/§23 du blueprint CSA) reste réservé au Project Lead (Mamadou Ba) avant de lever le HOLD sur L1-A.
