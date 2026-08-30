import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur traversant.
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * Le dessin physique déborde verticalement de la boîte logique 70×40.
 */
export function CapacitorPart() {
  return (
    <div
      className="part-capacitor"
      aria-label="Condensateur"
      style={{
        width: '70px',
        height: '40px',
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
          overflow: visible !important;
        }
      `}</style>
      <svg
        viewBox="0 -48 70 126"
        width="70"
        height="126"
        role="img"
        aria-hidden="true"
        overflow="visible"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="capacitor-body" cx="31%" cy="17%" r="86%">
            <stop offset="0%" stopColor="#c5e8ff" />
            <stop offset="13%" stopColor="#88c2e8" />
            <stop offset="37%" stopColor="#4f98cf" />
            <stop offset="65%" stopColor="#1f6aa8" />
            <stop offset="88%" stopColor="#124d82" />
            <stop offset="100%" stopColor="#0a3155" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#58636a" />
            <stop offset="22%" stopColor="#cbd4d9" />
            <stop offset="43%" stopColor="#ffffff" />
            <stop offset="61%" stopColor="#aeb7bc" />
            <stop offset="82%" stopColor="#edf1f3" />
            <stop offset="100%" stopColor="#505960" />
          </linearGradient>
        </defs>

        {/* Deux pattes métalliques : même diamètre et même longueur visible. */}
        <path d="M24 46 V84" fill="none" stroke="url(#capacitor-metal)" strokeWidth="4.0" strokeLinecap="round" />
        <path d="M46 46 V84" fill="none" stroke="url(#capacitor-metal)" strokeWidth="4.0" strokeLinecap="round" />
        <path d="M23.3 47 V82.5" fill="none" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />
        <path d="M45.3 47 V82.5" fill="none" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />

        {/* Silhouette de référence : très arrondie en haut, pleine au centre,
            puis resserrée doucement vers le bas avant les deux pattes. */}
        <path
          d="M10 43
             C8 38 7 31 7 23
             C7 1 12 -17 22 -28
             C26 -33 30 -37 35 -39
             C40 -37 44 -33 48 -28
             C58 -17 63 1 63 23
             C63 31 62 38 60 43
             C58 48 53 51 48 50
             C43 49 39 46 35 46
             C31 46 27 49 22 50
             C17 51 12 48 10 43 Z"
          fill="url(#capacitor-body)"
          stroke="#09365c"
          strokeWidth="1.3"
        />

        {/* Lumière principale : large reflet vertical, proche de la référence. */}
        <path
          d="M15 37
             C13 31 12 24 12 16
             C12 -1 18 -17 28 -28
             C23 -19 20 -8 20 7
             C20 19 21 29 18 37
             C17 40 16 40 15 37 Z"
          fill="#f4fbff"
          opacity="0.3"
        />
        <ellipse
          cx="27"
          cy="-27"
          rx="10.5"
          ry="5.8"
          fill="#ffffff"
          opacity="0.68"
          transform="rotate(-24 27 -27)"
        />
        <path
          d="M17 8 C19 -6 24 -18 34 -28"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.52"
        />

        {/* Ombre douce à droite et sous le volume. */}
        <path
          d="M56 13 C58 23 57 34 53 41 C51 45 48 47 44 46"
          fill="none"
          stroke="#052d4d"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.28"
        />
        <path
          d="M12 42 C19 46 27 44 35 45 C43 44 51 46 58 42"
          fill="none"
          stroke="#062a48"
          strokeWidth="1.2"
          opacity="0.52"
        />
      </svg>
    </div>
  )
}
