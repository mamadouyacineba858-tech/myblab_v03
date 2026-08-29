import React from 'react'

/**
 * Rendu visuel LED (MB-VIS-LED-V3).
 *
 * Contrat strictement inchangé : isOn reste l'unique état visuel dynamique.
 * La géométrie électrique (80×40 et positions des pins) reste définie par
 * componentDefinitions.js et n'est pas modifiée ici.
 */
export function LedPart({ isOn }) {
  const lens = isOn ? '#e33434' : '#8f2024'
  const lensDark = isOn ? '#b91c2a' : '#5f171b'
  const lensLight = isOn ? '#ff6666' : '#b94347'
  const chip = isOn ? '#fff7f7' : '#d8c8c8'
  const glow = isOn ? 0.34 : 0

  return (
    <div
      className={`part-led ${isOn ? 'part-led--on' : ''}`}
      aria-label={isOn ? 'LED allumée' : 'LED éteinte'}
      style={{
        background: 'transparent',
        boxShadow: 'none',
        filter: isOn ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.55))' : 'none',
      }}
    >
      <svg viewBox="0 0 80 40" width="80" height="40" role="img" aria-hidden="true">
        {/* Pattes traversantes : conservées dans le même repère 80×40. */}
        <line x1="30" y1="30" x2="30" y2="40" stroke="#8c939b" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="50" y1="30" x2="50" y2="40" stroke="#8c939b" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="29.3" y1="30" x2="29.3" y2="39" stroke="#d7dbe0" strokeWidth="0.55" opacity="0.55" />
        <line x1="49.3" y1="30" x2="49.3" y2="39" stroke="#d7dbe0" strokeWidth="0.55" opacity="0.55" />

        {/* Collerette plastique : silhouette typique d'une LED traversante. */}
        <path d="M14 27.5 H66 V30.5 Q66 33 63.5 33 H16.5 Q14 33 14 30.5 Z" fill="#5c2226" stroke="#35171a" strokeWidth="0.9" />
        <path d="M16 28 H64 V29.7 H16 Z" fill="#a83a40" opacity="0.72" />
        <path d="M16 31.5 H64" stroke="#2f1719" strokeWidth="0.8" opacity="0.8" />

        {/* Dôme rouge : priorité à la silhouette et à la profondeur. */}
        <path
          d="M15 28 V16.5 C15 7.9 26.2 2 40 2 C53.8 2 65 7.9 65 16.5 V28 Z"
          fill={lens}
          stroke="#651b20"
          strokeWidth="1.2"
        />
        <path
          d="M16.5 26.5 V16.8 C16.5 9.1 26.6 3.7 40 3.7 C53.4 3.7 63.5 9.1 63.5 16.8 V26.5 Z"
          fill={lensDark}
          opacity="0.38"
        />

        {/* Réflecteur et source interne. */}
        <ellipse cx="40" cy="24.5" rx="15" ry="5.5" fill="#f0b5b5" opacity={isOn ? 0.24 : 0.16} />
        <path d="M25 28 L32 22.5 L40 25.5 L48 20 L55 28 Z" fill="#d8dde2" opacity="0.72" />
        <path d="M29 27 L35 23.5 L40 25 L45 21.5 L51 27" fill="none" stroke="#ffffff" strokeWidth="0.65" opacity="0.6" />

        <rect x="37.3" y="22" width="5.4" height="3.6" rx="0.7" fill={chip} stroke="#6d4b4e" strokeWidth="0.6" />
        <line x1="40" y1="22" x2="31" y2="17" stroke="#eceff2" strokeWidth="0.7" opacity="0.9" />
        <line x1="42" y1="25" x2="50" y2="18" stroke="#eceff2" strokeWidth="0.7" opacity="0.9" />

        {/* Émission : invisible OFF, douce et localisée ON. */}
        <circle cx="40" cy="23.5" r="12" fill="#ff3b30" opacity={glow} pointerEvents="none" />
        {isOn && (
          <circle cx="40" cy="23.5" r="4.5" fill="#fff4f4" opacity="0.8" pointerEvents="none" />
        )}

        {/* Reflets de lentille. */}
        <ellipse cx="29" cy="10" rx="7" ry="2.3" fill={lensLight} opacity="0.78" transform="rotate(-18 29 10)" />
        <path d="M19 20 C20 13.5 24 9 30 6.5" fill="none" stroke="#ffd6d6" strokeWidth="1.25" strokeLinecap="round" opacity="0.62" />

        {/* Repère cathode discret sur la collerette. */}
        <rect x="61" y="28" width="4" height="1.7" rx="0.5" fill="#dfe3e7" opacity="0.9" />
      </svg>
    </div>
  )
}
