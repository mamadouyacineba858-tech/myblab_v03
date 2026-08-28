import React from 'react'

/**
 * Rendu physique d'un condensateur électrolytique radial polarisé.
 * La géométrie visuelle est volontairement indépendante des ancres logiques.
 */
export function PolarizedCapacitorPart() {
  return (
    <div className="part-capacitor part-capacitor--polarized" aria-label="Condensateur polarisé">
      <svg viewBox="0 0 70 78" width="70" height="78" role="img" aria-hidden="true" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pcBody" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#073d70" />
            <stop offset="0.16" stopColor="#145b9b" />
            <stop offset="0.43" stopColor="#247bc1" />
            <stop offset="0.62" stopColor="#1767a8" />
            <stop offset="0.86" stopColor="#0d4e88" />
            <stop offset="1" stopColor="#062f57" />
          </linearGradient>
          <linearGradient id="pcLead" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#596672" />
            <stop offset="0.38" stopColor="#c5cdd4" />
            <stop offset="0.58" stopColor="#eef2f4" />
            <stop offset="0.78" stopColor="#9aa5ae" />
            <stop offset="1" stopColor="#505c66" />
          </linearGradient>
          <linearGradient id="pcStripe" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#aebbc6" stopOpacity="0.82" />
            <stop offset="0.42" stopColor="#f3f6f8" stopOpacity="0.96" />
            <stop offset="0.7" stopColor="#d4dde4" stopOpacity="0.9" />
            <stop offset="1" stopColor="#8c9aa6" stopOpacity="0.82" />
          </linearGradient>
          <linearGradient id="pcTopMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0e5e8" />
            <stop offset="0.28" stopColor="#8b969e" />
            <stop offset="0.65" stopColor="#4b555d" />
            <stop offset="1" stopColor="#202930" />
          </linearGradient>
          <radialGradient id="pcTopSurface" cx="42%" cy="28%" r="72%">
            <stop offset="0" stopColor="#6d777e" />
            <stop offset="0.65" stopColor="#3a444b" />
            <stop offset="1" stopColor="#161e24" />
          </radialGradient>
          <filter id="pcShadow" x="-30%" y="-25%" width="160%" height="175%">
            <feDropShadow dx="0" dy="1.4" stdDeviation="1.1" floodOpacity="0.32" />
          </filter>
        </defs>

        {/* Physical leads. */}
        <line x1="25" y1="53.5" x2="25" y2="75" stroke="#596672" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="45" y1="53.5" x2="45" y2="74" stroke="#596672" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="25" y1="53.5" x2="25" y2="75" stroke="url(#pcLead)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="45" y1="53.5" x2="45" y2="74" stroke="url(#pcLead)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="24.2" y1="54" x2="24.2" y2="73.5" stroke="#fff" strokeOpacity=".3" strokeWidth=".8" strokeLinecap="round" />
        <line x1="44.2" y1="54" x2="44.2" y2="72.8" stroke="#fff" strokeOpacity=".3" strokeWidth=".8" strokeLinecap="round" />

        {/* Cylindrical blue sleeve. */}
        <path
          d="M35 5.2
             C23.7 5.2 16.1 8 15.2 16.1
             C14.4 23.4 14.4 38.2 15.4 44.8
             C16.1 49.7 19.2 52.3 24.6 53.9
             C27.6 54.8 31 55.1 35 55.1
             C39 55.1 42.4 54.8 45.4 53.9
             C50.8 52.3 53.9 49.7 54.6 44.8
             C55.6 38.2 55.6 23.4 54.8 16.1
             C53.9 8 46.3 5.2 35 5.2 Z"
          fill="url(#pcBody)"
          filter="url(#pcShadow)"
        />

        {/* Rolled lower skirt with the characteristic small recessed waist/crease. */}
        <path
          d="M15.3 43.3
             C16.2 48.4 20.1 50.9 25.2 52.1
             C28.2 52.8 31.5 53.05 35 53.05
             C38.5 53.05 41.8 52.8 44.8 52.1
             C49.9 50.9 53.8 48.4 54.7 43.3
             L55.1 47.2
             C54.5 52.4 48.2 56.4 35 56.5
             C21.8 56.4 15.5 52.4 14.9 47.2 Z"
          fill="#0a4278"
          opacity=".98"
        />
        <path d="M16.3 46.3 C20.7 50.2 26.8 51.55 35 51.7 C43.2 51.55 49.3 50.2 53.7 46.3" fill="none" stroke="#5ca7df" strokeOpacity=".42" strokeWidth="1.2" />
        <path d="M17.9 50.8 C22.1 54.3 28.1 55.5 35 55.65 C41.9 55.5 47.9 54.3 52.1 50.8" fill="none" stroke="#06345b" strokeOpacity=".72" strokeWidth="1.1" />
        <path d="M21.4 52.35 C25.1 53.85 29.5 54.45 35 54.5 C40.5 54.45 44.9 53.85 48.6 52.35" fill="none" stroke="#1b659d" strokeOpacity=".8" strokeWidth=".8" />

        {/* Negative polarity stripe continues into the lower skirt. */}
        <path
          d="M42.2 7.5
             C46.5 9.1 49.5 12.8 50.8 18
             C51.8 24.7 51.7 38.2 49.7 44.7
             C48.7 48 46.5 50.4 43.1 52.1
             L41.6 52.4 L41.6 7.7 Z"
          fill="url(#pcStripe)"
          opacity=".84"
        />
        <path d="M43.1 52.1 C46.4 50.4 48.6 48 49.7 44.7 L50.8 47.2 C49.7 50.6 47.4 53.2 44.2 54.9 L42.2 55.6 L42.1 52.7 Z" fill="url(#pcStripe)" opacity=".84" />
        <g fill="#33414c" opacity=".96" fontFamily="Arial,sans-serif" fontSize="5.1" fontWeight="700" textAnchor="middle">
          <text x="46" y="18">−</text><text x="46" y="26">−</text><text x="46" y="34">−</text><text x="46" y="42">−</text>
        </g>

        {/* Printed rating. */}
        <g fill="#f8fbff" fontFamily="Arial,sans-serif" fontWeight="700">
          <text x="18" y="28" fontSize="5.3">100µF</text>
          <text x="18" y="35.2" fontSize="4.5">25V</text>
        </g>

        {/* Recessed metal safety cap: the blue sleeve forms a raised lip around it. */}
        <ellipse cx="35" cy="7.1" rx="21.2" ry="5.15" fill="#052b4b" opacity=".98" />
        <ellipse cx="35" cy="6.85" rx="20.1" ry="4.55" fill="#1c619b" />
        <ellipse cx="35" cy="6.7" rx="18.45" ry="3.85" fill="#06141d" />
        <ellipse cx="35" cy="6.6" rx="17.05" ry="3.15" fill="url(#pcTopMetal)" />
        <ellipse cx="35" cy="6.5" rx="15.9" ry="2.55" fill="url(#pcTopSurface)" />
        <ellipse cx="35" cy="6.28" rx="15.2" ry="2.05" fill="#3b454c" opacity=".96" />

        {/* Deep scored safety vent, sitting inside the metal cap. */}
        <path d="M21.5 5.72 L35 6.3 L48.5 5.72" fill="none" stroke="#090f14" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M35 4.5 L35 8.1" fill="none" stroke="#080f14" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M22.8 5.05 L47.2 7.9" fill="none" stroke="#d9e0e4" strokeOpacity=".68" strokeWidth=".65" strokeLinecap="round" />
        <path d="M47.2 5.05 L22.8 7.9" fill="none" stroke="#070d12" strokeOpacity=".9" strokeWidth=".95" strokeLinecap="round" />
        <path d="M24.1 5.55 C27.4 4.95 31.2 4.75 35 4.75 C38.8 4.75 42.6 4.95 45.9 5.55" fill="none" stroke="#f3f6f7" strokeOpacity=".2" strokeWidth=".5" />

        {/* Sleeve highlights. */}
        <path d="M22 13.2 C25.3 8.3 30.2 6.35 34.9 6.05" fill="none" stroke="#fff" strokeOpacity=".48" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17.9 19 C17 27.2 17.2 39.6 19.5 46.2" fill="none" stroke="#062f55" strokeOpacity=".48" strokeWidth="1.45" strokeLinecap="round" />
      </svg>
    </div>
  )
}
