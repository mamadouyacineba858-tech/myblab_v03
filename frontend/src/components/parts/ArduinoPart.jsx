// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Arduino UNO — backend raster.
 *
 * MB-L1-ARDUINO-001 correction Canvas approuvée :
 * - aucun badge/pastille/label artificiel superposé au PCB ;
 * - la lisibilité vient du vrai raster UNO (headers + sérigraphie) ;
 * - taille visuelle de référence : 1.30 × l'ancienne carte Canvas, conforme à
 *   la référence visuelle validée par le Project Lead le 2026-09-14 ;
 * - aucune modification du Document, du modèle électrique ou de la simulation.
 *
 * Le scale est volontairement local au renderer pour cette correction
 * visuelle. La convergence définitive des PhysicalContacts avec une future
 * cartographie complète des headers Arduino sera traitée avec l'extension GPIO
 * et ne doit pas être simulée par des bulles flottantes.
 */
const ASSET_DIR = '/assets/components/arduino'
const WEBP_SRCSET = `${ASSET_DIR}/arduino.default.1x.webp 1x, ${ASSET_DIR}/arduino.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/arduino.default.1x.png 1x, ${ASSET_DIR}/arduino.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/arduino.default.3x.png`
const APPROVED_CANVAS_SCALE = 1.30

export function ArduinoPart() {
  const def = getComponentDef('ARDUINO')
  const width = def?.width ?? 120
  const height = def?.height ?? 140

  return (
    <div
      className="part-arduino"
      aria-label="Arduino UNO"
      data-canvas-scale={APPROVED_CANVAS_SCALE}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'visible',
        transform: `scale(${APPROVED_CANVAS_SCALE})`,
        transformOrigin: 'center center',
      }}
    >
      <picture className="part-arduino__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-arduino__img"
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
