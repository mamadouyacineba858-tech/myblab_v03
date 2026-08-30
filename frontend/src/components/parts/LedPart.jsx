import React from 'react'

/**
 * Rendu visuel réaliste d'une LED traversante 5 mm.
 * Contrat électrique conservé : viewBox 80×64, anode (28,62), cathode (52,62).
 * V19 : renforcement de la patte droite rectiligne, avec géométrie remplie
 * plutôt qu'un simple stroke afin de garder une largeur stable au rendu.
 */
export function LedPart({ isOn, uid }) {
  const lensMain = isOn ? '#e52a31' : '#8e1f24'
  const lensDark = isOn ? '#8f0d16' : '#4f1116'
  const lensLight = isOn ? '#ff7478' : '#bd454b'
  const metal = isOn ? '#dfe3e5' : '#c0c5c8'
  const chip = isOn ? '#fffdf2' : '#d2c9c5'
  const id = String(uid ?? 'led').replace(/[^a-zA-Z0-9_-]/g, '_')

  return (
    <div
      className={`part-led ${isOn ? 'part-led--on' : ''}`}
      aria-label={isOn ? 'LED allumée' : 'LED éteinte'}
      style={{ width: '100%', height: '100%', background: 'transparent', border: 0, borderRadius: 0, boxShadow: 'none', overflow: 'visible', display: 'block', position: 'relative', filter: isOn ? 'drop-shadow(0 0 3px rgba(255, 55, 55, 0.55))' : 'none' }}
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
            <stop offset="0%" stopColor="#555b60" /><stop offset="20%" stopColor="#aeb5ba" /><stop offset="42%" stopColor={metal} /><stop offset="53%" stopColor="#f5f6f6" /><stop offset="66%" stopColor="#c5cbce" /><stop offset="82%" stopColor="#969ea4" /><stop offset="100%" stopColor="#5b6268" />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffef0" stopOpacity="1" /><stop offset="22%" stopColor="#fff36b" stopOpacity="0.96" /><stop offset="56%" stopColor="#ff4b45" stopOpacity="0.5" /><stop offset="100%" stopColor="#ff2525" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-glass-clip`}><path d="M15 37 V15 C15 6.2 25.7 1 40 1 C54.3 1 65 6.2 65 15 V37 Z" /></clipPath>
        </defs>

        {/* Physical anode: wider filled metal geometry; centerline and endpoint unchanged. */}
        <rect x="23.5" y="38.5" width="9" height="23.5" rx="4.5" fill={`url(#${id}-metal)`} />
        <rect x="25.0" y="39.5" width="1.1" height="21.5" rx="0.55" fill="#f8fafb" opacity="0.78" />

        {/* Physical cathode: filled bent geometry, endpoint remains exactly (52,62). */}
        <path d="M50 38.5 H54 C54 42.4 54.7 43.8 57.0 46.0 C59.9 48.8 60.2 51.5 58.7 54.5 C57.5 56.9 54.9 59.9 53.0 62.0 H49.5 C51.2 59.0 54.2 55.2 55.2 53.2 C56.1 51.3 55.6 49.9 53.7 48.1 C51.0 45.5 50 43.3 50 38.5 Z" fill={`url(#${id}-metal)`} />
        <path d="M51.3 40.0 H52.2 C52.3 43.0 53.1 44.4 55.0 46.3 C57.4 48.7 58.0 50.9 56.8 53.5 C55.7 55.8 53.5 58.5 52.0 60.8" fill="none" stroke="#f8fafb" strokeWidth="0.82" strokeLinecap="round" opacity="0.76" />

        {/* Thin molded collar */}
        <path d="M13 36 H67 V39 Q67 41.5 61 42 H19 Q13 41.5 13 39 Z" fill={`url(#${id}-collar)`} stroke="#431015" strokeWidth="1" />
        <path d="M14.5 36 H65.5 V37.5 H14.5 Z" fill="#ff9b9d" opacity="0.58" />
        <path d="M18 40 C28 42 52 42 62 40" fill="none" stroke="#351014" strokeWidth="0.9" opacity="0.78" />

        {/* Tall rounded 5 mm-style lens */}
        <path d="M15 37 V15 C15 6.2 25.7 1 40 1 C54.3 1 65 6.2 65 15 V37 Z" fill={`url(#${id}-glass)`} stroke="#57131a" strokeWidth="1.25" />
        <path d="M17 36 V15.4 C17 7.9 26.6 3 40 3 C53.4 3 63 7.9 63 15.4 V36 Z" fill={`url(#${id}-dome)`} opacity="0.84" />
        <path d="M16 16 C16.8 7.8 26.8 2.5 40 2.2 C30.7 4 24.5 9.4 24.5 16 V36 H17 Z" fill="#ffd0d0" opacity="0.18" />
        <path d="M64 16 C63.2 7.8 53.2 2.5 40 2.2 C49.3 4 55.5 9.4 55.5 16 V36 H63 Z" fill="#28070b" opacity="0.22" />

        <g clipPath={`url(#${id}-glass-clip)`}>
          <path d="M21 37 Q40 24 59 37 Q40 42 21 37 Z" fill="#f1f3f5" opacity="0.84" />
          <path d="M25 35 Q40 27 55 35 Q40 39 25 35 Z" fill="#a9b1b8" opacity="0.82" />
          <path d="M28 34 Q40 28.8 52 34" fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.84" />
          <rect x="37.2" y="29.2" width="5.6" height="3.9" rx="0.7" fill={chip} stroke="#695452" strokeWidth="0.65" />
          <rect x="38" y="29.85" width="4" height="2.4" rx="0.45" fill={isOn ? '#fff7a8' : '#bdaea9'} opacity="0.92" />
          <path d="M40 29.3 Q35.2 24.7 30.2 22" fill="none" stroke="#f7f8fa" strokeWidth="0.62" strokeLinecap="round" />
          <path d="M42.3 32.3 Q47 26.1 50.1 23" fill="none" stroke="#f7f8fa" strokeWidth="0.62" strokeLinecap="round" />
          <circle cx="30.2" cy="22" r="0.65" fill="#ffffff" opacity="0.9" /><circle cx="50.1" cy="23" r="0.65" fill="#ffffff" opacity="0.9" />
          {isOn && <circle cx="40" cy="31.2" r="14" fill={`url(#${id}-glow)`} opacity="0.9" />}
          {isOn && <circle cx="40" cy="31.2" r="2.8" fill="#fffdf1" opacity="0.98" />}
        </g>

        <ellipse cx="30.5" cy="8.2" rx="7" ry="2.25" fill="#ffe6e6" opacity={isOn ? 0.92 : 0.66} transform="rotate(-18 30.5 8.2)" />
        <path d="M20 25 C21 15.8 26.2 8.5 33.5 5.7" fill="none" stroke="#fff0f0" strokeWidth="1.3" strokeLinecap="round" opacity={isOn ? 0.8 : 0.54} />
        <path d="M22.4 28 C23 20.6 26 14.5 29.2 11.5" fill="none" stroke="#ffffff" strokeWidth="0.55" strokeLinecap="round" opacity="0.46" />
        <path d="M59 36.3 L61.2 38.2 H56.8 Z" fill="#f5f7f8" opacity="0.96" />
      </svg>
    </div>
  )
}
