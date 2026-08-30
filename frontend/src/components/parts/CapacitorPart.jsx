import React from 'react'

/**
 * Rendu visuel réaliste du condensateur traversant.
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * La boîte logique reste 70×40 ; le rendu visuel déborde verticalement.
 */
export function CapacitorPart() {
  return (
    <div className="part-capacitor" aria-label="Condensateur" style={{ width: '70px', height: '40px', overflow: 'visible', background: 'transparent', border: 0, borderRadius: 0, boxShadow: 'none' }}>
      <style>{`.circuit-component:has(.part-capacitor) .myblab-pin{opacity:0!important}.circuit-component:has(.part-capacitor) .circuit-component__body{background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:0!important;overflow:visible!important}`}</style>
      <svg viewBox="0 -30 70 88" width="70" height="88" role="img" aria-hidden="true" overflow="visible" style={{ display: 'block', overflow: 'visible', position: 'relative', top: '-30px' }}>
        <defs>
          <radialGradient id="capacitor-body" cx="30%" cy="20%" r="82%">
            <stop offset="0%" stopColor="#c1e4fa" /><stop offset="16%" stopColor="#80b9df" /><stop offset="40%" stopColor="#3f86c0" /><stop offset="70%" stopColor="#185b96" /><stop offset="100%" stopColor="#0a3156" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#59636a" /><stop offset="28%" stopColor="#d9e0e4" /><stop offset="48%" stopColor="#ffffff" /><stop offset="64%" stopColor="#aab4ba" /><stop offset="100%" stopColor="#505a61" />
          </linearGradient>
        </defs>

        <path d="M24 37 V58" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.8" strokeLinecap="round" />
        <path d="M46 37 V58" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.8" strokeLinecap="round" />
        <path d="M23.35 38 V56.8" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.7" />
        <path d="M45.35 38 V56.8" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.7" />

        {/* Corps volontairement large : presque pleine largeur au milieu, étranglement tardif. */}
        <path d="M9 37 C6 31 5 24 5 16 C5 1 9 -12 16 -21 C21 -27 27 -30 35 -30 C43 -30 49 -27 54 -21 C61 -12 65 1 65 16 C65 24 64 31 61 37 C59 41 55 43 50 42 C45 41 40 38 35 38 C30 38 25 41 20 42 C15 43 11 41 9 37 Z" fill="url(#capacitor-body)" stroke="#0a355b" strokeWidth="1.2" />

        <path d="M13 35 C10.5 28 10 21 10 14 C10 1 15 -12 24 -21 C20 -13 17 -3 17 8 C17 19 18 28 15.5 35 Z" fill="#f3fbff" opacity="0.27" />
        <ellipse cx="27" cy="-20" rx="10" ry="4.8" fill="#ffffff" opacity="0.64" transform="rotate(-24 27 -20)" />
        <path d="M14 10 C15 -1 21 -13 31 -22" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        <path d="M59 11 C60 20 58 29 54 36 C51.5 40 48 41 44 39.5" fill="none" stroke="#062c4d" strokeWidth="2.8" opacity="0.25" strokeLinecap="round" />
        <path d="M13 37 C21 40 28 37.5 35 38.5 C42 37.5 49 40 57 37" fill="none" stroke="#062b49" strokeWidth="1.05" opacity="0.5" />
      </svg>
    </div>
  )
}
