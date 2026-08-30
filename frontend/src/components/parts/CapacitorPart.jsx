import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur céramique traversant.
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 */
export function CapacitorPart() {
  return (
    <div className="part-capacitor" aria-label="Condensateur">
      <style>{`
        .circuit-component:has(.part-capacitor) .myblab-pin { opacity: 0 !important; }
      `}</style>
      <svg viewBox="0 0 70 64" width="70" height="64" role="img" aria-hidden="true" overflow="visible" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id="cap-body" cx="32%" cy="18%" r="82%">
            <stop offset="0%" stopColor="#73a9d4" />
            <stop offset="24%" stopColor="#357fbd" />
            <stop offset="58%" stopColor="#1762a3" />
            <stop offset="82%" stopColor="#0d4c88" />
            <stop offset="100%" stopColor="#083966" />
          </radialGradient>
          <linearGradient id="cap-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#69747b" />
            <stop offset="28%" stopColor="#f4f6f7" />
            <stop offset="52%" stopColor="#b9c1c6" />
            <stop offset="76%" stopColor="#f0f3f4" />
            <stop offset="100%" stopColor="#59636a" />
          </linearGradient>
          <linearGradient id="cap-highlight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eaf7ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#9fd0f0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Short, equal-diameter through-hole leads. */}
        <path d="M27.5 39 V61" fill="none" stroke="url(#cap-metal)" strokeWidth="3.0" strokeLinecap="round" />
        <path d="M42.5 39 V61" fill="none" stroke="url(#cap-metal)" strokeWidth="3.0" strokeLinecap="round" />
        <path d="M27.05 40 V59.5" fill="none" stroke="#ffffff" strokeWidth="0.55" strokeLinecap="round" opacity="0.7" />
        <path d="M42.05 40 V59.5" fill="none" stroke="#ffffff" strokeWidth="0.55" strokeLinecap="round" opacity="0.7" />

        {/* Reference silhouette: broad rounded shoulder, narrow lower waist, soft concave base. */}
        <path d="M27.5 39
          C25.4 36.8 23.9 33.8 23.8 29.8
          C23.6 25.4 24.4 20.6 25.7 16.5
          C27.3 11.1 30.5 7.0 35 5.1
          C39.5 7.0 42.7 11.1 44.3 16.5
          C45.6 20.6 46.4 25.4 46.2 29.8
          C46.1 33.8 44.6 36.8 42.5 39
          C40.6 40.8 38.7 40.0 37.2 39.2
          C35.9 38.5 34.1 38.5 32.8 39.2
          C31.3 40.0 29.4 40.8 27.5 39 Z"
          fill="url(#cap-body)" stroke="#0b3d69" strokeWidth="1.05" />
        <path d="M26.3 31 C25.7 24 27 14.8 30.6 9.9 C32.2 7.7 33.8 6.5 35.2 6.0 C30.6 8.7 28.1 14.5 28.1 21.2 V34.6 C28 36.5 27.8 38 27.5 39" fill="url(#cap-highlight)" opacity="0.55" />
        <path d="M43.9 16.8 C45.2 23.5 45.1 31.8 42.7 36.9" fill="none" stroke="#062f55" strokeWidth="1.2" opacity="0.42" />
        <path d="M29 38.4 C32.4 39.7 37.6 39.7 41 38.4" fill="none" stroke="#062e50" strokeWidth="0.8" opacity="0.5" />
      </svg>
    </div>
  )
}
