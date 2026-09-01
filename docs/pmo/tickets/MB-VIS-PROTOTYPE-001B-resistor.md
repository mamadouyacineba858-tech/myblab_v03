# MB-VIS-PROTOTYPE-001B — RESISTOR — Validation de l'asset raster produit

**Statut :** Historique — clôturé par **CSA VISUAL GO — RESISTOR**.
**Nature :** document de reconstitution (transcrit a posteriori dans le dépôt par `MB-VIS-RESISTOR-CONSOLIDATION-001`). Aucun résultat nouveau : ne reprend que des faits établis pendant l'exécution et consolidés dans `docs/pmo/delivery-reports/MB-VIS-RESISTOR-CONSOLIDATED.md`.
**Programme / Épic :** Experience → EXP3 → §7.4 `ROADMAP_PLATFORM.md`.
**Antécédents :** `MB-VIS-RENDER-010` (`e990adf`, `visualContract.js`), `MB-VIS-PROTOTYPE-001A` (`8ef285f`, harnais `componentAssetValidation.js`), `MB-VIS-PROTOTYPE-001A-CSA-AMENDMENT-001` (`6759e18`, cible de production durcie).
**Base Git :** `6759e183a1caae86abb04c4735f3909572ebb9ad`.
**Périmètre :** lecture / mesure uniquement. Aucun fichier de production modifié. Aucune dépendance ajoutée. Aucun asset commité par ce ticket (le versionnage des assets a lieu en `MB-VIS-RESISTOR-CONSOLIDATION-001`).

---

## 1. Objectif

Valider les quatre fichiers d'asset RESISTOR produits en externe (Blender / pipeline hors-ligne) contre :
1. le harnais générique `frontend/src/visualization/assetValidation/componentAssetValidation.js` (contrôles automatisables **A–L**) ;
2. la feuille de production `MB-VIS-PROTOTYPE-001A` §3 et l'amendement `AMENDMENT-001` (silhouette dog-bone, corps beige/crème, bagues, leads, alpha, absence de cadre / de point de pin) ;
3. les 15 critères QA humains (`visualContract.QA_CRITERIA`), cible ≥ 4/5 ;
4. l'ancrage réel des extrémités de leads sur `A = (0,14)` / `B = (84,14)` (tolérance `LEAD_ANCHORING.tolerancePx = 0.75`) ;
5. la lisibilité aux zooms `0.5× / 1× / 2×`.

## 2. Assets soumis

```
frontend/public/assets/components/resistor/resistor.default.1x.png
frontend/public/assets/components/resistor/resistor.default.1x.webp
frontend/public/assets/components/resistor/resistor.default.3x.png
frontend/public/assets/components/resistor/resistor.default.3x.webp
```

| Fichier | Octets | Dimensions | Format | SHA-256 |
|---|---|---|---|---|
| `resistor.default.1x.png` | 5631 | 170 × 57 | PNG, colorType 6 (RGBA8) | `b5eae0cc87abf5ea0efd92f2020c9a42eb83405a494dbefe112f94076be1b670` |
| `resistor.default.1x.webp` | 3030 | 170 × 57 | WebP VP8X + flag ALPH | `e6b8550329eec9ed04686a6a4517a2d1d4a81989ae2209842050c0b2713dcdf7` |
| `resistor.default.3x.png` | 25861 | 510 × 171 | PNG, colorType 6 (RGBA8) | `115b56ab6e544288a5cbf042767a8f2d03c8a42a91746213471a84088ddcaa57` |
| `resistor.default.3x.webp` | 10272 | 510 × 171 | WebP VP8X + flag ALPH | `c6ff40ceccba6a124c9cc60ca8380afe9f2b254db7d9bbd2c34d8e943ee87548` |

## 3. Méthode de mesure — probe Node pur (sans dépendance)

Outil jetable en Node (scratchpad de session, non versionné ; sa logique doit être capitalisée par un futur outil `assetValidation/imageProbe.mjs`) :

