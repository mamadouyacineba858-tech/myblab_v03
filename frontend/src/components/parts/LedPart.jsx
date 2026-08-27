import React from 'react'

/**
 * Rendu visuel réaliste d'une LED traversante.
 * Contrat fonctionnel inchangé : isOn pilote uniquement l'état lumineux.
 * La boîte logique 80×40 et les coordonnées de pins restent inchangées.
 */
export function LedPart({ isOn }) {
  return (
    <div
      className={`part-led ${isOn ? 'part-led--on' : ''}`}
      aria-label={isOn ? 'LED allumée' : 'LED éteinte'}
      style={{
        background: 'transparent',
        boxShadow: 'none',
      }}
    >
      <svg viewBox="0 0 80 40" width="80" height="40" role="img" aria-hidden="true" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="ledDome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={isOn ? '#ff8f8f' : '#b7353d'} />
            <stop offset="0.28" stopColor={isOn ? '#ff4545' : '#a51f29'} />
            <stop offset="0.62" stopColor={isOn ? '#dc171f' : '#80151d'} />
            <stop offset="1" stopColor={isOn ? '#850b12' : '#4c0a10'} />
          </linearGradient>
          <linearGradient id="ledFlange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e1e3e5" />
            <stop offset="0.28" stopColor="#aeb3b7" />
            <stop offset="0.65" stopColor="#686d71" />
            <stop offset="1" stopColor="#3b3f42" />
          </linearGradient>
          <linearGradient id="ledMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7f8f9" />
            <stop offset="0.3" stopColor="#aeb5ba" />
            <stop offset="0.65" stopColor="#555c61" />
            <stop offset="1" stopColor="#dfe3e6" />
          </linearGradient>
          <radialGradient id="ledGlow">
            <stop offset="0" stopColor="#fff5f5" stopOpacity={isOn ? 0.95 : 0} />
            <stop offset="0.42" stopColor="#ff5555" stopOpacity={isOn ? 0.35 : 0} />
            <stop offset="1" stopColor="#ff2222" stopOpacity="0" />
          </radialGradient>
          <filter id="ledShadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="1" stdDeviation="0.7" floodOpacity="0.3" />
          </filter>
        </defs>

        {isOn && <ellipse cx="40" cy="18" rx="28" ry="20" fill="url(#ledGlow)" />}

        {/* Pattes traversantes verticales, volontairement épaisses comme les fils de la résistance. */}
        <line x1="31" y1="30" x2="31" y2="45" stroke="url(#ledMetal)" strokeWidth="4" strokeLinecap="round" />
        <line x1="49" y1="30" x2="49" y2="45" stroke="url(#ledMetal)" strokeWidth="4" strokeLinecap="round" />

        {/* Flasque métallique : bord mince et volume, sans enveloppe noire. */}
        <path d="M18 28.5 H62 V34 H18 Z" fill="url(#ledFlange)" filter="url(#ledShadow)" />
        <path d="M20 28.5 V18 A20 17.5 0 0 1 60 18 V28.5 Z" fill="url(#ledDome)" filter="url(#ledShadow)" />

        {/* Reflet du plastique bombé. */}
        <path
          d="M24 26.5 V18 A16 14 0 0 1 35.5 8"
          fill="none"
          stroke="#fff"
          strokeOpacity=".25"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M56 20 A16 13 0 0 1 54 25"
          fill="none"
          stroke="#300408"
          strokeOpacity=".28"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M20 28.5 H60" stroke="#25282a" strokeOpacity=".45" strokeWidth="1" />
      </svg>
    </div>
  )
}
