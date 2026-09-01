# MB-VIS-PROTOTYPE-002 — DIODE — Audit, spécification de production et statut d'intégration

**Statut : BLOCKED — production externe de l'asset requise.** Aucune régression, aucune modification de code.
**Programme / Épic :** Experience → EXP3 → `ROADMAP_PLATFORM.md` §7.4 (MYBlab Physical/Realistic Visual Engine).
**Antécédents :** `MB-VIS-RENDER-010` (`visualContract.js`), `MB-VIS-INDUSTRIAL-001` (backend déclaratif, commit `db24f72`), `docs/pmo/standards/VISUAL-COMPONENT-PROTOCOL.md`, chaîne RESISTOR (`MB-VIS-PROTOTYPE-001A→001C.4`, `docs/pmo/delivery-reports/MB-VIS-RESISTOR-CONSOLIDATED.md`).
**Base Git :** `db24f72f6ae0e53f4ff4789f338ab747f7d6dc74`.
**Numérotation :** ce ticket occupe l'identifiant `MB-VIS-PROTOTYPE-002`, réattribué à DIODE par la séquence recommandée post-consolidation (`ROADMAP_PLATFORM.md` §7.4, `VISUAL-COMPONENT-PROTOCOL.md` « Ordre recommandé » : CAPITALISATION → INDUSTRIAL-001 → **DIODE** → LED → …), en lieu et place de l'affectation originelle de `MB-VIS-RENDER-010` §6 (`002 = LED`), explicitement révisée par l'amendement de re-séquencement.

**Ce ticket NE FAIT PAS** : aucun rendu Blender, aucun asset produit ou fabriqué, aucune modification de `DiodePart.jsx`, `defaultRegistrations.js`, `componentDefinitions.js`, `CircuitComponent.jsx`, `CircuitComponent.css`, `Pin.jsx`, `Breadboard.*`, `simulator/*`. Aucune dépendance ajoutée.

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

## 7. Conformité `VISUAL-COMPONENT-PROTOCOL.md`

| Phase | Statut |
|---|---|
| 0 — Audit renderer existant | ✅ fait (ce document, §1) |
| 1 — Référence visuelle | ⚠️ partielle — cahier des charges dérivé (§3), **1 point à trancher par le CSA** : verre vs résine (§3) |
| 2 — Production / choix asset | ❌ **BLOQUÉ** — aucun asset, production externe requise |
| 3 → 12 | non atteintes (dépendent de la Phase 2) |

## 8. Limitations

- Aucun asset raster DIODE n'existe : ce ticket ne peut pas aller au-delà de la Phase 1 du protocole.
- Le choix matériau verre/résine du corps n'est pas tranché — nécessite une décision CSA avant production externe.
- Les dimensions `@1x`/`@3x` indicatives (§3) sont extrapolées du ratio observé sur l'asset RESISTOR validé, non mesurées sur un asset réel — à confirmer comme pour RESISTOR (§2 de `001A`, confirmé en `001B`).

## 9. Verdict

**BLOCKED — production externe de l'asset requise.** Aucune régression : 1615/1631 tests inchangés, `tsc` et `build` verts, 0 hack introduit, 0 fichier fonctionnel modifié. Le mécanisme déclaratif `MB-VIS-INDUSTRIAL-001` est confirmé **directement réutilisable pour DIODE sans aucune adaptation du renderer central** — seul l'asset manque.

**Prochaine étape :** production externe de `diode.default.{1x,3x}.{webp,png}` (après décision CSA verre/résine), puis validation (`MB-VIS-PROTOTYPE-002B` ou suite de ce ticket, sur le modèle `001B`), puis intégration (`DiodePart.jsx` → `<picture>/<img>`, `visual: { backend: 'raster' }`, `manifest.json`, remplacement de `DiodePart.uid.test.jsx`).

**Composant suivant : NE PAS enchaîner sur LED.** Cette mission s'arrête après DIODE, conformément à la directive reçue.
