import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur céramique traversant.
 *
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * Le dessin visuel reste indépendant des endpoints électriques afin de
 * conserver la connectivité existante tout en reproduisant la silhouette
 * physique du composant : corps bleu bombé et deux pattes métalliques.
 */
export function CapacitorPart() {
  return (
    <div
      className="part-capacitor"
      aria-label="Condensateur"
      style={{
        width: '70px',
        height: '64px',
        overflow: 'visible',
        background: 'transparent',
        border: 0,
        borderRadius: 0,
        boxShadow: 'none',
      }}
    >
      <style>{`
        .circuit-component:has(.part-capacitor) .myblab-pin {
          opacity: 0 !important;
        }
        .circuit-component:has(.part-capacitor) .circuit-component__body {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
        }
      `}</style>

      <svg
        viewBox="0 0 70 64"
        width="70"
        height="64"
        role="img"
        aria-hidden="true"
        overflow="visible"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="capacitor-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#174f86" />
            <stop offset="18%" stopColor="#2f78b5" />
            <stop offset="46%" stopColor="#5598cb" />
            <stop offset="72%" stopColor="#28689f" />
            <stop offset="100%" stopColor="#12436f" />
          </linearGradient>
          <radialGradient id="capacitor-dome" cx="30%" cy="15%" r="86%">
            <stop offset="0%" stopColor="#e7f7ff" stopOpacity="0.88" />
            <stop offset="20%" stopColor="#8bc4e8" stopOpacity="0.58" />
            <stop offset="54%" stopColor="#347db7" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#103e68" stopOpacity="0.96" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#626d74" />
            <stop offset="28%" stopColor="#f4f7f8" />
            <stop offset="50%" stopColor="#b9c2c7" />
            <stop offset="76%" stopColor="#f0f3f4" />
            <stop offset="100%" stopColor="#566168" />
          </linearGradient>
        </defs>

        {/* Pattes physiques : même diamètre, même longueur, sous le corps. */}
        <path d="M28 45 V62" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M42 45 V62" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M27.42 46 V60.5" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.7" />
        <path d="M41.42 46 V60.5" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.7" />

        {/* Corps de référence : bulbe haut, épaules arrondies et base resserrée. */}
        <path
          d="M17 41 V19 C17 8.4 24.7 2 35 2 C45.3 2 53 8.4 53 19 V41 C53 46.1 49.1 48.8 44.2 48.8 C40.3 48.8 38.4 46.1 35 46.1 C31.6 46.1 29.7 48.8 25.8 48.8 C20.9 48.8 17 46.1 17 41 Z"
          fill="url(#capacitor-body)"
          stroke="#123e63"
          strokeWidth="1.15"
        />
        <path
          d="M19 40 V19 C19 10 25.5 4.2 35 4.2 C44.5 4.2 51 10 51 19 V40 C51 43.8 47.8 46.5 43.8 46.5 C40.4 46.5 38.3 44.4 35 44.4 C31.7 44.4 29.6 46.5 26.2 46.5 C22.2 46.5 19 43.8 19 40 Z"
          fill="url(#capacitor-dome)"
          opacity="0.92"
        />

        {/* Reflet latéral, donnant au boîtier son volume arrondi. */
        <path
          d="M21 19 C22 10.8 27.3 5.8 34.7 5.1 C29.5 7.1 25.5 12.1 25.2 19 V40 C24.1 42.3 22.6 43.1 20.9 42.2 Z"
          fill="#edf9ff"
          opacity="0.26"
        />
        <path
          d="M49.8 18 C49.2 11.2 44.3 6.4 38.8 5.1 C45.8 7.3 48.2 12.5 48.4 19 V40 C49 42.2 50 42.5 50.1 40 Z"
          fill="#082b49"
          opacity="0.18"
        />
        <path
          d="M20.2 40.5 C25.8 43.6 30.1 42.5 35 42.5 C39.9 42.5 44.2 43.6 49.8 40.5"
          fill="none"
          stroke="#0b3150"
          strokeWidth="0.9"
          opacity="0.42"
        />
      </svg>
    </div>
  )
}
