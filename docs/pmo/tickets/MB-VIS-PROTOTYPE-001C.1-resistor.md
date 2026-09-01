# MB-VIS-PROTOTYPE-001C.1 — RESISTOR — Audit final du rendu raster (lecture seule)

**Statut :** Historique — verdict **BLOCKED — WRAPPER / INTEGRATION ISSUE**.
**Nature :** document de reconstitution (transcrit a posteriori par `MB-VIS-RESISTOR-CONSOLIDATION-001`).
**Base Git :** `6759e183a1caae86abb04c4735f3909572ebb9ad`.
**Périmètre :** audit strict **lecture seule** de `001C` avant acceptation. Aucune modification.

---

## 1. Objectif

Vérifier, avant acceptation de `001C` :
1. git (base, divergence, `diff --check`) ;
2. le diff réel de chaque fichier de test modifié (pourquoi nécessaire ; quelle assertion ancienne est remplacée ; est-ce que cela affaiblit une garantie ; est-ce qu'une régression pourrait passer) ;
3. `ResistorPart.jsx` (aucun vestige SVG, `<img>` conforme, chemins, `pointer-events`, import canonique) ;
4. **le wrapper visuel** : `.circuit-component` / `.circuit-component__body` — background / border / border-radius / box-shadow / padding / overflow / dimensions. Le wrapper ajoute-t-il une apparence qui n'appartient pas à l'asset validé (rectangle sombre, bordure, ombre supplémentaire, cadre, écrasement de la transparence) ? Ne pas modifier `CircuitComponent.jsx` ; si un changement est nécessaire, le signaler comme problème d'architecture pour un futur ticket ;
5. vérification navigateur (hasPicture / hasImg / hasSvg / currentSrc / naturalWidth / naturalHeight / bounding rects ; pins A=(0,14) B=(84,14) ; sélection ; drag ; câblage) ;
6. comparaison asset (`resistor.default.3x.webp`) ↔ affichage réel ;
7. tests non affaiblis (rerun 5 fichiers) ;
8. aucun test général transformé en spécifique RESISTOR pour faire PASS ;
9. build (`tsc -b` puis `npm run build`).

## 2. Constats principaux [FAIT OBSERVÉ]

### §2 — Tests
Les 4 adaptations de test de `001C` sont **légitimes** : toutes découlent de « l'ancien contrat attendait un `<svg>` racine qui n'existe plus pour un renderer raster ». Aucune garantie générale supprimée en silence. Là où une garde **statique** ne pouvait plus s'appliquer (`partDimensionsGuard`, tag `<svg>`), une garde **dynamique** (mutation `partDimensionsCanonical` sur l'`<img>`) préserve la garantie réelle. Le changement `renderQualityGate` T9 est un `if (!svg)` **générique** (aucun littéral `RESISTOR`). Des tests ont été **ajoutés**, pas seulement retirés. → **pas de `NO-GO — TEST REGRESSION`**.

### §3 — `ResistorPart.jsx`
Conforme : aucun `<svg>`/`<line>`/`<rect>`/gradient ; `<picture>`/`<source webp>`/`<img>` ; chemins `/assets/components/resistor/resistor.default.{1x,3x}.{webp,png}` ; `pointer-events:none` ; `draggable={false}` ; aucun handler ; import `getComponentDef` ; `uid` accepté non consommé.

### §4 — Wrapper visuel — **DÉFAUT**
`.circuit-component__body` (calculé, in-app) :
- `background: rgb(26,31,46)` = `#1a1f2e` — **aplat sombre plein** derrière l'asset transparent ;
- `border: 1px solid rgb(51,65,85)` = `#334155` — **cadre visible** ;
- `border-radius: 6px` — **coins arrondis** ;
- `box-shadow: rgba(0,0,0,0.35) 0 4px 12px` — **ombre portée supplémentaire**, distincte de l'ombre de contact cuite dans l'asset.

Ce chrome est appliqué à tous les composants non-LED (LED le neutralise via un `style` inline conditionné à `type === "LED"` dans `CircuitComponent.jsx`). RESISTOR-raster en hérite → **le fond alpha validé au pixel en 001B est écrasé par `#1a1f2e`** et une seconde ombre est ajoutée. **Problème d'architecture à traiter par un futur ticket** ; `CircuitComponent.jsx` non modifié dans cet audit.

### §5 — Navigateur
`hasPicture:true`, `hasImg:true`, `hasSvg:false` ; `currentSrc` = `…/resistor.default.3x.webp` ; pins A `left:0 top:14`, B `left:84 top:14` ; sélection = `outline: rgb(34,197,94) solid 2px` sur `.circuit-component` ; drag OK. Limitation : `img.naturalWidth` reporté `170` alors que `currentSrc` = `3x.webp` (510×171) — quirk de report du pane, non concluant sur les pixels @3x réellement rasterisés.

### §9 — Build
`tsc -b` : **exit 0**. `npm run build` : échec `[lightningcss minify] Unexpected token Semicolon` — **strictement identique** au blocage pré-existant `Breadboard.css` (fichier non modifié). Non corrigé.

## 3. Verdict

**BLOCKED — WRAPPER / INTEGRATION ISSUE.** Le composant raster fonctionne (rendu, WebP @3x servi, pins/drag/sélection intacts, tests légitimes, 0 régression) **mais** `.circuit-component__body` dégrade visiblement le résultat validé (rectangle sombre + bordure + coins arrondis + ombre générique). Correction à faire par un ticket dédié, **sans** modifier `CircuitComponent.jsx` (ajouter un branchement `type === "RESISTOR"` y casserait le garde-fou `renderQualityGate` T6). → traité par `MB-VIS-PROTOTYPE-001C.2`.
