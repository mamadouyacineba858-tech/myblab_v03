import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur céramique traversant.
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 */
export function CapacitorPart() {
  return (
    <div
      className="part-capacitor"
      aria-label="Condensateur"
      style={{ width: '70px', height: '64px', overflow: 'visible', background: 'transparent', border: 0, borderRadius: 0, boxShadow: 'none' }}
    >
      <style>{`
        .circuit-component:has(.part-capacitor) .myblab-pin { opacity: 0 !important; }
        .circuit-component:has(.part-capacitor) .circuit-component__body {
          background: transparent !important; border: 0 !important; box-shadow: none !important;
          border-radius: 0 !important; padding: 0 !important;
        }
      `}</style>
      <svg viewBox="0 0 70 64" width="70" height="64" role="img" aria-hidden="true" overflow="visible" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="capacitor-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#164b80" />
            <stop offset="16%" stopColor="#276da8" />
            <stop offset="38%" stopColor="#4f93c9" />
            <stop offset="54%" stopColor="#397fb8" />
            <stop offset="78%" stopColor="#21619a" />
            <stop offset="100%" stopColor="#103b65" />
          </linearGradient>
          <radialGradient id="capacitor-dome" cx="27%" cy="14%" r="88%">
            <stop offset="0%" stopColor="#f0faff" stopOpacity="0.92" />
            <stop offset="17%" stopColor="#9bcff0" stopOpacity="0.62" />
            <stop offset="43%" stopColor="#4c94c9" stopOpacity="0.48" />
            <stop offset="72%" stopColor="#2369a2" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#0c365d" stopOpacity="0.96" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#59656c" />
            <stop offset="24%" stopColor="#dfe6e9" />
            <stop offset="43%" stopColor="#ffffff" />
            <stop offset="61%" stopColor="#aeb9bf" />
            <stop offset="82%" stopColor="#eef2f4" />
            <stop offset="100%" stopColor="#505b62" />
          </linearGradient>
        </defs>

        {/* Pattes : même diamètre, courtes, verticales et métalliques. */}
        <path d="M28 45 V61" fill="none" stroke={`url(#capacitor-metal)`} strokeWidth="3.1" strokeLinecap="round" />
        <path d="M42 45 V61" fill="none" stroke={`url(#capacitor-metal)`} strokeWidth="3.1" strokeLinecap="round" />
        <path d="M27.45 46 V59.7" fill="none" stroke="#ffffff" strokeWidth="0.58" strokeLinecap="round" opacity="0.76" />
        <path d="M41.45 46 V59.7" fill="none" stroke="#ffffff" strokeWidth="0.58" strokeLinecap="round" opacity="0.76" />

        {/* Silhouette : large bulbe supérieur, épaules souples et col resserré. */}
        <path
          d="M16 40 V18.5 C16 7.7 24.1 1.5 35 1.5 C45.9 1.5 54 7.7 54 18.5 V40 C54 45.4 49.6 48.3 44.1 48.3 C40.4 48.3 38.2 45.8 35 45.8 C31.8 45.8 29.6 48.3 25.9 48.3 C20.4 48.3 16 45.4 16 40 Z"
          fill="url(#capacitor-body)"
          stroke="#103a60"
          strokeWidth="1.15"
        />
        <path
          d="M18.2 39.2 V18.7 C18.2 9.2 25.1 3.7 35 3.7 C44.9 3.7 51.8 9.2 51.8 18.7 V39.2 C51.8 43.3 47.8 46.2 43.7 46.2 C40.2 46.2 38.1 43.8 35 43.8 C31.9 43.8 29.8 46.2 26.3 46.2 C22.2 46.2 18.2 43.3 18.2 39.2 Z"
          fill="url(#capacitor-dome)"
          opacity="0.94"
        />

        {/* Reflets spéculaires et ombre de contact pour donner un vrai volume. */}
        <path d="M21.1 18.8 C22 10.5 27.5 5.1 34.8 4.6 C29.2 7.1 25.7 12.2 25.5 19 V36.5 C24.2 39.4 22.6 40.5 20.8 39.3 Z" fill="#eefaff" opacity="0.30" />
        <path d="M23 11.8 C25.5 7.2 29.2 4.8 34.1 4.2" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" opacity="0.62" />
        <path d="M50.1 18 C49.4 11.1 44.8 6.2 38.8 4.8 C45.5 7.4 48 12.3 48.2 19 V38.8 C49.1 41.3 50.1 41.6 50.2 39 Z" fill="#062946" opacity="0.20" />
        <path d="M19.7 40.2 C25.2 43.2 30.2 41.9 35 41.9 C39.8 41.9 44.8 43.2 50.3 40.2" fill="none" stroke="#082c4b" strokeWidth="1.05" opacity="0.48" />
        <path d="M25.8 46.6 C29.4 47.5 31.7 45.4 35 45.4 C38.3 45.4 40.6 47.5 44.2 46.6" fill="none" stroke="#071f35" strokeWidth="0.72" opacity="0.34" />
      </svg>
    </div>
  )
}
