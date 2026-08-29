import React from 'react'

/**
 * Rendu visuel réaliste d'une LED traversante 5 mm.
 *
 * Contrat électrique :
 * - dimensions visuelles : 80×64
 * - anode visuelle : (28,62)
 * - cathode visuelle : (52,62)
 *
 * Les coordonnées électriques sont définies dans componentDefinitions.js.
 * Ce renderer ne déplace jamais les pins : il dessine simplement les pattes
 * jusqu'à leurs extrémités physiques.
 */
export function LedPart({ isOn }) {
  return (
    <div
      className={`part-led ${isOn ? 'part-led--on' : ''}`}
      aria-label={isOn ? 'LED allumée' : 'LED éteinte'}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        border: 0,
        borderRadius: 0,
        boxShadow: 'none',
        overflow: 'visible',
        display: 'block',
        position: 'relative',
        filter: isOn ? 'drop-shadow(0 0 3px rgba(255, 60, 60, 0.55))' : 'none',
      }}
    >
      <svg
        viewBox="0 0 80 64"
        width="80"
        height="64"
        role="img"
        aria-hidden="true"
        overflow="visible"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="led-glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={isOn ? '#8f0d16' : '#521318'} />
            <stop offset="18%" stopColor={isOn ? '#d51e28' : '#801c22'} />
            <stop offset="48%" stopColor={isOn ? '#ff7777' : '#c45156'} />
            <stop offset="72%" stopColor={isOn ? '#d91d27' : '#861d23'} />
            <stop offset="100%" stopColor={isOn ? '#850a13' : '#4d1116'} />
          </linearGradient>
          <radialGradient id="led-dome" cx="42%" cy="24%" r="76%">
            <stop offset="0%" stopColor="#ffd0d0" stopOpacity={isOn ? 0.62 : 0.34} />
            <stop offset="25%" stopColor={isOn ? '#ff8d8d' : '#d65b60'} stopOpacity="0.72" />
            <stop offset="62%" stopColor={isOn ? '#df2029' : '#941f26'} stopOpacity="0.9" />
            <stop offset="100%" stopColor={isOn ? '#790812' : '#4b1116'} />
          </radialGradient>
          <linearGradient id="led-collar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef7074" />
            <stop offset="25%" stopColor="#b52c35" />
            <stop offset="68%" stopColor="#771920" />
            <stop offset="100%" stopColor="#430e13" />
          </linearGradient>
          <linearGradient id="led-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#626b74" />
            <stop offset="35%" stopColor="#e1e6ea" />
            <stop offset="55%" stopColor="#a7afb7" />
            <stop offset="78%" stopColor="#f2f5f7" />
            <stop offset="100%" stopColor="#59616a" />
          </linearGradient>
          <radialGradient id="led-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffef0" stopOpacity="1" />
            <stop offset="18%" stopColor="#fff48a" stopOpacity="0.98" />
            <stop offset="48%" stopColor="#ff685d" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#ff2424" stopOpacity="0" />
          </radialGradient>
          <clipPath id="led-dome-clip">
            <path d="M14 33 V16 C14 7.5 25.2 2 40 2 C54.8 2 66 7.5 66 16 V33 Z" />
          </clipPath>
        </defs>

        {/* Pattes droites : extrémités exactement sur les pins électriques V6. */}
        <path d="M28 34 V62" fill="none" stroke="url(#led-metal)" strokeWidth="3.1" strokeLinecap="round" />
        <path d="M52 34 V62" fill="none" stroke="url(#led-metal)" strokeWidth="3.1" strokeLinecap="round" />
        <path d="M27.35 36 V61.3" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.68" />
        <path d="M51.35 36 V61.3" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.68" />

        {/* Collerette moulée. */}
        <path d="M12.5 31.5 H67.5 V35 Q67.5 38.5 63 39 H17 Q12.5 38.5 12.5 35 Z" fill="url(#led-collar)" stroke="#410e13" strokeWidth="0.9" />
        <path d="M14.5 31.5 H65.5 V33.1 H14.5 Z" fill="#ff9b9d" opacity="0.55" />
        <path d="M16 37.2 C28 39 52 39 64 37.2" fill="none" stroke="#350a0e" strokeWidth="0.9" opacity="0.82" />

        {/* Dôme rouge translucide, avec volume latéral. */}
        <path d="M14 33 V16 C14 7.5 25.2 2 40 2 C54.8 2 66 7.5 66 16 V33 Z" fill="url(#led-glass)" stroke="#571117" strokeWidth="1.2" />
        <path d="M16 31 V16.3 C16 9 26.3 3.8 40 3.8 C53.7 3.8 64 9 64 16.3 V31 Z" fill="url(#led-dome)" opacity="0.84" />

        {/* Profondeur du plastique : bandes latérales douces. */
        <path d="M15 16 C15.8 9.2 25.8 4 39 3 C30.5 5.1 24.2 10.7 24.2 17 V31 H16 Z" fill="#ffd2d2" opacity="0.15" />
        <path d="M65 16 C64.2 9.2 54.2 4 41 3 C49.5 5.1 55.8 10.7 55.8 17 V31 H64 Z" fill="#31070b" opacity="0.2" />

        {/* Intérieur de la LED visible à travers le plastique. */}
        <g clipPath="url(#led-dome-clip)">
          {/* Réflecteur métallique concave. */}
          <path d="M22 33 Q40 19.5 58 33 Q40 38 22 33 Z" fill="#eef2f4" opacity="0.82" />
          <path d="M25 31.5 Q40 22.2 55 31.5 Q40 35 25 31.5 Z" fill="#aeb6bd" opacity="0.82" />
          <path d="M27 30.6 Q40 24.4 53 30.6" fill="none" stroke="#ffffff" strokeWidth="0.85" opacity="0.86" />

          {/* Chip central posé dans le réflecteur. */}
          <rect x="37.15" y="26" width="5.7" height="4.25" rx="0.65" fill={isOn ? '#fffdf4' : '#d8cfcb'} stroke="#66514f" strokeWidth="0.65" />
          <rect x="38.05" y="26.7" width="3.9" height="2.7" rx="0.4" fill={isOn ? '#fff59a' : '#bfb2ad'} opacity="0.92" />

          {/* Deux bond wires fins. */}
          <path d="M40 26.15 Q35 21.3 30.5 18.4" fill="none" stroke="#f7f8f9" strokeWidth="0.62" strokeLinecap="round" />
          <path d="M42 29 Q47 23.4 50.5 19.6" fill="none" stroke="#f7f8f9" strokeWidth="0.62" strokeLinecap="round" />
          <circle cx="30.5" cy="18.4" r="0.62" fill="#ffffff" opacity="0.9" />
          <circle cx="50.5" cy="19.6" r="0.62" fill="#ffffff" opacity="0.9" />

          {/* Émission localisée en ON. */}
          {isOn && <circle cx="40" cy="28" r="12.5" fill="url(#led-glow)" opacity="0.94" pointerEvents="none" />}
          {isOn && <circle cx="40" cy="28" r="3.2" fill="#fffef1" opacity="0.98" pointerEvents="none" />}
        </g>

        {/* Reflets du dôme. */}
        <ellipse cx="28" cy="9.2" rx="7.4" ry="2.25" fill="#ffe4e4" opacity={isOn ? 0.94 : 0.66} transform="rotate(-17 28 9.2)" />
        <path d="M18.8 22 C19.6 14.7 24.2 8.6 31.2 6.1" fill="none" stroke="#fff1f1" strokeWidth="1.25" strokeLinecap="round" opacity={isOn ? 0.82 : 0.56} />
        <path d="M20.6 24 C21.1 18.6 23.6 14.3 26.8 11.8" fill="none" stroke="#ffffff" strokeWidth="0.55" strokeLinecap="round" opacity="0.42" />

        {/* Repère cathode discret. */}
        <path d="M61.2 32.2 L63.4 34.1 H59 Z" fill="#f5f7f8" opacity="0.96" />
      </svg>
    </div>
  )
}
