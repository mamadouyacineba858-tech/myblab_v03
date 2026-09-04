import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Alimentation / POWER — backend RASTER (MB-VIS-COMP-036).
 *
 * Remplace l'ancien rendu SVG schématique (MB-COMPONENT-LIBRARY-002 :
 * `<rect>` boîtier + `<line>`×4 symbole pile + `<text>`×2 « +5V »/« GND » +
 * `<line>`×2 pattes) par l'asset raster réaliste validé CSA (alimentation DC
 * de laboratoire benchtop : boîtier blanc/gris, façade noire, double
 * affichage V/A, réglages VOLTAGE/CURRENT, interrupteur POWER, bornes
 * rouge/noire/verte ; 1x 70×90 / 3x 210×270, PNG + WebP, RGBA, fond
 * transparent). Intégré via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('POWER')` → wrapper `data-bare-body` + pins
 * `markerless`, sans aucun `type === "POWER"` dans la couche de rendu
 * centrale ni règle CSS spécifique).
 *
 * Patron identique à `ServoPart.jsx` / `NpnTransistorPart.jsx` /
 * `BuzzerPart.jsx` : `frontend/public/` est servi à la racine web →
 * `/assets/components/power/…`, priorité WebP via `<picture>`, fallback
 * PNG, 1x/3x natif via `srcSet`, aucune logique JS de sélection
 * d'écran/densité.
 *
 * Composant STATIQUE — aucune prop dynamique, état unique `default`. Le
 * renderer ne fait qu'afficher l'asset : aucun SVG, aucun canvas, aucun
 * dessin CSS, aucun pseudo-élément, aucun crop runtime, aucun masque CSS,
 * aucun texte ajouté, aucun corps artificiel.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("POWER")` (70×90) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - coordonnées électriques canoniques INCHANGÉES : 5V dx=70/dy=37,
 *    GND dx=58/dy=25 — `componentDefinitions.js` / `canonicalRegistry.js` /
 *    modèle de simulation non touchés ;
 *  - la PROJECTION visuelle des pins sur les 2 bornes réelles du raster
 *    (GND=(22,67) / 5V=(35,67)) est déclarée dans
 *    `utils/pinPresentationGeometry.js` (couche de présentation existante,
 *    même patron que LED / NPN_TRANSISTOR) — elle ne remplace jamais la
 *    position électrique. La borne verte EARTH visible sur l'asset est
 *    purement décorative : elle ne devient pas un pin logique.
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - rendu déterministe, aucun id.
 */
const ASSET_DIR = '/assets/components/power'
const WEBP_SRCSET = `${ASSET_DIR}/power.default.1x.webp 1x, ${ASSET_DIR}/power.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/power.default.1x.png 1x, ${ASSET_DIR}/power.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/power.default.3x.png`

export function PowerPart() {
  const def = getComponentDef('POWER')
  const width = def?.width ?? 70
  const height = def?.height ?? 90

  return (
    <div className="part-power" aria-label="Alimentation">
      <picture className="part-power__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-power__img"
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
