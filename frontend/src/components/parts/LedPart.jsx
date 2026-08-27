import React from 'react'

/** Realistic through-hole LED. Visual leads align with the electrical anchors. */
export function LedPart({ isOn }) {
  return (
    <div
      className={`part-led ${isOn ? 'part-led--on' : ''}`}
      aria-label={isOn ? 'LED allumée' : 'LED éteinte'}
      style={{ background: 'transparent', boxShadow: 'none', overflow: 'visible', position: 'relative', width: '100%', height: '100%' }}
    >
      <svg viewBox="0 0 80 72" width="80" height="72" role="img" aria-hidden="true"
        style={{ display: 'block', overflow: 'visible', position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <linearGradient id="ledDome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={isOn ? '#ff9b9b' : '#c33a43'} /><stop offset="0.3" stopColor={isOn ? '#ff4b4b' : '#a51f29'} /><stop offset="0.65" stopColor={isOn ? '#dc171f' : '#80151d'} /><stop offset="1" stopColor={isOn ? '#850b12' : '#4c0a10'} />
          </linearGradient>
          <linearGradient id="ledFlange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f5f6" /><stop offset="0.3" stopColor="#b8bdc1" /><stop offset="0.7" stopColor="#646a6e" /><stop offset="1" stopColor="#363a3d" />
          </linearGradient>
          <linearGradient id="ledMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e9edf2" /><stop offset="0.42" stopColor="#aeb8c3" /><stop offset="1" stopColor="#687481" />
          </linearGradient>
          <radialGradient id="ledGlow">
            <stop offset="0" stopColor="#fff5f5" stopOpacity={isOn ? 0.95 : 0} /><stop offset="0.42" stopColor="#ff5555" stopOpacity={isOn ? 0.35 : 0} /><stop offset="1" stopColor="#ff2222" stopOpacity="0" />
          </radialGradient>
          <filter id="ledShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="0.7" floodOpacity="0.3" /></filter>
        </defs>

        {isOn && <ellipse cx="40" cy="20" rx="28" ry="22" fill="url(#ledGlow)" />}

        {/* Leads match the resistor's 5.4px outer / 3.5px metal treatment. */}
        <path d="M31 35 V60" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" />
        <path d="M31 35 V60" stroke="url(#ledMetal)" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M31 36 V59" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.8" strokeLinecap="round" />

        {/* Slightly bent cathode lead, matching the reference LED. */}
        <path d="M49 35 V47 L54 52 V60" fill="none" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M49 35 V47 L54 52 V60" fill="none" stroke="url(#ledMetal)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M49 36 V46.7 L53.3 51.7 V59" fill="none" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />

        <path d="M18 30 H62 V36 H18 Z" fill="url(#ledFlange)" filter="url(#ledShadow)" />
        <path d="M20 30 V20 A20 18 0 0 1 60 20 V30 Z" fill="url(#ledDome)" filter="url(#ledShadow)" />
        <path d="M24 28 V20 A16 14 0 0 1 35.5 10" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2" strokeLinecap="round" />
        <path d="M56 22 A16 13 0 0 1 54 27" fill="none" stroke="#300408" strokeOpacity=".28" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M20 30 H60" stroke="#25282a" strokeOpacity=".45" strokeWidth="1" />
      </svg>
    </div>
  )
}
