import React from 'react'

/**
 * Rendu visuel LED (MB-VIS-LED-V4).
 *
 * Contrat électrique strictement conservé : viewBox 80×40 et positions des
 * pins restent ceux de componentDefinitions.js (anode 0/20, cathode 80/20).
 * Les extrémités visibles des pattes rejoignent désormais ces mêmes points,
 * afin que la connexion apparaisse au pied réel de la LED sans modifier la
 * géométrie électrique existante.
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
        {/*
         * Pattes traversantes : leurs extrémités correspondent volontairement
         * aux pins électriques historiques (0,20) et (80,20) projetés au pied
         * de la LED. Aucun changement de pin n'est nécessaire.
         */}
        <path
          d="M27 28.5 L17 32 L8 36 L0 40"
          fill="none"
          stroke="#777f88"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M53 28.5 L63 32 L72 36 L80 40"
          fill="none"
          stroke="#777f88"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M26.3 29 L17 32.5 L8 36.5 L1 39.5"
          fill="none"
          stroke="#d9dde1"
          strokeWidth="0.65"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M53.7 29 L63 32.5 L72 36.5 L79 39.5"
          fill="none"
          stroke="#d9dde1"
          strokeWidth="0.65"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Collerette plastique : silhouette typique d'une LED traversante. */}
        <path d="M14 27.5 H66 V30.5 Q66 33 63.5 33 H16.5 Q14 33 14 30.5 Z" fill="#8d2028" stroke="#451419" strokeWidth="0.9" />
        <path d="M16 28 H64 V29.7 H16 Z" fill="#d04a4f" opacity="0.72" />
        <path d="M16 31.5 H64" stroke="#4a171b" strokeWidth="0.8" opacity="0.8" />

        {/* Dôme rouge : silhouette principale. */}
        <path
          d="M15 28 V16.5 C15 7.9 26.2 2 40 2 C53.8 2 65 7.9 65 16.5 V28 Z"
          fill={lens}
          stroke="#65151b"
          strokeWidth="1.2"
        />
        <path
          d="M16.5 26.5 V16.8 C16.5 9.1 26.6 3.7 40 3.7 C53.4 3.7 63.5 9.1 63.5 16.8 V26.5 Z"
          fill={lensDark}
          opacity="0.38"
        />

        {/* Réflecteur, chip et fils de bonding. */}
        <ellipse cx="40" cy="24.5" rx="15" ry="5.5" fill="#f0b5b5" opacity={isOn ? 0.24 : 0.16} />
        <path d="M25 28 L32 22.5 L40 25.5 L48 20 L55 28 Z" fill="#d8dde2" opacity="0.72" />
        <path d="M29 27 L35 23.5 L40 25 L45 21.5 L51 27" fill="none" stroke="#ffffff" strokeWidth="0.65" opacity="0.6" />

        <rect x="37.3" y="22" width="5.4" height="3.6" rx="0.7" fill={chip} stroke="#6d4b4e" strokeWidth="0.6" />
        <line x1="40" y1="22" x2="31" y2="17" stroke="#eceff2" strokeWidth="0.7" opacity="0.9" />
        <line x1="42" y1="25" x2="50" y2="18" stroke="#eceff2" strokeWidth="0.7" opacity="0.9" />

        {/* Émission : localisée et contrôlée. */}
        <circle cx="40" cy="23.5" r="12" fill="#ff3b30" opacity={glow} pointerEvents="none" />
        {isOn && (
          <circle cx="40" cy="23.5" r="4.5" fill="#fff4f4" opacity="0.8" pointerEvents="none" />
        )}

        {/* Reflets de lentille. */}
        <ellipse cx="29" cy="10" rx="7" ry="2.3" fill={lensLight} opacity="0.78" transform="rotate(-18 29 10)" />
        <path d="M19 20 C20 13.5 24 9 30 6.5" fill="none" stroke="#ffd6d6" strokeWidth="1.25" strokeLinecap="round" opacity="0.62" />

        {/* Repère cathode discret sur la collerette. */}
        <path d="M61 28 L63 29.7 H59 Z" fill="#f1f4f6" opacity="0.95" />
      </svg>
    </div>
  )
}
