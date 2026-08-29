import React from 'react'

/**
 * Rendu visuel LED traversante (MB-VIS-LED-V5).
 *
 * Le contrat électrique reste inchangé : componentDefinitions.js conserve les
 * pins canoniques anode (0,20) et cathode (80,20). La présentation projette
 * uniquement les points de connexion vers les extrémités physiques des pattes
 * (28,40) et (52,40) via pinPresentationGeometry.js.
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
      <svg viewBox="0 0 80 40" width="80" height="40" role="img" aria-hidden="true" overflow="visible">
        {/* Pattes traversantes : verticales et raccordées à leurs pieds. */}
        <path d="M28 27 L28 34 L28 40" fill="none" stroke="#777f88" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M52 27 L52 34 L52 40" fill="none" stroke="#777f88" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M27.35 28 L27.35 34 L27.35 39.5" fill="none" stroke="#d9dde1" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />
        <path d="M51.35 28 L51.35 34 L51.35 39.5" fill="none" stroke="#d9dde1" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />

        {/* Collerette plastique typique d'une LED traversante. */}
        <path d="M14 25.5 H66 V28.5 Q66 31 63 31 H17 Q14 31 14 28.5 Z" fill="#8d2028" stroke="#451419" strokeWidth="0.9" />
        <path d="M16 26 H64 V27.6 H16 Z" fill="#d04a4f" opacity="0.72" />
        <path d="M16 29.7 H64" stroke="#4a171b" strokeWidth="0.8" opacity="0.8" />

        {/* Dôme rouge réaliste. */}
        <path d="M15 26 V15 C15 7.7 26.2 2 40 2 C53.8 2 65 7.7 65 15 V26 Z" fill={lens} stroke="#65151b" strokeWidth="1.2" />
        <path d="M16.5 24.5 V15.2 C16.5 8.9 26.6 3.7 40 3.7 C53.4 3.7 63.5 8.9 63.5 15.2 V24.5 Z" fill={lensDark} opacity="0.38" />

        {/* Réflecteur, chip et fils de bonding. */}
        <ellipse cx="40" cy="23" rx="15" ry="5.2" fill="#f0b5b5" opacity={isOn ? 0.24 : 0.16} />
        <path d="M25 26 L32 21 L40 24 L48 19.5 L55 26 Z" fill="#d8dde2" opacity="0.72" />
        <path d="M29 25 L35 22 L40 23.5 L45 21 L51 25" fill="none" stroke="#ffffff" strokeWidth="0.65" opacity="0.6" />
        <rect x="37.3" y="21" width="5.4" height="3.6" rx="0.7" fill={chip} stroke="#6d4b4e" strokeWidth="0.6" />
        <line x1="40" y1="21" x2="31" y2="16" stroke="#eceff2" strokeWidth="0.7" opacity="0.9" />
        <line x1="42" y1="24" x2="50" y2="17" stroke="#eceff2" strokeWidth="0.7" opacity="0.9" />

        {/* Émission localisée. */}
        <circle cx="40" cy="22.5" r="11" fill="#ff3b30" opacity={glow} pointerEvents="none" />
        {isOn && <circle cx="40" cy="22.5" r="4.2" fill="#fff4f4" opacity="0.8" pointerEvents="none" />}

        {/* Reflets de lentille. */}
        <ellipse cx="29" cy="9.5" rx="7" ry="2.3" fill={lensLight} opacity="0.78" transform="rotate(-18 29 9.5)" />
        <path d="M19 19 C20 13 24 8.8 30 6.5" fill="none" stroke="#ffd6d6" strokeWidth="1.25" strokeLinecap="round" opacity="0.62" />

        {/* Repère cathode sur la collerette. */}
        <path d="M61 26 L63 27.6 H59 Z" fill="#f1f4f6" opacity="0.95" />
      </svg>
    </div>
  )
}
