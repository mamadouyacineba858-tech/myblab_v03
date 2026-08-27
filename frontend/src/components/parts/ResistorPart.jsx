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
            <stop offset="0" stopColor="#f7e7c8" />
            <stop offset="0.48" stopColor="#d8bd91" />
            <stop offset="1" stopColor="#9d815c" />
          </linearGradient>
          <linearGradient id="resistorMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5f7fa" />
            <stop offset="0.45" stopColor="#aeb7c2" />
            <stop offset="1" stopColor="#59636f" />
          </linearGradient>
          <filter id="resistorShadow" x="-20%" y="-40%" width="140%" height="180%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="0.8" floodOpacity="0.38" />
          </filter>
        </defs>
        <line x1="0" y1="14" x2="18" y2="14" stroke="url(#resistorMetal)" strokeWidth="2" />
        <line x1="72" y1="14" x2="84" y2="14" stroke="url(#resistorMetal)" strokeWidth="2" />
        <rect x="18" y="4" width="54" height="20" rx="9" fill="url(#resistorBody)" filter="url(#resistorShadow)" />
        <rect x="32" y="4.5" width="5" height="19" rx="1" fill="#8b3f25" />
        <rect x="44" y="4.5" width="5" height="19" rx="1" fill="#5a3a8a" />
        <path d="M21 7.2h48" stroke="#fff" strokeOpacity=".32" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </div>
  )
}
