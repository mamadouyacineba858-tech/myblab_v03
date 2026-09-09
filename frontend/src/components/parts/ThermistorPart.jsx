import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Thermistance / THERMISTOR NTC — backend RASTER.
 *
 * FT-C : même stratégie validée sur la LDR. L'asset historique reste utilisé
 * pour la tête NTC ; les anciennes pattes latérales raster sont masquées.
 * AssemblyLeadsLayer rend ensuite deux pattes physiques verticales avec
 * l'entraxe validé LED/LDR de 24 unités, sans modifier l'identité électrique A/B.
 */
const ASSET_DIR = '/assets/components/thermistor'
const WEBP_SRCSET = `${ASSET_DIR}/thermistor.default.1x.webp 1x, ${ASSET_DIR}/thermistor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/thermistor.default.1x.png 1x, ${ASSET_DIR}/thermistor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/thermistor.default.3x.png`

const NATIVE_ASSET_WIDTH = 84
const NATIVE_ASSET_HEIGHT = 36
const SIDE_LEAD_CROP = 24

export function ThermistorPart({ uid } = {}) {
  const def = getComponentDef("THERMISTOR")
  const width = def?.width ?? 84
  const height = def?.height ?? 64

  return (
    <div
      className="part-thermistor"
      aria-label="Thermistance"
      style={{ position: 'relative', width, height }}
    >
      <picture
        className="part-thermistor__picture"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: NATIVE_ASSET_WIDTH,
          height: NATIVE_ASSET_HEIGHT,
          display: 'block',
        }}
      >
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-thermistor__img"
          src={PNG_FALLBACK}
          srcSet={PNG_SRCSET}
          width={NATIVE_ASSET_WIDTH}
          height={NATIVE_ASSET_HEIGHT}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{
            width: NATIVE_ASSET_WIDTH,
            height: NATIVE_ASSET_HEIGHT,
            display: 'block',
            pointerEvents: 'none',
            clipPath: `inset(0 ${SIDE_LEAD_CROP}px 0 ${SIDE_LEAD_CROP}px)`,
          }}
        />
      </picture>
    </div>
  )
}
