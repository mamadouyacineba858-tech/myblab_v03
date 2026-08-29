import React from 'react'

/**
 * Rendu visuel LED traversante (MB-VIS-LED-V5).
 *
 * Le contrat électrique reste inchangé : componentDefinitions.js conserve les
 * pins canoniques anode (0,20) et cathode (80,20). La présentation projette
 * uniquement les points de connexion vers les extrémités physiques des pattes
 * (28,60) et (52,60) via pinPresentationGeometry.js.
 */
export function LedPart({ isOn }) {
  const lens = isOn ? '#ef3038' : '#8f2024'
  const lensDark = isOn ? '#b31222' : '#5f171b'
  const lensLight = isOn ? '#ff8585' : '#c34b50'
  const chip = isOn ? '#fff7f7' : '#d8c8c8'
  const glow = isOn ? 0.34 : 0

  return (
    <div
      className={`part-led ${isOn ? 'part-led--on' : ''}`}
      aria-label={isOn ? 'LED allumée' : 'LED éteinte'}
      style={{
        background: 'transparent',
        boxShadow: 'none',
        border: '0',
        borderRadius: 0,
        filter: isOn ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.55))' : 'none',
      }}
    >
      <svg
        viewBox="0 0 80 64"
        width="80"
        height="64"
        role="img"
        aria-hidden="true"
        overflow="visible"
      >
        {/* Pattes traversantes : connexion visuelle au bout réel des pattes. */}
        <path
          d="M28 34 L28 46 L28 60"
          fill="none"
          stroke="#777f88"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M52 34 L52 46 L52 60"
          fill="none"
          stroke="#777f88"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27.35 35 L27.35 46 L27.35 59.5"
          fill="none"
          stroke="#d9dde1"
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.72"
        />
        <path
          d="M51.35 35 L51.35 46 L51.35 59.5"
          fill="none"
          stroke="#d9dde1"
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.72"
        />

        {/* Collerette plastique typique d'une LED traversante. */}
        <path
          d="M14 31 H66 V35 Q66 38 63 38 H17 Q14 38 14 35 Z"
          fill="#8d2028"
          stroke="#451419"
          strokeWidth="0.9"
        />
        <path d="M16 31.5 H64 V33.3 H16 Z" fill="#d04a4f" opacity="0.72" />
        <path d="M16 36.2 H64" stroke="#4a171b" strokeWidth="0.8" opacity="0.8" />

        {/* Dôme rouge réaliste. */}
        <path
          d="M15 31 V17 C15 8.6 26.2 2 40 2 C53.8 2 65 8.6 65 17 V31 Z"
          fill={lens}
          stroke="#65151b"
          strokeWidth="1.2"
        />
        <path
          d="M16.5 29.5 V17.2 C16.5 9.8 26.6 3.7 40 3.7 C53.4 3.7 63.5 9.8 63.5 17.2 V29.5 Z"
          fill={lensDark}
          opacity="0.38"
        />

        {/* Réflecteur, chip et fils de bonding. */}
        <ellipse cx="40" cy="27" rx="15" ry="5.5" fill="#f0b5b5" opacity={isOn ? 0.24 : 0.16} />
        <path d="M25 31 L32 25 L40 28 L48 22.5 L55 31 Z" fill="#d8dde2" opacity="0.72" />
        <path d="M29 30 L35 26 L40 27.5 L45 24 L51 30" fill="none" stroke="#ffffff" strokeWidth="0.65" opacity="0.6" />

        <rect x="37.3" y="24.5" width="5.4" height="3.6" rx="0.7" fill={chip} stroke="#6d4b4e" strokeWidth="0.6" />
        <line x1="40" y1="24.5" x2="31" y2="19" stroke="#eceff2" strokeWidth="0.7" opacity="0.9" />
        <line x1="42" y1="27.5" x2="50" y2="20" stroke="#eceff2" strokeWidth="0.7" opacity="0.9" />

        {/* Émission localisée. */}
        <circle cx="40" cy="26" r="12" fill="#ff3b30" opacity={glow} pointerEvents="none" />
        {isOn && (
          <circle cx="40" cy="26" r="4.5" fill="#fff4f4" opacity="0.8" pointerEvents="none" />
        )}

        {/* Reflets de lentille. */}
        <ellipse cx="29" cy="10.5" rx="7" ry="2.3" fill={lensLight} opacity="0.78" transform="rotate(-18 29 10.5)" />
        <path d="M19 21 C20 14.5 24 10 30 7" fill="none" stroke="#ffd6d6" strokeWidth="1.25" strokeLinecap="round" opacity="0.62" />

        {/* Repère cathode sur la collerette. */}
        <path d="M61 31 L63 33 H59 Z" fill="#f1f4f6" opacity="0.95" />
      </svg>
    </div>
  )
}
