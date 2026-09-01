# MB-VIS-PROTOTYPE-002 — DIODE — Intégration raster

**Statut : PASS — DIODE intégré au backend raster déclaratif.** Historique : phase d'audit/spec clôturée BLOCKED (`6277d99`) ; asset produit et vérifié en externe ; intégration `MB-VIS-PROTOTYPE-002B` livrée (voir `docs/pmo/delivery-reports/MB-VIS-PROTOTYPE-002-diode-delivery-report.md`).
**Programme / Épic :** Experience → EXP3 → `ROADMAP_PLATFORM.md` §7.4 (MYBlab Physical/Realistic Visual Engine).
**Antécédents :** `MB-VIS-RENDER-010` (`visualContract.js`), `MB-VIS-INDUSTRIAL-001` (backend déclaratif, commit `db24f72`), `docs/pmo/standards/VISUAL-COMPONENT-PROTOCOL.md`, chaîne RESISTOR (`MB-VIS-PROTOTYPE-001A→001C.4`, `docs/pmo/delivery-reports/MB-VIS-RESISTOR-CONSOLIDATED.md`).
**Base Git (audit) :** `db24f72` · **Base Git (intégration 002B) :** `6277d993aaf4466e77c50eac6d2800752a30d27b`.
**Numérotation :** ce ticket occupe l'identifiant `MB-VIS-PROTOTYPE-002`, réattribué à DIODE par la séquence recommandée post-consolidation (`ROADMAP_PLATFORM.md` §7.4, `VISUAL-COMPONENT-PROTOCOL.md` « Ordre recommandé » : CAPITALISATION → INDUSTRIAL-001 → **DIODE** → LED → …), en lieu et place de l'affectation originelle de `MB-VIS-RENDER-010` §6 (`002 = LED`), explicitement révisée par l'amendement de re-séquencement.

**Ce que 002B modifie :** `DiodePart.jsx` (SVG → raster), `defaultRegistrations.js` (`visual: { backend: 'raster' }` sur DIODE), `renderQualityGate.test.jsx` (T10 rendu tolérant au schéma de manifeste), `visualContract.test.js` (liste des types raster), `DiodePart.uid.test.jsx` → `DiodePart.raster.test.jsx`, + le paquet d'assets `frontend/public/assets/components/diode/`. **NON modifiés :** `componentDefinitions.js`, `CircuitComponent.jsx`, `CircuitComponent.css`, `Pin.jsx`, `Pin.css`, `Breadboard.*`, `geometry.js`, `pinPresentationGeometry.js`, `simulator/*`, `models/*`. Aucune dépendance.

---

## 0. Livraison MB-VIS-PROTOTYPE-002B (intégration)

| Élément | Résultat |
|---|---|
| Assets | 6 fichiers dans `frontend/public/assets/components/diode/` — `diode.default.{1x,3x}.{webp,png}` (170×61 / 510×182, alpha, PNG RGBA8 + WebP VP8L), `manifest.json`, `ASSET-INTEGRITY.json`. SHA-256 vérifiés == `ASSET-INTEGRITY.json`. Poids : 2928 / 3584 / 17032 / 23230 o — tous ≤ 30 Ko. **Non régénérés / non recompressés / non renommés.** |
| Renderer | `DiodePart.jsx` : `<div class="part-diode"><picture><source type="image/webp" srcSet 1x/3x><img src=…3x.png srcSet …pointer-events:none></picture></div>` — patron `ResistorPart.jsx`, dimensions via `getComponentDef("DIODE")` (84×30), aucun `<svg>`/`<defs>`/gradient. |
| Registre | `{ type: 'DIODE', component: DiodePart, visual: { backend: 'raster' } }` — `getComponentPresentation('DIODE')` → `{ backend: 'raster', bareBody: true, markerless: true }`. |
| Renderer central | **inchangé** — chrome (`data-bare-body`) et masquage du marqueur (`hideVisualMarker`) dérivés automatiquement du backend par le mécanisme `MB-VIS-INDUSTRIAL-001`. Aucun `type === "DIODE"`, aucune règle CSS `:has(.part-diode)`, aucun `!important`, aucun z-index. |
| Géométrie fonctionnelle | boîte **84×30**, pins **anode(0,15) / cathode(84,15)** — inchangées (`componentDefinitions.js` non touché). |
| Tests | ciblé : `DiodePart.raster.test.jsx` (11) + `renderQualityGate` T10 (RESISTOR + DIODE) + `visualContract` + `partDimensions*` + `RealisticRenderers` + `circuitComponentRasterChrome` + `ResistorPart.raster` + `componentLibraryRolloutGate` → **9 fichiers / 321 tests, 100 % PASS**. Suite complète : **1620 pass / 16 fail (1636)** — base `6277d99` : 1615 / 16 (1631) → **+5 tests, 0 nouveau FAIL** ; 10 fichiers en échec identiques à `KNOWN-BROKEN-STATE.md` §3. `tsc -b` exit 0. `npm run build` exit 0. |
| Test SVG V0 | `DiodePart.uid.test.jsx` (verrouillait `<defs>`/gradients/namespace `uid`) → **remplacé** par `DiodePart.raster.test.jsx` (couvre les 8 points requis). |
| T10 générique | rendu **tolérant au schéma** : `manifest.type` ou `manifest.component` ; `manifest.assets[]` ou `manifest.variants[]` ; `canonical` ou `canonicalBox` ; `ASSET-INTEGRITY.json` optionnel (cross-check octets + sha256) ; dimensions et poids lus sur les **fichiers réels**. RESISTOR et DIODE couverts par le même test, sans les nommer. |

