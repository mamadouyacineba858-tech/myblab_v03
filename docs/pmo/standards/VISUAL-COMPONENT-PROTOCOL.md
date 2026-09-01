# STANDARD — Protocole visuel composant (backend raster)

**Statut :** Standard PMO. Établi à partir du parcours RESISTOR (`docs/pmo/delivery-reports/MB-VIS-RESISTOR-CONSOLIDATED.md`).
**Portée :** tout ticket portant un composant du catalogue au backend **raster** (EXP3/J7), de « voici un composant » à « composant validé + versionné ».
**Sources de vérité invoquées :** `frontend/src/visualization/visualContract.js` (RENDER-010), `frontend/src/config/componentDefinitions.js` (géométrie), `frontend/src/utils/pinPresentationGeometry.js` (positions de pins de présentation), `frontend/src/__tests__/renderQualityGate.test.jsx` (T5/T6/T8/T9).

> Objectif : réduire à un minimum d'allers-retours le traitement des composants suivants (DIODE, LED, CAPACITOR, …) en réutilisant la méthode RESISTOR et en évitant ses faux départs.

---

## 0. Pré-requis absolus

- **`MB-VIS-INDUSTRIAL-001` doit être livré avant DIODE.** Tant qu'il ne l'est pas, la neutralisation du chrome wrapper et du marqueur pin se fait par des règles CSS `:has(.part-<kebab>)` **spécifiques** (dette assumée, cf. §6/§7). Après INDUSTRIAL-001, elle passe par un attribut déclaratif `[data-backend="raster"]` / un flag `markerless`.
- Une phase ne démarre pas tant que la précédente n'est pas **PASS + preuve archivée**.
- Toute preuve « rendu » doit être une **preuve navigateur** (DOM + capture), jamais seulement computationnelle.

## Règles transverses (rappel — voir `KNOWN-BROKEN-STATE.md`)

- Commande de test **unique** : `npm --prefix frontend run test:ci` **ou**, depuis `frontend/`, `npx vitest run --config src/simulator/vitest.config.ts`. Jamais `npm exec vitest` (env `node` → `document is not defined`).
- Mesure binaire d'image : **Node uniquement** (jamais PowerShell). Bandes/marquages : échantillonner la **ligne médiane du corps**. Alpha : échantillonner **aux coins / bords, loin de la silhouette**.
- Interdits permanents : modifier `Breadboard.jsx` / `Breadboard.css` / `holeAt()` ; supprimer/masquer des trous ; modifier `componentDefinitions.js` / `Pin.jsx` / `SimulationCanvas.jsx` / `geometry.js` / `pinPresentationGeometry.js` / `simulator/*` ; modifier un asset validé (SHA-256 figés) ; affaiblir/supprimer une assertion de test pour faire PASS ; ajouter un `switch(type)` ou un nouveau `type === "…"` dans `CircuitComponent.jsx` / `Pin.jsx` / `PartRenderer.jsx` (garde T6) ; `!important` de contournement ; z-index arbitraire ; pseudo-élément « cap » ; classe temporaire ; dépendance ; commit/push/merge/amend/force-push/stash sans GO CSA explicite.

---

## Phase 0 — Audit du renderer existant

- **Entrée :** `type`, `*Part.jsx` actuel.
- **Opération :** lire le renderer, `getComponentDef(type)`, `PIN_PRESENTATION_BY_TYPE[type]`, la famille dans `visualContract` (`FILL_FACTOR`, `MATERIALS`), les états (`visualStateRegistry`), les z-index, `Pin.jsx` (y compris ses **inline styles**), `CircuitComponent.jsx` (chrome `__body`, `hideVisualMarker`).
- **Preuve :** fiche composant (boîte, pins, famille, états, backend actuel, défauts SVG constatés).
- **PASS :** fiche complète. **FAIL :** information manquante.
- **Autorisé :** lecture seule. **Interdit :** tout.

## Phase 1 — Référence visuelle

- **Entrée :** référence d'ambition CSA + composant physique réel.
- **Opération :** figer silhouette, matériau(x), couleurs, bagues/marquages, orientation, terminaisons de leads.
- **Preuve :** document de cible durcie (modèle : `MB-VIS-PROTOTYPE-001A-resistor-CSA-AMENDMENT-001.md`).
- **PASS :** le CSA acte la cible. **FAIL :** cible floue.
- **Autorisé :** `docs/pmo/tickets/`. **Interdit :** code, assets.

