import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * CAPACITOR — rendu FT-C céramique radial NON POLARISÉ.
 *
 * Référence visuelle validée CSA : petit condensateur céramique disque orange,
 * marquage « 104 », deux pattes verticales parallèles insérées dans le
 * breadboard. Aucune polarité n'est affichée ni suggérée.
 *
 * Invariants :
 * - identité électrique historique pinA/pinB inchangée ;
 * - composant non polarisé : aucune borne + / - ;
 * - entraxe mécanique = 24 unités, identique LED/LDR/THERMISTOR ;
 * - PhysicalContacts inchangés : x=23 / x=47, y=38 ;
 * - les pattes sont rendues par AssemblyLeadsLayer ;
 * - aucune logique de simulation dans ce renderer.
 */
export function CapacitorPart() {
  const def = getComponentDef('CAPACITOR')
  const width = def?.width ?? 70
  const height = def?.height ?? 40

  return (
    <div
      className="part-capacitor"
      aria-label="Condensateur céramique non polarisé"
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
          borderRadius: '49% 49% 44% 44% / 47% 47% 53% 53%',
          background: 'radial-gradient(circle at 34% 24%, #ff9b4d 0%, #e86f24 34%, #c94e12 70%, #9e3309 100%)',
          border: '1px solid rgba(255,210,170,0.48)',
          boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.18), inset -3px -4px 5px rgba(103,35,5,0.32), 0 1px 2px rgba(0,0,0,0.30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1d120c',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 9,
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: 0.15,
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        <span>104</span>
      </div>
    </div>
  )
}