**Verdict d'intégration : PASS — DIODE raster intégré, zéro régression, zéro hack.**

---

## 1. Audit read-only (Phase 0 du protocole)

### A. Infrastructure fonctionnelle existante
`frontend/src/config/componentDefinitions.js` — **complète, canonique, source de vérité, non modifiée** :
- boîte : **84 × 30** ;
- pins : **anode** `dx=0, dy=15` · **cathode** `dx=84, dy=15` (`PIN_PRESENTATION_BY_TYPE.DIODE`) ;
- enregistrée dans `PALETTE_ITEMS`.

### B. Ancien renderer visuel existant
`frontend/src/components/parts/DiodePart.jsx` — SVG **volumétrique** (ticket historique `MB-VIS-LED-012`, commit `43db4ef`, PHASE V0 pré-industrialisation) : `<defs>` avec 4 `linearGradient` **namespacés par `uid`** (pattern identique à l'ancien RESISTOR SVG `b964a86`), corps résine sombre, bague de cathode métallique côté `dx=84` (cohérent avec le pin cathode), pattes rondes, marquage « 1N4148 » décoratif. `uid` seule prop consommée. Aucun `type === "DIODE"`, aucun couplage au renderer central.

### C. Tests existants
- `frontend/src/components/parts/__tests__/DiodePart.uid.test.jsx` — **7 tests**, verrouille le contrat de namespace SVG (ids dérivés de `uid`, aucun id statique, déterminisme). **Ce contrat deviendrait obsolète si DIODE passait au raster** (plus de `<defs>`/gradients/ids).
- Couverture générique (non spécifique DIODE) : `RealisticRenderers.test.jsx` (aria-label « Diode », dims `<svg>`), `partDimensionsCanonical.test.jsx` / `partDimensionsGuard.test.js` (DIODE dans `SVG_PARTS`/`PART_FILES`, dérivé du registre depuis `MB-VIS-INDUSTRIAL-001` — **aucune liste codée en dur**), `renderQualityGate.test.jsx` (T2/T3/T8/T9, tous types).
- `frontend/src/__tests__/models/DiodeModel.test.js` — modèle électrique (`simulator/`), **hors périmètre visuel**, non inspecté au-delà de sa présence.

### D. Assets existants
**Aucun.** `frontend/public/assets/components/` ne contient que `resistor/`. Aucun fichier `diode.*` dans le dépôt, dans l'historique Git (`git log --all -- '**/diode*'` néant hors code source), ni dans le scratchpad de session.

### E. Intégration registre existante
`frontend/src/visualization/defaultRegistrations.js` ligne 71 :
```js
{ type: 'DIODE', component: DiodePart },
```
**Aucun champ `visual`.** Conséquence (mécanisme `MB-VIS-INDUSTRIAL-001`) : `getComponentPresentation('DIODE')` → `resolvePresentation(undefined)` → `{ backend: 'svg', bareBody: false, markerless: false }` — comportement générique par défaut, **identique aux 13 autres types non déclarés**. Confirmé par lecture directe de `resolvePresentation()` (`visualContract.js`) ; aucune branche `type === "DIODE"` nulle part (grep, §5).

### F. Ce qui manque réellement
1. **Les 4 fichiers d'asset raster** `diode.default.{1x,3x}.{webp,png}` — production externe (hors agent).
2. Une déclaration `visual: { backend: 'raster' }` sur l'entrée `DIODE` de `defaultRegistrations.js` — **à ajouter seulement après** validation de l'asset (sinon rendu cassé : `<img>` vers un fichier inexistant).
3. Un `manifest.json` (`frontend/public/assets/components/diode/`) une fois l'asset validé (garde `renderQualityGate` T10).
4. Le remplacement de `DiodePart.jsx` par la forme `<picture>/<img>` (patron `ResistorPart.jsx`).
5. La mise à jour de `DiodePart.uid.test.jsx` (obsolète pour un backend raster) par un test raster dédié, sur le modèle de `ResistorPart.raster.test.jsx`.

---

## 2. Proposition technique (Phase 1)

DIODE appartient à la famille **« axial-leaded horizontal »** avec RESISTOR (`docs/pmo/standards/VISUAL-COMPONENT-PROTOCOL.md`, table des familles — **~95 % de réutilisation attendue** de la méthode RESISTOR) : leads horizontaux, 2 pins, aucun état visuel, `FILL_FACTOR.AXIAL_LEADED = 0.62`.

Cible retenue, **conditionnée à la production de l'asset** : `visual: { backend: 'raster' }`, mécanisme du registre déclaratif industrialisé — **aucune adaptation du renderer central spécifique à DIODE** (chrome wrapper et markerless sont déjà génériques depuis `MB-VIS-INDUSTRIAL-001` : `.circuit-component__body[data-bare-body]` + `hideVisualMarker` dérivé, tous deux **automatiquement dérivés** dès que `backend: 'raster'` est déclaré — aucune règle CSS ni condition à écrire).

### Invariants fonctionnels vérifiés — NE SERONT PAS MODIFIÉS
| Invariant | Source | Valeur |
|---|---|---|
| boîte canonique | `componentDefinitions.js` | 84 × 30 |
| pins | `componentDefinitions.js` | anode(0,15) / cathode(84,15) |
| hitbox / drag / sélection | `CircuitComponent.jsx` (générique, inchangé) | dérivés de `def.width/height`, aucune dépendance au backend |
| câblage | `Pin.jsx` (générique, inchangé) | `<button>` toujours dans le DOM, cliquable, quel que soit `markerless` |
| simulation | `simulator/`, `DiodeModel.js` | non lus au-delà de leur existence — non touchés |

## 3. Asset (Phase 2) — spécification dérivée, AUCUN asset produit

Spécification dérivée **du harnais existant** `deriveComponentAssetSpec("DIODE", { fillFactorKey: "AXIAL_LEADED" })` (`componentAssetValidation.js`, **aucune valeur inventée**) :

```json
{
  "type": "DIODE", "typeKebab": "diode",
  "box": [84, 30], "fillFactorKey": "AXIAL_LEADED", "fillFactor": 0.62,
  "pinAnchors": [{ "id": "anode", "x": 0, "y": 15 }, { "id": "cathode", "x": 84, "y": 15 }],
  "leadAnchorTolerancePx": 0.75,
  "assetDir": "frontend/public/assets/components/diode",
  "states": ["default"], "resolutions": ["1x", "3x"], "formats": ["webp", "png"],
  "expectedFiles": [
    "frontend/public/assets/components/diode/diode.default.1x.webp",
    "frontend/public/assets/components/diode/diode.default.1x.png",
    "frontend/public/assets/components/diode/diode.default.3x.webp",
    "frontend/public/assets/components/diode/diode.default.3x.png"
  ],
  "budget": { "maxKbPerVariant": 30, "maxKbPerVariantComplex": 120, "maxVariants": 8, "maxResolutions": 2, "maxDimensionPx": 1024 }
}
```

Référence physique (`visualContract.SCALE_REFERENCE`, déjà présente, non modifiée) : **1N4148 DO-35**, corps ≈ 4 × 2 mm, pattes comprises ≈ 25 mm, `impliedUnitsPerMm ≈ 3.4` — cohérent avec le cluster des passifs axiaux (3.0–3.5) dont RESISTOR fait partie (3.4).

### Cahier des charges pour la production externe (dérivé, cohérent avec RESISTOR validé et RENDER-010)
- **Silhouette** : corps cylindrique **verre** (`MATERIALS.GLASS`, `transmission: 0.9`, spéculaire miroir), pas résine opaque — DIODE de verre DO-35 réelle, cohérent avec `1N4148`. *(Note : l'actuel `DiodePart.jsx` SVG dessine un corps résine sombre opaque — c'est un choix du prototype SVG V0, pas une contrainte du contrat visuel ; à trancher explicitement par le CSA pour la production raster : verre transparent (fidèle au 1N4148) ou résine opaque (cohérence visuelle avec le SVG existant). **Point à valider avant production**, non tranché par ce ticket.)*
- **Bague de cathode** : anneau métallique net, positionné côté `dx=84` (cathode), cohérent avec le pin réel — **jamais dessinée à l'envers**.
- **Leads** : `MATERIALS.METAL_LEAD`, cylindriques, horizontaux, terminaison = rayon du lead (règle AMENDMENT-001 §5, réutilisable telle quelle), extrémités sur anode(0,15)/cathode(84,15) après mise à l'échelle, tolérance 0.75 u canvas @1×.
- **Lumière / ombre** : `LIGHTING`/`CONTACT_SHADOW` du contrat — identiques à RESISTOR (rig réutilisable tel quel, §3.4 de `MB-VIS-PROTOTYPE-001A-resistor.md`).
- **Alpha / cadre** : mêmes interdits que `CSA-AMENDMENT-001` §6 (aucun rectangle, aucun point de pin dans l'image, aucune planche multi-vues).
- **Dimensions cibles provisoires** (indicatif, **à confirmer par mesure lors de la validation**, comme pour RESISTOR §2 de `001A`) : en reprenant le ratio d'oversampling observé sur l'asset RESISTOR validé (`170×57` pour une boîte `84×28`, soit ≈ ×2.02) appliqué à la boîte DIODE `84×30` → **@1x ≈ 170×61 px**, **@3x ≈ 510×182 px** (ratio ≈ 2.8:1, cohérent avec 84:30). Valeur indicative uniquement — non contractuelle.

**Aucun asset n'est produit ni fabriqué par ce ticket.** Conformément au protocole (Phase 2 = production externe, hors agent) et à la règle explicite de la mission : *« Ne fabrique pas un faux asset technique approximatif juste pour faire passer les tests. »*

## 4. Intégration (Phase 3) — NON RÉALISÉE

**STOP documenté** conformément à l'instruction de la mission (§3) : *« Si une modification générique de l'infrastructure est absolument nécessaire, STOP et documente-la avant de la faire. »* Ici, aucune modification générique n'est nécessaire (le mécanisme déclaratif de `MB-VIS-INDUSTRIAL-001` couvre déjà DIODE sans code supplémentaire) — c'est l'**asset** qui manque, pas l'architecture. Tant qu'il n'existe pas :
- `DiodePart.jsx` **n'est pas modifié** (le convertir sans asset produirait un `<img>` cassé) ;
- `defaultRegistrations.js` **ne reçoit pas** `visual: { backend: 'raster' }` pour DIODE (le déclarer sans asset romprait le rendu réel du composant, régression fonctionnelle certaine) ;
- `DiodePart.uid.test.jsx` **n'est pas touché** (le contrat SVG qu'il verrouille reste exact tant que le renderer reste SVG).

## 5. Contrôle anti-hack (Phase 5)

| Recherche | Résultat |
|---|---|
| `type === "DIODE"` | **0** occurrence (grep exhaustif `frontend/src`) |
| `type === "RESISTOR"` | **0** |
| `:has(.part-diode)` / `:has(> .part-diode)` | **0** |
| `:has(.part-resistor)` | **0** fonctionnel (uniquement en commentaires historiques, cf. `MB-VIS-INDUSTRIAL-001`) |
| règle CSS spécifique diode | **0** — aucune créée |
| logique spéciale dans `CircuitComponent.jsx` | **0** — fichier non touché |
| `!important` nouveau | **0** — aucun fichier de ce ticket modifié |
| z-index arbitraire nouveau | **0** |

`getComponentPresentation('DIODE')` = `{ backend: 'svg', bareBody: false, markerless: false }` — **identique aux 13 autres types non déclarés raster**, prouvant que l'industrialisation ne dégrade ni ne modifie DIODE tant qu'aucune déclaration `visual` n'est ajoutée.

## 6. Tests (Phase 4 / Phase 10)

Commande canonique : `npx vitest run --config src/simulator/vitest.config.ts` (depuis `frontend/`).

| Portée | Résultat |
|---|---|
| Ciblé : `DiodePart.uid.test.jsx`, `RealisticRenderers.test.jsx`, `partDimensionsCanonical.test.jsx`, `partDimensionsGuard.test.js`, `renderQualityGate.test.jsx`, `visualContract.test.js`, `circuitComponentRasterChrome.test.jsx`, `models/DiodeModel.test.js` | **8 fichiers / 302 tests — 100 % PASS** |
| Suite complète — avant ce ticket (base `db24f72`) | 1615 pass / **16 fail** (1631) |
| Suite complète — après (aucun code modifié) | **1615 pass / 16 fail (1631) — strictement identique** |
| Fichiers en échec | **10, identiques** à `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md` §3 (géométrie breadboard / MB-VIS-LED-V5) — aucun lié à DIODE |
| Nouveaux FAIL | **0** |
| Régressions | **0** |
| `npx tsc -b` | **exit 0** |
| `npm run build` | **exit 0** (build vert depuis le correctif `Breadboard.css` de `MB-VIS-INDUSTRIAL-001`) |

> **Note :** les §1–§6 ci-dessus décrivent l'**état d'audit** (avant 002B, `getComponentPresentation('DIODE')` valait alors `{ backend: 'svg', … }`). L'état livré est celui du §0 ci-dessus.

## 7. Conformité `VISUAL-COMPONENT-PROTOCOL.md` (après 002B)

| Phase | Statut |
|---|---|
| 0 — Audit renderer existant | ✅ (§1) |
| 1 — Référence visuelle | ✅ cahier des charges dérivé (§3) ; matériau tranché à la production externe (verre translucide 1N4148, cohérent `MATERIALS.GLASS`) |
| 2 — Production / choix asset | ✅ paquet produit et vérifié en externe (`ASSET-INTEGRITY.json`) |
| 3 — Validation pixel | ✅ octets/sha256/dimensions/alpha vérifiés (probe Node + `renderQualityGate` T10) |
| 4 — Validation géométrique | ✅ 170×61 / 510×182 (`@3x = 3×@1x ± 1 px`), ≤ 1024 px ; pins anode(0,15)/cathode(84,15) inchangés |
| 5 — Intégration | ✅ `DiodePart.jsx` raster + `visual: { backend: 'raster' }` + `DiodePart.raster.test.jsx` |
| 6 — Artefacts wrapper | ✅ automatique (`data-bare-body` dérivé — aucune règle CSS ajoutée) |
| 7 — Pin / câblage | ✅ `hideVisualMarker` dérivé (`opacity:0`), `<button>` conservé, bubbling wrapper testé |
| 8 — Breadboard | ✅ aucun fichier `Breadboard.*` touché |
| 9 — Zoom | via mécanisme générique (transform CSS unique), non re-mesuré navigateur dans cette passe |
| 10 — Tests / tsc / build | ✅ 321 ciblés PASS, 1620/1636 suite, `tsc` 0, `build` 0, 0 nouveau FAIL |
| 11 — CSA VISUAL GO | ⏳ à confirmer par le CSA sur ce livrable |
| 12 — Versionnage | ✅ commit dédié `MB-VIS-PROTOTYPE-002` + push |

## 8. Limitations

- **Phase 9 (contrôle navigateur des zooms 0.5×/1×/2×)** non ré-exécutée dans cette passe : DIODE hérite du mécanisme générique déjà validé au navigateur pour RESISTOR (transform CSS unique, aucun recalcul par zoom). À confirmer par le CSA si un contrôle visuel navigateur est exigé avant GO.
- Le manifeste DIODE (`component`/`canonical`/`variants` + `ASSET-INTEGRITY.json`) suit un schéma différent du manifeste RESISTOR (`type`/`canonicalBox`/`assets`) que j'avais rédigé en consolidation. `renderQualityGate` T10 a été rendu **tolérant aux deux schémas** ; une harmonisation ultérieure du manifeste RESISTOR sur le schéma DIODE (plus structuré) reste une dette documentaire mineure, hors périmètre de ce ticket.

## 9. Verdict

**PASS — DIODE intégré au backend raster déclaratif (`MB-VIS-PROTOTYPE-002` / 002B).**
Assets vérifiés, renderer converti, registre déclaratif, **aucune modification du renderer central**, géométrie fonctionnelle intacte (84×30 ; anode(0,15)/cathode(84,15)), `simulator/*` non touché, 0 hack (`type === "DIODE"` / `:has(.part-diode)` / `!important` / z-index : 0), 0 nouvelle régression (1620/1636, 16 FAIL historiques inchangés), `tsc` et `build` verts.

**Composant suivant : NE PAS enchaîner sur LED.** `MB-VIS-PROTOTYPE-002` est finalisé ; la mission s'arrête ici, conformément à la directive reçue.