## Phase 2 — Production / choix de l'asset

- **Entrée :** cible durcie + `visualContract.ASSET_CONTRACT`.
- **Opération :** production externe (Blender / pipeline hors-ligne — hors agent).
- **Preuve :** 4 fichiers `{kebab}.{state}.{res}.{ext}` (WebP + PNG, @1x + @3x) dans `frontend/public/assets/components/<kebab>/`.
- **PASS :** 4 fichiers présents, nommage conforme. **FAIL :** manquant / planche multi-vues.
- **Autorisé :** `frontend/public/assets/components/<kebab>/`. **Interdit :** code.

## Phase 3 — Validation pixel

- **Entrée :** 4 fichiers.
- **Opération :** probe **Node** — octets, SHA-256, dimensions (IHDR / VP8X), alpha (ALPH / colorType 6), `fullyOpaque`, déterminisme (2 exports → SHA identiques) ; `validateComponentAsset(deriveComponentAssetSpec(type, { fillFactorKey }), probe)` → contrôles **A–L** ; séquence de bagues sur la **ligne médiane** ; alpha aux **coins**.
- **Preuve :** tableau A–L + SHA-256 + trace bandes + trace alpha.
- **PASS :** A–L OK, alpha OK, bandes = séquence attendue, N bandes exactes. **FAIL :** un contrôle KO → retour Phase 2.
- **Autorisé :** outil de probe (versionné). **Interdit :** retouche d'asset.

## Phase 4 — Validation géométrique

- **Entrée :** asset validé pixel.
- **Opération :** 1ᵉʳ / dernier pixel opaque de la ligne médiane vs `A` / `B` ; ratio ~3:1 ; `@3x ≈ 3 × @1x ± 1 px` ; terminaison de lead = rayon du lead.
- **Preuve :** écart extrémité de lead ↔ `getPinPresentationPosition()` **≤ 0.75 u canvas @1×** aux 3 zooms.
- **PASS :** conforme. **FAIL :** écart > 0.75 → retour Phase 2.
- **Autorisé :** outil de probe. **Interdit :** —.

## Phase 5 — Intégration

