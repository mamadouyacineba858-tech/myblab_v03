import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur céramique traversant.
 *
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * Le dessin visuel est indépendant des endpoints : les connexions restent
 * latérales pour le moteur, tandis que les pattes visibles descendent sous
 * le corps. Les marqueurs Pin restent interactifs mais sont invisibles sur
 * le Canvas afin de ne pas polluer la silhouette réaliste.
 */
export function CapacitorPart() {
  return (
    <div className="part-capacitor" aria-label="Condensateur">
      <style>{`
        .circuit-component:has(.part-capacitor) .myblab-pin {
          opacity: 0 !important;
        }
      `}</style>
      <svg viewBox="0 0 70 64" width="70" height="64" role="img" aria-hidden="true" overflow="visible" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="capacitor-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#174f86" />
            <stop offset="20%" stopColor="#2f78b5" />
            <stop offset="48%" stopColor="#4f91c5" />
            <stop offset="72%" stopColor="#28689f" />
            <stop offset="100%" stopColor="#12436f" />
          </linearGradient>
          <radialGradient id="capacitor-dome" cx="30%" cy="18%" r="82%">
            <stop offset="0%" stopColor="#d9efff" stopOpacity="0.8" />
            <stop offset="24%" stopColor="#77b2db" stopOpacity="0.52" />
            <stop offset="62%" stopColor="#2c73ad" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#103f69" stopOpacity="0.92" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#69757d" />
            <stop offset="32%" stopColor="#f2f5f6" />
            <stop offset="54%" stopColor="#b9c2c7" />
            <stop offset="78%" stopColor="#eef2f4" />
            <stop offset="100%" stopColor="#59636a" />
          </linearGradient>
        </defs>

        {/* Visible leads: equal diameter, short, vertical below the body. */}
        <path d="M28 32 V61" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M42 32 V61" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M27.45 34 V59.5" fill="none" stroke="#ffffff" strokeWidth="0.65" strokeLinecap="round" opacity="0.68" />
        <path d="M41.45 34 V59.5" fill="none" stroke="#ffffff" strokeWidth="0.65" strokeLinecap="round" opacity="0.68" />

        {/* Rounded blue ceramic body, deliberately compact and non-polarized. */}
        <path d="M17 34 V18 C17 7.6 24.8 2 35 2 C45.2 2 53 7.6 53 18 V34 Z" fill="url(#capacitor-body)" stroke="#123e63" strokeWidth="1.15" />
        <path d="M19 32 V18 C19 9.3 25.6 4.2 35 4.2 C44.4 4.2 51 9.3 51 18 V32 Z" fill="url(#capacitor-dome)" opacity="0.9" />
        <path d="M21 18 C22 10.7 27.3 5.8 34.5 5.1 C29.2 7.1 25.4 11.8 25.1 18 V31 H20 Z" fill="#e8f6ff" opacity="0.2" />
        <path d="M20 32 C27 35 43 35 50 32" fill="none" stroke="#0b3150" strokeWidth="1" opacity="0.42" />
      </svg>
    </div>
  )
}
