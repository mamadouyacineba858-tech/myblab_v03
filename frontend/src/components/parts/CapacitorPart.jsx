import React from 'react'

/**
 * Rendu visuel réaliste d'un condensateur traversant.
 * Contrat électrique inchangé : pinA=(0,20), pinB=(70,20).
 * Le SVG conserve la boîte contractuelle 70×40, mais son contenu peut
 * déborder verticalement pour reproduire la silhouette physique réelle.
 */
export function CapacitorPart() {
  return (
    <div
      className="part-capacitor"
      aria-label="Condensateur"
      style={{
        width: '70px',
        height: '40px',
        overflow: 'visible',
        background: 'transparent',
        border: 0,
        borderRadius: 0,
        boxShadow: 'none',
      }}
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
          overflow: visible !important;
        }
      `}</style>
      <svg
        viewBox="0 0 70 40"
        width="70"
        height="40"
        role="img"
        aria-hidden="true"
        overflow="visible"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="capacitor-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#124b82" />
            <stop offset="17%" stopColor="#286eaa" />
            <stop offset="39%" stopColor="#63a9d7" />
            <stop offset="52%" stopColor="#3c83bb" />
            <stop offset="78%" stopColor="#1e6099" />
            <stop offset="100%" stopColor="#0d3961" />
          </linearGradient>
          <radialGradient id="capacitor-volume" cx="30%" cy="12%" r="88%">
            <stop offset="0%" stopColor="#f5fbff" stopOpacity="0.94" />
            <stop offset="15%" stopColor="#a9d7f3" stopOpacity="0.64" />
            <stop offset="39%" stopColor="#5799ca" stopOpacity="0.46" />
            <stop offset="70%" stopColor="#2369a2" stopOpacity="0.73" />
            <stop offset="100%" stopColor="#0b3459" stopOpacity="0.97" />
          </radialGradient>
          <linearGradient id="capacitor-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#566168" />
            <stop offset="25%" stopColor="#dce4e8" />
            <stop offset="44%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#aab5bb" />
            <stop offset="81%" stopColor="#edf1f3" />
            <stop offset="100%" stopColor="#4e5960" />
          </linearGradient>
        </defs>

        {/* Pattes courtes, parallèles, même diamètre. */}
        <path d="M25.5 45 V72" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.1" strokeLinecap="round" />
        <path d="M44.5 45 V72" fill="none" stroke="url(#capacitor-metal)" strokeWidth="3.1" strokeLinecap="round" />
        <path d="M24.95 46 V70.7" fill="none" stroke="#ffffff" strokeWidth="0.58" strokeLinecap="round" opacity="0.72" />
        <path d="M43.95 46 V70.7" fill="none" stroke="#ffffff" strokeWidth="0.58" strokeLinecap="round" opacity="0.72" />

        {/* Silhouette de référence : large en haut, épaules arrondies,
            resserrement progressif et léger creux entre les pattes. */}
        <path
          d="M8 43
             C7 37 6 30 6 22
             C6 7 17 -8 35 -9
             C53 -8 64 7 64 22
             C64 30 63 37 62 43
             C59 48 54 50 49 49
             C44 48 40 45 35 46
             C30 45 26 48 21 49
             C16 50 11 48 8 43 Z"
          fill="url(#capacitor-body)"
          stroke="#0b3459"
          strokeWidth="1.15"
        />
        <path
          d="M10 41
             C9 34 8.5 28 8.5 21.5
             C8.5 9 18.4 -5.2 35 -6.2
             C51.6 -5.2 61.5 9 61.5 21.5
             C61.5 28 61 34 60 41
             C57.2 45.6 52.6 47.1 48.5 46.2
             C43.8 45.2 40 42.6 35 43.5
             C30 42.6 26.2 45.2 21.5 46.2
             C17.4 47.1 12.8 45.6 10 41 Z"
          fill="url(#capacitor-volume)"
          opacity="0.95"
        />

        {/* Reflet principal et ombrage périphérique. */}
        <path
          d="M13 21 C14 10 22 -2 34.2 -4.7 C25.1 -1.1 19 7.2 18.7 18.5 C18.5 28 18.4 34.8 15.7 41.2 C13.5 42.7 11.4 41.8 10.7 39.5 Z"
          fill="#f1fbff"
          opacity="0.32"
        />
        <path
          d="M16.5 13 C20.2 4.8 27.2 -2 34.7 -3.6"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.1"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M57.8 18 C57.1 9.5 50.8 1.5 42 -2.1 C51.8 2.1 55 10.4 55.1 20 V39.5 C56.6 42.1 58.1 41.7 59.1 38.5 Z"
          fill="#052744"
          opacity="0.2"
        />
        <path
          d="M11 41.5 C18 44.7 26.2 43.2 35 43.7 C43.8 43.2 52 44.7 59 41.5"
          fill="none"
          stroke="#062b49"
          strokeWidth="1.05"
          opacity="0.5"
        />
      </svg>
    </div>
  )
}
