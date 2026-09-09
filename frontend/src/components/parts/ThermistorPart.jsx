import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * THERMISTOR NTC — rendu FT-C vertical réaliste.
 *
 * Le raster historique bleu/noir avec sorties latérales est volontairement
 * abandonné : sa silhouette ne correspond pas à la référence physique validée
 * par le CSA. Le corps visible est maintenant une pastille NTC noire verticale
 * centrée au-dessus des deux pattes dynamiques fournies par AssemblyLeadsLayer.
 *
 * Invariants :
 * - identité électrique A/B inchangée ;
 * - PhysicalContacts inchangés : x=30 / x=54, y=62 ;
 * - entraxe mécanique = 24 unités, identique LED/LDR ;
 * - aucune logique de simulation dans ce renderer.
 */
export function ThermistorPart() {
  const def = getComponentDef('THERMISTOR')
  const width = def?.width ?? 84
  const height = def?.height ?? 64

  return (
    <div
      className="part-thermistor"
      aria-label="Thermistance NTC"
      style={{
        position: 'relative',
        width,
        height,
        pointerEvents: 'none',
      }}
    >
      <div
        className="part-thermistor__body"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 20,
          top: 1,
          width: 44,
          height: 32,
          boxSizing: 'border-box',
          borderRadius: '48% 48% 43% 43% / 47% 47% 53% 53%',
          background: 'radial-gradient(circle at 36% 24%, #454545 0%, #252525 28%, #111111 64%, #070707 100%)',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.08), inset -3px -4px 5px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e8e8e8',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 8,
          lineHeight: 1.05,
          fontWeight: 500,
          letterSpacing: 0.15,
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        <span>NTC</span>
        <span>100-9</span>
      </div>
    </div>
  )
}
