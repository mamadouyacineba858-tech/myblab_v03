import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur céramique traversant.
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * Le rendu déborde volontairement de la boîte logique afin de conserver
 * une silhouette réaliste sans modifier les coordonnées électriques.
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
          border-radius: 0 !important; padding: 0 !important; overflow: visible !important;
        }
      `}</style>
      <svg viewBox="0 0 70 64" width="84" height="77" role="img" aria-hidden="true" overflow="visible" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="capacitor-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#164b80" />
            <stop offset="16%" stopColor="#276da8" />
            <stop offset="38%" stopColor="#5a9ed0" />
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
        <path d="M25 46 V61" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.1" strokeLinecap="round" />
        <path d="M45 46 V61" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.1" strokeLinecap="round" />
        <path d="M24.45 47 V59.7" fill="none" stroke="#ffffff" strokeWidth="0.58" strokeLinecap="round" opacity="0.76" />
        <path d="M44.45 47 V59.7" fill="none" stroke="#ffffff" strokeWidth="0.58" strokeLinecap="round" opacity="0.76" />

        {/* Silhouette : corps large, bombé, resserré à la base comme la référence. */}
        <path
          d="M5 42 V19 C5 7.2 17.2 1 35 1 C52.8 1 65 7.2 65 19 V42 C65 47.6 59 51 51.5 51 C45.8 51 41.5 47.6 35 47.6 C28.5 47.6 24.2 51 18.5 51 C11 51 5 47.6 5 42 Z"
          fill="url(#capacitor-body)"
          stroke="#103a60"
          strokeWidth="1.15"
        />
        <path
          d="M7.2 41 V19.2 C7.2 9.2 17.9 3.2 35 3.2 C52.1 3.2 62.8 9.2 62.8 19.2 V41 C62.8 45.4 57.4 48.6 51 48.6 C45.4 48.6 41.3 45.2 35 45.2 C28.7 45.2 24.6 48.6 19 48.6 C12.6 48.6 7.2 45.4 7.2 41 Z"
          fill="url(#capacitor-dome)"
          opacity="0.94"
        />

        {/* Reflets spéculaires et ombres de volume. */}
        <path d="M10.8 19.5 C11.7 10.1 20.7 4.2 34.6 3.4 C25.8 6 18.9 12.1 18.5 19.7 V40.5 C17.2 43.4 14.1 44.7 10.7 42.6 Z" fill="#eefaff" opacity="0.31" />
        <path d="M14.2 13.4 C17.6 7.3 24.4 4.3 33.1 3.7" fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" opacity="0.66" />
        <path d="M59.2 18.5 C58.4 10.7 51.9 5.5 43.2 3.8 C53.1 7.1 56.4 12.3 56.5 19.4 V40.1 C57.7 43 59.1 43.2 59.4 39.7 Z" fill="#062946" opacity="0.21" />
        <path d="M9.5 41.5 C18.1 45.1 25.4 43.3 35 43.3 C44.6 43.3 51.9 45.1 60.5 41.5" fill="none" stroke="#082c4b" strokeWidth="1.05" opacity="0.48" />
        <path d="M18.4 48.8 C24.8 50 29 46.5 35 46.5 C41 46.5 45.2 50 51.6 48.8" fill="none" stroke="#071f35" strokeWidth="0.72" opacity="0.36" />
      </svg>
    </div>
  )
}
