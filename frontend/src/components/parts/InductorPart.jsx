import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * INDUCTOR — corps raster Founder PASS FROZEN, sans habillage.
 *
 * A4-INDUCTOR : composant à deux bornes NON polarisées A/B, corps entier
 * (aucune fenêtre de découpe / clip-path) — contrairement à DIODE, le
 * raster livré ne cuit aucun prolongement métallique externe à masquer : les
 * deux pattes fonctionnelles sont entièrement synthétiques, dessinées par
 * AssemblyLeadsLayer depuis les racines mesurées jusqu'aux PhysicalContacts
 * (voir visualization/assemblyProfiles.js). Aucun marquage dynamique (à la
 * différence de CAPACITOR/THERMISTOR) : l'asset FROZEN est rendu tel quel.
 */
const ASSET_DIR = '/assets/components/inductor'
const WEBP_SRCSET = `${ASSET_DIR}/inductor.default.1x.webp 1x, ${ASSET_DIR}/inductor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/inductor.default.1x.png 1x, ${ASSET_DIR}/inductor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/inductor.default.3x.png`

export function InductorPart() {
  const def = getComponentDef('INDUCTOR')
  const width = def?.width ?? 144
  const height = def?.height ?? 108

  return (
    <div className="part-inductor" aria-label="Inductance">
      <picture className="part-inductor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-inductor__img"
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
