import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel du condensateur céramique disque traversant.
 *
 * MB-VIS-COMP-011 — diffusion du pattern volumétrique déjà éprouvé par
 * LedPart.jsx / ResistorPart.jsx (MB-VIS-LED-010) vers le CAPACITOR :
 *  - gradients namespacés par `uid` (plus aucun id SVG statique : l'ancien
 *    identifiant fixe du gradient de disque provoquait une collision entre
 *    instances quand plusieurs condensateurs coexistaient sur le canvas —
 *    audit MB-VIS-RENDER-009) ;
 *  - corps à dégradé vertical (haut clair -> bas ambre) pour un relief
 *    perceptible, tranche légèrement décalée pour suggérer l'épaisseur du
 *    disque, liseré et reflet spéculaire du vernis ;
 *  - pattes métalliques épaissies : trait `url(#<id>-metal)` + fin reflet
 *    clair, exactement le patron LedPart/ResistorPart.
 *
 * Composant STATIQUE : `uid` est la seule prop consommée, uniquement pour
 * namespacer les ids de `<defs>`. Le rendu reste strictement déterministe
 * pour un `uid` donné (aucun aléa, aucune date) — TEST T8 renderQualityGate.
 *
 * Contrat géométrique INCHANGÉ (VIS-INV) : viewBox / dimensions 70×40 et
 * pins canoniques pinA (0,20) / pinB (70,20) sont dérivés / gérés hors de
 * ce fichier ; aucune coordonnée canonique n'est recalculée ici, seule la
 * silhouette interne du dessin (contenue dans la boîte 70×40) change. Les
 * deux pattes dessinées sortent sous le corps, silhouette identifiable
 * d'un condensateur céramique radial (identité visuelle conservée).
 */
export function CapacitorPart({ uid } = {}) {
  const def = getComponentDef("CAPACITOR")
  const width = def?.width ?? 70
  const height = def?.height ?? 40
  const id = String(uid ?? 'capacitor').replace(/[^a-zA-Z0-9_-]/g, '_')

  return (
    <div className="part-capacitor" aria-label="Condensateur">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true">
        <defs>
          {/* Face avant : dégradé vertical haut clair -> bas ambre (volume). */}
          <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe19a" />
            <stop offset="24%" stopColor="#f7c65b" />
            <stop offset="62%" stopColor="#e5992a" />
            <stop offset="100%" stopColor="#b26c12" />
          </linearGradient>
          {/* Tranche / profondeur du disque, plus sombre que la face. */}
          <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c07d18" />
            <stop offset="100%" stopColor="#7a4708" />
          </linearGradient>
          {/* Patte métallique : même patron que LedPart.jsx / ResistorPart.jsx. */}
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#555b60" />
            <stop offset="20%" stopColor="#aeb5ba" />
            <stop offset="53%" stopColor="#f5f6f6" />
            <stop offset="82%" stopColor="#969ea4" />
            <stop offset="100%" stopColor="#5b6268" />
          </linearGradient>
        </defs>

        {/* Pattes métalliques verticales (dessinées avant le corps : le corps
            masque leur point d'entrée). Trait de base + fin reflet clair. */}
        <line x1="26" y1="25" x2="26" y2="40" stroke={`url(#${id}-metal)`} strokeWidth="4" strokeLinecap="round" />
        <line x1="44" y1="25" x2="44" y2="40" stroke={`url(#${id}-metal)`} strokeWidth="4" strokeLinecap="round" />
        <line x1="25.1" y1="26" x2="25.1" y2="39" stroke="#f8fafb" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
        <line x1="43.1" y1="26" x2="43.1" y2="39" stroke="#f8fafb" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />

        {/* Ombre de contact sous le corps : ancre le volume au-dessus des pattes. */}
        <ellipse cx="35" cy="27" rx="19" ry="2" fill="#4d2c05" opacity="0.32" />

        {/* Tranche du disque : même silhouette décalée de (2 ; 1.8), révèle
            l'épaisseur sur les bords bas/droite. */}
        <path
          d="M15 22.8 C15 11.3 21.5 4.8 37 4.8 C52.5 4.8 59 11.3 59 22.8 C59 26.4 56 28.8 51 28.8 L23 28.8 C18 28.8 15 26.4 15 22.8 Z"
          fill={`url(#${id}-edge)`}
        />

        {/* Face avant du condensateur : dégradé de volume + liseré. */}
        <path
          d="M13 21 C13 9.5 19.5 3 35 3 C50.5 3 57 9.5 57 21 C57 24.6 54 27 49 27 L21 27 C16 27 13 24.6 13 21 Z"
          fill={`url(#${id}-face)`}
          stroke="#6b3f0a"
          strokeWidth="1.1"
        />

        {/* Congés de soudure : fondu patte -> corps au ras du bord inférieur. */}
        <ellipse cx="26" cy="25.6" rx="2.8" ry="1.7" fill={`url(#${id}-edge)`} />
        <ellipse cx="44" cy="25.6" rx="2.8" ry="1.7" fill={`url(#${id}-edge)`} />

        {/* Liseré clair épousant la courbe supérieure interne (galbe du vernis). */}
        <path
          d="M16 18 C16.6 10 22.5 5 35 5 C47.5 5 53.4 10 54 18"
          fill="none"
          stroke="#fff4d6"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Reflet spéculaire du vernis + petit éclat. */}
        <ellipse cx="25" cy="11" rx="8.5" ry="4" fill="#fff8e6" opacity="0.5" transform="rotate(-18 25 11)" />
        <ellipse cx="20" cy="8.5" rx="2.4" ry="1.3" fill="#ffffff" opacity="0.55" />

        {/* Marquage céramique discret — repère fixe, aide à l'identification. */}
        <text
          x="35"
          y="18.5"
          textAnchor="middle"
          fontFamily="'Segoe UI', Arial, sans-serif"
          fontSize="6.5"
          fontWeight="600"
          fill="#5f3907"
          opacity="0.5"
        >
          104
        </text>
      </svg>
    </div>
  )
}
