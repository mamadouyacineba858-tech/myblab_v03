import React from 'react'
import './ResistorPart.css'

/**
 * Rendu visuel réaliste d'une résistance traversante.
 * Contrat géométrique inchangé : boîte logique 84×28 et pins inchangés.
 */
export function ResistorPart() {
  return (
    <div className="part-resistor" aria-label="Résistance">
      <svg viewBox="0 0 84 28" width="84" height="28" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="resistorBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1d5" />
            <stop offset="0.34" stopColor="#e5ca9e" />
            <stop offset="0.72" stopColor="#c6a878" />
            <stop offset="1" stopColor="#9b7b55" />
          </linearGradient>
          <linearGradient id="resistorMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9edf2" />
            <stop offset="0.42" stopColor="#aeb8c3" />
            <stop offset="1" stopColor="#687481" />
          </linearGradient>
          <linearGradient id="resistorBand" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6f2f1e" />
            <stop offset="0.5" stopColor="#a94d32" />
            <stop offset="1" stopColor="#612618" />
          </linearGradient>
          <linearGradient id="resistorBand2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4d347b" />
            <stop offset="0.5" stopColor="#7251a8" />
            <stop offset="1" stopColor="#3f286b" />
          </linearGradient>
          <linearGradient id="resistorBand3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#b56b18" />
            <stop offset="0.5" stopColor="#e0a03a" />
            <stop offset="1" stopColor="#965314" />
          </linearGradient>
          <filter id="resistorShadow" x="-20%" y="-50%" width="140%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="0.65" floodOpacity="0.28" />
          </filter>
        </defs>

        <line x1="0" y1="14" x2="18" y2="14" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="72" y1="14" x2="84" y2="14" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="0" y1="13.25" x2="18" y2="13.25" stroke="url(#resistorMetal)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="72" y1="13.25" x2="84" y2="13.25" stroke="url(#resistorMetal)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="1" y1="12.35" x2="17" y2="12.35" stroke="#fff" strokeOpacity=".45" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="73" y1="12.35" x2="83" y2="12.35" stroke="#fff" strokeOpacity=".45" strokeWidth="0.8" strokeLinecap="round" />

        <rect x="18" y="6" width="54" height="16" rx="7" fill="url(#resistorBody)" filter="url(#resistorShadow)" />
        <rect x="31" y="6.2" width="4.5" height="15.6" rx="0.8" fill="url(#resistorBand)" />
        <rect x="42" y="6.2" width="4.5" height="15.6" rx="0.8" fill="url(#resistorBand2)" />
        <rect x="53" y="6.2" width="4.5" height="15.6" rx="0.8" fill="url(#resistorBand3)" />

        <path d="M22 8.1h46" stroke="#fff" strokeOpacity=".38" strokeWidth="1" strokeLinecap="round" />
        <path d="M23 20.7h44" stroke="#684f35" strokeOpacity=".24" strokeWidth=".8" strokeLinecap="round" />
      </svg>
    </div>
  )
}
