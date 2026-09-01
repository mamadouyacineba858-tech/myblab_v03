# MB-VIS-PROTOTYPE-001C.2 — RESISTOR — Nettoyage visuel ciblé (chrome du wrapper)

**Statut :** Historique — verdict **PASS — RESISTOR CLEAN RENDER**.
**Nature :** document de reconstitution (transcrit a posteriori par `MB-VIS-RESISTOR-CONSOLIDATION-001`).
**Base Git :** `6759e183a1caae86abb04c4735f3909572ebb9ad`.
**Antécédent :** `MB-VIS-PROTOTYPE-001C.1` (BLOCKED — WRAPPER / INTEGRATION ISSUE).

---

## 1. Objectif (deux corrections uniquement)

1. Supprimer, **pour le RESISTOR uniquement**, le rectangle / cadre / ombre générique du wrapper `.circuit-component__body` autour de l'asset raster.
2. Déterminer l'origine des trous / pastilles de breadboard visibles derrière/autour du RESISTOR — **avant** toute modification — et ne les traiter que s'ils proviennent du renderer ou d'un habillage du composant.

Interdits : refaire l'asset ; modifier `componentDefinitions.js` / `Pin.jsx` / `SimulationCanvas.jsx` / `simulator/*` / `geometry.js` ; toucher au système électrique / drag / sélection / câblage ; modifier les dimensions 84×28 ou A=(0,14)/B=(84,14) ; **modifier `Breadboard.css` ou le composant Breadboard** ; supprimer/masquer globalement les trous ; ajouter une condition générale `if (resistor) hide holes`.

## 2. PROBLÈME A — rectangle autour du RESISTOR

### Cause exacte [FAIT OBSERVÉ]
`frontend/src/canvas/CircuitComponent.css`, règle `.circuit-component__body` :
```css
background: #1a1f2e;                          /* rectangle sombre plein */
border: 1px solid #334155;                    /* cadre */
border-radius: 6px;                           /* coins arrondis */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);   /* ombre générique en plus de celle de l'asset */
```
Appliqué au RESISTOR parce que `frontend/src/canvas/CircuitComponent.jsx` ne neutralise ce chrome que pour `type === "LED"` (`style={type === "LED" ? { background:'transparent', border:'0', borderRadius:0, boxShadow:'none' } : undefined}`). Pour RESISTOR le style inline vaut `undefined` → carte sombre complète peinte derrière l'asset transparent.

### Correction appliquée
Une **seule règle CSS déclarative** ajoutée dans `CircuitComponent.css`, ciblant la classe racine stable émise par le renderer (`.part-resistor`) via `:has()` — **aucune** modification de `CircuitComponent.jsx`, **aucune** branche `type === "…"` dans la couche de rendu (garde `renderQualityGate` T6 préservé) :

```css
.circuit-component__body:has(> .part-resistor) {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
```

- `box-sizing: border-box` global → supprimer la bordure n'a **aucun** impact de layout (body reste 84×28) ;
- `display:flex` / centrage / `width|height:100%` conservés ;
- l'ombre **cuite dans l'asset** reste (seul le `box-shadow` du wrapper est retiré).

Vérifié navigateur : `backgroundColor rgba(0,0,0,0)`, `border none 0px`, `borderRadius 0px`, `boxShadow none`, sélecteur `:has(> .part-resistor)` → `matches = true` ; `CSS.supports('selector(:has(*))') = true`.

## 3. PROBLÈME B — trous de breadboard

### Enquête [FAIT OBSERVÉ]
- Élément DOM produisant les trous : `<circle className="breadboard__hole …">` du composant `Breadboard.jsx` (bloc `holes.map`, ~420 trous pour le layout STANDARD_V1), stylé par `Breadboard.css` (`fill:#1e293b; stroke:#cbd5e1; r:3px`), dérivé de `holeAt()`.
- Le renderer RESISTOR ne produit **aucun** trou (`<div.part-resistor><picture><img></picture></div>` — aucun `<svg>`/`<circle>`). L'asset 001B a un fond transparent, zéro trou.
- Aucun habillage ajouté au composant ne produit de trou (le seul habillage était la carte `.circuit-component__body` du Problème A, qui *masquait* des trous, n'en créait pas).
- Stacking : `.circuit-component` z-index 5 + postérieur dans le DOM ; `svg.breadboard` z-index 1 → le RESISTOR peint **au-dessus** (`document.elementFromPoint` sur le RESISTOR → `part-resistor__picture`, jamais un trou). Aucun bug de stacking.
- Pourquoi « derrière / autour » dans la capture : 14 des ~420 trous tombent dans la boîte 84×28 ; le fond **opaque `#1a1f2e`** de la carte (Problème A) les recouvrait → un rectangle sombre « découpé » dans la grille de trous.

### Correction
**Aucune.** Les trous appartiennent à la **breadboard** (légitimes), pas au renderer ni à un habillage → **non retirés** (règle absolue du ticket). Une fois la carte sombre retirée (Problème A), le RESISTOR se pose proprement sur la breadboard, trous visibles autour/entre le corps comme sur une vraie breadboard.

## 4. Fichiers modifiés
| Fichier | Nature |
|---|---|
| `frontend/src/canvas/CircuitComponent.css` | + 1 règle `.circuit-component__body:has(> .part-resistor)` + commentaire |
| `frontend/src/canvas/__tests__/circuitComponentRasterChrome.test.js` | **NOUVEAU** — garde statique (4 tests) : présence + contenu de la règle raster ; règle de **base** `.circuit-component__body` conserve son habillage (aucune suppression globale) ; `CircuitComponent.jsx` garde exactement 2 branches `type === "LED"` |

## 5. Fichiers NON modifiés
`Breadboard.jsx`, `Breadboard.css`, `CircuitComponent.jsx`, `Pin.jsx`, `componentDefinitions.js`, `simulator/*`, les 4 assets.

## 6. Résultat & verdict
Tests ciblés + gardes = verts ; 16 échecs historiques inchangés ; `tsc -b` exit 0 ; `npm run build` échoue uniquement sur `Breadboard.css` pré-existant (`CircuitComponent.css` parse OK sous `lightningcss`).
**Verdict : PASS — RESISTOR CLEAN RENDER.**

## 7. Reste
Deux « cercles » sombres subsistent exactement aux extrémités des leads → traités par `MB-VIS-PROTOTYPE-001C.4`.
