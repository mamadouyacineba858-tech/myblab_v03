import React from 'react'

/**
 * Rendu visuel LED traversante.
 *
 * Le contrat électrique reste inchangé : les pins canoniques sont conservés
 * dans componentDefinitions.js. Le dessin dépasse volontairement la hauteur
 * de la bounding box logique afin de représenter les longues pattes d'une LED
 * 5 mm sans déplacer les coordonnées électriques.
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
        width: '100%',
        height: '100%',
        background: 'transparent',
        boxShadow: 'none',
        border: 0,
        borderRadius: 0,
        overflow: 'visible',
        filter: isOn ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.55))' : 'none',
      }}
    >
      <svg
        viewBox="0 0 80 72"
        width="80"
        height="72"
        role="img"
        aria-hidden="true"
        overflow="visible"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Deux pattes métalliques longues : endpoints visuels à (28,68)/(52,68). */}
        <path d="M28 29 L28 68" fill="none" stroke="#777f88" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M52 29 L52 68" fill="none" stroke="#777f88" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M27.35 30 L27.35 67.5" fill="none" stroke="#d9dde1" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />
        <path d="M51.35 30 L51.35 67.5" fill="none" stroke="#d9dde1" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />

        {/* Collerette / base. */}
        <path d="M13 29 H67 V34 Q67 37 63 37 H17 Q13 37 13 34 Z" fill="#8d2028" stroke="#451419" strokeWidth="1" />
        <path d="M15 29.5 H65 V31.5 H15 Z" fill="#d04a4f" opacity="0.78" />
        <path d="M16 35 H64" stroke="#4a171b" strokeWidth="0.9" opacity="0.8" />

        {/* Dôme : silhouette verticale de LED traversante 5 mm. */}
        <path d="M14 30 V15 C14 6.8 25.4 1.5 40 1.5 C54.6 1.5 66 6.8 66 15 V30 Z" fill={lens} stroke="#65151b" strokeWidth="1.3" />
        <path d="M15.8 28 V15.3 C15.8 8.2 26 3.3 40 3.3 C54 3.3 64.2 8.2 64.2 15.3 V28 Z" fill={lensDark} opacity="0.38" />

        {/* Réflecteur, chip et bond wires. */}
        <ellipse cx="40" cy="26.5" rx="16" ry="6" fill="#f0b5b5" opacity={isOn ? 0.24 : 0.16} />
        <path d="M24 30 L32 23.5 L40 27 L48 21.5 L56 30 Z" fill="#d8dde2" opacity="0.74" />
        <path d="M28 29 L35 24.5 L40 26.5 L45 22.8 L52 29" fill="none" stroke="#ffffff" strokeWidth="0.7" opacity="0.64" />
        <rect x="37.2" y="24.2" width="5.6" height="3.8" rx="0.7" fill={chip} stroke="#6d4b4e" strokeWidth="0.6" />
        <line x1="40" y1="24.2" x2="31" y2="18" stroke="#eceff2" strokeWidth="0.72" opacity="0.9" />
        <line x1="42" y1="27.2" x2="50" y2="18.8" stroke="#eceff2" strokeWidth="0.72" opacity="0.9" />

        {/* Émission localisée. */}
        <circle cx="40" cy="25.8" r="12.5" fill="#ff3b30" opacity={glow} pointerEvents="none" />
        {isOn && <circle cx="40" cy="25.8" r="4.7" fill="#fff4f4" opacity="0.84" pointerEvents="none" />}

        {/* Reflets de lentille. */}
        <ellipse cx="28.5" cy="9.5" rx="7.5" ry="2.4" fill={lensLight} opacity="0.8" transform="rotate(-18 28.5 9.5)" />
        <path d="M18.5 20 C19.5 13.2 24 8.2 30.5 6" fill="none" stroke="#ffd6d6" strokeWidth="1.3" strokeLinecap="round" opacity="0.64" />

        {/* Repère cathode. */}
        <path d="M61.5 30 L63.5 31.8 H59.5 Z" fill="#f1f4f6" opacity="0.95" />
      </svg>
    </div>
  )
}
