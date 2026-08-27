import React from 'react'

/**
 * Rendu visuel réaliste du condensateur non polarisé.
 *
 * Le contrat électrique reste passif et symétrique : deux bornes identiques.
 * La présentation reproduit un condensateur radial enrobé bleu, avec deux
 * fils métalliques verticaux. Les ancres logiques sont placées à leurs
 * extrémités dans componentDefinitions.js.
 */
export function CapacitorPart() {
  return (
    <div className="part-capacitor" aria-label="Condensateur non polarisé">
      <svg viewBox="0 0 70 64" width="70" height="64" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="capacitorBlue" x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#2f75b5" />
            <stop offset="0.48" stopColor="#165a96" />
            <stop offset="1" stopColor="#0c4679" />
          </linearGradient>
          <linearGradient id="capacitorLead" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#68747f" />
            <stop offset="0.45" stopColor="#c2cad1" />
            <stop offset="0.72" stopColor="#8d98a2" />
            <stop offset="1" stopColor="#5e6973" />
          </linearGradient>
          <filter id="capacitorShadow" x="-30%" y="-25%" width="160%" height="170%">
            <feDropShadow dx="0" dy="1.4" stdDeviation="1" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Thick physical leads, matching the visual weight of the resistor leads. */}
        <line x1="24" y1="43" x2="24" y2="62" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="46" y1="43" x2="46" y2="62" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="24" y1="43" x2="24" y2="62" stroke="url(#capacitorLead)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="46" y1="43" x2="46" y2="62" stroke="url(#capacitorLead)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="23.2" y1="44" x2="23.2" y2="60.5" stroke="#fff" strokeOpacity=".35" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="45.2" y1="44" x2="45.2" y2="60.5" stroke="#fff" strokeOpacity=".35" strokeWidth="0.8" strokeLinecap="round" />

        {/* Radial blue resin body: rounded top, gently tapered lower section. */}
        <path
          d="M35 5
             C24.5 5 16.5 11.8 15.5 21.5
             C14.7 29.4 17.5 37.2 21.8 42.1
             C24.1 44.7 27.1 45.5 30.2 45.5
             L39.8 45.5
             C42.9 45.5 45.9 44.7 48.2 42.1
             C52.5 37.2 55.3 29.4 54.5 21.5
             C53.5 11.8 45.5 5 35 5 Z"
          fill="url(#capacitorBlue)"
          filter="url(#capacitorShadow)"
        />
        <path
          d="M24.5 14.5 C27 10.8 31.4 8.8 35.7 8.3"
          fill="none"
          stroke="#fff"
          strokeOpacity=".42"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M18.8 28.5 C19.3 35 21.2 39.2 24.5 42.2"
          fill="none"
          stroke="#0a3c68"
          strokeOpacity=".32"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
