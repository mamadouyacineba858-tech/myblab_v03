import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { LED_COLOR_OPTIONS } from '../../config/componentDefinitions.js'

/**
 * LED — réconciliation FT-C V2 + L1-PROP-003 (couleur physique).
 *
 * Seul le delta visuel validé est repris ici : le dôme raster est légèrement
 * agrandi. La boîte canonique, les pins, les PhysicalContacts et la mécanique
 * d'assemblage restent ceux du baseline batterie 01fc5cee.
 *
 * `properties.color` (axe physique persistant) et `isOn` (axe électrique
 * runtime) restent orthogonaux (§4/§6 du ticket) ; ce renderer est le SEUL
 * endroit qui les combine pour choisir un asset — cf. §7/§11.
 */
const ASSET_DIR = '/assets/components/led'
const LED_BODY_SCALE = 1.12
const LED_COLLAR_Y = 33
const LED_DEFAULT_COLOR = 'red'
const LED_COLORS = LED_COLOR_OPTIONS.map((option) => option.value)

function assetSources(color, state) {
  const base = `${ASSET_DIR}/led.${color}.${state}`
  return {
    webp: `${base}.1x.webp 1x, ${base}.3x.webp 3x`,
    png: `${base}.1x.png 1x, ${base}.3x.png 3x`,
    fallback: `${base}.3x.png`,
  }
}

export function LedPart({ isOn, properties } = {}) {
  const def = getComponentDef("LED")
  const width = def?.width ?? 80
  const height = def?.height ?? 64
  const color = LED_COLORS.includes(properties?.color) ? properties.color : LED_DEFAULT_COLOR
  const source = assetSources(color, isOn ? 'on' : 'off')

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
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
            transform: `scale(${LED_BODY_SCALE})`,
            transformOrigin: `50% ${LED_COLLAR_Y}px`,
          }}
        />
      </picture>
    </div>
  )
}
