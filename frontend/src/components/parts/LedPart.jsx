import React from 'react'

/**
 * Rendu visuel LED (MB-VIS-LED-V2).
 *
 * Contrat strictement inchangé : isOn reste l'unique état visuel dynamique.
 * La géométrie électrique du composant (80×40 et positions de pins) reste
 * définie par componentDefinitions.js et n'est pas modifiée ici.
 */
export function LedPart({ isOn }) {
  const lensFill = isOn ? '#35e878' : '#4b5563'
  const chipFill = isOn ? '#f5fff8' : '#c7cdd3'
  const glowOpacity = isOn ? 0.28 : 0

  return (
    <div
      className={`part-led ${isOn ? 'part-led--on' : ''}`}
      aria-label={isOn ? 'LED allumée' : 'LED éteinte'}
    >
      <svg viewBox="0 0 80 40" width="80" height="40" role="img" aria-hidden="true">
        <line x1="30" y1="34" x2="30" y2="40" className="part-led__leg" />
        <line x1="50" y1="34" x2="50" y2="40" className="part-led__leg" />

        <rect x="18" y="29" width="44" height="7" rx="2" className="part-led__flange" />
        <rect x="20" y="30" width="40" height="2" rx="1" fill="#737b86" opacity="0.55" />

        <path
          d="M20 30 V18 A20 18 0 0 1 60 18 V30 Z"
          className="part-led__dome"
          style={{ fill: lensFill }}
        />

        <ellipse cx="40" cy="24" rx="13" ry="6" fill="#aeb6bf" opacity="0.25" />
        <path d="M27 29 L34 23 L40 26 L46 19 L53 29 Z" fill="#c4cbd2" opacity="0.62" />

        <rect
          x="37.5"
          y="21"
          width="5"
          height="3.5"
          rx="0.7"
          fill={chipFill}
          stroke="#59616a"
          strokeWidth="0.65"
        />
        <line x1="40" y1="21" x2="30" y2="17" stroke="#e3e7eb" strokeWidth="0.7" opacity="0.9" />
        <line x1="40" y1="24.5" x2="50" y2="17" stroke="#e3e7eb" strokeWidth="0.7" opacity="0.9" />

        <circle cx="40" cy="24" r="11" fill="#22c55e" opacity={glowOpacity} pointerEvents="none" />

        <ellipse cx="34" cy="14" rx="6" ry="2.4" fill="#ffffff" opacity="0.58" />
        <path
          d="M22 20 A18 16 0 0 1 28 11"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.35"
        />

        <rect x="29" y="34" width="2" height="6" fill="#7f8792" opacity="0.9" />
        <rect x="49" y="34" width="2" height="6" fill="#7f8792" opacity="0.9" />
        <rect x="58" y="29" width="4" height="2" fill="#d7dde3" opacity="0.85" />
      </svg>
    </div>
  )
}
