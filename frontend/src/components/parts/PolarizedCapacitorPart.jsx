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

        {/* Physical leads: same visual diameter family as the resistor. */}
        <line x1="25" y1="53.5" x2="25" y2="75" stroke="#596672" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="45" y1="53.5" x2="45" y2="74" stroke="#596672" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="25" y1="53.5" x2="25" y2="75" stroke="url(#pcLead)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="45" y1="53.5" x2="45" y2="74" stroke="url(#pcLead)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="24.2" y1="54" x2="24.2" y2="73.5" stroke="#fff" strokeOpacity=".3" strokeWidth=".8" strokeLinecap="round" />
        <line x1="44.2" y1="54" x2="44.2" y2="72.8" stroke="#fff" strokeOpacity=".3" strokeWidth=".8" strokeLinecap="round" />

        {/* Blue aluminum sleeve: straight cylindrical wall with rolled lower skirt. */}
        <path
          d="M35 4
             C23.4 4 15.1 7.2 14.3 16.1
             C13.7 23.8 13.7 38.2 14.8 45.3
             C15.7 51.1 20.3 54.3 27 55.2
             C29.7 55.6 32.5 55.8 35 55.8
             C37.5 55.8 40.3 55.6 43 55.2
             C49.7 54.3 54.3 51.1 55.2 45.3
             C56.3 38.2 56.3 23.8 55.7 16.1
             C54.9 7.2 46.6 4 35 4 Z"
          fill="url(#pcBody)"
          filter="url(#pcShadow)"
        />

        {/* Rolled bottom rim. */}
        <path
          d="M14.9 43.7 C16.7 50.9 23.1 54.5 35 54.9 C46.9 54.5 53.3 50.9 55.1 43.7 C54.6 51.8 47.9 56.3 35 56.3 C22.1 56.3 15.4 51.8 14.9 43.7 Z"
          fill="#0a4278"
          opacity=".88"
        />
        <path d="M18.3 49.1 C22.5 53.1 28 54.2 35 54.35 C42 54.2 47.5 53.1 51.7 49.1" fill="none" stroke="#4b9bd7" strokeOpacity=".38" strokeWidth="1.15" />

        {/* Negative polarity sleeve stripe, wrapped around the cylinder. */}
        <path
          d="M42.2 7 C46.8 8.8 49.9 12.7 51.1 18 C52.1 24.7 52 38.6 49.9 45.1 C48.8 48.5 46.5 51 43.2 52.5 L41.4 52.5 L41.4 7.3 Z"
          fill="url(#pcStripe)"
          opacity=".9"
        />
        <g fill="#33414c" opacity=".96" fontFamily="Arial,sans-serif" fontSize="5.1" fontWeight="700" textAnchor="middle">
          <text x="46" y="18">−</text>
          <text x="46" y="26">−</text>
          <text x="46" y="34">−</text>
          <text x="46" y="42">−</text>
        </g>

        {/* Printed rating. */}
        <g fill="#f8fbff" fontFamily="Arial,sans-serif" fontWeight="700">
          <text x="18" y="28" fontSize="5.3">100µF</text>
          <text x="18" y="35.2" fontSize="4.5">25V</text>
        </g>

        {/* Realistic aluminum top: rolled blue rim + recessed metal safety vent. */}
        <ellipse cx="35" cy="7.1" rx="21.2" ry="5.15" fill="#062e52" opacity=".96" />
        <ellipse cx="35" cy="6.65" rx="20.1" ry="4.55" fill="#1c5f98" />
        <ellipse cx="35" cy="6.35" rx="18.65" ry="3.65" fill="url(#pcTopMetal)" />
        <ellipse cx="35" cy="6.22" rx="17.15" ry="3.0" fill="url(#pcTopSurface)" />

        {/* Recessed scored safety vent: dark groove with metallic cut edges. */}
        <path d="M20.8 5.45 L35 6.18 L49.2 5.45" fill="none" stroke="#11181e" strokeWidth="2.05" strokeLinecap="round" />
        <path d="M35 4.15 L35 8.35" fill="none" stroke="#10171d" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M21.9 4.35 L48.1 8.05" fill="none" stroke="#dbe1e5" strokeOpacity=".66" strokeWidth=".78" strokeLinecap="round" />
        <path d="M48.1 4.35 L21.9 8.05" fill="none" stroke="#080e13" strokeOpacity=".92" strokeWidth="1.05" strokeLinecap="round" />
        <path d="M23.5 5.05 L35 5.62 L46.5 5.05" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth=".55" strokeLinecap="round" />

        {/* Sleeve highlight and cylindrical side shading. */}
        <path d="M21.8 13.2 C25.1 8.2 30.1 6.2 35 5.9" fill="none" stroke="#fff" strokeOpacity=".48" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M17.8 19 C16.9 27.2 17.1 39.7 19.5 46.3" fill="none" stroke="#062f55" strokeOpacity=".48" strokeWidth="1.45" strokeLinecap="round" />
      </svg>
    </div>
  )
}
