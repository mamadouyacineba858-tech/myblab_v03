import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * CAPACITOR — rendu FT-C radial électrolytique vertical.
 *
 * L'ancien asset axial/céramique « 104 » est abandonné : sa silhouette ne
 * correspond pas à la cible produit validée. Le corps visible est maintenant
 * un petit cylindre électrolytique vertical centré au-dessus des deux pattes
 * dynamiques rendues par AssemblyLeadsLayer.
 *
 * Invariants :
 * - identité électrique historique pinA/pinB inchangée ;
 * - entraxe mécanique = 24 unités, identique LED/LDR/THERMISTOR ;
 * - PhysicalContacts : x=23 / x=47, y=38 ;
 * - aucune polarité électrique inventée dans le renderer ;
 * - aucune logique de simulation ici.
 */
export function CapacitorPart() {
  const def = getComponentDef('CAPACITOR')
  const width = def?.width ?? 70
  const height = def?.height ?? 40

  return (
    <div
      className="part-capacitor"
      aria-label="Condensateur électrolytique radial"
      style={{
        position: 'relative',
        width,
        height,
        pointerEvents: 'none',
      }}
    >
      <div
        className="part-capacitor__body"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 20,
          top: 1,
          width: 30,
          height: 27,
          boxSizing: 'border-box',
          borderRadius: '44% 44% 24% 24% / 18% 18% 12% 12%',
          background: 'linear-gradient(90deg, #08192f 0%, #153b67 20%, #245982 42%, #12395e 68%, #07172b 100%)',
          border: '1px solid rgba(210,230,245,0.22)',
          boxShadow: 'inset 3px 0 5px rgba(255,255,255,0.10), inset -4px 0 6px rgba(0,0,0,0.42), 0 1px 2px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e7edf3',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 6.5,
          lineHeight: 1.05,
          fontWeight: 600,
          letterSpacing: 0.05,
          textAlign: 'center',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 2,
            right: 2,
            top: 1,
            height: 4,
            borderRadius: '50%',
            background: 'linear-gradient(180deg, #b8c0c8 0%, #6f7881 48%, #c7ced5 100%)',
            opacity: 0.92,
          }}
        />
        <span style={{ marginTop: 4 }}>100µF</span>
        <span>25V</span>
      </div>
    </div>
  )
}
