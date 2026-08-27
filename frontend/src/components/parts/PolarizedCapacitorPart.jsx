import React from 'react'

export function PolarizedCapacitorPart() {
  return (
    <div className="part-capacitor part-capacitor--polarized" aria-label="Condensateur polarisé">
      <svg viewBox="0 0 70 78" width="70" height="78" role="img" aria-hidden="true" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="pcBody" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0b4778"/><stop offset="0.2" stopColor="#176aa8"/><stop offset="0.52" stopColor="#2177b8"/><stop offset="0.82" stopColor="#125d98"/><stop offset="1" stopColor="#083b67"/>
          </linearGradient>
          <linearGradient id="pcLead" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#596672"/><stop offset="0.4" stopColor="#c5cdd4"/><stop offset="0.65" stopColor="#e0e5e9"/><stop offset="1" stopColor="#596672"/>
          </linearGradient>
          <linearGradient id="pcStripe" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#cbd5df" stopOpacity="0.78"/><stop offset="0.5" stopColor="#f4f6f8" stopOpacity="0.96"/><stop offset="1" stopColor="#a8b5c0" stopOpacity="0.82"/>
          </linearGradient>
          <linearGradient id="pcMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9c2c8"/><stop offset="0.35" stopColor="#66717a"/><stop offset="1" stopColor="#252d34"/>
          </linearGradient>
          <filter id="pcShadow" x="-30%" y="-25%" width="160%" height="170%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.1" floodOpacity="0.28"/></filter>
        </defs>

        <line x1="25" y1="53" x2="25" y2="75" stroke="#596672" strokeWidth="5.4" strokeLinecap="round"/>
        <line x1="45" y1="53" x2="45" y2="74" stroke="#596672" strokeWidth="5.4" strokeLinecap="round"/>
        <line x1="25" y1="53" x2="25" y2="75" stroke="url(#pcLead)" strokeWidth="3.5" strokeLinecap="round"/>
        <line x1="45" y1="53" x2="45" y2="74" stroke="url(#pcLead)" strokeWidth="3.5" strokeLinecap="round"/>
        <line x1="24.2" y1="54" x2="24.2" y2="73.5" stroke="#fff" strokeOpacity=".32" strokeWidth=".8" strokeLinecap="round"/>
        <line x1="44.2" y1="54" x2="44.2" y2="72.5" stroke="#fff" strokeOpacity=".32" strokeWidth=".8" strokeLinecap="round"/>

        <path d="M35 3.5C24.5 3.5 17 6.5 14.8 14.4C13.2 20.4 13.4 39.5 15.4 45.8C17.1 51.1 21.1 54.3 27.2 55.2C29.8 55.6 32.5 55.8 35 55.8C37.5 55.8 40.2 55.6 42.8 55.2C48.9 54.3 52.9 51.1 54.6 45.8C56.6 39.5 56.8 20.4 55.2 14.4C53 6.5 45.5 3.5 35 3.5Z" fill="url(#pcBody)" filter="url(#pcShadow)"/>

        {/* Rolled lower rim of the aluminum can. */}
        <path d="M15.5 44.5C17.2 50.8 23.4 54.6 35 55.1C46.6 54.6 52.8 50.8 54.5 44.5C53.7 51.7 47.2 56.1 35 56.2C22.8 56.1 16.3 51.7 15.5 44.5Z" fill="#0a4278" opacity=".82"/>
        <path d="M18 48.3C22.1 52.5 27.6 53.9 35 54.1C42.4 53.9 47.9 52.5 52 48.3" fill="none" stroke="#4a9bdd" strokeOpacity=".35" strokeWidth="1.15"/>

        {/* Negative polarity stripe. */}
        <path d="M42.1 6.2C46.7 8.1 49.8 11.8 51.1 17.1C52.2 23.5 52 39.2 49.9 45.2C48.7 48.4 46.5 50.8 43.3 52.3H41.5V6.8Z" fill="url(#pcStripe)" opacity=".9"/>
        <g fill="#34414a" opacity=".95" fontFamily="Arial,sans-serif" fontSize="5.2" fontWeight="700" textAnchor="middle"><text x="46" y="18">−</text><text x="46" y="26">−</text><text x="46" y="34">−</text><text x="46" y="42">−</text></g>

        {/* Printed rating. */}
        <g fill="#f8fbff" fontFamily="Arial,sans-serif" fontWeight="700"><text x="18" y="28" fontSize="5.1">100µF</text><text x="18" y="35" fontSize="4.4">25V</text></g>

        {/* Metal safety vent integrated into the top, not a flat decorative ellipse. */}
        <ellipse cx="35" cy="7" rx="20.3" ry="4.45" fill="#07121a" opacity=".96"/>
        <ellipse cx="35" cy="6.65" rx="18.6" ry="3.65" fill="url(#pcMetal)"/>
        <ellipse cx="35" cy="6.42" rx="17.2" ry="3.05" fill="#343d44"/>
        <path d="M19.4 6.15C24.3 4.5 29.5 4.05 35 4.05C40.5 4.05 45.7 4.5 50.6 6.15" fill="none" stroke="#d6dde1" strokeOpacity=".5" strokeWidth=".75"/>

        {/* Real scored safety vent: recessed center plus raised/bright cut edges. */}
        <path d="M21.3 5.45L35 6.2L48.7 5.45" fill="none" stroke="#111a20" strokeWidth="2" strokeLinecap="round"/>
        <path d="M35 4.05V8.55" fill="none" stroke="#0b1116" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M21.8 4.15L48.2 8.3" fill="none" stroke="#c7d0d5" strokeOpacity=".62" strokeWidth=".8" strokeLinecap="round"/>
        <path d="M48.2 4.15L21.8 8.3" fill="none" stroke="#080f14" strokeOpacity=".88" strokeWidth="1" strokeLinecap="round"/>
        <path d="M23.2 5.1L35 5.75L46.8 5.1" fill="none" stroke="#f2f5f6" strokeOpacity=".22" strokeWidth=".55"/>

        {/* Sleeve highlights and cylindrical shading. */}
        <path d="M22.2 11.5C25.4 7.4 30 5.8 34.9 5.5" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M17.8 19C16.8 27.5 17.1 40.5 19.5 46.4" fill="none" stroke="#0a3c65" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    </div>
  )
}
