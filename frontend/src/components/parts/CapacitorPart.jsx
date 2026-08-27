import React from 'react'

/**
 * Rendu visuel réaliste du condensateur non polarisé.
 *
 * Le contrat électrique reste inchangé : deux bornes passives horizontales
 * aux extrémités de la boîte 70×40. Seule la présentation physique évolue.
 * Aucun marquage de polarité n'est affiché : ce composant représente le
 * condensateur non polarisé actuel.
 */
export function CapacitorPart() {
  return (
    <div className="part-capacitor" aria-label="Condensateur non polarisé">
      <svg viewBox="0 0 70 40" width="70" height="40" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="capacitorMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef2f5" />
            <stop offset="0.42" stopColor="#aeb8c3" />
            <stop offset="1" stopColor="#66727e" />
          </linearGradient>
          <linearGradient id="capacitorCeramic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1cf" />
            <stop offset="0.28" stopColor="#e5c58c" />
            <stop offset="0.62" stopColor="#c79b5b" />
            <stop offset="1" stopColor="#916b3d" />
          </linearGradient>
          <linearGradient id="capacitorEdge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#79542f" />
            <stop offset="0.5" stopColor="#d7ad70" />
            <stop offset="1" stopColor="#76512d" />
          </linearGradient>
          <filter id="capacitorShadow" x="-20%" y="-50%" width="140%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="0.7" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* Metal leads use the same visual treatment as the resistor leads. */}
        <line x1="0" y1="20" x2="20" y2="20" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="50" y1="20" x2="70" y2="20" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" />
        <line x1="0" y1="19.25" x2="20" y2="19.25" stroke="url(#capacitorMetal)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="50" y1="19.25" x2="70" y2="19.25" stroke="url(#capacitorMetal)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="1" y1="18.35" x2="19" y2="18.35" stroke="#fff" strokeOpacity=".42" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="51" y1="18.35" x2="69" y2="18.35" stroke="#fff" strokeOpacity=".42" strokeWidth="0.8" strokeLinecap="round" />

        {/* Rounded ceramic disc: deliberately no + / - marking. */}
        <ellipse cx="35" cy="20" rx="16" ry="13" fill="url(#capacitorCeramic)" filter="url(#capacitorShadow)" />
        <ellipse cx="35" cy="20" rx="16" ry="13" fill="none" stroke="url(#capacitorEdge)" strokeWidth="1.1" />
        <path d="M23 12.5 C28 9.5 40 8.7 47 12" fill="none" stroke="#fff" strokeOpacity=".42" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M22.5 27 C29 29.8 41 30.2 47.5 27" fill="none" stroke="#6e4b29" strokeOpacity=".25" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  )
}
