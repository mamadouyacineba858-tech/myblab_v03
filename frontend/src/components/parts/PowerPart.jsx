import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Alimentation DC de laboratoire — backend raster.
 *
 * MB-L1-POWER-001 — Canvas readability :
 * - le Core POWER reste 70×90 et le modèle électrique reste inchangé ;
 * - les PhysicalContacts restent la source de vérité pour le câblage ;
 * - seul le corps visuel est agrandi localement autour de son centre ;
 * - l'asset 3x est forcé pour éviter qu'un navigateur choisisse la variante 1x ;
 * - aucune borne logique supplémentaire n'est créée : la borne verte EARTH
 *   du raster reste décorative.
 *
 * La cible de départ est volontairement 2.5× : le Canvas Gate décidera si un
 * dernier ajustement de taille est nécessaire. Ne pas modifier le Core pour
 * atteindre une cible purement visuelle.
 */
const ASSET_DIR = '/assets/components/power'
const WEBP_3X = `${ASSET_DIR}/power.default.3x.webp`
const PNG_3X = `${ASSET_DIR}/power.default.3x.png`
const APPROVED_CANDIDATE_SCALE = 2.5

export function PowerPart() {
  const def = getComponentDef('POWER')
  const width = def?.width ?? 70
  const height = def?.height ?? 90

  return (
    <div
      className="part-power"
      aria-label="Alimentation"
      data-canvas-scale={APPROVED_CANDIDATE_SCALE}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'visible',
        transform: `scale(${APPROVED_CANDIDATE_SCALE})`,
        transformOrigin: 'center center',
      }}
    >
      <picture className="part-power__picture" data-hires-source="3x-only">
        <source type="image/webp" srcSet={`${WEBP_3X} 1x, ${WEBP_3X} 3x`} />
        <img
          className="part-power__img"
          src={PNG_3X}
          srcSet={`${PNG_3X} 1x, ${PNG_3X} 3x`}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
            imageRendering: 'auto',
            filter: 'contrast(1.06) saturate(1.03)',
          }}
        />
      </picture>
    </div>
  )
}