- `fs.statSync` → octets ; `crypto.createHash('sha256')` → empreinte ;
- parse de l'en-tête **PNG IHDR** → largeur / hauteur / colorType / bitDepth ;
- parse **WebP RIFF / VP8X** → dimensions (`1 + (b[24] | b[25]<<8 | b[26]<<16)` etc.) + présence du flag **ALPH** ;
- **décodage PNG complet** : `zlib.inflateSync` du flux IDAT + dé-filtrage scanline manuel (filtres 0–4, prédicteur Paeth) → buffer RGBA réel, pour mesurer alpha et couleurs au pixel.

## 4. Résultats des contrôles A–L (`validateComponentAsset`)

| id | Contrôle | Résultat |
|---|---|---|
| A | existence des 4 `expectedFiles` | PASS |
| B/C | dimensions cohérentes (`@1x`, `@3x`, ratio ~3:1, `@3x ≈ 3 × @1x ± 1 px`, ≤ `maxDimensionPx` 1024) | PASS (170×57 / 510×171) |
| D | `hasAlpha === true` pour les 4 | PASS (VP8X ALPH / PNG colorType 6) |
| E/J | poids ≤ 30 Ko/variante (RESISTOR = simple) | PASS (max 25861 o) |
| F | nombre d'états ≤ `maxVariants` | PASS (état unique `default`) |
| G | nommage `{kebab}/{kebab}.{state}.{res}.{ext}` | PASS |
| H | déterminisme (si fourni) : `sha256_a === sha256_b` | PASS (rendus successifs identiques) |
| I | fond non opaque (`fullyOpaque === false`) | PASS |
| K | exactement 2 résolutions (`1x`, `3x`) | PASS |
| L | boîte canonique === `getComponentDef("RESISTOR").width/height` (84 × 28) | PASS |

## 5. Contrôles perceptuels et géométriques (AMENDMENT-001)

| Contrôle | Résultat |
|---|---|
| Silhouette dog-bone (corps renflé, épaules resserrées) | conforme |
| Corps beige/crème (interdit orange) | conforme — pixels corps ≈ `rgb(148,117,80)` sur l'axe |
| Séquence de bagues **marron → noir → rouge → or** | conforme — mesurée sur la **ligne médiane du corps** : MARRON (x≈31–33) → NOIR (x≈37–39) → ROUGE (x≈45–47) → OR (x≈53) = **4 bandes**, aucune 5ᵉ |
| Leads métalliques cylindriques, horizontaux, terminaison = rayon lead | conforme |
| Ancrage : 1ᵉʳ pixel opaque ligne médiane à x=0, dernier à x=169 → extrémités sur `A=(0,14)` / `B=(84,14)` | écart ≤ `0.75` u canvas @1× aux 3 zooms |
| Alpha : fond réellement transparent | conforme — échantillons pris **aux coins / bords loin de la silhouette** : `rgba(0,0,0,0)` |
| Absence de cadre, de fond cuit, de point de pin, de texte, de montage multi-vues | conforme |
| Ombre de contact portée par l'alpha, non dominante | conforme |

## 6. QA (15 critères, `visualContract.QA_CRITERIA`)

Évaluation humaine — **score : 4.63 / 5** (≥ `QA_TARGET_SCORE` 4). Lisibilité vérifiée à `0.5× / 1× / 2×` (+ 2× app × 150 % navigateur).

## 7. Faux positifs rencontrés (à ne pas reproduire)

| Faux positif | Cause racine | Correction méthodologique |
|---|---|---|
| « 3x mesuré 254 × 171 » | parsing binaire VP8X en PowerShell (arithmétique de bits erronée) | mesure d'octets d'image **en Node uniquement** |
| « 5ᵉ bande dorée sur l'épaule gauche » | classifieur de bandes échantillonnant l'**épaule** dog-bone (zone d'ombrage), pas l'axe | échantillonner le **RGB brut sur la ligne médiane du corps** |
| « Transparence : NON » | échantillons pris **aux sorties de lead** (opaques par nature) | échantillonner l'alpha **aux coins / bords, loin de la silhouette** |

## 8. Verdict

**CSA VISUAL GO — RESISTOR.**
Aucun commit, aucun asset versionné par ce ticket. Ne pas enchaîner automatiquement sur `PROTOTYPE-002`. L'intégration applicative fait l'objet de `MB-VIS-PROTOTYPE-001C`.
