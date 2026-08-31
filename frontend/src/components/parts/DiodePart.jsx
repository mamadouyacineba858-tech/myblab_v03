import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Diode axiale (MB-VIS-LED-012 — diffusion du pattern
 * volumétrique LED / RESISTOR (MB-VIS-LED-010) / CAPACITOR (MB-VIS-COMP-011)).
 *
 * Objectif : lire comme un vrai composant axial (corps cylindrique en résine
 * sombre, bague de cathode métallique, pattes rondes) plutôt qu'un rect plat.
 * Technique réutilisée telle quelle : gradients SVG namespacés par `uid`
 * (aucun id statique), pattes `url(#<id>-metal)` + fin reflet clair, faible
 * compte de primitives, aucun filtre lourd, rendu déterministe.
 *
 * Composant STATIQUE : `uid` est la seule prop consommée, uniquement pour
 * namespacer les ids de `<defs>` (évite la collision d'ids entre instances —
 * cf. audit MB-VIS-RENDER-009 §4.F). Déterministe pour un `uid` donné.
 *
 * Contrat géométrique INCHANGÉ (I1-I4) : viewBox / dimensions 84×30 dérivés
 * de getComponentDef("DIODE") ; pins canoniques anode (dx=0, dy=15) /
 * cathode (dx=84, dy=15) gérés hors de ce fichier (Pin.jsx). Aucune
 * coordonnée canonique n'est recalculée ici. La bague de cathode est dessinée
 * côté droit, cohérente avec la position réelle du pin "cathode" (dx=84) —
 * orientation fonctionnelle conservée.
 */
export function DiodePart({ uid } = {}) {
  const def = getComponentDef("DIODE")
  const width = def?.width ?? 84
  const height = def?.height ?? 30
  const id = String(uid ?? 'diode').replace(/[^a-zA-Z0-9_-]/g, '_')

  return (
    <div className="part-diode" aria-label="Diode">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true">
        <defs>
          {/* Patte ronde : reflet tubulaire vertical (haut/bas sombres, centre clair). */}
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b6268" />
            <stop offset="30%" stopColor="#c9ced2" />
            <stop offset="50%" stopColor="#f5f6f6" />
            <stop offset="70%" stopColor="#aeb5ba" />
            <stop offset="100%" stopColor="#5b6268" />
          </linearGradient>
          {/* Corps résine sombre : dégradé vertical (haut éclairé -> bas ombré) = volume cylindrique. */}
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a4150" />
            <stop offset="18%" stopColor="#2b303c" />
            <stop offset="55%" stopColor="#191d26" />
            <stop offset="100%" stopColor="#0c0e13" />
          </linearGradient>
          {/* Tranche / congés : profondeur, plus sombre que la face. */}
          <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#23272f" />
            <stop offset="100%" stopColor="#0a0c10" />
          </linearGradient>
          {/* Bague de cathode : anneau métallique argenté. */}
          <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2f4f6" />
            <stop offset="25%" stopColor="#d7dbe0" />
            <stop offset="55%" stopColor="#a9b0b8" />
            <stop offset="100%" stopColor="#7f868f" />
          </linearGradient>
        </defs>

        {/* Pattes axiales (dessinées avant le corps : le corps masque leur entrée). */}
        <line x1="0" y1="15" x2="24" y2="15" stroke={`url(#${id}-metal)`} strokeWidth="4" strokeLinecap="round" />
        <line x1="60" y1="15" x2="84" y2="15" stroke={`url(#${id}-metal)`} strokeWidth="4" strokeLinecap="round" />
        <line x1="1" y1="13.4" x2="23" y2="13.4" stroke="#f8fafb" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
        <line x1="61" y1="13.4" x2="83" y2="13.4" stroke="#f8fafb" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />

        {/* Tranche du boîtier : même silhouette décalée de (0.8 ; 1.6), révèle l'épaisseur. */}
        <rect x="22.8" y="6.6" width="40" height="19" rx="3.5" fill={`url(#${id}-edge)`} />

        {/* Corps cylindrique en résine. */}
        <rect x="22" y="5" width="40" height="20" rx="3.5" fill={`url(#${id}-body)`} stroke="#05070b" strokeWidth="1" />

        {/* Reflet supérieur (arête éclairée du cylindre) + ombre basse. */}
        <rect x="25" y="6.8" width="34" height="3.6" rx="1.8" fill="#ffffff" opacity="0.12" />
        <rect x="24" y="20.8" width="36" height="3.4" rx="1.5" fill="#000000" opacity="0.26" />

        {/* Embout arrondi côté anode (lecture axiale). */}
        <ellipse cx="23" cy="15" rx="1.7" ry="9" fill="#000000" opacity="0.22" />

        {/* Congés patte -> corps. */}
        <ellipse cx="22" cy="15" rx="2.2" ry="2.6" fill={`url(#${id}-edge)`} />
        <ellipse cx="62" cy="15" rx="2.2" ry="2.6" fill={`url(#${id}-edge)`} />

        {/* Bague de cathode (côté pin "cathode", dx=84). */}
        <rect x="51" y="5" width="5" height="20" fill={`url(#${id}-band)`} />
        <rect x="51.4" y="6.2" width="4.2" height="3" rx="1" fill="#ffffff" opacity="0.35" />
        <line x1="50.9" y1="5" x2="50.9" y2="25" stroke="#05070b" strokeWidth="0.8" opacity="0.55" />
        <line x1="56.1" y1="5" x2="56.1" y2="25" stroke="#05070b" strokeWidth="0.8" opacity="0.55" />

        {/* Marquage discret — repère fixe, aide à l'identification. */}
        <text
          x="37"
          y="17.4"
          textAnchor="middle"
          fontFamily="'Segoe UI', Arial, sans-serif"
          fontSize="5"
          fill="#9aa3ad"
          opacity="0.42"
        >
          1N4148
        </text>
      </svg>
    </div>
  )
}
