import React from 'react'

/**
 * Rendu visuel réaliste d'une LED traversante 5 mm.
 *
 * Contrat électrique V6/V8/V9 préservé :
 * - viewBox / dimensions : 80×64
 * - anode : (28,62)
 * - cathode : (52,62)
 *
 * V10 : le raffinement est strictement visuel. Les extrémités des deux
 * pattes restent exactement sur les endpoints électriques validés.
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
            <stop offset="14%" stopColor={lensMain} />
            <stop offset="42%" stopColor={lensLight} />
            <stop offset="64%" stopColor={lensMain} />
            <stop offset="100%" stopColor={lensDark} />
          </linearGradient>
          <radialGradient id={`${id}-dome`} cx="34%" cy="20%" r="82%">
            <stop offset="0%" stopColor="#ffd0d0" stopOpacity={isOn ? 0.62 : 0.34} />
            <stop offset="25%" stopColor={lensLight} stopOpacity="0.72" />
            <stop offset="62%" stopColor={lensMain} stopOpacity="0.94" />
            <stop offset="100%" stopColor={lensDark} />
          </radialGradient>
          <linearGradient id={`${id}-collar`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f17b7e" />
            <stop offset="26%" stopColor="#b62d35" />
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
            <path d="M16 39 V15 C16 6.4 26.2 1 40 1 C53.8 1 64 6.4 64 15 V39 Z" />
          </clipPath>
        </defs>

        {/* Pattes : endpoints électriques inchangés, exactement à y=62. */}
        <path d="M28 41 V62" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M52 41 V62" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M27.35 43 V61.35" fill="none" stroke="#f7f9fb" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />
        <path d="M51.35 43 V61.35" fill="none" stroke="#f7f9fb" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />

        {/* Collerette moulée, plus fine pour conserver la silhouette d'une LED 5 mm. */}
        <path d="M14 38 H66 V41 Q66 43.5 61 44 H19 Q14 43.5 14 41 Z" fill={`url(#${id}-collar)`} stroke="#431015" strokeWidth="1" />
        <path d="M15.5 38 H64.5 V39.5 H15.5 Z" fill="#ff9b9d" opacity="0.58" />
        <path d="M18 42 C28 44 52 44 62 42" fill="none" stroke="#351014" strokeWidth="0.9" opacity="0.78" />

        {/* Dôme plus étroit et plus haut : proportions proches d'une vraie LED traversante. */}
        <path d="M16 39 V15 C16 6.4 26.2 1 40 1 C53.8 1 64 6.4 64 15 V39 Z" fill={`url(#${id}-glass)`} stroke="#57131a" strokeWidth="1.25" />
        <path d="M18 37 V15.4 C18 8.1 27.1 3 40 3 C52.9 3 62 8.1 62 15.4 V37 Z" fill={`url(#${id}-dome)`} opacity="0.84" />

        {/* Ombres de moulage donnant une profondeur cylindrique au plastique. */}
        <path d="M17 16 C17.8 8 27.3 2.5 40 2.2 C31 4 25 9.4 25 16 V37 H18 Z" fill="#ffd0d0" opacity="0.18" />
        <path d="M63 16 C62.2 8 52.7 2.5 40 2.2 C49 4 55 9.4 55 16 V37 H62 Z" fill="#28070b" opacity="0.22" />

        {/* Réflecteur, chip et bond wires visibles au travers du dôme. */}
        <g clipPath={`url(#${id}-glass-clip)`}>
          <path d="M22 39 Q40 27.5 58 39 Q40 44 22 39 Z" fill="#f1f3f5" opacity="0.84" />
          <path d="M26 37 Q40 30.2 54 37 Q40 40.8 26 37 Z" fill="#a9b1b8" opacity="0.82" />
          <path d="M29 36 Q40 31.7 51 36" fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.84" />

          <rect x="37.2" y="32" width="5.6" height="3.9" rx="0.7" fill={chip} stroke="#695452" strokeWidth="0.65" />
          <rect x="38" y="32.65" width="4" height="2.4" rx="0.45" fill={isOn ? '#fff7a8' : '#bdaea9'} opacity="0.92" />

          <path d="M40 32.1 Q35.2 27.8 30.2 25.2" fill="none" stroke="#f7f8fa" strokeWidth="0.62" strokeLinecap="round" />
          <path d="M42.3 35.1 Q47 29.1 50.1 26" fill="none" stroke="#f7f8fa" strokeWidth="0.62" strokeLinecap="round" />
          <circle cx="30.2" cy="25.2" r="0.65" fill="#ffffff" opacity="0.9" />
          <circle cx="50.1" cy="26" r="0.65" fill="#ffffff" opacity="0.9" />

          {isOn && <circle cx="40" cy="34" r="13" fill={`url(#${id}-glow)`} opacity="0.9" />}
          {isOn && <circle cx="40" cy="34" r="2.8" fill="#fffdf1" opacity="0.98" />}
        </g>

        {/* Reflets de surface du dôme. */}
        <ellipse cx="31" cy="8.2" rx="6.7" ry="2.2" fill="#ffe6e6" opacity={isOn ? 0.92 : 0.66} transform="rotate(-18 31 8.2)" />
        <path d="M21 23 C22 15.5 26.8 8.8 33.7 6" fill="none" stroke="#fff0f0" strokeWidth="1.3" strokeLinecap="round" opacity={isOn ? 0.8 : 0.54} />
        <path d="M23.2 25 C23.8 19.1 26.4 14.4 29.2 11.7" fill="none" stroke="#ffffff" strokeWidth="0.55" strokeLinecap="round" opacity="0.46" />

        {/* Repère cathode. */}
        <path d="M58.4 38.3 L60.5 40.2 H56.3 Z" fill="#f5f7f8" opacity="0.96" />
      </svg>
    </div>
  )
}
