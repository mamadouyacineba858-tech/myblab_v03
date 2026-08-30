import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur céramique traversant.
 *
 * Contrat électrique inchangé : viewBox 70×40, pinA=(0,20), pinB=(70,20).
 * Les pattes visuelles rejoignent les endpoints latéraux puis descendent
 * sous le corps, sans introduire de polarité.
 */
export function CapacitorPart() {
  return (
    <div className="part-capacitor" aria-label="Condensateur">
      <svg viewBox="0 0 70 40" width="70" height="40" role="img" aria-hidden="true" overflow="visible">
        <defs>
          <linearGradient id="capacitor-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6e8fa6" />
            <stop offset="18%" stopColor="#a8c1d0" />
            <stop offset="48%" stopColor="#d6e4ea" />
            <stop offset="72%" stopColor="#91adbd" />
            <stop offset="100%" stopColor="#55768d" />
          </linearGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#66727a" />
            <stop offset="35%" stopColor="#e4eaed" />
            <stop offset="58%" stopColor="#aeb8be" />
            <stop offset="100%" stopColor="#59636a" />
          </linearGradient>
          <linearGradient id="capacitor-highlight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Electrical endpoints remain exactly at (0,20) and (70,20). */}
        <path d="M0 20 C7 20 10 21 13 25 V36" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M70 20 C63 20 60 21 57 25 V36" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Compact ceramic body. */}
        <rect x="13" y="7" width="44" height="26" rx="10" fill="url(#capacitor-body)" stroke="#3f5f73" strokeWidth="1.2" />
        <ellipse cx="35" cy="12" rx="19" ry="6" fill="url(#capacitor-highlight)" opacity="0.5" />
        <path d="M17 17 C21 10 28 9 35 9 C42 9 49 10 53 17" fill="none" stroke="#eef7fb" strokeWidth="1" opacity="0.45" />
        <path d="M16 27 C25 32 45 32 54 27" fill="none" stroke="#304c5e" strokeWidth="1" opacity="0.4" />
      </svg>
    </div>
  )
}
