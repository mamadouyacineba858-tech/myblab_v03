import React from 'react'

/**
 * Rendu physique d'un condensateur électrolytique radial polarisé.
 * La géométrie visuelle est volontairement indépendante des ancres logiques.
 */
export function PolarizedCapacitorPart() {
  return (
    <div className="part-capacitor part-capacitor--polarized" aria-label="Condensateur polarisé">
      <svg viewBox="0 0 70 82" width="70" height="82" role="img" aria-hidden="true" style={{ overflow: 'visible' }}>
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
            <stop offset="0" stopColor="#596672" /><stop offset="0.38" stopColor="#c5cdd4" />
            <stop offset="0.58" stopColor="#eef2f4" /><stop offset="0.78" stopColor="#9aa5ae" /><stop offset="1" stopColor="#505c66" />
          </linearGradient>
          <linearGradient id="pcStripe" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#aebbc6" stopOpacity=".82" /><stop offset=".42" stopColor="#f3f6f8" stopOpacity=".96" />
            <stop offset=".7" stopColor="#d4dde4" stopOpacity=".9" /><stop offset="1" stopColor="#8c9aa6" stopOpacity=".82" />
          </linearGradient>
          <linearGradient id="pcTopMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e0e5e8" /><stop offset=".28" stopColor="#8b969e" />
            <stop offset=".65" stopColor="#4b555d" /><stop offset="1" stopColor="#202930" />
          </linearGradient>
          <radialGradient id="pcTopSurface" cx="42%" cy="28%" r="72%">
            <stop offset="0" stopColor="#6d777e" /><stop offset=".65" stopColor="#3a444b" /><stop offset="1" stopColor="#161e24" />
          </radialGradient>
          <filter id="pcShadow" x="-30%" y="-25%" width="160%" height="175%"><feDropShadow dx="0" dy="1.4" stdDeviation="1.1" floodOpacity=".32" /></filter>
        </defs>

        {/* Leads: same physical diameter family as the resistor. */}
        <line x1="25" y1="55.5" x2="25" y2="79" stroke="#596672" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="45" y1="55.5" x2="45" y2="78" stroke="#596672" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="25" y1="55.5" x2="25" y2="79" stroke="url(#pcLead)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="45" y1="55.5" x2="45" y2="78" stroke="url(#pcLead)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="24.2" y1="56" x2="24.2" y2="77.5" stroke="#fff" strokeOpacity=".3" strokeWidth=".8" strokeLinecap="round" />
        <line x1="44.2" y1="56" x2="44.2" y2="76.8" stroke="#fff" strokeOpacity=".3" strokeWidth=".8" strokeLinecap="round" />

        {/* Cylindrical sleeve. */}
        <path d="M35 5.2 C23.7 5.2 16.1 8 15.2 16.1 C14.4 23.4 14.4 38.2 15.4 44.8
          C16.1 49.7 19.2 52.3 24.6 53.9 C27.6 54.8 31 55.1 35 55.1 C39 55.1 42.4 54.8 45.4 53.9
          C50.8 52.3 53.9 49.7 54.6 44.8 C55.6 38.2 55.6 23.4 54.8 16.1 C53.9 8 46.3 5.2 35 5.2 Z"
          fill="url(#pcBody)" filter="url(#pcShadow)" />

        {/* Pronounced lower waist / rolled skirt: the small recessed belt visible on real cans. */}
        <path d="M15.3 43.2 C16.2 47.8 20.1 50.2 25.1 51.1 C28.2 51.7 31.5 51.9 35 51.9
          C38.5 51.9 41.8 51.7 44.9 51.1 C49.9 50.2 53.8 47.8 54.7 43.2
          L55.2 47.3 C54.5 50.7 51.6 53.3 47.2 54.6 C43.9 55.6 39.8 56 35 56
          C30.2 56 26.1 55.6 22.8 54.6 C18.4 53.3 15.5 50.7 14.8 47.3 Z"
          fill="#0a4278" opacity=".99" />
        <path d="M15.8 46.1 C20.2 49.6 26.5 50.9 35 51.05 C43.5 50.9 49.8 49.6 54.2 46.1"
          fill="none" stroke="#73b7e7" strokeOpacity=".6" strokeWidth="1.25" />
        <path d="M16.5 48.6 C20.5 52.7 27.2 54.5 35 54.65 C42.8 54.5 49.5 52.7 53.5 48.6"
          fill="none" stroke="#052d52" strokeOpacity=".86" strokeWidth="1.5" />
        <path d="M19.4 51.4 C23.5 54.4 29.1 55.45 35 55.5 C40.9 55.45 46.5 54.4 50.6 51.4"
          fill="none" stroke="#2775ad" strokeOpacity=".85" strokeWidth=".85" />

        {/* Negative stripe follows the skirt instead of ending at the body wall. */}
        <path d="M42.2 7.5 C46.5 9.1 49.5 12.8 50.8 18 C51.8 24.7 51.7 38.2 49.7 44.7
          C49.1 47.7 47 50.2 43.1 52.1 L41.6 52.6 L41.6 7.7 Z" fill="url(#pcStripe)" opacity=".84" />
        <path d="M43.1 52.1 C46.4 50.3 48.6 47.9 49.7 44.7 L50.8 47.4 C49.6 50.5 47.3 53 44.2 54.7 L42.1 55.4 L42.1 52.7 Z" fill="url(#pcStripe)" opacity=".84" />
        <g fill="#33414c" opacity=".96" fontFamily="Arial,sans-serif" fontSize="5.1" fontWeight="700" textAnchor="middle">
          <text x="46" y="18">−</text><text x="46" y="26">−</text><text x="46" y="34">−</text><text x="46" y="42">−</text>
        </g>

        {/* Printed rating. */}
        <g fill="#f8fbff" fontFamily="Arial,sans-serif" fontWeight="700">
          <text x="18" y="28" fontSize="5.3">100µF</text><text x="18" y="35.2" fontSize="4.5">25V</text>
        </g>

        {/* Deeply recessed metal cap: blue sleeve forms a clearly visible lip around the metal. */}
        <ellipse cx="35" cy="7.35" rx="21.5" ry="5.3" fill="#052b4b" opacity=".99" />
        <ellipse cx="35" cy="7.05" rx="20.5" ry="4.75" fill="#1b619d" />
        <ellipse cx="35" cy="6.82" rx="18.5" ry="3.95" fill="#06131c" />
        <ellipse cx="35" cy="6.72" rx="17.15" ry="3.2" fill="url(#pcTopMetal)" />
        <ellipse cx="35" cy="6.55" rx="16.0" ry="2.58" fill="url(#pcTopSurface)" />
        <ellipse cx="35" cy="6.38" rx="15.25" ry="2.05" fill="#3b454c" opacity=".96" />

        {/* Recessed safety vent, entirely inside the metal cap. */}
        <path d="M21.5 5.7 L35 6.3 L48.5 5.7" fill="none" stroke="#090f14" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M35 4.45 L35 8.12" fill="none" stroke="#080f14" strokeWidth="1.75" strokeLinecap="round" />
        <path d="M22.8 5.02 L47.2 7.88" fill="none" stroke="#dce3e7" strokeOpacity=".72" strokeWidth=".68" strokeLinecap="round" />
        <path d="M47.2 5.02 L22.8 7.88" fill="none" stroke="#070d12" strokeOpacity=".92" strokeWidth=".95" strokeLinecap="round" />
        <path d="M24 5.48 C27.4 4.92 31.2 4.74 35 4.74 C38.8 4.74 42.6 4.92 46 5.48" fill="none" stroke="#f3f6f7" strokeOpacity=".22" strokeWidth=".5" strokeLinecap="round" />

        {/* Sleeve highlights / cylindrical shading. */}
        <path d="M22 13.2 C25.3 8.3 30.2 6.35 34.9 6.05" fill="none" stroke="#fff" strokeOpacity=".48" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17.9 19 C17 27.2 17.2 39.6 19.5 46.2" fill="none" stroke="#062f55" strokeOpacity=".48" strokeWidth="1.45" strokeLinecap="round" />
      </svg>
    </div>
  )
}
