import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Transistor NPN — backend RASTER (MB-VIS-COMP-034).
 *
 * Remplace l'ancien rendu SVG schématique (MB-COMPONENT-LIBRARY-002 :
 * `<line>`×3 pattes + `<path>` boîtier + `<line>` méplat + `<text>` « NPN »)
 * par l'asset raster réaliste validé CSA (2N2222 TO-92 face avant, V5 :
 * 1x 90×60 / 3x 270×180, PNG + WebP, RGBA, fond transparent, boîtier noir
 * TO-92, 3 pattes métalliques verticales, marquage physique dans le raster).
 * Intégré via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('NPN_TRANSISTOR')` → wrapper `data-bare-body` +
 * pins `markerless`, sans aucun `type === "NPN_TRANSISTOR"` dans la couche
 * de rendu centrale ni règle CSS spécifique).
 *
 * Patron identique à `BuzzerPart.jsx` / `LedPart.jsx` : `frontend/public/`
 * est servi à la racine web → `/assets/components/npn-transistor/…`,
 * priorité WebP via `<picture>`, fallback PNG, 1x/3x natif via `srcSet`,
 * aucune logique JS de sélection d'écran/densité.
 *
 * Composant STATIQUE — aucune prop dynamique, état unique `default`. Le
 * renderer ne fait qu'afficher l'asset : aucun SVG, aucun canvas, aucun
 * dessin CSS, aucun pseudo-élément, aucun crop runtime, aucun masque CSS,
 * aucun texte ajouté, aucun corps artificiel.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("NPN_TRANSISTOR")` (90×60) —
 *    aucune valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - coordonnées électriques canoniques INCHANGÉES : collector C(45,0),
 *    base B(0,45), emitter E(90,45) — `componentDefinitions.js` /
 *    `canonicalRegistry.js` / modèle de simulation non touchés ;
 *  - la PROJECTION visuelle des pins sur les 3 vraies pattes du raster
 *    (B(32,60) / C(42,60) / E(51,60)) est déclarée dans
 *    `utils/pinPresentationGeometry.js` (couche de présentation existante,
 *    même patron que la LED) — elle ne remplace jamais la position
 *    électrique ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - rendu déterministe, aucun id.
 */
const ASSET_DIR = '/assets/components/npn-transistor'
const WEBP_SRCSET = `${ASSET_DIR}/npn-transistor.default.1x.webp 1x, ${ASSET_DIR}/npn-transistor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/npn-transistor.default.1x.png 1x, ${ASSET_DIR}/npn-transistor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/npn-transistor.default.3x.png`

export function NpnTransistorPart() {
  const def = getComponentDef('NPN_TRANSISTOR')
  const width = def?.width ?? 90
  const height = def?.height ?? 60

  return (
    <div className="part-npn-transistor" aria-label="Transistor NPN">
      <picture className="part-npn-transistor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-npn-transistor__img"
          src={PNG_FALLBACK}
          srcSet={PNG_SRCSET}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
        />
      </picture>
    </div>
  )
}
