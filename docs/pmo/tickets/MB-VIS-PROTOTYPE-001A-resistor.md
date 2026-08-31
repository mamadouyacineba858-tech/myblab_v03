# MB-VIS-PROTOTYPE-001A — RESISTOR — Visual Asset Production Specification + Validation Harness

**Statut :** Spécification de production + harnais de validation. **Ne produit aucun asset.**
**Programme / Épic :** Experience → EXP3 → §7.4 `ROADMAP_PLATFORM.md` (MYBlab Physical/Realistic Visual Engine).
**Antécédents :** `MB-VIS-RENDER-009`, `MB-VIS-REVIEW-001`, `MB-VIS-REVIEW-002` (décision **H3 discipliné** — raster EXP3/J7), `MB-VIS-RENDER-010` (Physical Component Visual Contract, commit `e990adf`).
**Base Git :** `e990adffb60746cc9f351e6756426c4baa18c6d1`.
**Source de vérité unique du langage visuel :** `frontend/src/visualization/visualContract.js`. Ce document n'en crée aucune copie ; il **dérive** de ce contrat une feuille de production RESISTOR et une procédure de validation.

**Périmètre créé par 001A :**
- `docs/pmo/tickets/MB-VIS-PROTOTYPE-001A-resistor.md` *(ce document)*
- `frontend/src/visualization/assetValidation/componentAssetValidation.js` *(harnais générique — dérive les attendus, valide un asset fourni)*
- `frontend/src/visualization/assetValidation/__tests__/componentAssetValidation.test.js` *(tests du harnais + preuve DOM de la forme d'intégration)*

**001A NE FAIT PAS :** aucun rendu Blender ; aucun substitut SVG/procédural ; aucune rastérisation d'icône ; aucune modification de renderer, `RendererRegistry`, `PartRenderer`, `VisualizationManager`, `CircuitComponent.jsx`, `Pin.jsx`, `componentDefinitions.js`, `simulator/*`, `SimulationCanvas.jsx`, `Breadboard.*` ; aucune dépendance ; aucune modification `package.json`/`package-lock.json` ; aucun asset image dans Git.

---

## 1. Objectif

Transformer `MB-VIS-RENDER-010` en :
1. une **feuille de production externe** (§5–§14) qu'un artiste Blender/Cycles suit pour produire l'asset RESISTOR de façon déterministe et cohérente-catalogue ;
2. un **harnais de validation générique** (§15) que `MB-VIS-PROTOTYPE-001B` exécutera contre l'asset réellement produit ;
3. la **forme d'intégration expérimentale** (§16), prouvée par un test DOM sans toucher aucun fichier de production.

**001A ne peut PAS conclure** « le RESISTOR est réaliste », « niveau 4 atteint » ou « H1 validé » — aucun asset professionnel n'est produit ici (cf. Blueprint §18).

---

## 2. Attendus dérivés du contrat (non redéfinis)

| Grandeur | Source | Valeur RESISTOR |
|---|---|---|
| Boîte canonique | `getComponentDef("RESISTOR").width/height` (`componentDefinitions.js`) | **84 × 28** unités canvas |
| Pins (ancrage) | `utils/pinPresentationGeometry.js#getPinPresentationPosition` ; hors-LED = offsets `dx/dy` de `getComponentDef("RESISTOR").pins` | **A = (0, 14)** · **B = (84, 14)** |
| Fill factor | `visualContract.FILL_FACTOR.AXIAL_LEADED` | **0.62** |
| Direction lumière | `visualContract.LIGHTING.keyLight.fromDirection` | **(−0.6, −0.8)** (unitaire, haut-gauche) |
| Direction ombre | `visualContract.LIGHTING.shadowDirection` | **(0.6, 0.8)** (unitaire, opposée) |
| Ombre de contact | `visualContract.CONTACT_SHADOW` | offset **(1.8, 2.4)** · blur **3** · opacity **≤ 0.32** · anchor **silhouette-bottom** |
| Échelle | `visualContract.SCALE.canvasUnitsPerMm` | **3.0** (`provisional: true`) |
| Matériau corps | `visualContract.MATERIALS.CERAMIC` | roughness 0.60 · spéculaire doux · highlight large-doux |
| Matériau pattes | `visualContract.MATERIALS.METAL_LEAD` | roughness 0.35 · spéculaire étroit-net · highlight linéaire-vif · anisotrope |
| Format | `visualContract.ASSET_CONTRACT.format` | WebP alpha (primaire) + PNG alpha (fallback) |
| Résolutions | `visualContract.ASSET_CONTRACT.resolutions` | **@1x** (×1) · **@3x** (×3) |
| Racine assets | `visualContract.ASSET_CONTRACT.root` | `frontend/public/assets/components` |
| Nommage | `visualContract.ASSET_CONTRACT.naming` | `{root}/{typeKebab}/{typeKebab}.{state}.{res}.{ext}` |
| État | `visualContract.ASSET_CONTRACT.states` (aucun état visuel pour RESISTOR) | **`default`** |
| Budget | `visualContract.RENDER_BUDGET.raster` (RESISTOR = simple) | **≤ 30 Ko / variante**, ≤ 2 résolutions, ≤ 8 variantes, ≤ 1024 px (`provisional: true`) |
| Capture | `visualContract.CAPTURE.mode` | `deterministic` |
| Grille QA | `visualContract.QA_CRITERIA` (15) · `QA_TARGET_SCORE` | **≥ 4/5** — validation **humaine**, faite en 001B |

Fichiers d'asset attendus (dérivés du nommage) :
```
frontend/public/assets/components/resistor/resistor.default.1x.webp
frontend/public/assets/components/resistor/resistor.default.3x.webp
frontend/public/assets/components/resistor/resistor.default.1x.png
frontend/public/assets/components/resistor/resistor.default.3x.png
```
Dimensions cibles **provisoires** : `@1x ≈ 170 × 57 px` · `@3x ≈ 512 × 170 px` — à **confirmer par mesure en 001B**.

---

## 3. Feuille de production externe (destinée à l'artiste Blender / pipeline 3D)

### 3.1 Scène — commune RESISTOR → LED → DC MOTOR
- **Caméra** : orthographique de préférence (perspective très longue focale, ≥ ~120 mm équiv., acceptée à défaut). Axe optique **perpendiculaire au plan de travail**, **légère plongée ≤ 8°** pour lire l'épaisseur. Caméra **fixe** — aucune rotation libre, aucune variation entre captures.
- **Cadrage de famille** : identique pour les 3 composants. L'objet est **posé sur la surface**, vu de trois-quarts très léger — **pas** une icône frontale.
- **Plan de travail** : présent uniquement comme **récepteur d'ombre** (shadow catcher), invisible dans le rendu final (n'apparaît pas dans l'alpha, seule l'ombre projetée est conservée).
- **Sortie** : fond **transparent** ; aucun rectangle, aucune couleur de fond cuite ; l'ombre de contact **présente dans le canal alpha**.

