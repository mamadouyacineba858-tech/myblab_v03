import React from 'react'

/**
 * Rendu visuel réaliste d'une LED traversante.
 * Contrat fonctionnel inchangé : isOn pilote uniquement l'état lumineux.
 * La boîte logique 80×40 et les coordonnées de pins restent inchangées.
 */
export function LedPart({ isOn }) {
  return (
    <div
      className={`part-led ${isOn ? "part-led--on" : ""}`}
      aria-label={isOn ? "LED allumée" : "LED éteinte"}
    >
      <svg viewBox="0 0 80 40" width="80" height="40" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="ledDome" x1="0" y1="0" x2="1" y2="0.9">
            <stop offset="0" stopColor={isOn ? "#ff6b6b" : "#8f1d26"} />
            <stop offset="0.42" stopColor={isOn ? "#ef3030" : "#a51f29"} />
            <stop offset="0.78" stopColor={isOn ? "#b30f18" : "#71131b"} />
            <stop offset="1" stopColor="#4b0b10" />
          </linearGradient>
          <linearGradient id="ledFlange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c5c5c5" />
            <stop offset="0.45" stopColor="#777" />
            <stop offset="1" stopColor="#424242" />
          </linearGradient>
          <linearGradient id="ledMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eeeeee" />
            <stop offset="0.35" stopColor="#9da4aa" />
            <stop offset="0.7" stopColor="#555b60" />
            <stop offset="1" stopColor="#d5d9dc" />
          </linearGradient>
          <radialGradient id="ledGlow">
            <stop offset="0" stopColor="#ffdddd" stopOpacity={isOn ? 0.95 : 0} />
            <stop offset="1" stopColor="#ff3333" stopOpacity="0" />
          </radialGradient>
          <filter id="ledShadow" x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="1.1" stdDeviation="0.75" floodOpacity="0.35" />
          </filter>
        </defs>

        {isOn && <ellipse cx="40" cy="17" rx="25" ry="19" fill="url(#ledGlow)" />}

        <line x1="30" y1="34" x2="30" y2="40" stroke="url(#ledMetal)" strokeWidth="3" strokeLinecap="round" />
        <line x1="50" y1="34" x2="50" y2="40" stroke="url(#ledMetal)" strokeWidth="3" strokeLinecap="round" />

        <path d="M18 29.5 H62 V34.5 H18 Z" fill="url(#ledFlange)" filter="url(#ledShadow)" />
        <path d="M20 29.5 V18 A20 17.5 0 0 1 60 18 V29.5 Z" fill="url(#ledDome)" filter="url(#ledShadow)" />

        <path
          d="M24 27 V18 A16 13.5 0 0 1 36 7"
          fill="none"
          stroke="#fff"
          strokeOpacity=".22"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="40" cy="29.5" rx="19" ry="1.3" fill="#2f2f2f" opacity=".32" />
      </svg>
    </div>
  )
}
