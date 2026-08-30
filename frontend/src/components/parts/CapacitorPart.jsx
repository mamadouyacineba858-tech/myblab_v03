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
    <div
      className="part-capacitor"
      aria-label="Condensateur"
      style={{ width: '70px', height: '64px', overflow: 'visible', background: 'transparent', border: 0, borderRadius: 0, boxShadow: 'none' }}
    >
      <style>{`
        .circuit-component:has(.part-capacitor) .myblab-pin {
          opacity: 0 !important;
        }
        .circuit-component:has(.part-capacitor) .circuit-component__body {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      <svg viewBox="0 0 70 64" width="70" height="64" role="img" aria-hidden="true" overflow="visible" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="capacitor-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#174f86" />
            <stop offset="18%" stopColor="#2f78b5" />
            <stop offset="46%" stopColor="#5598cb" />
            <stop offset="72%" stopColor="#28689f" />
            <stop offset="100%" stopColor="#12436f" />
          </linearGradient>
          <radialGradient id="capacitor-dome" cx="29%" cy="18%" r="84%">
            <stop offset="0%" stopColor="#e4f5ff" stopOpacity="0.82" />
            <stop offset="22%" stopColor="#80b9df" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#2d75af" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#103e68" stopOpacity="0.94" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#626d74" />
            <stop offset="30%" stopColor="#f4f7f8" />
            <stop offset="52%" stopColor="#b9c2c7" />
            <stop offset="78%" stopColor="#f0f3f4" />
            <stop offset="100%" stopColor="#566168" />
          </linearGradient>
        </defs>

        {/* Deux pattes identiques : courtes, verticales et métalliques. */}
        <path d="M28 34 V61" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M42 34 V61" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M27.42 35 V59.5" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.68" />
        <path d="M41.42 35 V59.5" fill="none" stroke="#ffffff" strokeWidth="0.62" strokeLinecap="round" opacity="0.68" />

        {/* Corps céramique bleu, bombé en haut et légèrement resserré à la base. */}
        <path d="M17 30 V18 C17 7.7 24.7 2 35 2 C45.3 2 53 7.7 53 18 V30 C53 34.2 49.2 37 44 37 C40.7 37 38.6 35.2 35 35.2 C31.4 35.2 29.3 37 26 37 C20.8 37 17 34.2 17 30 Z" fill="url(#capacitor-body)" stroke="#123e63" strokeWidth="1.15" />
        <path d="M19 29 V18 C19 9.4 25.5 4.2 35 4.2 C44.5 4.2 51 9.4 51 18 V29 C51 32.4 47.8 34.7 43.5 34.7 C40.3 34.7 38.2 33.3 35 33.3 C31.8 33.3 29.7 34.7 26.5 34.7 C22.2 34.7 19 32.4 19 29 Z" fill="url(#capacitor-dome)" opacity="0.9" />
        <path d="M21 18 C22 10.7 27.2 5.8 34.5 5.1 C29.3 7.1 25.5 11.7 25.1 18 V29.8 C23.6 30.7 22.1 30.8 20.8 30.1 Z" fill="#e8f6ff" opacity="0.24" />
        <path d="M20.5 30.2 C26.5 33.2 30.5 32.2 35 32.2 C39.5 32.2 43.5 33.2 49.5 30.2" fill="none" stroke="#0b3150" strokeWidth="0.9" opacity="0.38" />
      </svg>
    </div>
  )
}
