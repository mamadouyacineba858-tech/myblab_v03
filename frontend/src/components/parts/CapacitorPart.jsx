import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur traversant.
 *
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * La géométrie visuelle dépasse volontairement la boîte logique 70×40.
 */
export function CapacitorPart() {
  return (
    <div
      className="part-capacitor"
      aria-label="Condensateur"
      style={{
        position: 'relative',
        width: '70px',
        height: '40px',
        overflow: 'visible',
        background: 'transparent',
        border: 0,
        borderRadius: 0,
        boxShadow: 'none',
        display: 'block',
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
        viewBox="0 -52 70 104"
        width="70"
        height="104"
        role="img"
        aria-hidden="true"
        overflow="visible"
        style={{
          position: 'absolute',
          left: 0,
          top: -52,
          width: '70px',
          height: '104px',
          display: 'block',
          overflow: 'visible',
        }}
      >
        <defs>
          <radialGradient id="capacitor-body" cx="29%" cy="13%" r="88%">
            <stop offset="0%" stopColor="#d8efff" />
            <stop offset="15%" stopColor="#76b7df" />
            <stop offset="36%" stopColor="#367fba" />
            <stop offset="68%" stopColor="#125895" />
            <stop offset="100%" stopColor="#063965" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4e5960" />
            <stop offset="24%" stopColor="#b8c1c6" />
            <stop offset="43%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#c4cdd1" />
            <stop offset="82%" stopColor="#eef2f4" />
            <stop offset="100%" stopColor="#515b62" />
          </linearGradient>
        </defs>

        {/* Deux pattes courtes, identiques et verticales. */}
        <path d="M23 35 V78" fill="none" stroke="url(#capacitor-metal)" strokeWidth="4" strokeLinecap="round" />
        <path d="M47 35 V78" fill="none" stroke="url(#capacitor-metal)" strokeWidth="4" strokeLinecap="round" />
        <path d="M22.25 36 V76" fill="none" stroke="#ffffff" strokeWidth="0.72" strokeLinecap="round" opacity="0.72" />
        <path d="M46.25 36 V76" fill="none" stroke="#ffffff" strokeWidth="0.72" strokeLinecap="round" opacity="0.72" />

        {/* Corps : silhouette de goutte large en haut, resserrée vers la base. */}
        <path
          d="M9 34
             C7 27 6 19 7 10
             C8 -14 18 -36 35 -46
             C52 -36 62 -14 63 10
             C64 19 63 27 61 34
             C60 40 56 43 51 42
             C46 41 42 38 35 40
             C28 38 24 41 19 42
             C14 43 10 40 9 34 Z"
          fill="url(#capacitor-body)"
          stroke="#07375e"
          strokeWidth="1.25"
        />

        {/* Volume gauche et reflet principal. */}
        <path
          d="M12 31 C9 21 10 8 12 -2 C15 -22 24 -37 35 -43 C24 -30 19 -14 19 5 C19 19 19 29 16 36 C14 35 13 33 12 31 Z"
          fill="#eef9ff"
          opacity="0.24"
        />
        <ellipse
          cx="27"
          cy="-32"
          rx="11"
          ry="5.5"
          fill="#ffffff"
          opacity="0.7"
          transform="rotate(-27 27 -32)"
        />
        <path
          d="M13 9 C14 0 19 -19 31 -31"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.9"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Ombre droite et modelé inférieur. */}
        <path
          d="M57 -2 C62 12 61 27 57 35 C55 39 52 41 48 40"
          fill="none"
          stroke="#042b4a"
          strokeWidth="3.4"
          strokeLinecap="round"
          opacity="0.28"
        />
        <path
          d="M12 34 C20 38 27 35 35 37 C43 35 50 38 58 34"
          fill="none"
          stroke="#062d4d"
          strokeWidth="1.2"
          opacity="0.5"
        />
      </svg>
    </div>
  )
}
