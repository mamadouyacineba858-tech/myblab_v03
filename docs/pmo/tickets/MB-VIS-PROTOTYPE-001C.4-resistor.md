# MB-VIS-PROTOTYPE-001C.4 — RESISTOR — Neutralisation des marqueurs aux extrémités des leads

**Statut :** Historique — verdict **PASS — RESISTOR INSERTION HOLES CLEAN**. Dernière étape du parcours RESISTOR ; état visuel **validé par le CSA**.
**Nature :** document de reconstitution (transcrit a posteriori par `MB-VIS-RESISTOR-CONSOLIDATION-001`).
**Base Git :** `6759e183a1caae86abb04c4735f3909572ebb9ad`.
**Antécédent :** `MB-VIS-PROTOTYPE-001C.2` (PASS — RESISTOR CLEAN RENDER).
**Note :** il n'existe pas de `001C.3` (le parcours passe de `001C.2` à `001C.4`).

---

## 1. Objectif (une correction, strictement limitée)

Occulter visuellement les **deux cercles** visibles exactement aux extrémités gauche/droite des pattes du RESISTOR, de sorte que le rendu passe de `○──── RESISTOR ────○` à `────── RESISTOR ──────`.

Interdits : refaire l'asset ; modifier `Breadboard.jsx` / `Breadboard.css` / `holeAt()` / la génération/position/nombre des trous / le z-index breadboard ; supprimer ou masquer globalement des trous ; ajouter une condition générale ; toucher `componentDefinitions.js` / `Pin.jsx` / `SimulationCanvas.jsx` / `simulator/*` / `geometry.js` ; modifier les dimensions 84×28 ou A=(0,14)/B=(84,14) ; ajouter rectangle / fond opaque / carte / `!important` / z-index arbitraire / pseudo-élément « cap » / classe temporaire.

## 2. Inspection — cause exacte [FAIT OBSERVÉ]

Les « deux cercles » sont **les marqueurs visuels du `<Pin>`** :
- `frontend/src/canvas/Pin.jsx` rend `<button className="myblab-pin">` par pin ;
- `frontend/src/canvas/Pin.css` : `.myblab-pin { width:12px; height:12px; border:2px solid #94a3b8; border-radius:50%; background:#1e293b; z-index:10 }` ;
- `opacity` posé en **inline style** par `Pin.jsx` (`opacity: hideVisualMarker ? 0 : 1`) ; `hideVisualMarker` n'est mis à `true` que pour `type === "LED"` (dans `CircuitComponent.jsx`).
- Rendus exactement à `A=(0,14)` et `B=(84,14)`, **z-index 10** → au-dessus de l'asset raster (z-index composant 5) **et** au-dessus des trous breadboard (z-index 1).

Le lead métallique de l'asset est déjà peint jusqu'au bord (1ᵉʳ/dernier pixel opaque de la ligne médiane à x=0 / x=169). Le seul élément qui dessine encore un « trou » sombre à la pointe du lead est donc le marqueur `.myblab-pin`.

## 3. Faux départs rencontrés (à ne pas reproduire)

| Faux départ | Cause | Correction |
|---|---|---|
| « ce sont des trous breadboard `--bus-active` » | conclusion sur l'apparence sans `elementFromPoint` + z-index | le topmost est `.myblab-pin` (z10) ; il *masque* le trou dessous |
| `opacity: 0` en CSS | `Pin.jsx` pose `opacity:1` en **inline style** → bat toute règle de feuille sans `!important` | passer par `background` / `border` / `box-shadow` (non posés en inline) |
| `border-color: transparent` (longhand) | ne bat pas fiablement `border: 2px solid …` (shorthand) + artefact de transition | `border: 0` (shorthand contre shorthand) |
| pseudo-éléments `::before/::after` « lead cap » avec pourcentages | nombres magiques = hack interdit | revenir à la neutralisation simple du marqueur |

## 4. Correction appliquée

Une **seule règle CSS déclarative**, locale au RESISTOR, ajoutée dans `CircuitComponent.css` (même motif `:has()` que `001C.2`) :

```css
.circuit-component:has(.part-resistor) .myblab-pin {
  background: transparent;
  border: 0;
  box-shadow: none;
}
```

- même effet visuel que `hideVisualMarker` (déjà appliqué à la LED) mais **par CSS**, sans branche `type === "…"` dans la couche de rendu (garde `renderQualityGate` T6 préservé) et **sans toucher le système breadboard** ;
- le `<button>` reste dans le DOM : `opacity` inchangée (inline `opacity:1`), `pointer-events` intacts, dimensions/position inchangées → **câblage (clic), drag et sélection ne changent pas** ;
- comme pour la LED, le retour visuel de survol / *pending* / *connecté* n'est plus rendu sur les pins du RESISTOR ; le clic de câblage reste fonctionnel ;
- aucun trou de breadboard n'est modifié ; les trous voisins du RESISTOR restent rendus normalement par `Breadboard.jsx`.

## 5. Vérifications navigateur [FAIT OBSERVÉ]

| Contrôle | Résultat |
|---|---|
| `.myblab-pin` après règle | `background rgba(0,0,0,0)`, `border 0px none`, `boxShadow none`, `opacity 1`, `12px`, `z-index 10`, `pointer-events auto` |
| Cercles sombres aux extrémités | disparus (avant/après comparés) |
| Câblage | clic pin A → classe `myblab-pin--pending` ; clic pin B → **`🔌 Fils : 1`** (fil créé et rendu) |
| Drag | `left:202 top:180` → `left:350 top:300` (`moved = true`) ; pins suivent à 0/14 & 84/14 ; règle `:has` matche toujours après drag |
| Sélection | `outline: rgb(34,197,94) solid 2px` sur `.circuit-component` |
| Zoom | marqueurs neutralisés à 0.5× / 1× / 2× (règle CSS, indépendante du `scale()`) |
| Breadboard sans RESISTOR | 420 trous rendus normalement (règle `:has(.part-resistor)` ne matche rien) |

## 6. Fichiers modifiés
| Fichier | Nature |
|---|---|
| `frontend/src/canvas/CircuitComponent.css` | + 1 règle `.circuit-component:has(.part-resistor) .myblab-pin` + commentaire |
| `frontend/src/canvas/__tests__/circuitComponentRasterChrome.test.js` | + 1 `describe` (4 tests → 8 au total) : présence/contenu de la règle marqueur ; la règle NE touche PAS `opacity`/`pointer-events`/taille (câblage préservé) ; `Pin.css` de base intact ; aucune classe `.breadboard*` dans le bloc |

## 7. Fichiers NON modifiés
`Pin.jsx`, `Pin.css`, `CircuitComponent.jsx`, `Breadboard.jsx`, `Breadboard.css`, `componentDefinitions.js`, `simulator/*`, les 4 assets.

## 8. Limitation

Après neutralisation du marqueur, la coloration propre du breadboard (`--bus-active` / `--occupied`, `#d97706` / `#16a34a`, Ø 6 px) sur les 2 trous de rail où les leads se connectent reste faiblement visible là où la marge transparente de l'asset ne la couvre pas. Ces trous sont **rendus par `Breadboard.jsx`** (interdit de modifier), ont la taille/le style de tous les autres trous, et indiquent correctement le point de connexion. Les supprimer imposerait de modifier le rendu des trous breadboard ou l'asset — les deux interdits.

## 9. Verdict

**PASS — RESISTOR INSERTION HOLES CLEAN.** État visuel RESISTOR **validé par le CSA**. Aucun commit par ce ticket (versionnage : `MB-VIS-RESISTOR-CONSOLIDATION-001`).
