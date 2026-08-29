import React from 'react'

/**
 * Rendu visuel LED (MB-VIS-LED-V2).
 *
 * Contrat strictement inchangé : isOn reste l'unique état visuel dynamique.
 * La géométrie électrique du composant (80×40 et positions de pins) reste
 * définie par componentDefinitions.js et n'est pas modifiée ici.
 */
export function LedPart({ isOn }) {
  return (
    <div
      className={`part-led ${isOn ? 'part-led--on' : ''}`}
      aria-label={isOn ? 'LED allumée' : 'LED éteinte'}
    >
      <svg viewBox="0 0 80 40" width="80" height="40" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="ledLens" x1="0" y1="0" x2="0.85" y2="1">
            <stop offset="0" className="part-led__lens-stop--highlight" />
            <stop offset="0.28" className="part-led__lens-stop--body" />
            <stop offset="1" className="part-led__lens-stop--shadow" />
          </linearGradient>
          <radialGradient id="ledGlow" cx="50%" cy="55%" r="55%">
            <stop offset="0" className="part-led__glow-stop--core" />
            <stop offset="0.45" className="part-led__glow-stop--mid" />
            <stop offset="1" className="part-led__glow-stop--edge" />
          </radialGradient>
          <linearGradient id="ledMetal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" className="part-led__metal-stop--dark" />
            <stop offset="0.45" className="part-led__metal-stop--light" />
            <stop offset="1" className="part-led__metal-stop--dark" />
          </linearGradient>
        </defs>

        <line x1="30" y1="34" x2="30" y2="40" className="part-led__leg" />
        <line x1="50" y1="34" x2="50" y2="40" className="part-led__leg" />

        <rect x="18" y="29" width="44" height="7" rx="2" className="part-led__flange" />
        <rect x="20" y="30" width="40" height="2" rx="1" className="part-led__flange-highlight" />

        <path
          d="M20 30 V18 A20 18 0 0 1 60 18 V30 Z"
          className="part-led__dome"
        />

        <ellipse cx="40" cy="23" rx="14" ry="7" className="part-led__inner-reflector" />
        <path d="M27 29 L34 23 L40 26 L46 19 L53 29 Z" className="part-led__reflector" />
        <rect x="37.5" y="21" width="5" height="3.5" rx="0.7" className="part-led__chip" />
        <line x1="40" y1="21" x2="30" y2="17" className="part-led__bond-wire" />
        <line x1="40" y1="24.5" x2="50" y2="17" className="part-led__bond-wire" />

        <ellipse cx="34" cy="14" rx="6" ry="2.4" className="part-led__highlight" />
        <path d="M22 20 A18 16 0 0 1 28 11" className="part-led__lens-highlight" />

        <circle cx="40" cy="24" r="11" className="part-led__emission" />

        <rect x="29" y="34" width="2" height="6" className="part-led__leg-sleeve" />
        <rect x="49" y="34" width="2" height="6" className="part-led__leg-sleeve" />

        <rect x="58" y="29" width="4" height="2" className="part-led__cathode-mark" />
      </svg>
    </div>
  )
}