- **Entrée :** asset validé.
- **Opération :** `*Part.jsx` → `<div className="part-<kebab>"><picture><source type="image/webp" srcSet="…1x.webp 1x, …3x.webp 3x"><img src="…3x.png" srcSet="…1x.png 1x, …3x.png 3x" width={def.width} height={def.height} draggable={false} alt="" aria-hidden="true" style={{ width:'100%', height:'100%', display:'block', pointerEvents:'none' }} /></picture></div>` ; dims via `getComponentDef(type)` ; aucun `<svg>`/`<line>`/`<rect>`/gradient résiduel ; ajouter `frontend/src/components/parts/__tests__/<Type>Part.raster.test.jsx` (modèle : `ResistorPart.raster.test.jsx`) ; adapter les gardes qui présument un `<svg>` racine (`partDimensionsGuard` : ajouter le fichier au `Set` raster ; `partDimensionsCanonical` : `describe` dédié **avec test de mutation** sur l'`<img>` ; `RealisticRenderers` : filtrer + `it` dédié ; `renderQualityGate` T9 : déjà générique `if (!svg)`).
- **Preuve :** suite ciblée verte ; 16 échecs historiques identiques (aucun nouveau).
- **PASS :** 0 nouveau FAIL, aucun double rendu. **FAIL :** régression ou `<svg>` résiduel.
- **Autorisé :** `*Part.jsx`, `__tests__/*` du composant, gardes citées. **Interdit :** `CircuitComponent.jsx`, `PartRenderer.jsx`, `Pin.jsx`, `componentDefinitions.js`, `simulator/*`, `Breadboard.*`.

## Phase 6 — Suppression des artefacts du wrapper

- **Entrée :** composant intégré.
- **Opération :** `getComputedStyle(.circuit-component__body)` ; si chrome présent → règle CSS dans `CircuitComponent.css` : `[data-backend="raster"]` si INDUSTRIAL-001 est livré, sinon `.circuit-component__body:has(> .part-<kebab>) { background:transparent; border:0; border-radius:0; box-shadow:none }` + garde statique dans `circuitComponentRasterChrome.test.js`.
- **Preuve :** `background rgba(0,0,0,0)`, `border 0`, `border-radius 0`, `box-shadow none` ; l'ombre visible = celle de l'asset uniquement.
- **PASS :** pas de chrome résiduel. **FAIL :** chrome visible.
- **Autorisé :** `CircuitComponent.css`, test garde. **Interdit :** `CircuitComponent.jsx` (si solution CSS possible), `Breadboard.*`.

## Phase 7 — Pin / câblage

- **Entrée :** idem.
- **Opération :** inspecter `.myblab-pin` ; si disque sombre visible aux extrémités d'un asset qui dessine ses propres bouts → règle CSS `[data-backend="raster"] .myblab-pin` (post-INDUSTRIAL-001) sinon `.circuit-component:has(.part-<kebab>) .myblab-pin { background:transparent; border:0; box-shadow:none }` ; **vérifier le câblage réel** (clic pin A → pin B → `Fils : n+1`), le drag réel, la sélection.
- **Preuve :** capture avant/après + `Fils` incrémenté + `left/top` du composant changent + pins == `def`.
- **PASS :** marqueur neutralisé **et** câblage/drag/sélection OK. **FAIL :** marqueur visible OU câblage cassé OU pins déplacés.
- **Autorisé :** `CircuitComponent.css`, test garde. **Interdit :** `Pin.jsx`, `Pin.css`, `CircuitComponent.jsx` (si CSS possible).

## Phase 8 — Breadboard

- **Entrée :** idem.
- **Opération :** poser le composant sur une breadboard ; `document.elementFromPoint` au centre + marges → topmost = l'asset ; `document.querySelectorAll('circle.breadboard__hole').length` inchangé ; `git diff --name-only` sans `breadboard`.
- **Preuve :** topmost = asset ; trous voisins intacts ; 0 fichier breadboard modifié.
- **PASS :** RAS. **FAIL :** breadboard modifiée → **STOP — ARCHITECTURAL BLOCKER** (ne jamais corriger un artefact composant côté breadboard).
- **Autorisé :** lecture seule breadboard. **Interdit :** `Breadboard.jsx`, `Breadboard.css`, `holeAt()`.

## Phase 9 — Zoom

- **Entrée :** idem.
- **Opération :** captures 0.5× / 1× / 2× (+ 2× app × 150 % navigateur) ; ancrage lead↔pin re-mesuré à chaque zoom.
- **Preuve :** 3–4 captures nettes + écart ≤ 0.75.
- **PASS :** net, ancrage OK. **FAIL :** flou / halo / clipping / ancrage qui dérive.
- **Autorisé :** lecture seule. **Interdit :** —.

## Phase 10 — Tests / typecheck / build

- **Entrée :** idem.
- **Opération :** suite ciblée (commande canonique) ; `npx tsc -b` depuis `frontend/` ; `lightningcss.transform()` sur le CSS touché.
- **Preuve :** 0 nouveau FAIL ; `tsc` exit 0 ; CSS parse OK (échec `npm run build` **uniquement** sur `Breadboard.css` pré-existant).
- **PASS :** tout vert hors pré-existant. **FAIL :** nouveau FAIL / `tsc` ≠ 0 / CSS ne parse pas.
- **Autorisé :** `__tests__/*` du composant. **Interdit :** tests généraux (pas de spécialisation-type pour PASS).

## Phase 11 — CSA VISUAL GO

- **Entrée :** rapport complet des Phases 0–10 + captures + grille QA 15 critères (`visualContract.QA_CRITERIA`, score ≥ 4/5) + comparaison à la référence.
- **Opération :** revue humaine.
- **Preuve :** verdict CSA écrit.
- **PASS :** GO. **FAIL :** NO-GO → retour à la phase indiquée.
- **Autorisé :** `docs/pmo/delivery-reports/`. **Interdit :** code, assets.

## Phase 12 — Versionnage

- **Entrée :** GO obtenu.
- **Opération :** `git add` **explicitement nommé** — `*Part.jsx`, `CircuitComponent.css`, `__tests__/*`, `frontend/public/assets/components/<kebab>/*`, `manifest.json`, ticket(s), delivery report ; **un seul commit** ; push.
- **Preuve :** `git show --stat` = liste attendue ; assets **dans HEAD** ; `git status` clean ; `git rev-list --left-right --count origin/<branche>...HEAD` = `0 0`.
- **PASS :** tout committé et poussé. **FAIL :** fichier oublié / asset absent de HEAD.
- **Autorisé :** `git add` / `commit` / `push` sur GO CSA uniquement. **Interdit :** `--amend`, `--force`, `stash pop` non demandés.

---

## Checklist « zéro perte de temps »

**Avant d'écrire la moindre ligne**
- [ ] `*Part.jsx` existant lu + `getComponentDef` + `PIN_PRESENTATION_BY_TYPE` + famille `visualContract` + z-index + `Pin.jsx` (inline styles).
- [ ] Couche du défaut identifiée par `elementFromPoint` + `getComputedStyle` (pas à l'œil).
- [ ] Pas de confusion `circle.breadboard__hole` (z 1) ↔ `.myblab-pin` (z 10).
- [ ] Pas de confusion rectangle `.circuit-component__body` ↔ fond d'asset.

**Pendant**
- [ ] `Breadboard.*` / `holeAt()` non touchés pour un artefact composant (sinon STOP — ARCHITECTURAL BLOCKER).
- [ ] `CircuitComponent.jsx` non touché si une règle CSS locale suffit (sinon T6 casse).
- [ ] Aucun rectangle / fond opaque / carte / `!important` / nombre magique / z-index arbitraire / classe temporaire / pseudo-élément « cap ».
- [ ] Un seul rendu : aucun `<svg>`/`<line>`/`<rect>` à côté de l'`<img>`.
- [ ] Pins == `def` au repos **et** après drag.
- [ ] Chaque règle CSS testée **en live** (`<style>` injecté) avant écriture.

**Avant de dire PASS**
- [ ] Preuve **navigateur** (DOM + capture), pas seulement computationnelle.
- [ ] Zooms 0.5× / 1× / 2× ; transparence (coins) ; états (LED/RGB/boutons).
- [ ] Câblage réel (clic A→B → `Fils` +1), drag réel, sélection.
- [ ] Suite via commande canonique ; 0 nouveau FAIL ; 16 FAIL historiques identiques.
- [ ] `tsc -b` exit 0 ; CSS touché parse sous `lightningcss`.
- [ ] `git status --short` : seuls les fichiers autorisés ; `git diff --check` exit 0.

**Frontières**
- [ ] Un fichier local non versionné (asset, script scratchpad) **ne fait pas partie du dépôt** : le signaler, ne pas le supposer acquis.
- [ ] Ne pas passer au composant suivant sans **CSA VISUAL GO écrit** et **Phase 12** faite.

---

## Familles de composants (réutilisation de la méthode RESISTOR)

| Famille | Membres | Réutilisation | Spécificité à traiter |
|---|---|---|---|
| Axial-leaded horizontal | RESISTOR, DIODE | ~95 % | bande cathode ≠ bagues |
| Passif radial vertical | CAPACITOR, LDR, THERMISTOR | ~80 % | ancrage **vertical** des leads |
| Through-hole émissif | LED, RGB_LED | ~55 % | **états visuels**, variantes d'asset (`{state}`), déjà « markerless » |
| Boîtier interactif | BUTTON, BUTTON_LATCHING, POTENTIOMETER | ~50 % | états d'interaction (`interaction.type`) déjà branchés |
| Multi-broches semi | NPN_TRANSISTOR, SERVO | ~50 % | 3 ancrages, repérage |
| Volumétrique | DC_MOTOR, BUZZER | ~55 % | volume, arbre chrome, banc « objet physique » |
| Carte | ARDUINO, POWER | ~30 % | sous-échelle canonique, nombreux pins, budget raster « complexe » |
| Support | BREADBOARD | — | **exclu** — déjà réaliste, ne pas re-raster |

## Ordre recommandé

**CAPITALISATION** (fait) → **`MB-VIS-INDUSTRIAL-001`** (backend déclaratif) → **DIODE** (test de non-régression du protocole) → **LED** (états) → **CAPACITOR** (ancrage vertical) → **LDR + THERMISTOR** → **DC_MOTOR** → BUTTON(*) → NPN_TRANSISTOR → SERVO → RGB_LED (après LED) → POTENTIOMETER / BUZZER / POWER → ARDUINO.
