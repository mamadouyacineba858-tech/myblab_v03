# MB-VIS-RENDER-010 — Physical Component Visual Contract

**Statut :** Contrat établi (module de tokens + tests). Ne constitue pas un rendu de composant.
**Programme / Épic :** Experience → EXP3 (§7.4 `ROADMAP_PLATFORM.md` — MYBlab Physical/Realistic Visual Engine).
**Antécédents :** `MB-VIS-RENDER-009` (contrat de qualité Q1–Q14, baseline SVG), `MB-VIS-REVIEW-001` (audit global des renderers), `MB-VIS-REVIEW-002` (Technology Review — décision **H3 discipliné** : raster comme backend EXP3/J7, r3f réservé EXP5).
**Base Git :** commit `7726a09f8922d4192177c752c9a3ea3127213942`.
**Périmètre modifié :**
- `frontend/src/visualization/visualContract.js` *(nouveau — source de vérité unique)*
- `frontend/src/visualization/__tests__/visualContract.test.js` *(nouveau)*
- `docs/pmo/tickets/MB-VIS-RENDER-010-physical-component-visual-contract.md` *(ce document)*

**Ne modifie PAS** : aucun `*Part.jsx`, `RendererRegistry`, `VisualizationManager`, `PartRenderer`, `CircuitComponent.jsx`, `Pin.jsx`, `config/componentDefinitions.js`, `utils/geometry.js`, `utils/pinPresentationGeometry.js`, `simulator/*`, `Breadboard.css`. Aucune dépendance ajoutée. Aucun asset produit. Aucune scène 3D.

---

## 1. Objet

MB-VIS-RENDER-010 formalise le **langage visuel physique commun** de MYBlab et fournit son **socle exécutable minimal** : le module `frontend/src/visualization/visualContract.js`, source de vérité unique dont les futurs renderers (backend `raster` cible EXP3/J7, `svg` en transition, `r3f` réservé EXP5) dérivent lumière, matériaux, ombre de contact, échelle, ancrage des leads, budgets, mode de capture et critères QA.

Ce ticket **ne transforme visuellement aucun composant**. RESISTOR, LED, DC MOTOR, etc. sont traités par les tickets `MB-VIS-PROTOTYPE-001..003` puis `MB-VIS-INDUSTRIAL-001`.

Principe : le module visuel est à la représentation ce que `config/componentDefinitions.js` est à la géométrie fonctionnelle — un module de **données pur**, sans React, sans effet de bord, déterministe, **n'important rien** de la couche fonctionnelle.

---

## 2. Repère et unités

- Origine : coin haut-gauche de la boîte canonique du composant = `(0,0)`.
- Axes : `x` vers la droite, `y` vers le **bas** (repère SVG/CSS).
- Unités : « unités canvas @1× ». Le zoom de l'atelier est un unique `transform: scale()` CSS sur `.simulation-canvas__zoom-layer` — **aucun renderer ne recalcule selon le zoom**.

---

## 3. Sections du contrat (A–L)

### A — Visual Design Tokens
Une **seule** source de vérité : `visualContract.js`, agrégat gelé `VISUAL_CONTRACT` (version `1.0.0-RENDER-010`). Aucun renderer n'invente sa propre lumière / ses matériaux / son ombre.

### B — Material Tokens
`MATERIALS` — 12 familles obligatoires : `METAL_LEAD`, `METAL_CHROME`, `METAL_BRUSHED`, `COPPER`, `BRASS`, `PLASTIC_MATTE`, `PLASTIC_GLOSSY`, `CERAMIC`, `GLASS`, `LENS`, `EPOXY_RESIN`, `PCB`.
Chaque token décrit une **propriété physique visuelle** — `family`, `roughness ∈ [0,1]`, `specular` (caractère), `highlight` (caractère), `base` (caractère), plus `transmission` / `emissive` / `anisotropic` / `layers` selon la famille. **Jamais une couleur hex nue** (test : aucune valeur `#rrggbb`). Chaque backend traduit : SVG → stops de gradient + opacités ; raster → shader équivalent au rendu hors-ligne ; r3f → paramètres PBR.

### C — Lighting Contract
`LIGHTING` — clé **haut-gauche**, ombre **bas-droite**.
`keyLight.fromDirection` = vecteur unitaire `(-0.6, -0.8)` (de la surface vers la lumière). `shadowDirection` = `(0.6, 0.8)`, unitaire, **exactement opposé**. Cohérence catalogue prioritaire sur la liberté artistique par composant.

