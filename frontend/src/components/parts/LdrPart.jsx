import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Photorésistance / LDR (MB-VIS-LED-013 — diffusion du langage
 * volumétrique LED / RESISTOR (MB-VIS-LED-010) / CAPACITOR (MB-VIS-COMP-011)
 * / DIODE (MB-VIS-LED-012)).
 *
 * Objectif : lire comme une vraie photorésistance — pastille céramique ronde,
 * face photoconductrice jaune-vert avec sa piste en créneau caractéristique,
 * pattes métalliques axiales — plutôt qu'un disque plat.
 * Technique réutilisée telle quelle : gradients SVG namespacés par `uid`
 * (aucun id statique), pattes `url(#<id>-metal)` + fin reflet clair, faible
 * compte de primitives, aucun filtre lourd, rendu déterministe.
 *
 * Composant STATIQUE : `uid` est la seule prop consommée, uniquement pour
 * namespacer les ids de `<defs>` (évite la collision d'ids entre instances —
 * cf. audit MB-VIS-RENDER-009 §4.F). Déterministe pour un `uid` donné.
 *
 * Contrat géométrique INCHANGÉ (I1-I8) : viewBox / dimensions 84×36 dérivés
 * de getComponentDef("LDR") ; pins canoniques A (dx=0, dy=18) / B (dx=84,
 * dy=18) gérés hors de ce fichier (Pin.jsx). Aucune coordonnée canonique
 * n'est recalculée ici. Composant symétrique (piste centrée) — orientation
 * électrique inchangée. La silhouette « pastille ronde + piste en créneau »
 * est conservée.
 */
export function LdrPart({ uid } = {}) {
  const def = getComponentDef("LDR")
  const width = def?.width ?? 84
  const height = def?.height ?? 36
  const id = String(uid ?? 'ldr').replace(/[^a-zA-Z0-9_-]/g, '_')

  // Piste photoconductrice en créneau, contenue dans la face (y ∈ [9 ; 27]).
  const track = "M22 18 L27 10 L33 10 L33 26 L40 26 L40 10 L47 10 L47 26 L54 26 L54 10 L61 10 L62 18"

  return (
    <div className="part-ldr" aria-label="Photorésistance">
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
          {/* Corps céramique : bord et tranche du support. */}
          <linearGradient id={`${id}-ceramic`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8c6a0" />
            <stop offset="45%" stopColor="#b89a6a" />
            <stop offset="100%" stopColor="#7d6642" />
          </linearGradient>
          {/* Face photoconductrice : dégradé radial (centre éclairé -> bord assombri) = volume. */}
          <radialGradient id={`${id}-face`} cx="38%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#f2f6b0" />
            <stop offset="32%" stopColor="#dbe86a" />
            <stop offset="66%" stopColor="#b6c742" />
            <stop offset="100%" stopColor="#8a9a2c" />
          </radialGradient>
        </defs>

        {/* Pattes axiales (dessinées avant le corps : le corps masque leur entrée). */}
        <line x1="0" y1="18" x2="20" y2="18" stroke={`url(#${id}-metal)`} strokeWidth="4" strokeLinecap="round" />
        <line x1="64" y1="18" x2="84" y2="18" stroke={`url(#${id}-metal)`} strokeWidth="4" strokeLinecap="round" />
        <line x1="1" y1="16.4" x2="19" y2="16.4" stroke="#f8fafb" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
        <line x1="65" y1="16.4" x2="83" y2="16.4" stroke="#f8fafb" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />

        {/* Support céramique : pastille arrière légèrement décalée (rebord + épaisseur). */}
        <ellipse cx="42.6" cy="19.4" rx="25" ry="15.5" fill={`url(#${id}-ceramic)`} />

        {/* Face photoconductrice. */}
        <ellipse cx="42" cy="18" rx="23" ry="14" fill={`url(#${id}-face)`} stroke="#6b7526" strokeWidth="1" />
        {/* Liseré interne (galbe de la résine de protection). */}
        <ellipse cx="42" cy="18" rx="20.5" ry="11.8" fill="none" stroke="#f4f8c8" strokeWidth="1" opacity="0.35" />

        {/* Piste en créneau : ombre portée + trait principal + fin reflet. */}
        <path d={track} fill="none" stroke="#1e2708" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.5" transform="translate(0.6 1.2)" />
        <path d={track} fill="none" stroke="#38470f" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={track} fill="none" stroke="#cdda72" strokeWidth="0.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.45" transform="translate(-0.4 -0.5)" />

        {/* Plots de raccordement piste -> pattes. */}
        <circle cx="22" cy="18" r="1.9" fill="#2c380c" />
        <circle cx="62" cy="18" r="1.9" fill="#2c380c" />

        {/* Congés patte -> corps. */}
        <ellipse cx="20" cy="18" rx="2.3" ry="3" fill={`url(#${id}-ceramic)`} />
        <ellipse cx="64" cy="18" rx="2.3" ry="3" fill={`url(#${id}-ceramic)`} />

        {/* Reflet spéculaire de la résine (haut-gauche). */}
        <ellipse cx="33" cy="11.5" rx="9" ry="3.4" fill="#ffffff" opacity="0.34" transform="rotate(-16 33 11.5)" />
      </svg>
    </div>
  )
}
