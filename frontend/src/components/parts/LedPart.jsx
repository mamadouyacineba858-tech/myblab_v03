import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel LED — backend RASTER (MB-VIS-PROTOTYPE-003).
 *
 * Remplace l'ancien rendu SVG volumétrique « through-hole » (série
 * MB-VIS-LED V8→V17 : `<defs>` + 6 gradients namespacés par `uid`, glow
 * conditionnel dessiné dans le SVG) par le paquet d'assets raster produit et
 * vérifié pour MB-VIS-PROTOTYPE-003, intégré via le mécanisme déclaratif de
 * MB-VIS-INDUSTRIAL-001 (`defaultRegistrations` → `visual: { backend: 'raster' }`
 * → `getComponentPresentation('LED')` → wrapper `data-bare-body` + pins
 * `markerless`, sans aucun `type === "LED"` ni règle CSS spécifique).
 *
 * Patron identique à `ResistorPart.jsx` / `DiodePart.jsx` : `frontend/public/`
 * est servi à la racine web → `/assets/components/led/…`, priorité WebP via
 * `<picture>`, fallback PNG, aucune logique JS de sélection d'asset.
 *
 * Spécificité LED (premier composant raster à ÉTATS visuels discrets) :
 *  - deux états d'asset, `off` et `on`, chacun décliné @1x/@3x en WebP + PNG ;
 *  - la luminescence de l'état allumé est CUITE dans l'asset `led.on.*`
 *    (aucun `box-shadow` / `filter` / pseudo-élément / glow SVG côté renderer) ;
 *  - l'état provient EXCLUSIVEMENT du système existant : `isOn` est dérivé des
 *    signaux de pins par le Visual State Registry
 *    (`defaultVisualStateRegistrations.js` → `getLedState`) et transmis en prop
 *    par `PartRenderer.jsx` — aucune logique de simulation déplacée ici ;
 *  - le wrapper conserve la classe `.part-led` / `.part-led--on` et l'attribut
 *    `aria-label` (« LED allumée » / « LED éteinte ») du contrat historique.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("LED")` (80×64) — aucune valeur
 *    recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins anode(28,62) / cathode(52,62) : produits par CircuitComponent/Pin,
 *    jamais dessinés dans l'asset ni ici ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - `uid` reste accepté (contrat de props inchangé) mais n'est plus consommé
 *    (plus de `<defs>` à namespacer) → rendu déterministe pour toute instance.
 */
const ASSET_DIR = '/assets/components/led'

const ASSET_SOURCES = {
  off: {
    webp: `${ASSET_DIR}/led.off.1x.webp 1x, ${ASSET_DIR}/led.off.3x.webp 3x`,
    png: `${ASSET_DIR}/led.off.1x.png 1x, ${ASSET_DIR}/led.off.3x.png 3x`,
    fallback: `${ASSET_DIR}/led.off.3x.png`,
  },
  on: {
    webp: `${ASSET_DIR}/led.on.1x.webp 1x, ${ASSET_DIR}/led.on.3x.webp 3x`,
    png: `${ASSET_DIR}/led.on.1x.png 1x, ${ASSET_DIR}/led.on.3x.png 3x`,
    fallback: `${ASSET_DIR}/led.on.3x.png`,
  },
}

export function LedPart({ isOn } = {}) {
  const def = getComponentDef("LED")
  const width = def?.width ?? 80
  const height = def?.height ?? 64
  const source = isOn ? ASSET_SOURCES.on : ASSET_SOURCES.off

  return (
    <div
      className={`part-led ${isOn ? 'part-led--on' : ''}`}
      aria-label={isOn ? 'LED allumée' : 'LED éteinte'}
    >
      <picture className="part-led__picture">
        <source type="image/webp" srcSet={source.webp} />
        <img
          className="part-led__img"
          src={source.fallback}
          srcSet={source.png}
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
