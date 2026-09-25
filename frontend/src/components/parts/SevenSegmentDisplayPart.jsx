import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/seven-segment-sc56-11ewa/'
const BASE = `${ASSET_DIR}seven-segment-sc56-11ewa.default`

/**
 * A10-DISP1 — géométrie d'ÉMISSION interne des segments, repère runtime 72x114. Présentation
 * uniquement : contours des zones claires (segments diffusants) du raster runtime FROZEN, mesurés
 * en lecture seule sur le 3x (enveloppe convexe simplifiée, /3). Aucun lien avec les
 * PhysicalContacts ni avec la géométrie électrique.
 */
const SEGMENT_EMISSION_SHAPES = Object.freeze({
  a: 'polygon(24.3px 29.7px, 27px 27.3px, 52.7px 27.3px, 55px 29.7px, 55px 30.7px, 50.3px 34.7px, 28px 34.7px, 24.3px 30.7px)',
  b: 'polygon(51.3px 35.7px, 55.3px 32px, 56.7px 31.7px, 59px 34.7px, 55.7px 54.3px, 55px 55.7px, 51.3px 58.3px, 48px 54.7px)',
  c: 'polygon(47px 64px, 51px 60.7px, 52px 60.7px, 54px 63px, 54px 66.7px, 51px 84.3px, 48.3px 87px, 47.3px 87px, 44px 83.3px)',
  d: 'polygon(16.3px 87.7px, 20.3px 84px, 43px 84px, 46.3px 87.7px, 46.3px 89px, 44px 91px, 18.3px 91px, 16.3px 89px)',
  e: 'polygon(15.7px 63.3px, 18.7px 60.7px, 20px 60.7px, 22.7px 63.7px, 20px 82.7px, 15.7px 86.7px, 14.3px 86.7px, 12.3px 84.3px)',
  f: 'polygon(20px 33.7px, 22.3px 31.7px, 23.3px 31.7px, 27px 35.7px, 24px 54.3px, 19.7px 58.3px, 19px 58.3px, 16.3px 55px)',
  g: 'polygon(21px 58.7px, 24.7px 55.7px, 46.7px 55.7px, 50px 58.7px, 50px 59.7px, 46.3px 63px, 23.7px 63px, 20.7px 59.7px)',
  DP: 'circle(4.2px at 57.5px 87px)',
})
const SEGMENT_ORDER = Object.freeze(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'DP'])

/**
 * Corps = raster FROZEN SC56-11EWA (segments éteints blanc/gris diffusés d'origine). Chaque
 * segment allumé (`segments[id] === true`, Visual State Registry) ajoute une émission rouge
 * découpée à sa forme ; un segment éteint ne dessine rien. Aucune logique électrique ici.
 */
export function SevenSegmentDisplayPart({ segments } = {}) {
  const { width, height } = getComponentDef('SEVEN_SEGMENT_DISPLAY')
  const lit = SEGMENT_ORDER.filter((id) => segments?.[id] === true)
  return (
    <div
      className="part-seven-segment-display"
      aria-label="7-Segment Display SC56-11EWA"
      data-lit-segments={lit.join(' ')}
      style={{ position: 'relative', width, height }}
    >
      <picture>
        <source type="image/webp" srcSet={`${BASE}.1x.webp 1x, ${BASE}.3x.webp 3x`} />
        <img
          src={`${BASE}.1x.png`}
          srcSet={`${BASE}.1x.png 1x, ${BASE}.3x.png 3x`}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden={true}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
        />
      </picture>
      <div
        className="part-seven-segment-display__emission"
        aria-hidden={true}
        style={{ position: 'absolute', left: 0, top: 0, width, height, pointerEvents: 'none', filter: 'drop-shadow(0 0 1.5px rgba(255, 48, 24, 0.9))' }}
      >
        {lit.map((id) => (
          <div
            key={id}
            className="part-seven-segment-display__segment"
            data-segment={id}
            style={{ position: 'absolute', left: 0, top: 0, width, height, clipPath: SEGMENT_EMISSION_SHAPES[id], background: 'linear-gradient(180deg, #ff5a3c 0%, #f01e0c 100%)' }}
          />
        ))}
      </div>
    </div>
  )
}
