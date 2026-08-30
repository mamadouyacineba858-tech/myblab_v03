import React from 'react'

/**
 * Rendu visuel réaliste du condensateur traversant.
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * La boîte logique reste 70×40 ; le dessin physique déborde verticalement
 * afin de conserver les proportions réalistes du composant.
 */
export function CapacitorPart() {
  return (
    <div
      className="part-capacitor"
      aria-label="Condensateur"
      style={{
        width: '70px', height: '40px', overflow: 'visible',
        background: 'transparent', border: 0, borderRadius: 0,
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
        viewBox="0 -42 70 114"
        width="70"
        height="114"
        role="img"
        aria-hidden="true"
        overflow="visible"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="capacitor-body" cx="31%" cy="18%" r="82%">
            <stop offset="0%" stopColor="#b9def5" />
            <stop offset="18%" stopColor="#6ca9d4" />
            <stop offset="45%" stopColor="#347db7" />
            <stop offset="76%" stopColor="#14558e" />
            <stop offset="100%" stopColor="#0b3761" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5c676e" />
            <stop offset="28%" stopColor="#dce3e7" />
            <stop offset="48%" stopColor="#ffffff" />
            <stop offset="64%" stopColor="#aeb8bd" />
            <stop offset="100%" stopColor="#515b61" />
          </linearGradient>
        </defs>

        {/* Deux pattes courtes, parallèles et strictement identiques. */}
        <path d="M25 36 V70" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M45 36 V70" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M24.35 37 V68.5" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.72" />
        <path d="M44.35 37 V68.5" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.72" />

        {/* Silhouette de référence : large en haut, resserrée vers le bas. */}
        <path
          d="M15 38
             C11 32 8 24 8 14
             C8 -9 18 -33 35 -37
             C52 -33 62 -9 62 14
             C62 24 59 32 55 38
             C52 43 47 45 43 43
             C40 42 38 39 35 39
             C32 39 30 42 27 43
             C23 45 18 43 15 38 Z"
          fill="url(#capacitor-body)"
          stroke="#0a355b"
          strokeWidth="1.25"
        />

        {/* Volume interne : lumière haute et ombrage bas. */}
        <path
          d="M17 36
             C14 29 12 22 12 14
             C12 -6 21 -27 35 -32
             C25 -24 20 -10 20 8
             C20 20 21 29 18 36 Z"
          fill="#f3fbff"
          opacity="0.24"
        />
        <ellipse cx="29" cy="-24" rx="10" ry="5" fill="#ffffff" opacity="0.62" transform="rotate(-24 29 -24)" />
        <path d="M57 8 C58 19 57 29 53 36 C50 40 47 41 44 40" fill="none" stroke="#062c4d" strokeWidth="3" opacity="0.24" strokeLinecap="round" />
        <path d="M17 36 C23 39 29 37 35 38 C41 37 47 39 53 36" fill="none" stroke="#062b49" strokeWidth="1.1" opacity="0.52" />
      </svg>
    </div>
  )
}
