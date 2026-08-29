import React from 'react'

/**
 * Rendu visuel réaliste d'une LED traversante 5 mm.
 *
 * Contrat électrique V6/V8 préservé :
 * - viewBox / dimensions : 80×64
 * - anode : (28,62)
 * - cathode : (52,62)
 *
 * Le renderer ne modifie jamais les pins électriques. Les deux pattes
 * visibles se terminent exactement sur leurs endpoints physiques.
 */
export function LedPart({ isOn, uid }) {
  const lensMain = isOn ? '#e52a31' : '#8e1f24'
  const lensDark = isOn ? '#8f0d16' : '#4f1116'
  const lensLight = isOn ? '#ff7478' : '#bd454b'
  const metal = isOn ? '#edf2f5' : '#aeb6bd'
  const chip = isOn ? '#fffdf2' : '#d2c9c5'
  const id = String(uid ?? 'led').replace(/[^a-zA-Z0-9_-]/g, '_')

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
        filter: isOn ? 'drop-shadow(0 0 3px rgba(255, 55, 55, 0.55))' : 'none',
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
          <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={lensDark} />
            <stop offset="16%" stopColor={lensMain} />
            <stop offset="46%" stopColor={lensLight} />
            <stop offset="72%" stopColor={lensMain} />
            <stop offset="100%" stopColor={lensDark} />
          </linearGradient>
          <radialGradient id={`${id}-dome`} cx="38%" cy="24%" r="78%">
            <stop offset="0%" stopColor="#ffd0d0" stopOpacity={isOn ? 0.62 : 0.34} />
            <stop offset="26%" stopColor={lensLight} stopOpacity="0.72" />
            <stop offset="64%" stopColor={lensMain} stopOpacity="0.94" />
            <stop offset="100%" stopColor={lensDark} />
          </radialGradient>
          <linearGradient id={`${id}-collar`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f17b7e" />
            <stop offset="30%" stopColor="#b62d35" />
            <stop offset="72%" stopColor="#741820" />
            <stop offset="100%" stopColor="#431015" />
          </linearGradient>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#59626a" />
            <stop offset="36%" stopColor={metal} />
            <stop offset="62%" stopColor="#8f989f" />
            <stop offset="100%" stopColor="#4d555d" />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffef0" stopOpacity="1" />
            <stop offset="22%" stopColor="#fff36b" stopOpacity="0.96" />
            <stop offset="56%" stopColor="#ff4b45" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ff2525" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-glass-clip`}>
            <path d="M9 33 V16 C9 7 22.4 1 40 1 C57.6 1 71 7 71 16 V33 Z" />
          </clipPath>
        </defs>

        {/* Pattes : endpoints électriques inchangés, exactement à y=62. */}
        <path d="M28 34 V62" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M52 34 V62" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M27.35 36 V61.35" fill="none" stroke="#f7f9fb" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />
        <path d="M51.35 36 V61.35" fill="none" stroke="#f7f9fb" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />

        {/* Collerette moulée typique d'une LED traversante. */}
        <path d="M8.5 31.5 H71.5 V35 Q71.5 39 66 40 H14 Q8.5 39 8.5 35 Z" fill={`url(#${id}-collar)`} stroke="#431015" strokeWidth="1" />
        <path d="M10.5 31.5 H69.5 V33.2 H10.5 Z" fill="#ff9b9d" opacity="0.58" />
        <path d="M13 37.3 C25 40 55 40 67 37.3" fill="none" stroke="#351014" strokeWidth="1" opacity="0.78" />

        {/* Corps 5 mm : dôme large et arrondi, sans boîte rectangulaire. */}
        <path d="M9 33 V16 C9 7 22.4 1 40 1 C57.6 1 71 7 71 16 V33 Z" fill={`url(#${id}-glass)`} stroke="#57131a" strokeWidth="1.25" />
        <path d="M11 31 V16.4 C11 8.9 23.1 3 40 3 C56.9 3 69 8.9 69 16.4 V31 Z" fill={`url(#${id}-dome)`} opacity="0.84" />

        {/* Ombres de moulage pour donner une vraie profondeur au plastique. */
        <path d="M10 17 C10.7 8.3 23.3 2.3 40 2.3 C28.7 4.5 20.5 10.2 20.5 17 V31 H11 Z" fill="#ffd0d0" opacity="0.18" />
        <path d="M70 17 C69.4 8.3 56.8 2.3 40 2.3 C51.3 4.5 59.5 10.2 59.5 17 V31 H69 Z" fill="#28070b" opacity="0.2" />

        {/* Réflecteur, chip et bond wires visibles au travers du dôme. */}
        <g clipPath={`url(#${id}-glass-clip)`}>
          <path d="M18 33 Q40 17.5 62 33 Q40 39 18 33 Z" fill="#f1f3f5" opacity="0.84" />
          <path d="M22 31 Q40 20.8 58 31 Q40 35.2 22 31 Z" fill="#a9b1b8" opacity="0.82" />
          <path d="M25 30 Q40 22.7 55 30" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.84" />

          <rect x="36.8" y="25.8" width="6.4" height="4.6" rx="0.7" fill={chip} stroke="#695452" strokeWidth="0.7" />
          <rect x="37.8" y="26.55" width="4.4" height="2.9" rx="0.45" fill={isOn ? '#fff7a8' : '#bdaea9'} opacity="0.92" />

          <path d="M40 26.1 Q34.8 21.2 28.8 18" fill="none" stroke="#f7f8fa" strokeWidth="0.65" strokeLinecap="round" />
          <path d="M42.5 29.5 Q48 23.1 51.4 18.8" fill="none" stroke="#f7f8fa" strokeWidth="0.65" strokeLinecap="round" />
          <circle cx="28.8" cy="18" r="0.7" fill="#ffffff" opacity="0.9" />
          <circle cx="51.4" cy="18.8" r="0.7" fill="#ffffff" opacity="0.9" />

          {isOn && <circle cx="40" cy="28" r="15" fill={`url(#${id}-glow)`} opacity="0.9" />}
          {isOn && <circle cx="40" cy="28" r="3.3" fill="#fffdf1" opacity="0.98" />}
        </g>

        {/* Reflets du plastique bombé. */}
        <ellipse cx="27" cy="8.4" rx="8.7" ry="2.5" fill="#ffe6e6" opacity={isOn ? 0.92 : 0.66} transform="rotate(-17 27 8.4)" />
        <path d="M15.5 22.5 C16.6 14.5 22.3 7.6 31.5 5" fill="none" stroke="#fff0f0" strokeWidth="1.45" strokeLinecap="round" opacity={isOn ? 0.8 : 0.54} />
        <path d="M18 24.5 C18.7 18.1 21.7 13.6 25.2 10.8" fill="none" stroke="#ffffff" strokeWidth="0.58" strokeLinecap="round" opacity="0.46" />

        {/* Repère cathode sur la collerette. */}
        <path d="M64.7 32.1 L67.1 34.2 H62.2 Z" fill="#f5f7f8" opacity="0.96" />
      </svg>
    </div>
  )
}
