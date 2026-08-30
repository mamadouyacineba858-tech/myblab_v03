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
        viewBox="0 -38 70 100"
        width="70"
        height="100"
        role="img"
        aria-hidden="true"
        overflow="visible"
        style={{ display: 'block', overflow: 'visible', position: 'relative', top: '-38px' }}
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

        {/* Deux pattes courtes, parallèles, identiques et de même diamètre. */}
        <path d="M24 39 V68" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.8" strokeLinecap="round" />
        <path d="M46 39 V68" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.8" strokeLinecap="round" />
        <path d="M23.35 40 V66.8" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.7" />
        <path d="M45.35 40 V66.8" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.7" />

        {/* Silhouette : large et arrondie, avec étranglement uniquement près de la base. */}
        <path
          d="M8 39
             C5.5 33 4 25 4 16
             C4 -4 9 -21 18 -31
             C22.5 -36 28.5 -39 35 -39
             C41.5 -39 47.5 -36 52 -31
             C61 -21 66 -4 66 16
             C66 25 64.5 33 62 39
             C60 44 56 47 51 47
             C46 47 41 43 35 43
             C29 43 24 47 19 47
             C14 47 10 44 8 39 Z"
          fill="url(#capacitor-body)"
          stroke="#0a355b"
          strokeWidth="1.2"
        />

        {/* Reflet large et doux. */}
        <path
          d="M14 36 C11 29 10 22 10 14 C10 -2 16 -18 26 -28 C21 -17 18 -6 18 7 C18 19 19 29 16 36 Z"
          fill="#f3fbff"
          opacity="0.25"
        />
        <ellipse cx="27" cy="-27" rx="10" ry="5" fill="#ffffff" opacity="0.64" transform="rotate(-24 27 -27)" />
        <path d="M14 9 C16 -3 21 -16 31 -25" fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" opacity="0.48" />

        {/* Ombre droite et creux inférieur. */}
        <path d="M59 10 C61 21 59 31 55 38 C52 43 48 44 44 42" fill="none" stroke="#062c4d" strokeWidth="2.8" opacity="0.25" strokeLinecap="round" />
        <path d="M12 39 C20 43 27 40.5 35 42 C43 40.5 50 43 58 39" fill="none" stroke="#062b49" strokeWidth="1.05" opacity="0.5" />
      </svg>
    </div>
  )
}