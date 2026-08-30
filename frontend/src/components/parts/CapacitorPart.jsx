import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur radial/disque.
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * Le rendu visuel déborde volontairement de la boîte logique 70×40.
 */
export function CapacitorPart() {
  return (
    <div
      className="part-capacitor"
      aria-label="Condensateur"
      style={{
        position: 'relative', width: '70px', height: '40px', overflow: 'visible',
        background: 'transparent', border: 0, borderRadius: 0, boxShadow: 'none', display: 'block',
      }}
    >
      <style>{`.circuit-component:has(.part-capacitor) .myblab-pin{opacity:0!important}.circuit-component:has(.part-capacitor) .circuit-component__body{background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:0!important;overflow:visible!important}`}</style>

      <svg
        viewBox="0 -42 70 100"
        width="70"
        height="100"
        role="img"
        aria-hidden="true"
        overflow="visible"
        style={{ position:'absolute', left:0, top:'-42px', width:'70px', height:'100px', display:'block', overflow:'visible' }}
      >
        <defs>
          <radialGradient id="capacitor-disk" cx="32%" cy="25%" r="78%">
            <stop offset="0%" stopColor="#ffe6a3" />
            <stop offset="24%" stopColor="#f6bd43" />
            <stop offset="62%" stopColor="#d98b12" />
            <stop offset="88%" stopColor="#b96908" />
            <stop offset="100%" stopColor="#8c4d05" />
          </radialGradient>
          <linearGradient id="capacitor-lead" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#596066" />
            <stop offset="28%" stopColor="#b8bec2" />
            <stop offset="48%" stopColor="#f3f5f6" />
            <stop offset="64%" stopColor="#9da5aa" />
            <stop offset="100%" stopColor="#50575c" />
          </linearGradient>
          <filter id="capacitor-shadow" x="-30%" y="-30%" width="160%" height="170%">
            <feGaussianBlur stdDeviation="0.9" />
          </filter>
        </defs>

        {/* Deux longues pattes métalliques identiques. */}
        <path d="M24 34 V88" fill="none" stroke="#172027" strokeWidth="3.1" strokeLinecap="round" opacity="0.32" filter="url(#capacitor-shadow)" />
        <path d="M46 34 V88" fill="none" stroke="#172027" strokeWidth="3.1" strokeLinecap="round" opacity="0.32" filter="url(#capacitor-shadow)" />
        <path d="M24 34 V88" fill="none" stroke="url(#capacitor-lead)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M46 34 V88" fill="none" stroke="url(#capacitor-lead)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M23.55 35 V86.5" fill="none" stroke="#ffffff" strokeWidth="0.45" strokeLinecap="round" opacity="0.62" />
        <path d="M45.55 35 V86.5" fill="none" stroke="#ffffff" strokeWidth="0.45" strokeLinecap="round" opacity="0.62" />

        {/* Corps disque : forme circulaire légèrement aplatie, proche du premier modèle fourni. */}
        <ellipse cx="35" cy="7" rx="25.5" ry="26" fill="#713d05" opacity="0.28" filter="url(#capacitor-shadow)" />
        <path
          d="M35 -19
             C49 -19 60 -8 60 7
             C60 22 49 33 35 33
             C21 33 10 22 10 7
             C10 -8 21 -19 35 -19 Z"
          fill="url(#capacitor-disk)"
          stroke="#9b5908"
          strokeWidth="1.2"
        />

        {/* Reflets du vernis/moulage. */
        <path
          d="M18 16 C14 8 15 -2 20 -9 C24 -14 28 -17 33 -18 C26 -12 22 -5 22 4 C22 10 23 16 21 20 Z"
          fill="#fff4c9"
          opacity="0.34"
        />
        <ellipse cx="25" cy="-8" rx="7.5" ry="3.5" fill="#fff9df" opacity="0.55" transform="rotate(-25 25 -8)" />
        <path d="M17 8 C18 -2 23 -10 31 -15" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.42" />

        {/* Marquage discret, comme sur un composant réel. */}
        <text x="35" y="5.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="5.4" fontWeight="700" fill="#713b08" opacity="0.78">104</text>
        <text x="35" y="11.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="3.4" fontWeight="600" fill="#713b08" opacity="0.68">50V</text>

        {/* Petit liseré inférieur. */}
        <path d="M15 20 C21 29 28 32 35 32 C42 32 49 29 55 20" fill="none" stroke="#9c5908" strokeWidth="0.9" opacity="0.58" />
      </svg>
    </div>
  )
}
