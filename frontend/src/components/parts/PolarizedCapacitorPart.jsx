import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur électrolytique polarisé radial.
 *
 * La polarité est matérialisée par une bande verticale négative et les deux
 * pattes physiques descendent vers les ancres logiques du composant.
 */
export function PolarizedCapacitorPart() {
  return (
    <div className="part-capacitor part-capacitor--polarized" aria-label="Condensateur polarisé">
      <svg viewBox="0 0 70 78" width="70" height="78" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="polarizedCapBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2f75b5" />
            <stop offset="0.48" stopColor="#165a96" />
            <stop offset="1" stopColor="#0a3f70" />
          </linearGradient>
          <linearGradient id="polarizedCapLead" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#68747f" />
            <stop offset="0.45" stopColor="#c2cad1" />
            <stop offset="0.72" stopColor="#8d98a2" />
            <stop offset="1" stopColor="#5e6973" />
          </linearGradient>
          <linearGradient id="polarizedCapStripe" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e8eef4" stopOpacity="0.92" />
            <stop offset="0.55" stopColor="#cbd5df" stopOpacity="0.76" />
            <stop offset="1" stopColor="#9aa8b5" stopOpacity="0.82" />
          </linearGradient>
          <filter id="polarizedCapShadow" x="-30%" y="-20%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.4" stdDeviation="1" floodOpacity="0.3" />
          </filter>
        </defs>

        <line x1="25" y1="54" x2="25" y2="75" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="45" y1="54" x2="45" y2="75" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="25" y1="54" x2="25" y2="75" stroke="url(#polarizedCapLead)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="45" y1="54" x2="45" y2="75" stroke="url(#polarizedCapLead)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="24.2" y1="55" x2="24.2" y2="73.5" stroke="#fff" strokeOpacity=".35" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="44.2" y1="55" x2="44.2" y2="73.5" stroke="#fff" strokeOpacity=".35" strokeWidth="0.8" strokeLinecap="round" />

        <path
          d="M35 4
             C23.8 4 15.2 10.5 14.4 21.2
             C13.8 30.2 15.8 41.8 20.1 49.1
             C22.6 53.2 26.1 55.2 30.4 55.2
             L39.6 55.2
             C43.9 55.2 47.4 53.2 49.9 49.1
             C54.2 41.8 56.2 30.2 55.6 21.2
             C54.8 10.5 46.2 4 35 4 Z"
          fill="url(#polarizedCapBody)"
          filter="url(#polarizedCapShadow)"
        />

        {/* Negative polarity stripe. */}
        <path
          d="M43.4 7.1 C47.1 9.8 49.4 14.2 49.9 20.3 C50.4 28.9 48.7 40.8 45.1 47.3 C44.2 49 43.1 50.1 41.7 51.1 L41.7 7.1 Z"
          fill="url(#polarizedCapStripe)"
          opacity="0.78"
        />
        <g fill="#64748b" opacity="0.72">
          <text x="45.4" y="18" fontSize="4.5" fontWeight="700" textAnchor="middle">−</text>
          <text x="45.4" y="26" fontSize="4.5" fontWeight="700" textAnchor="middle">−</text>
          <text x="45.4" y="34" fontSize="4.5" fontWeight="700" textAnchor="middle">−</text>
          <text x="45.4" y="42" fontSize="4.5" fontWeight="700" textAnchor="middle">−</text>
        </g>

        <path
          d="M24.2 13.2 C27.1 9.2 31.5 7.1 35.8 6.6"
          fill="none"
          stroke="#fff"
          strokeOpacity=".42"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M18.3 31 C18.7 38.2 20.4 44.1 23.7 48.7"
          fill="none"
          stroke="#07385f"
          strokeOpacity=".34"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
