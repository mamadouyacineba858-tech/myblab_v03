import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur céramique traversant.
 *
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * Le dessin visuel est indépendant des endpoints : les connexions restent
 * disponibles pour le moteur tandis que la silhouette visible est celle
 * d'un condensateur radial à corps époxy bombé et deux pattes courtes.
 */
export function CapacitorPart() {
  return (
    <div className="part-capacitor" aria-label="Condensateur">
      <style>{`
        .circuit-component:has(.part-capacitor) .myblab-pin {
          opacity: 0 !important;
        }
      `}</style>
      <svg viewBox="0 0 70 104" width="70" height="104" role="img" aria-hidden="true" overflow="visible" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="capacitor-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#123f70" />
            <stop offset="13%" stopColor="#1f609d" />
            <stop offset="34%" stopColor="#3d88c5" />
            <stop offset="52%" stopColor="#2d73ae" />
            <stop offset="76%" stopColor="#1d5c98" />
            <stop offset="100%" stopColor="#0d365e" />
          </linearGradient>
          <radialGradient id="capacitor-highlight" cx="29%" cy="17%" r="76%">
            <stop offset="0%" stopColor="#e8f7ff" stopOpacity="0.92" />
            <stop offset="15%" stopColor="#9ed0f1" stopOpacity="0.62" />
            <stop offset="42%" stopColor="#4e95ca" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#123e6c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5d6870" />
            <stop offset="25%" stopColor="#dfe5e8" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="72%" stopColor="#aeb8be" />
            <stop offset="100%" stopColor="#59636a" />
          </linearGradient>
        </defs>

        {/* Two equal short leads, positioned under the narrowed body. */}
        <path d="M27 69 V100" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M43 69 V100" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M26.35 71 V98.5" fill="none" stroke="#ffffff" strokeWidth="0.72" strokeLinecap="round" opacity="0.72" />
        <path d="M42.35 71 V98.5" fill="none" stroke="#ffffff" strokeWidth="0.72" strokeLinecap="round" opacity="0.72" />

        {/* Reference silhouette: rounded epoxy bulb, broad shoulder, tapered neck and shallow bottom scallop. */}
        <path
          d="M35 2
             C18.7 2 8 13.2 8 30.2
             C8 43.7 13.2 50.3 16.7 57.3
             C19.3 62.5 19.2 68.2 22.3 71.2
             C25.4 74.2 29.2 72.6 35 69.4
             C40.8 72.6 44.6 74.2 47.7 71.2
             C50.8 68.2 50.7 62.5 53.3 57.3
             C56.8 50.3 62 43.7 62 30.2
             C62 13.2 51.3 2 35 2 Z"
          fill="url(#capacitor-body)"
          stroke="#0b3155"
          strokeWidth="1.2"
        />
        <path
          d="M35 4
             C20.6 4 10.5 14.2 10.5 30.3
             C10.5 42.2 15.3 48.6 18.5 55.7
             C21 61.2 20.9 66.1 23 68.6
             C26 70.6 30.5 69.1 35 66.8
             C39.5 69.1 44 70.6 47 68.6
             C49.1 66.1 49 61.2 51.5 55.7
             C54.7 48.6 59.5 42.2 59.5 30.3
             C59.5 14.2 49.4 4 35 4 Z"
          fill="url(#capacitor-highlight)"
          opacity="0.92"
        />

        {/* Soft molded highlight and side depth. */}
        <path
          d="M18.5 43 C16.5 32 17.8 19 24.2 11.5 C27.2 8 30.8 6.1 34.2 5.2 C27.3 8.2 23.3 14.7 23 23.1 C22.7 33.1 24.8 42.2 22.3 51.7 C21.4 55 20.8 58.2 21.1 61.4"
          fill="none"
          stroke="#eef9ff"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.34"
        />
        <path
          d="M53.5 17 C59 25 58.7 37.5 54 48.5 C51.1 55.2 49.3 61 48.8 66.2"
          fill="none"
          stroke="#062848"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
    </div>
  )
}