### 3.2 Composition RESISTOR
- Boîte de travail = **84 × 28** unités canvas (ratio 3:1). Rendre à `@3x` puis dériver `@1x`.
- Le **corps** occupe ≈ **62 %** de la largeur utile (`FILL_FACTOR.AXIAL_LEADED = 0.62`), centré.
- Les **pattes** sont longues, horizontales, **clairement séparées du corps**, alignées sur `y = 14` (unités canvas) de sorte que leurs extrémités coïncident avec **A = (0,14)** et **B = (84,14)** une fois l'asset mis à l'échelle de la boîte canonique.
- Silhouette **immédiatement reconnaissable** comme résistance axiale 1/4 W réelle.

### 3.3 Matériaux
- **Corps — `CERAMIC`** : coating céramique physique, `roughness ≈ 0.60`, spéculaire **doux**, highlight **large et doux**. Interdit : apparence plastique générique, « gradient décoratif » tenant lieu de matériau.
- **Bagues** : peinture/coating **réel** sur la géométrie **cylindrique** (les bagues épousent la courbure), code couleur réaliste, **transitions physiques** corps↔bague (léger relief/edge, pas un simple aplat).
- **Pattes — `METAL_LEAD`** : métal étamé crédible, `roughness ≈ 0.35`, highlight **plus étroit**, **reflet métallique réel**, continuité **cylindrique**. Interdit : simple ligne grise plate.

