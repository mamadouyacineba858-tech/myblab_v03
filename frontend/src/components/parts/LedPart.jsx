import React from 'react'

/**
 * Rendu visuel réaliste d'une LED traversante 5 mm.
 *
 * Contrat électrique V8 :
 * - viewBox / dimensions : 80×64
 * - anode visuelle : (28,62)
 * - cathode visuelle : (52,62)
 *
 * Les coordonnées électriques sont définies dans componentDefinitions.js.
 * Ce renderer ne déplace jamais les pins : il dessine simplement les pattes
 * jusqu'à leurs extrémités physiques.
 */
export function LedPart({ isOn }) {
  const lensMain = isOn ? '#e52a31' : '#8e1f24'
  const lensDark = isOn ? '#9e0f18' : '#5a1419'
  const lensLight = isOn ? '#ff7777' : '#c95458'
  const metal = isOn ? '#e6edf2' : '#b7bec4'
  const chip = isOn ? '#fffdf8' : '#d8d0cc'

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
            <stop offset="0%" stopColor={lensDark} />
            <stop offset="18%" stopColor={lensMain} />
            <stop offset="48%" stopColor={lensLight} />
            <stop offset="72%" stopColor={lensMain} />
            <stop offset="100%" stopColor={lensDark} />
          </linearGradient>
          <radialGradient id="led-dome" cx="42%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#ffb2b2" stopOpacity={isOn ? 0.55 : 0.3} />
            <stop offset="28%" stopColor={lensLight} stopOpacity="0.72" />
            <stop offset="68%" stopColor={lensMain} stopOpacity="0.92" />
            <stop offset="100%" stopColor={lensDark} />
          </radialGradient>
          <linearGradient id="led-collar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ed676b" />
            <stop offset="28%" stopColor="#b62d35" />
            <stop offset="70%" stopColor="#7e1b22" />
            <stop offset="100%" stopColor="#4d1318" />
          </linearGradient>
          <linearGradient id="led-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#727b84" />
            <stop offset="38%" stopColor={metal} />
            <stop offset="62%" stopColor="#8a939b" />
            <stop offset="100%" stopColor="#59616a" />
          </linearGradient>
          <radialGradient id="led-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffef0" stopOpacity="1" />
            <stop offset="22%" stopColor="#fff36b" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#ff4b45" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ff2525" stopOpacity="0" />
          </radialGradient>
          <clipPath id="led-glass-clip">
            <path d="M14 33 V16 C14 7.6 25.2 2 40 2 C54.8 2 66 7.6 66 16 V33 Z" />
          </clipPath>
        </defs>

        {/* Pattes métalliques : leurs extrémités sont exactement les endpoints V6. */}
        <path d="M28 34 V62" fill="none" stroke="url(#led-metal)" strokeWidth="3.1" strokeLinecap="round" />
        <path d="M52 34 V62" fill="none" stroke="url(#led-metal)" strokeWidth="3.1" strokeLinecap="round" />
        <path d="M27.35 36 V61.4" fill="none" stroke="#f1f4f7" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
        <path d="M51.35 36 V61.4" fill="none" stroke="#f1f4f7" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />

        {/* Base moulée : épaisseur et rebord visibles. */}
        <path d="M12.5 31.5 H67.5 V35 Q67.5 38.5 63 39 H17 Q12.5 38.5 12.5 35 Z" fill="url(#led-collar)" stroke="#4c1116" strokeWidth="0.9" />
        <path d="M14.5 31.5 H65.5 V33.2 H14.5 Z" fill="#f17b7e" opacity="0.62" />
        <path d="M16 37.1 C27 39 53 39 64 37.1" fill="none" stroke="#3e1014" strokeWidth="0.9" opacity="0.8" />

        {/* Dôme plastique : volume cylindrique + sommet arrondi. */}
        <path d="M14 33 V16 C14 7.6 25.2 2 40 2 C54.8 2 66 7.6 66 16 V33 Z" fill="url(#led-glass)" stroke="#5d151a" strokeWidth="1.2" />
        <path d="M16 31 V16.3 C16 9 26.3 3.9 40 3.9 C53.7 3.9 64 9 64 16.3 V31 Z" fill="url(#led-dome)" opacity="0.82" />

        {/* Ombre latérale du moulage pour éviter l'aspect d'un simple aplat. */
        <path d="M14.8 17 C15.2 8.8 26.2 3 40 3 C30.5 5.1 24 10.4 24 17 V31 H16 Z" fill="#ffb0b0" opacity="0.18" />
        <path d="M64.5 17 C64.2 9.1 54 4 40 3 C49.5 5.1 56 10.4 56 17 V31 H64 Z" fill="#350b0f" opacity="0.18" />

        {/* Réflecteur métallique concave, visible à travers le dôme. */}
        <g clipPath="url(#led-glass-clip)">
          <path d="M22 33 Q40 19 58 33 Q40 38 22 33 Z" fill="#eef1f3" opacity="0.78" />
          <path d="M25 31 Q40 22 55 31 Q40 34.5 25 31 Z" fill="#aeb6bd" opacity="0.78" />
          <path d="M28 30 Q40 24.5 52 30" fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.8" />

          {/* Chip central. */}
          <rect x="37.2" y="26" width="5.6" height="4.2" rx="0.65" fill={chip} stroke="#6c5655" strokeWidth="0.65" />
          <rect x="38.1" y="26.65" width="3.8" height="2.7" rx="0.4" fill={isOn ? '#fff7b0' : '#c5b6b1'} opacity="0.9" />

          {/* Bond wires fins. */}
          <path d="M40 26.1 Q35 21 30.5 18.2" fill="none" stroke="#f5f7f8" strokeWidth="0.62" strokeLinecap="round" />
          <path d="M42 29 Q47 23.3 50.5 19.5" fill="none" stroke="#f5f7f8" strokeWidth="0.62" strokeLinecap="round" />
          <circle cx="30.5" cy="18.2" r="0.65" fill="#ffffff" opacity="0.85" />
          <circle cx="50.5" cy="19.5" r="0.65" fill="#ffffff" opacity="0.85" />

          {/* Cœur lumineux uniquement en état ON. */}
          {isOn && <circle cx="40" cy="28" r="12" fill="url(#led-glow)" opacity="0.9" />}
          {isOn && <circle cx="40" cy="28" r="3.2" fill="#fffdf1" opacity="0.98" />}
        </g>

        {/* Reflets de surface : deux signatures de plastique bombé. */}
        <ellipse cx="28" cy="9.2" rx="7.4" ry="2.25" fill="#ffdede" opacity={isOn ? 0.9 : 0.62} transform="rotate(-17 28 9.2)" />
        <path d="M18.8 22 C19.6 14.8 24.2 8.6 31.2 6.1" fill="none" stroke="#ffe8e8" strokeWidth="1.25" strokeLinecap="round" opacity={isOn ? 0.78 : 0.5} />
        <path d="M20.5 24 C21.1 18.6 23.5 14.5 26.6 12" fill="none" stroke="#ffffff" strokeWidth="0.55" strokeLinecap="round" opacity="0.42" />

        {/* Repère cathode sur la collerette. */}
        <path d="M61.2 32.2 L63.4 34.1 H59 Z" fill="#f5f7f8" opacity="0.96" />
      </svg>
    </div>
  )
}
