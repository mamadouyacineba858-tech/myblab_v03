import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur traversant.
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * Silhouette compacte inspirée de la référence validée.
 */
export function CapacitorPart() {
  return (
    <div className="part-capacitor" aria-label="Condensateur" style={{ position:'relative', width:'70px', height:'40px', overflow:'visible', background:'transparent', border:0, borderRadius:0, boxShadow:'none', display:'block' }}>
      <style>{`.circuit-component:has(.part-capacitor) .myblab-pin{opacity:0!important}.circuit-component:has(.part-capacitor) .circuit-component__body{background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:0!important;overflow:visible!important}`}</style>
      <svg viewBox="0 -20 70 80" width="70" height="80" role="img" aria-hidden="true" overflow="visible" style={{position:'absolute',left:0,top:'-20px',width:'70px',height:'80px',display:'block',overflow:'visible'}}>
        <defs>
          <radialGradient id="capacitor-body" cx="29%" cy="18%" r="82%">
            <stop offset="0%" stopColor="#bfe2f8"/><stop offset="17%" stopColor="#75afd9"/><stop offset="43%" stopColor="#347db7"/><stop offset="74%" stopColor="#14558e"/><stop offset="100%" stopColor="#0b3761"/>
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#59636a"/><stop offset="28%" stopColor="#d9e0e4"/><stop offset="48%" stopColor="#ffffff"/><stop offset="64%" stopColor="#aab4ba"/><stop offset="100%" stopColor="#505a61"/>
          </linearGradient>
        </defs>

        <path d="M24 38 V59" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.6" strokeLinecap="round"/>
        <path d="M46 38 V59" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.6" strokeLinecap="round"/>
        <path d="M23.35 39 V57.8" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>
        <path d="M45.35 39 V57.8" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.7"/>

        {/* Corps compact : largeur dominante, sommet arrondi, côtés presque droits. */}
        <path d="M11 37 C8 33 7 27 7 20 C7 7 9 0 13 -7 C18 -16 26 -20 35 -20 C44 -20 52 -16 57 -7 C61 0 63 7 63 20 C63 27 62 33 59 37 C57 40 53 42 49 41 C44 40 40 38 35 38 C30 38 26 40 21 41 C17 42 13 40 11 37 Z" fill="url(#capacitor-body)" stroke="#0a355b" strokeWidth="1.2"/>

        <path d="M15 34 C12 28 11 22 11 16 C11 5 15 -5 22 -13 C19 -5 17 4 17 14 C17 23 19 30 16 35 Z" fill="#f3fbff" opacity="0.28"/>
        <ellipse cx="27" cy="-11" rx="9" ry="4.4" fill="#ffffff" opacity="0.64" transform="rotate(-24 27 -11)"/>
        <path d="M14 14 C16 4 20 -5 29 -13" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
        <path d="M58 16 C59 25 57 32 53 37 C50 40 47 40 44 39" fill="none" stroke="#062c4d" strokeWidth="2.8" opacity="0.25" strokeLinecap="round"/>
        <path d="M14 37 C21 40 28 38 35 39 C42 38 49 40 56 37" fill="none" stroke="#062b49" strokeWidth="1.05" opacity="0.5"/>
      </svg>
    </div>
  )
}