### 3.4 Lumière (`LIGHTING`)
- **Une seule** clé principale depuis `fromDirection = (−0.6, −0.8)` (haut-gauche, dominante verticale) : softbox neutre, **légèrement froide**, assez large pour des highlights réalistes.
- Fill ≈ **0.35**. Ambient ≈ **0.18**. **Aucune** lumière contradictoire ajoutée « pour faire joli ».
- Le rig doit être **réutilisable tel quel** pour LED et DC MOTOR.

### 3.5 Ombre de contact (`CONTACT_SHADOW`)
- Projetée par la clé, orientée selon `shadowDirection = (0.6, 0.8)` (bas-droite).
- Paramètres visés une fois composée sur la boîte canonique : **offset ≈ (1.8, 2.4)**, **blur ≈ 3**, **opacité ≤ 0.32**, **ancrée au bas de la silhouette**.
- Interdit : halo, glow, ombre flottante, ombre détachée, ombre dominante, plusieurs directions d'ombre, contour artificiel autour de l'objet.
- L'ombre reste **secondaire** ; elle ne doit jamais devenir l'élément visuel dominant.

### 3.6 Alpha / fond
- Résultat = **objet + ombre de contact sur transparence**. Prémultiplié ou non selon l'export, mais **bord propre** (pas de frange blanche/noire, pas de halo alpha).

