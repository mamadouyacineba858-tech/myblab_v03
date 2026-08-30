import React from 'react'

/**
 * Rendu visuel réaliste du condensateur traversant.
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * La boîte logique reste 70×40 ; le rendu visuel déborde verticalement.
 */
export function CapacitorPart() {
  return (
    <div
      className="part-capacitor"
      aria-label="Condensateur"
      style={{
        width: '70px', height: '40px', overflow: 'visible',
        background: 'transparent', border: 0, borderRadius: 0, boxShadow: 'none',
      }}
    >
      <svg
        viewBox="0 -30 70 86"
        width="70"
        height="86"
        role="img"
        aria-hidden="true"
        overflow="visible"
        style={{ display: 'block', overflow: 'visible', position: 'relative', top: '-30px' }}
      >
        <defs>
          <radialGradient id="capacitor-body" cx="30%" cy="18%" r="82%">
            <stop offset="0%" stopColor="#b9def5" />
            <stop offset="18%" stopColor="#6ca9d4" />
            <stop offset="45%" stopColor="#347db7" />
            <stop offset="76%" stopColor="#14558e" />
            <stop offset="100%" stopColor="#0b3761" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#59636a" />
            <stop offset="28%" stopColor="#d9e0e4" />
            <stop offset="48%" stopColor="#ffffff" />
            <stop offset="64%" stopColor="#aab4ba" />
            <stop offset="100%" stopColor="#505a61" />
          </linearGradient>
        </defs>

        {/* Pattes : courtes, parallèles, identiques et de même diamètre. */}
        <path d="M25 34 V55" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.8" strokeLinecap="round" />
        <path d="M45 34 V55" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.8" strokeLinecap="round" />
        <path d="M24.35 35 V53.8" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.7" />
        <path d="M44.35 35 V53.8" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.7" />

        {/* Silhouette : largeur proche de la référence, sans effet de poire allongée. */}
        <path
          d="M13 35
             C10 29 8 22 8 14
             C8 -3 15 -19 25 -26
             C28 -28.5 32 -30 35 -30
             C38 -30 42 -28.5 45 -26
             C55 -19 62 -3 62 14
             C62 22 60 29 57 35
             C55 39 51 41 47 40
             C43 39 39 36.5 35 36.5
             C31 36.5 27 39 23 40
             C19 41 15 39 13 35 Z"
          fill="url(#capacitor-body)"
          stroke="#0a355b"
          strokeWidth="1.2"
        />

        {/* Reflet large sur le flanc gauche. */}
        <path
          d="M16 33 C13.5 27 12 20 12 13 C12 -1 18 -16 28 -24 C23 -15 20 -5 20 7 C20 18 21 27 18.5 34 Z"
          fill="#f3fbff"
          opacity="0.24"
        />
        <ellipse cx="28" cy="-20" rx="9" ry="4.5" fill="#ffffff" opacity="0.64" transform="rotate(-24 28 -20)" />
        <path d="M15 10 C16 -1 22 -14 32 -22" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.48" />

        {/* Ombre et creux inférieur. */}
        <path d="M57 10 C58 20 56.5 28 53 35 C50.5 38.5 47.5 39.5 44.5 38.5" fill="none" stroke="#062c4d" strokeWidth="2.8" opacity="0.25" strokeLinecap="round" />
        <path d="M16 35 C22 38 29 35.8 35 36.8 C41 35.8 48 38 54 35" fill="none" stroke="#062b49" strokeWidth="1.05" opacity="0.5" />
      </svg>
    </div>
  )
}
