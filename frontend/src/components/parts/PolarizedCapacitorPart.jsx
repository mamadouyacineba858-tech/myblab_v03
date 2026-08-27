import React from 'react'

export function PolarizedCapacitorPart() {
  return (
    <div className="part-capacitor part-capacitor--polarized" aria-label="Condensateur polarisé">
      <svg viewBox="0 0 70 78" width="70" height="78" role="img" aria-hidden="true">
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
          <filter id="pcShadow" x="-30%" y="-25%" width="160%" height="170%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.1" floodOpacity="0.28"/></filter>
        </defs>
        <line x1="25" y1="53" x2="25" y2="75" stroke="#596672" strokeWidth="5.4" strokeLinecap="round"/>
        <line x1="45" y1="53" x2="45" y2="74" stroke="#596672" strokeWidth="5.4" strokeLinecap="round"/>
        <line x1="25" y1="53" x2="25" y2="75" stroke="url(#pcLead)" strokeWidth="3.5" strokeLinecap="round"/>
        <line x1="45" y1="53" x2="45" y2="74" stroke="url(#pcLead)" strokeWidth="3.5" strokeLinecap="round"/>
        <path d="M35 3.5C24.5 3.5 17 6.5 14.8 14.4C13.2 20.4 13.4 39.5 15.4 45.8C17.1 51.1 21.1 54.3 27.2 55.2C29.8 55.6 32.5 55.8 35 55.8C37.5 55.8 40.2 55.6 42.8 55.2C48.9 54.3 52.9 51.1 54.6 45.8C56.6 39.5 56.8 20.4 55.2 14.4C53 6.5 45.5 3.5 35 3.5Z" fill="url(#pcBody)" filter="url(#pcShadow)"/>
        <path d="M16.1 15.4C18.3 7.7 25.5 4.1 35 4.1S51.7 7.7 53.9 15.4C49.1 12.1 43.1 10.5 35 10.5S20.9 12.1 16.1 15.4Z" fill="#3184c2" opacity="0.62"/>
        <path d="M42.1 6.2C46.7 8.1 49.8 11.8 51.1 17.1C52.2 23.5 52 39.2 49.9 45.2C48.7 48.4 46.5 50.8 43.3 52.3H41.5V6.8Z" fill="url(#pcStripe)" opacity="0.88"/>
        <g fill="#64748b" opacity="0.92" fontSize="5.2" fontWeight="700" textAnchor="middle"><text x="46" y="18">-</text><text x="46" y="26">-</text><text x="46" y="34">-</text><text x="46" y="42">-</text></g>
        <path d="M22.2 11.5C25.4 7.4 30 5.8 34.9 5.5" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M17.8 19C16.8 27.5 17.1 40.5 19.5 46.4" fill="none" stroke="#0a3c65" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M20.1 51.1C24.4 54.5 29.3 55.2 35 55.5C40.7 55.2 45.6 54.5 49.9 51.1" fill="none" stroke="#07385f" strokeOpacity="0.5" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    </div>
  )
}
