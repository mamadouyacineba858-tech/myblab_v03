import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Photorésistance / LDR — backend RASTER (MB-VIS-PROTOTYPE-005).
 *
 * Remplace l'ancien rendu SVG volumétrique (MB-VIS-LED-013 : `<defs>` + 3
 * gradients namespacés par `uid` — metal / ceramic / face —, piste en créneau
 * en `<path>`) par l'asset raster produit et vérifié pour MB-VIS-PROTOTYPE-005,
 * intégré via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('LDR')` → wrapper `data-bare-body` + pins
 * `markerless`, sans aucun `type === "LDR"` ni règle CSS spécifique).
 *
 * Patron identique à `ResistorPart.jsx` / `DiodePart.jsx` / `LedPart.jsx` /
 * `CapacitorPart.jsx` : `frontend/public/` est servi à la racine web →
 * `/assets/components/ldr/…`, priorité WebP via `<picture>`, fallback PNG,
 * aucune logique JS de sélection d'asset. Composant STATIQUE (état unique
 * `default`) — aucun état ON/OFF, aucune animation, aucun effet CSS.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("LDR")` (84×36) — aucune valeur
 *    recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins A(0,18) / B(84,18) : produits par CircuitComponent/Pin, jamais
 *    dessinés dans l'asset ni ici ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - `uid` reste accepté (contrat de props inchangé) mais n'est plus consommé
 *    (plus de `<defs>` à namespacer) → rendu déterministe pour toute instance,
 *    aucune collision d'id entre deux photorésistances simultanées.
 */
const ASSET_DIR = '/assets/components/ldr'
const WEBP_SRCSET = `${ASSET_DIR}/ldr.default.1x.webp 1x, ${ASSET_DIR}/ldr.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/ldr.default.1x.png 1x, ${ASSET_DIR}/ldr.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/ldr.default.3x.png`

export function LdrPart({ uid } = {}) {
  const def = getComponentDef("LDR")
  const width = def?.width ?? 84
  const height = def?.height ?? 36

  return (
    <div className="part-ldr" aria-label="Photorésistance">
      <picture className="part-ldr__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-ldr__img"
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