### D — Contact Shadow Contract
`CONTACT_SHADOW` — communique « l'objet repose sur la surface », **jamais décorative**.
`offset (1.8, 2.4)` colinéaire à `shadowDirection` · `blur 3.0` · `opacity 0.28` · `maxIntensity 0.32` (**plafond dur anti-halo**) · `anchor: 'silhouette-bottom'` · `spread 2.0`.
Anti-patterns interdits : `halo`, `bordure-noire`, `ombre-decorative-large`, `filtre-drop-shadow-par-composant`.

### E — Physical Scale Contract
`SCALE.canvasUnitsPerMm = 3.0` (calage sur le groupe des passifs axiaux « pattes comprises », **provisoire**, à confirmer par prototype). `SCALE_REFERENCE` : les 16 types, `box` = `getComponentDef(type).width/height` **exactement** (test), `physicalMm` de référence, `impliedUnitsPerMm`.

**Constat d'audit (`SCALE_AUDIT`, FAIT OBSERVÉ)** : les boîtes canoniques **ne sont pas mutuellement à l'échelle physique** — `impliedUnitsPerMm` s'étale de **~1.75 (ARDUINO)** à **~9.2 (BUTTON)**, facteur **~5**. Les passifs axiaux se regroupent autour de **~3.0–3.5**. Sous-échelle relative marquée : `ARDUINO`, `POWER`. Sur-échelle relative : `BUTTON`, `POTENTIOMETER`, `NPN_TRANSISTOR`, `RGB_LED`, `BUZZER`.
**Résolution : hors périmètre RENDER-010.** Les dimensions canoniques **ne sont pas modifiées**. Chaque asset est produit pour **remplir sa boîte canonique** (`FILL_FACTOR`), la proportion **interne** d'un asset doit être physiquement correcte, et le rescale éventuel des boîtes des cartes complexes relève d'un **futur ticket fonctionnel** distinct.

### F — Pin / Lead Anchoring Contract
`LEAD_ANCHORING` — les extrémités visuelles des leads coïncident avec `utils/pinPresentationGeometry.js#getPinPresentationPosition(component, pin)` (dérivée de `componentDefinitions.js`, non modifiée). `cardinality: 'un-lead-visuel-par-pin'`. `tolerancePx 0.75` (unités canvas @1×). `zoomBehaviour: 'invariant en unités canvas ; aucun recalcul par zoom'`. Vérifié à `0.5× / 1× / 2×`. **Le renderer visuel n'invente aucune coordonnée électrique.**

### G — Backend Contract
`BACKENDS = { SVG:'svg', RASTER:'raster', R3F:'r3f' }`.
`BACKEND_STATUS` : `svg` = existant (fallback) · `raster` = **cible EXP3/J7** · `r3f` = **réservé EXP5, non implémenté, aucune dépendance**.
`DEFAULT_BACKEND = 'svg'`. `resolveBackend(visual)` est **tolérant** : entrée absente ou backend inconnu → `svg` → **comportement actuel strictement préservé** tant qu'aucune entrée ne déclare de backend.
Le **point d'extension reste `RendererRegistry`** (type → composant React), **inchangé par ce ticket**. Aucun second registre, aucune factory parallèle, aucun `switch(type)` dans `CircuitComponent`.

### H — Asset Contract (backend raster)
`ASSET_CONTRACT` — format **WebP** + fallback **PNG**, alpha ; résolutions **@1×** et **@3×** ; racine `frontend/public/assets/components` (seul emplacement d'assets statiques en usage — à confirmer à l'industrialisation) ; nommage `{root}/{typeKebab}/{typeKebab}.{state}.{res}.{ext}` ; états dérivés de `visualization/visualStateRegistry.js` (`LED: on|off`, `RGB_LED: combinaisons r/g/b`, autres : `default`) ; production = **rendu hors-ligne unique** (une caméra, un HDRI, un sol) → cohérence catalogue automatique.
**AUCUN asset n'est produit dans MB-VIS-RENDER-010** (test).

### I — Rendering Budget
`RENDER_BUDGET` par backend :
- `svg` : `maxPrimitives 40` — **T9 de renderQualityGate conservé tel quel** pour les renderers restés en `svg`.
- `raster` : cibles **initiales provisoires** — `maxWeightKbPerVariantSimple 30`, `maxWeightKbPerVariantComplex 120`, `maxVariants 8`, `resolutions 2`, `maxDimensionPx 1024`. `provisional: true`, `confirmBy: 'MB-VIS-PROTOTYPE-001..003 (mesure réelle)'`. **Aucun seuil arbitraire n'est transformé en loi sans mesure.**
- `r3f` : réservé.

