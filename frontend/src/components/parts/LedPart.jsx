import React from 'react'

/**
 * Rendu visuel réaliste d'une LED traversante 5 mm.
 *
 * Contrat électrique conservé :
 * - viewBox / dimensions : 80×64
 * - anode : (28,62)
 * - cathode : (52,62)
 *
 * V12 : silhouette de LED traversante affinée. Le corps est haut et arrondi,
 * la collerette reste fine et une patte est légèrement cintrée pour distinguer
 * visuellement les deux connexions. Les extrémités électriques restent inchangées.
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
        width: '100%', height: '100%', background: 'transparent', border: 0,
        borderRadius: 0, boxShadow: 'none', overflow: 'visible', display: 'block',
        position: 'relative', filter: isOn ? 'drop-shadow(0 0 3px rgba(255, 55, 55, 0.55))' : 'none',
      }}
    >
      <svg viewBox="0 0 80 64" width="80" height="64" role="img" aria-hidden="true" overflow="visible" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={lensDark} /><stop offset="14%" stopColor={lensMain} /><stop offset="42%" stopColor={lensLight} /><stop offset="64%" stopColor={lensMain} /><stop offset="100%" stopColor={lensDark} />
          </linearGradient>
          <radialGradient id={`${id}-dome`} cx="34%" cy="18%" r="84%">
            <stop offset="0%" stopColor="#ffd0d0" stopOpacity={isOn ? 0.62 : 0.34} /><stop offset="25%" stopColor={lensLight} stopOpacity="0.72" /><stop offset="62%" stopColor={lensMain} stopOpacity="0.94" /><stop offset="100%" stopColor={lensDark} />
          </radialGradient>
          <linearGradient id={`${id}-collar`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f17b7e" /><stop offset="26%" stopColor="#b62d35" /><stop offset="72%" stopColor="#741820" /><stop offset="100%" stopColor="#431015" />
          </linearGradient>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#59626a" /><stop offset="36%" stopColor={metal} /><stop offset="62%" stopColor="#8f989f" /><stop offset="100%" stopColor="#4d555d" />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffef0" stopOpacity="1" /><stop offset="22%" stopColor="#fff36b" stopOpacity="0.96" /><stop offset="56%" stopColor="#ff4b45" stopOpacity="0.5" /><stop offset="100%" stopColor="#ff2525" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-glass-clip`}><path d="M15 45 V15 C15 6.2 25.7 1 40 1 C54.3 1 65 6.2 65 15 V45 Z" /></clipPath>
        </defs>

        {/* Leads: anode straight, cathode subtly bent; both endpoints stay exact. */}
        <path d="M28 48 V62" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M52 48 C52 51 53.2 52.4 55.2 54.1 C57.3 55.9 58.1 57.3 57.2 59.2 C56.4 60.8 54.2 61.8 52 62" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M27.35 49 V61.35" fill="none" stroke="#f7f9fb" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />
        <path d="M51.35 49 C51.4 51.7 52.6 53.2 54.6 54.8 C56.5 56.4 57.2 57.5 56.5 59.1 C55.8 60.2 53.9 61.2 52.2 61.35" fill="none" stroke="#f7f9fb" strokeWidth="0.7" strokeLinecap="round" opacity="0.72" />

        {/* Thin molded collar */}
        <path d="M13 44 H67 V47 Q67 49.5 61 50 H19 Q13 49.5 13 47 Z" fill={`url(#${id}-collar)`} stroke="#431015" strokeWidth="1" />
        <path d="M14.5 44 H65.5 V45.5 H14.5 Z" fill="#ff9b9d" opacity="0.58" />
        <path d="M18 48 C28 50 52 50 62 48" fill="none" stroke="#351014" strokeWidth="0.9" opacity="0.78" />

        {/* Tall rounded 5 mm-style lens */}
        <path d="M15 45 V15 C15 6.2 25.7 1 40 1 C54.3 1 65 6.2 65 15 V45 Z" fill={`url(#${id}-glass)`} stroke="#57131a" strokeWidth="1.25" />
        <path d="M17 43 V15.4 C17 7.9 26.6 3 40 3 C53.4 3 63 7.9 63 15.4 V43 Z" fill={`url(#${id}-dome)`} opacity="0.84" />
        <path d="M16 16 C16.8 7.8 26.8 2.5 40 2.2 C30.7 4 24.5 9.4 24.5 16 V43 H17 Z" fill="#ffd0d0" opacity="0.18" />
        <path d="M64 16 C63.2 7.8 53.2 2.5 40 2.2 C49.3 4 55.5 9.4 55.5 16 V43 H63 Z" fill="#28070b" opacity="0.22" />

        <g clipPath={`url(#${id}-glass-clip)`}>
          {/* Reflector / cup */}
          <path d="M21 45 Q40 30 59 45 Q40 50 21 45 Z" fill="#f1f3f5" opacity="0.84" />
          <path d="M25 43 Q40 33 55 43 Q40 47 25 43 Z" fill="#a9b1b8" opacity="0.82" />
          <path d="M28 42 Q40 34.8 52 42" fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.84" />
          {/* Die */}
          <rect x="37.2" y="37" width="5.6" height="3.9" rx="0.7" fill={chip} stroke="#695452" strokeWidth="0.65" />
          <rect x="38" y="37.65" width="4" height="2.4" rx="0.45" fill={isOn ? '#fff7a8' : '#bdaea9'} opacity="0.92" />
          {/* Bond wires */}
          <path d="M40 37.1 Q35.2 31.7 30.2 28" fill="none" stroke="#f7f8fa" strokeWidth="0.62" strokeLinecap="round" />
          <path d="M42.3 40.1 Q47 33.1 50.1 29" fill="none" stroke="#f7f8fa" strokeWidth="0.62" strokeLinecap="round" />
          <circle cx="30.2" cy="28" r="0.65" fill="#ffffff" opacity="0.9" /><circle cx="50.1" cy="29" r="0.65" fill="#ffffff" opacity="0.9" />
          {isOn && <circle cx="40" cy="39" r="14" fill={`url(#${id}-glow)`} opacity="0.9" />}
          {isOn && <circle cx="40" cy="39" r="2.8" fill="#fffdf1" opacity="0.98" />}
        </g>

        {/* Lens highlights and cathode-side mark */}
        <ellipse cx="30.5" cy="8.2" rx="7" ry="2.25" fill="#ffe6e6" opacity={isOn ? 0.92 : 0.66} transform="rotate(-18 30.5 8.2)" />
        <path d="M20 25 C21 15.8 26.2 8.5 33.5 5.7" fill="none" stroke="#fff0f0" strokeWidth="1.3" strokeLinecap="round" opacity={isOn ? 0.8 : 0.54} />
        <path d="M22.4 28 C23 20.6 26 14.5 29.2 11.5" fill="none" stroke="#ffffff" strokeWidth="0.55" strokeLinecap="round" opacity="0.46" />
        <path d="M59 44.3 L61.2 46.2 H56.8 Z" fill="#f5f7f8" opacity="0.96" />
      </svg>
    </div>
  )
}
