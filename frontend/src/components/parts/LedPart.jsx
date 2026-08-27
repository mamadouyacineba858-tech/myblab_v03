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
            <stop offset="0" stopColor={isOn ? '#ffb0b0' : '#d84a52'} /><stop offset="0.28" stopColor={isOn ? '#ff5151' : '#a9232c'} /><stop offset="0.68" stopColor={isOn ? '#dc171f' : '#78131b'} /><stop offset="1" stopColor={isOn ? '#850b12' : '#47090e'} />
          </linearGradient>
          <linearGradient id="ledFlange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e34b55" /><stop offset="0.35" stopColor="#b51e29" /><stop offset="0.75" stopColor="#7d1018" /><stop offset="1" stopColor="#4b080d" />
          </linearGradient>
          <linearGradient id="ledMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef2f5" /><stop offset="0.42" stopColor="#b5bec7" /><stop offset="1" stopColor="#687581" />
          </linearGradient>
          <radialGradient id="ledGlow">
            <stop offset="0" stopColor="#fff5f5" stopOpacity={isOn ? 0.95 : 0} /><stop offset="0.42" stopColor="#ff5555" stopOpacity={isOn ? 0.35 : 0} /><stop offset="1" stopColor="#ff2222" stopOpacity="0" />
          </radialGradient>
          <filter id="ledShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="0.7" floodOpacity="0.3" /></filter>
        </defs>

        {isOn && <ellipse cx="40" cy="22" rx="30" ry="25" fill="url(#ledGlow)" />}

        {/* Physical leads: same visual diameter as the realistic resistor leads. */}
        <path d="M31 39 V62" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" />
        <path d="M31 39 V62" stroke="url(#ledMetal)" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M31 40 V61" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.8" strokeLinecap="round" />

        {/* Cathode lead with the characteristic real-world bend. */}
        <path d="M49 39 V48 L54 53 V62" fill="none" stroke="#596572" strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M49 39 V48 L54 53 V62" fill="none" stroke="url(#ledMetal)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M49 40 V47.7 L53.3 52.7 V61" fill="none" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* Lowered, fuller dome: closer to a real 5 mm through-hole LED. */}
        <path d="M18 36 H62 V40 H18 Z" fill="url(#ledFlange)" filter="url(#ledShadow)" />
        <path d="M20 36 V19 A20 17 0 0 1 60 19 V36 Z" fill="url(#ledDome)" filter="url(#ledShadow)" />
        <path d="M24 34 V20 A16 14 0 0 1 35.5 10" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2" strokeLinecap="round" />
        <path d="M56 23 A16 13 0 0 1 54 32" fill="none" stroke="#300408" strokeOpacity=".28" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M20 36 H60" stroke="#25282a" strokeOpacity=".45" strokeWidth="1" />
      </svg>
    </div>
  )
}
