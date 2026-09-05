# Lead Anchor Probe — MB-VIS-CONTACT-FOUNDATION-001

Outil de **mesure** (jamais de définition) du point de contact physique réel
d'un asset raster de composant, pour comparaison contre
`spec.pinAnchors` (`frontend/src/visualization/assetValidation/componentAssetValidation.js`,
dérivé exclusivement de `componentDefinitions.js` /
`getPinPresentationPosition()`).

**Ce script ne définit jamais de coordonnée attendue.** Il mesure un fichier
image réel (alpha réel des pixels) et produit un `measuredPins` prêt à être
passé à `validateLeadAnchors(spec, measuredPins)`. Aucune troisième source de
vérité géométrique n'est créée (ADR-014, INV-PIN-007) — la sonde ne fait que
fournir la preuve empirique qu'un pin de présentation coïncide (ou non) avec
le pixel réellement opaque de l'asset livré.

## Pourquoi un script navigateur, pas un utilitaire Node

Le dépôt ne porte aucune dépendance de décodage d'image côté Node (pas de
`sharp`/`pngjs`/`jimp`/`canvas` — vérifié `frontend/package.json`) — en
ajouter une pour ce seul usage aurait été hors du périmètre strictement
nécessaire de ce ticket. Les navigateurs modernes décodent PNG/WebP
nativement via `createImageBitmap()` + `<canvas>.getImageData()` : ce script
s'exécute donc dans la console DevTools (ou via un outil d'automatisation de
navigateur) pendant que le dev server sert `frontend/public/assets/`, sans
aucune dépendance nouvelle.

## Méthode

Pour chaque pin déclaré (`componentDefinitions.js` + override éventuel de
`pinPresentationGeometry.js`) :

1. convertir la coordonnée canonique (`dx`,`dy`) en pixel attendu via le
   ratio RÉEL pixels-de-l'image / unités-canoniques (`bmp.width / def.width`,
   `bmp.height / def.height`) — **jamais** en supposant `1 unité = 1 pixel** ;
2. si la coordonnée tombe sur un bord de la boîte (`dx∈{0,width}` ou
   `dy∈{0,height}`), balayer la ligne/colonne entière pour trouver le premier
   pixel opaque (`alpha ≥ 32`) depuis ce bord — c'est la convention des
   pattes/fils qui rejoignent le bord de la boîte canonique (passifs axiaux,
   fils de sortie) ;
3. sinon, recherche du pixel opaque le plus proche par expansion en anneaux
   (composants dont le contact est en retrait du bord, ex. override POWER) ;
4. reconvertir le pixel trouvé en unités canoniques (division par le même
   ratio) et comparer à la coordonnée attendue.

## Script (à coller dans la console DevTools, page servie par le dev server)

```js
async function probeComponent(kebab, state, canonicalWidth, canonicalHeight, pins, res = '1x') {
  const resp = await fetch(`/assets/components/${kebab}/${kebab}.${state}.${res}.png`);
  const bmp = await createImageBitmap(await resp.blob());
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  const img = ctx.getImageData(0, 0, bmp.width, bmp.height);
  const alphaAt = (x, y) => (x < 0 || y < 0 || x >= img.width || y >= img.height) ? 0 : img.data[(y * img.width + x) * 4 + 3];
  const pxX = bmp.width / canonicalWidth, pxY = bmp.height / canonicalHeight;
  const measuredPins = {};
  for (const [id, [dx, dy]] of Object.entries(pins)) {
    const ex = dx * pxX, ey = dy * pxY;
    const eps = 0.001;
    let found = null;
    if (dx <= eps) { for (let x = 0; x < img.width; x++) if (alphaAt(x, Math.round(ey)) >= 32) { found = { x, y: Math.round(ey) }; break; } }
    else if (dx >= canonicalWidth - eps) { for (let x = img.width - 1; x >= 0; x--) if (alphaAt(x, Math.round(ey)) >= 32) { found = { x, y: Math.round(ey) }; break; } }
    else if (dy <= eps) { for (let y = 0; y < img.height; y++) if (alphaAt(Math.round(ex), y) >= 32) { found = { x: Math.round(ex), y }; break; } }
    else if (dy >= canonicalHeight - eps) { for (let y = img.height - 1; y >= 0; y--) if (alphaAt(Math.round(ex), y) >= 32) { found = { x: Math.round(ex), y }; break; } }
    if (!found) {
      const cx = Math.round(ex), cy = Math.round(ey);
      const maxR = Math.round(Math.max(img.width, img.height) * 0.5);
      outer: for (let r = 0; r <= maxR; r++) {
        for (let x = cx - r; x <= cx + r; x++) for (const y of [cy - r, cy + r]) if (alphaAt(x, y) >= 32) { found = { x, y }; break outer; }
        for (let y = cy - r + 1; y <= cy + r - 1; y++) for (const x of [cx - r, cx + r]) if (alphaAt(x, y) >= 32) { found = { x, y }; break outer; }
      }
    }
    if (found) measuredPins[id] = { x: found.x / pxX, y: found.y / pxY };
  }
  return measuredPins;
}

// Exemple — BUTTON, état "released", pins déjà corrigés (componentDefinitions.js) :
// await probeComponent('button', 'released', 60, 60, { pin1: [8, 30], pin2: [51, 30] })
```

## Utilisation avec `validateLeadAnchors`

```js
import { deriveComponentAssetSpec, validateLeadAnchors } from '../src/visualization/assetValidation/componentAssetValidation.js'

const spec = deriveComponentAssetSpec('BUTTON', { fillFactorKey: 'BOXED' })
const measuredPins = await probeComponent('button', 'released', 60, 60, { pin1: [8, 30], pin2: [51, 30] })
const result = validateLeadAnchors(spec, measuredPins)
// result.ok === true si chaque delta ≤ spec.leadAnchorTolerancePx (0.75)
```

## Limites connues (disclosed, MB-VIS-CONTACT-FOUNDATION-001)

- **Matériaux semi-transparents** (verre — `DIODE`, lentille LED — `LED`) :
  le seuil alpha≥32 peut détecter le bord du corps translucide avant/après
  le fil métallique réel selon la résolution — mesures 1x et 3x observées
  incohérentes entre elles pour `DIODE` lors de l'audit initial ; à
  confirmer visuellement avant toute correction de `dx/dy` sur ces types.
- **Corps pleins/opaques** (`ARDUINO`, `POWER` — boîtier occupant presque
  toute la boîte) : la recherche par expansion en anneaux peut retourner un
  delta artificiellement nul si le point attendu tombe n'importe où sur une
  zone opaque étendue (carte PCB, façade), sans distinguer spécifiquement
  le contact électrique du reste de la surface. Un delta nul sur ces types
  ne doit pas être interprété comme une precision sub-pixel confirmée.
- Le script suppose un asset PNG avec canal alpha réel (non ré-encodé sans
  alpha) — cohérent avec `ASSET_CONTRACT.format.alpha = true`.
