import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Thermistance / THERMISTOR NTC (MB-VIS-LED-014 — diffusion du
 * langage volumétrique LED / RESISTOR (MB-VIS-LED-010) / CAPACITOR
 * (MB-VIS-COMP-011) / DIODE (MB-VIS-LED-012) / LDR (MB-VIS-LED-013)).
 *
 * Objectif : lire comme une vraie perle NTC — goutte d'époxy bleue vernissée
 * traversée par deux fils métalliques axiaux — plutôt qu'un disque plat.
 * Technique réutilisée telle quelle : gradients SVG namespacés par `uid`
 * (aucun id statique), pattes `url(#<id>-metal)` + fin reflet clair, faible
 * compte de primitives, aucun filtre lourd, rendu déterministe.
 *
 * Composant STATIQUE : `uid` est la seule prop consommée, uniquement pour
 * namespacer les ids de `<defs>` (évite la collision d'ids entre instances —
 * cf. audit MB-VIS-RENDER-009 §4.F). Déterministe pour un `uid` donné.
 *
 * Contrat géométrique INCHANGÉ : viewBox / dimensions 84×36 dérivés de
 * getComponentDef("THERMISTOR") ; pins canoniques A (dx=0, dy=18) / B
 * (dx=84, dy=18) gérés hors de ce fichier (Pin.jsx). Aucune coordonnée
 * canonique n'est recalculée ici. Composant symétrique — orientation
 * électrique inchangée. La silhouette « perle ronde sur fil axial » est
 * conservée.
 */
export function ThermistorPart({ uid } = {}) {
  const def = getComponentDef("THERMISTOR")
  const width = def?.width ?? 84
  const height = def?.height ?? 36
  const id = String(uid ?? 'thermistor').replace(/[^a-zA-Z0-9_-]/g, '_')

  return (
    <div className="part-thermistor" aria-label="Thermistance">
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
          {/* Perle époxy : dégradé radial (point chaud haut-gauche -> bord bleu profond) = volume. */}
          <radialGradient id={`${id}-bead`} cx="36%" cy="32%" r="72%">
            <stop offset="0%" stopColor="#a9cef7" />
            <stop offset="25%" stopColor="#6ba2e6" />
            <stop offset="55%" stopColor="#3568c0" />
            <stop offset="80%" stopColor="#1c3f88" />
            <stop offset="100%" stopColor="#0d2350" />
          </radialGradient>
          {/* Profondeur / congés : bleu très sombre. */}
          <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a336e" />
            <stop offset="100%" stopColor="#081a42" />
          </linearGradient>
        </defs>

        {/* Pattes axiales (dessinées avant le corps : le corps masque leur entrée). */}
        <line x1="0" y1="18" x2="27" y2="18" stroke={`url(#${id}-metal)`} strokeWidth="4" strokeLinecap="round" />
        <line x1="57" y1="18" x2="84" y2="18" stroke={`url(#${id}-metal)`} strokeWidth="4" strokeLinecap="round" />
        <line x1="1" y1="16.4" x2="26" y2="16.4" stroke="#f8fafb" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
        <line x1="58" y1="16.4" x2="83" y2="16.4" stroke="#f8fafb" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />

        {/* Congés patte -> perle. */}
        <ellipse cx="27" cy="18" rx="2.4" ry="3" fill={`url(#${id}-edge)`} />
        <ellipse cx="57" cy="18" rx="2.4" ry="3" fill={`url(#${id}-edge)`} />

        {/* Perle : disque de profondeur légèrement décalé + face vernie. */}
        <circle cx="43" cy="19.8" r="15.5" fill={`url(#${id}-edge)`} />
        <circle cx="42" cy="18" r="15" fill={`url(#${id}-bead)`} stroke="#0a1f4a" strokeWidth="1" />

        {/* Anneau de lumière interne + ombre basse-droite (rondeur). */}
        <circle cx="42" cy="18" r="12.6" fill="none" stroke="#bfdcff" strokeWidth="1" opacity="0.22" />
        <ellipse cx="47" cy="24" rx="10" ry="7.5" fill="#08194a" opacity="0.3" transform="rotate(20 47 24)" />

        {/* Reflet spéculaire du vernis (haut-gauche) + petit éclat. */}
        <ellipse cx="35" cy="11" rx="6.5" ry="3.2" fill="#ffffff" opacity="0.5" transform="rotate(-24 35 11)" />
        <circle cx="33.5" cy="12.5" r="1.6" fill="#ffffff" opacity="0.6" />
      </svg>
    </div>
  )
}
