import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { encodeThermistorMarking } from '../../visualization/thermistorMarking.js'

/**
 * THERMISTOR NTC — MB-L1-PROP-006.
 *
 * La silhouette physique reutilise exactement le corps radial valide du
 * CAPACITOR V2, recale dans la boite canonique 84x36 : meme volume et memes
 * pieds, mais rendu noir par filtre. Les longues pattes restent fournies par
 * AssemblyLeadsLayer afin de preserver les PhysicalContacts A/B.
 *
 * La resistance nominale reste la source de verite unique via
 * parameters.resistance. Le code EIA 3 chiffres est derive a chaque rendu ;
 * aucune valeur de marquage n'est persistee et aucune temperature n'est
 * simulee dans ce renderer.
 */
const CAPACITOR_ASSET_DIR = '/assets/components/capacitor'
const WEBP_SRCSET = `${CAPACITOR_ASSET_DIR}/capacitor.base.1x.webp 1x, ${CAPACITOR_ASSET_DIR}/capacitor.base.3x.webp 3x`
const PNG_SRCSET = `${CAPACITOR_ASSET_DIR}/capacitor.base.1x.png 1x, ${CAPACITOR_ASSET_DIR}/capacitor.base.3x.png 3x`
const PNG_FALLBACK = `${CAPACITOR_ASSET_DIR}/capacitor.base.3x.png`

export function ThermistorPart({ parameters } = {}) {
  const def = getComponentDef('THERMISTOR')
  const width = def?.width ?? 84
  const height = def?.height ?? 36
  const code = encodeThermistorMarking(parameters?.resistance)

  const ariaLabel = code.exact
    ? `Thermistance NTC, marquage ${code.marking}`
    : 'Thermistance NTC'

  return (
    <div
      className="part-thermistor"
      aria-label={ariaLabel}
      style={{
        position: 'relative',
        width,
        height,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <picture
        className="part-thermistor__picture"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 7,
          top: 4,
          width: 70,
          height: 40,
          display: 'block',
          pointerEvents: 'none',
        }}
      >
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-thermistor__img"
          src={PNG_FALLBACK}
          srcSet={PNG_SRCSET}
          width={70}
          height={40}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
            filter: 'grayscale(1) brightness(0.19) contrast(1.65)',
          }}
        />
      </picture>

      <span
        className="part-thermistor__identity"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 33,
          top: 11,
          width: 18,
          height: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f1f5f9',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontWeight: 700,
          fontSize: 5.5,
          lineHeight: 1,
          letterSpacing: 0.1,
          textShadow: '0 1px 1px rgba(0,0,0,0.9)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        NTC
      </span>

      {code.exact ? (
        <span
          className="part-thermistor__marking"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 33,
            top: 18,
            width: 18,
            height: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f8fafc',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontWeight: 700,
            fontSize: 7.5,
            lineHeight: 1,
            letterSpacing: 0.1,
            textShadow: '0 1px 1px rgba(0,0,0,0.95)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {code.marking}
        </span>
      ) : null}
    </div>
  )
}
