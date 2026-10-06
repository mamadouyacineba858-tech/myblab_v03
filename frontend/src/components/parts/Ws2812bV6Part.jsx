import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/ws2812b-v6/'

// A12-NEOPIXEL-CANVAS-RUNTIME-001 : fenetre lumineuse = lentille circulaire du raster FROZEN,
// mesuree dans le repere 1x 72x72 (lentille x 21..55, y 16..49). Le disque reste dans le body
// (x 17..62) et loin des quatre contacts (x 0 / x 72) ; la box et la geometrie electrique ne bougent pas.
const LENS = { cx: 38, cy: 33, radius: 17 }
// Opacite Level-1 : plancher lisible + part lineaire en max(r, g, b) / 255 (aucun modele optique).
const MIN_OPACITY = 0.35
const OPACITY_SPAN = 0.6
const LENS_MASK = 'radial-gradient(circle closest-side, #000 45%, transparent 100%)'

/**
 * A12-NEOPIXEL — raster CSA FROZEN WORLDSEMI WS2812B-V6 (5050 SMD), 72x72, + Visual State RGB dynamique.
 * Renderer purement presentationnel : il recoit la couleur latchee deja projetee ({ r, g, b, latched },
 * Visual State Registry) et la superpose au raster inchange ; le protocole reste hors Presentation.
 * Eteint (non latche ou noir) : aucun overlay, aspect raster statique strict.
 */
export function Ws2812bV6Part({ r = 0, g = 0, b = 0, latched = false } = {}) {
  const { width, height } = getComponentDef('WS2812B_V6')
  const intensity = latched ? Math.max(r, g, b) / 255 : 0
  const emitting = intensity > 0
  return (
    <div
      className="part-ws2812b-v6"
      aria-label="NeoPixel — WS2812B-V6 (WORLDSEMI)"
      data-emitting={emitting ? 'true' : 'false'}
      style={{ position: 'relative', width, height }}
    >
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}ws2812b-v6.default.1x.webp 1x, ${ASSET_DIR}ws2812b-v6.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}ws2812b-v6.default.1x.png`}
          srcSet={`${ASSET_DIR}ws2812b-v6.default.1x.png 1x, ${ASSET_DIR}ws2812b-v6.default.3x.png 3x`}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden={true}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
        />
      </picture>
      {emitting && (
        <div className="part-ws2812b-v6__emission" aria-hidden={true} data-rgb={`${r},${g},${b}`} style={emissionStyle(r, g, b, intensity)} />
      )}
    </div>
  )
}

/** Disque colore sur la lentille : couleur = r/g/b tels quels, bord adouci par masque radial. */
function emissionStyle(r, g, b, intensity) {
  return {
    position: 'absolute',
    left: LENS.cx - LENS.radius,
    top: LENS.cy - LENS.radius,
    width: 2 * LENS.radius,
    height: 2 * LENS.radius,
    borderRadius: '50%',
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    opacity: Math.round((MIN_OPACITY + OPACITY_SPAN * intensity) * 1000) / 1000,
    maskImage: LENS_MASK,
    WebkitMaskImage: LENS_MASK,
    pointerEvents: 'none',
  }
}