### 3.7 Déterminisme (`CAPTURE.mode = deterministic`)
- **Seed fixe** pour tout échantillonnage pseudo-aléatoire (path tracing, denoiser).
- Interdit : animation, bruit variable, random non seedé, variation temporelle, auto-glow, variation d'éclairage entre captures, grain différent entre deux rendus.
- **Deux exports successifs** avec la même scène → **fichiers identiques** (hash SHA-256 égal), ou différence **explicitement documentée et mesurée** (ex. métadonnées d'horodatage à neutraliser).

### 3.8 Export (`ASSET_CONTRACT`)
- 4 fichiers, nommage strict (§2). **WebP alpha** qualité ≈ **85** (primaire) + **PNG alpha** (fallback obligatoire).
- Dimensions cibles provisoires : `@3x ≈ 512 × 170`, `@1x ≈ 170 × 57`. **Ne jamais** sacrifier netteté / contour / rendu métal / ombre / transparence pour « rentrer dans le budget » — si le budget est dépassé, le **signaler en 001B** (mesure), ne pas dégrader l'image.

---

## 4. Harnais de validation (livrable B)

**Justification de l'implémentation code** (Blueprint §4 — « uniquement si réellement nécessaire ») : `MB-VIS-PROTOTYPE-001B`, puis `PROTOTYPE-002` (LED) et `-003` (DC MOTOR), devront tous exécuter **la même** batterie de contrôles fichier/DOM contre un asset livré. Un harnais **générique** (paramétré par `type`) évite de réécrire cette logique trois fois et garantit que les 3 prototypes sont jugés à l'identique. Il est **minimal** : dérivation d'attendus (lecture des sources de vérité, **aucune duplication**) + une fonction pure `validateComponentAsset(spec, probe)`.

**Emplacement retenu :** `frontend/src/visualization/assetValidation/` (sous-module dédié) plutôt que `__tests__/` — c'est un **utilitaire réutilisable** par 3 tickets, pas un test ; il mérite une frontière de module explicite. Son propre test vit dans `assetValidation/__tests__/`.

### 4.1 `componentAssetValidation.js` — API

- `deriveComponentAssetSpec(type, { fillFactorKey })` → objet **gelé** :
  ```
  { type, typeKebab, box:[w,h], fillFactorKey, fillFactor,
    pinAnchors:[{ id, x, y }],           // depuis getComponentDef(type).pins (dx,dy)
    lighting, contactShadow, capture,    // références directes visualContract
    assetDir, expectedFiles:[{ state,res,ext,path,maxKb }],
    budget:{ maxKbPerVariant, maxVariants, maxResolutions, maxDimensionPx } }
  ```
  Lit **exclusivement** `getComponentDef(type)` + `visualContract.js`. Ne réécrit aucune valeur.

- `validateComponentAsset(spec, probe)` → `{ ok:boolean, checks:[{ id, name, ok, detail }] }`.
  `probe` (fourni par 001B après mesure réelle) :
  ```
  { files: { [path]: { exists, bytes, width, height, hasAlpha, fullyOpaque, sha256 } },
    determinism?: { [path]: { sha256_a, sha256_b } } }
  ```
  Contrôles implémentés (Blueprint §16, sous-ensemble **automatisable**) :
  | id | Contrôle | Règle |
  |---|---|---|
  | A | existence | les 4 `expectedFiles` existent |
  | B/C | dimensions | `@1x`/`@3x` cohérents (ratio 3:1 ± tol., `@3x = 3 × @1x` ± 1 px) et ≤ `maxDimensionPx` |
  | D | alpha | `hasAlpha === true` pour chaque fichier |
  | E/J | poids / budget | chaque `bytes/1024 ≤ maxKbPerVariant` |
  | F | variantes | nb d'états distincts ≤ `maxVariants` |
  | G | nommage | chaque chemin respecte `{typeKebab}/{typeKebab}.{state}.{res}.{ext}` |
  | H | déterminisme | si `determinism` fourni : `sha256_a === sha256_b` par fichier |
  | I | fond non opaque | `fullyOpaque === false` pour chaque fichier |
  | K | résolutions | exactement 2 (`1x`, `3x`) |
  | L | boîte canonique | `spec.box` === `getComponentDef(type).width/height` (garde anti-dérive) |

  **Non automatisable → hors harnais, fait humainement en 001B** : réalisme perceptuel, matériaux crédibles, lumière/ombre crédibles, netteté aux zooms, comparaison à la référence, **score visuel ≥ 4/5**. Le harnais ne prétend **jamais** mesurer le réalisme par inspection DOM.

### 4.2 Preuve DOM de la forme d'intégration (§16 K/M/N/O)
Test dédié : rend un `<img>` **candidat** portant les attributs dérivés du contrat, dans un wrapper neutre imitant `.circuit-component__body`, et vérifie :
- `img.getAttribute('width')` / `height` === `getComponentDef("RESISTOR").width` / `height` ;
- `img.draggable === false` ;
- `img` ne porte **aucun** gestionnaire (`onPointerDown/Up`, `onClick`, `onMouseDown`) et a `pointer-events: none` → n'intercepte pas les interactions du wrapper ;
- le wrapper reçoit toujours `pointerdown` (compteur d'événements) ;
- aucun `<Pin>` ni logique de pin dans le candidat.
Ce test **ne rend pas** `CircuitComponent` et **ne modifie aucun fichier de production**.

---

## 5. Intégration expérimentale — forme cible (documentation)

```
CircuitComponent (INCHANGÉ)
  └─ div.circuit-component  [left, top, width=def.width, height=def.height]  ← hitbox / sélection / drag / câblage
       ├─ div.circuit-component__body
       │    └─ <img src="…/resistor/resistor.default.3x.webp"
       │            srcset="…1x.webp 1x, …3x.webp 3x"
       │            width={def.width} height={def.height}
       │            draggable={false}
       │            style={{ width:'100%', height:'100%', pointerEvents:'none' }}
       │            alt="" aria-hidden="true" />
       └─ {def.pins.map(pin => <Pin … />)}   ← INCHANGÉ, overlay HTML, positions getPinPresentationPosition()
```
- L'`<img>` **occupe la boîte canonique**, `width/height` issus de la définition, `draggable=false`, `pointer-events:none` → **ne capte pas** les interactions destinées au wrapper.
- Les **pins ne bougent pas** : ils restent rendus et positionnés par `CircuitComponent` / `getPinPresentationPosition()`.
- **Aucune** modification de `CircuitComponent.jsx`, du hit-test, du drag, de la sélection, du câblage.
- Le branchement effectif (entrée de registre `{ visual: { backend:'raster' } }` + lecture de `resolveBackend` dans `PartRenderer`) appartient à **`MB-VIS-INDUSTRIAL-001`**, pas à un prototype.

---

## 6. Procédure MB-VIS-PROTOTYPE-001B (après production externe)

1. **Placer** les 4 fichiers produits dans `frontend/public/assets/components/resistor/` (branche locale jetable, non mergée).
2. **Sonder** chaque fichier (dimensions, `bytes`, alpha, `fullyOpaque`, `sha256`) — outil au choix de 001B (un probe PNG/WebP minimal, ou un module image temporaire en devDependency **si le CSA l'autorise explicitement** ; sinon probe manuel documenté).
3. **Exécuter** `validateComponentAsset(deriveComponentAssetSpec("RESISTOR", { fillFactorKey:"AXIAL_LEADED" }), probe)` → tableau de contrôles A–L.
4. **Rendre** deux fois la scène → comparer les hash (§3.7).
5. **Intégrer** expérimentalement (branche jetable) l'`<img>` dans un RESISTOR de test et **mesurer aux zooms** `0.5× / 1× / 2×` **et** `2× app + 150 % navigateur` :
   - silhouette nette, détails/leads lisibles, pas d'artefact de compression, pas de pixellisation excessive, pas de halo alpha, pas de bordure, pas de clipping ;
   - écart extrémité de lead ↔ `getPinPresentationPosition()` **≤ 0.75 unité canvas @1×** à chaque zoom.
6. **Évaluer** les 15 critères QA (`visualContract.QA_CRITERIA`), score /5 **avec justification par critère**.
7. **Comparer** à la référence d'ambition (§7).
8. **Vérifier** : suite de tests inchangée (16 FAIL historiques identiques, 0 nouveau), `git diff --check` PASS, aucun fichier fonctionnel modifié, aucune dépendance (hors éventuel probe autorisé), aucun asset commité.
9. **Rapport 001B** : rubriques du Blueprint 001 §21 (§1 Base Git … §14 Recommandation GO/NO-GO).

---

## 7. Procédure de comparaison à la référence

Comparer le RESISTOR produit à la **référence d'ambition** fournie par le Product Lead (labo électronique réaliste), sur : niveau de réalisme, profondeur/volume, matériaux (métal vs céramique), lumière, ombre de contact, silhouette, intégration au plan de travail, perception « objet physique ».
**La référence n'est pas reproduite pixel par pixel** — c'est un **benchmark d'ambition artistique**.
Question de décision (001B) : *« Un utilisateur percevrait-il cette résistance comme un objet physique posé sur l'atelier, plutôt que comme une illustration SVG ? »* → GO si oui **et** score ≥ 4/5 ; NO-GO sinon (retour langage visuel / scène / production avant tout autre prototype).

---

## 8. Traçabilité

```
MB-VIS-RENDER-010 (visualContract.js — e990adf)
   └─ MB-VIS-PROTOTYPE-001A  (CE DOCUMENT + assetValidation/)
          └─ [ production asset externe : Blender / artiste ]
               └─ MB-VIS-PROTOTYPE-001B  (validation réelle + score visuel ≥ 4 + comparaison référence)
                    └─ CSA VISUAL GO
                         ├─ MB-VIS-PROTOTYPE-002  LED (+ état)
                         └─ MB-VIS-PROTOTYPE-003  DC MOTOR
                              └─ CSA VISUAL GO FINAL
                                   └─ MB-VIS-INDUSTRIAL-001  (branchement resolveBackend + pipeline + 16 composants)
                                        └─ V13 fils → V15/V16 breadboard → V17/V18 canvas+ombres
                                           → V19 états → V20 cohérence → V21 QA visuelle → V22 gate Tinkercad (J7)
```