### J — Deterministic Capture Contract
`CAPTURE_MODES = { INTERACTIVE, DETERMINISTIC }` · `DEFAULT_CAPTURE_MODE = 'interactive'`.
En `deterministic`, un renderer **doit figer/désactiver** : `animation`, `transition`, `random`, `time-based-effect`, `procedural-noise`, `auto-glow-pulse`.
Garantie : `mêmes props + captureMode:deterministic → sortie DOM structurellement identique`. `renderQualityGate` **T8** (deux rendus → HTML identique) reste applicable aux backends `svg` et `raster` (`<img>` déterministe). Objectif : rendre possible la future régression visuelle (`MB-VIS-QA-029`).

### K — Visual QA Contract
`QA_CRITERIA` — **15 critères** (silhouette, proportions, volume, matériau, leads, contact surface, lumière, clipping, cohérence breadboard, cohérence inter-composants, lisibilité 0.5×/1×/2×, état déterministe en capture, aucun changement fonctionnel).
`QA_TARGET_SCORE = 4` (/5, minimum pour déclarer un renderer « réaliste »). `QA_ZOOM_LEVELS = [0.5, 1, 2]`.
`QA_ANTI_RULE` : « un composant n'est pas "réaliste" parce qu'il possède plusieurs gradients ».

### L — Future R3F Extension (documentation seulement)
`R3F_EXTENSION` — `status: 'reserved-exp5'` ; point d'extension = `RendererRegistry` **inchangé** (une entrée pourra porter `visual.backend = 'r3f'`) ; scène 3D = un **unique `<Canvas>` partagé** pour tout l'atelier (jamais un par composant) — **non créé** ; `untouched` : zoom `SimulationCanvas`, hit-test wrapper, Pin overlays, `geometry`, `pinPresentationGeometry`, `componentDefinitions` ; `dependencies: 'aucune'`.

---

## 4. Modèle de consommation (futurs tickets — non câblé ici)

```text
componentDefinitions.js  ──►  dimensions + pins (INCHANGÉ)
pinPresentationGeometry.js ─►  positions de présentation des pins (INCHANGÉ)
        │
        ▼
RendererRegistry (INCHANGÉ)  ──►  type → composant React
        │                              une entrée POURRA porter { visual: { backend } }
        ▼
Renderer (svg | raster | r3f)  ──►  importe visualContract.js :
        LIGHTING · MATERIALS · CONTACT_SHADOW · SCALE/FILL_FACTOR ·
        LEAD_ANCHORING · RENDER_BUDGET[backend] · CAPTURE · resolveBackend()
```

`resolveBackend()` et le champ `visual.backend` seront branchés dans `PartRenderer` / les entrées de registre par `MB-VIS-INDUSTRIAL-001`, **pas** par ce ticket : aucune entrée ne déclare de backend aujourd'hui, donc `resolveBackend` renvoie toujours `svg` et le comportement est identique à l'actuel.

---

## 5. Ce que ce ticket ne fait PAS

- Aucun composant redessiné, aucun `*Part.jsx` modifié.
- Aucun asset produit (les prototypes produisent les premiers).
- Aucune installation de `three` / `@react-three/fiber` / `@react-three/drei` (test : `frontend/package.json`).
- Aucune scène WebGL, aucun raycaster, aucun modèle glTF.
- Aucune modification de `SimulationCanvas`, du zoom, du hit-test.
- Aucune modification de `componentDefinitions.js`, des pins, de `geometry.js`, du simulateur, du modèle électrique.
- Aucun correctif de `Breadboard.css` (blocage `vite build` préexistant).
- Aucune correction opportuniste des 16 tests préexistants (géométrie pins LED / breadboard).
- Aucun nettoyage de CSS mort hors périmètre.
- Aucune architecture parallèle, aucun nouveau registre, aucun `switch(type)` dans `CircuitComponent`.

---

## 6. Traçabilité

```text
ROADMAP_PLATFORM.md §7.4 (MYBlab Physical/Realistic Visual Engine)
        │
        ├── MB-VIS-REVIEW-001  — audit global des renderers
        ├── MB-VIS-REVIEW-002  — Technology Review → H3 discipliné (raster EXP3/J7, r3f réservé EXP5)
        └── MB-VIS-RENDER-010  — Physical Component Visual Contract (CE DOCUMENT)
                    │  frontend/src/visualization/visualContract.js  (source de vérité unique)
                    │  frontend/src/visualization/__tests__/visualContract.test.js
                    ▼
              MB-VIS-PROTOTYPE-001  RESISTOR
              MB-VIS-PROTOTYPE-002  LED (+ état)
              MB-VIS-PROTOTYPE-003  DC MOTOR
                    ▼
              CSA VISUAL GO
                    ▼
              MB-VIS-INDUSTRIAL-001  — pipeline d'assets + branchement resolveBackend/visual.backend
                                       + budget de test raster + correctif Breadboard.css
                    ▼
              reprise séquence §7.2 (fils, breadboard photoréaliste, canvas, états, QA visuelle, gate J7)
```
