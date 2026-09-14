import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Alimentation DC de laboratoire — backend raster.
 *
 * MB-L1-POWER-001 — Canvas readability :
 * - Core POWER, modèle DC et PhysicalContacts inchangés ;
 * - corps visuel agrandi localement à 2.5× ;
 * - source 3x forcée pour le rendu visible ;
 * - sérigraphie de façade redessinée par-dessus le raster uniquement pour
 *   rendre les commandes lisibles à l'échelle Canvas, sans créer de hit target ;
 * - la borne verte EARTH reste décorative et ne devient jamais un pin logique.
 */
const ASSET_DIR = '/assets/components/power'
const WEBP_3X = `${ASSET_DIR}/power.default.3x.webp`
const PNG_3X = `${ASSET_DIR}/power.default.3x.png`
const LEGACY_ASSETS = `${ASSET_DIR}/power.default.1x.webp ${ASSET_DIR}/power.default.1x.png`
const APPROVED_CANDIDATE_SCALE = 2.5

function FacadeLabel({ children, left, top, width, fontSize = 2.7, color = '#141414', align = 'center', weight = 800 }) {
  return (
    <span
      className="part-power__facade-label"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left,
        top,
        width,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize,
        fontWeight: weight,
        lineHeight: 1,
        letterSpacing: '0.08px',
        textAlign: align,
        color,
        textShadow: color === '#ffffff' ? '0 0 1px rgba(0,0,0,.75)' : '0 0 1px rgba(255,255,255,.9)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 3,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

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
      <picture
        className="part-power__picture"
        data-hires-source="3x-only"
        data-legacy-assets={LEGACY_ASSETS}
      >
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

      <div
        className="part-power__facade-overlay"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
      >
        <FacadeLabel left={5.5} top={18.2} width={33} fontSize={2.4} color="#ffffff" align="left">DC POWER SUPPLY</FacadeLabel>
        <FacadeLabel left={48} top={18.2} width={17} fontSize={2.0} color="#ffffff">MCH-305D</FacadeLabel>

        <FacadeLabel left={8} top={43.7} width={23} fontSize={3.0}>VOLTAGE</FacadeLabel>
        <FacadeLabel left={33.5} top={43.7} width={24} fontSize={3.0}>CURRENT</FacadeLabel>
        <FacadeLabel left={55.2} top={43.7} width={12} fontSize={2.7}>POWER</FacadeLabel>

        <FacadeLabel left={6.4} top={62.2} width={8} fontSize={2.5}>MIN</FacadeLabel>
        <FacadeLabel left={25.7} top={62.2} width={8} fontSize={2.5}>MAX</FacadeLabel>
        <FacadeLabel left={32.1} top={62.2} width={8} fontSize={2.5}>MIN</FacadeLabel>
        <FacadeLabel left={51.2} top={62.2} width={8} fontSize={2.5}>MAX</FacadeLabel>

        <FacadeLabel left={17.3} top={68.0} width={6} fontSize={4.2}>−</FacadeLabel>
        <FacadeLabel left={31.6} top={67.2} width={7} fontSize={4.7} color="#d71920">+</FacadeLabel>
        <FacadeLabel left={44.6} top={67.3} width={8} fontSize={3.6}>⏚</FacadeLabel>

        <FacadeLabel left={21} top={81.0} width={29} fontSize={2.4}>0 - 30V   0 - 5A</FacadeLabel>
      </div>
    </div>
  )
}
