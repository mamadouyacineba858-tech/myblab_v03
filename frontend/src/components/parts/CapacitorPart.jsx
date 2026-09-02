import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Condensateur — backend RASTER (MB-VIS-PROTOTYPE-004).
 *
 * Remplace l'ancien rendu SVG volumétrique (MB-VIS-COMP-011 : `<defs>` + 3
 * gradients namespacés par `uid`, corps céramique ambre, marquage « 104 »)
 * par l'asset raster produit et vérifié pour MB-VIS-PROTOTYPE-004, intégré
 * via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('CAPACITOR')` → wrapper `data-bare-body` + pins
 * `markerless`, sans aucun `type === "CAPACITOR"` ni règle CSS spécifique).
 *
 * Patron identique à `ResistorPart.jsx` / `DiodePart.jsx` / `LedPart.jsx` :
 * `frontend/public/` est servi à la racine web → `/assets/components/capacitor/…`,
 * priorité WebP via `<picture>`, fallback PNG, aucune logique JS de sélection
 * d'asset. Composant STATIQUE (état unique `default`) — pas de variante `{state}`.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("CAPACITOR")` (70×40) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins pinA(0,20) / pinB(70,20) : produits par CircuitComponent/Pin,
 *    jamais dessinés dans l'asset ni ici ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - `uid` reste accepté (contrat de props inchangé) mais n'est plus consommé
 *    (plus de `<defs>` à namespacer) → rendu déterministe pour toute instance,
 *    aucune collision d'id entre deux condensateurs simultanés.
 */
const ASSET_DIR = '/assets/components/capacitor'
const WEBP_SRCSET = `${ASSET_DIR}/capacitor.default.1x.webp 1x, ${ASSET_DIR}/capacitor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/capacitor.default.1x.png 1x, ${ASSET_DIR}/capacitor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/capacitor.default.3x.png`

export function CapacitorPart({ uid } = {}) {
  const def = getComponentDef("CAPACITOR")
  const width = def?.width ?? 70
  const height = def?.height ?? 40

  return (
    <div className="part-capacitor" aria-label="Condensateur">
      <picture className="part-capacitor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-capacitor__img"
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
