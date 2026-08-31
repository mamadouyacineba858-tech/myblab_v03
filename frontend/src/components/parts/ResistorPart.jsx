import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Résistance (MB-VIS-LED-010 — diffusion du pattern volumétrique LED).
 *
 * MB-VIS-LED-010 : la RESISTOR est la cible choisie pour diffuser la
 * technique de rendu déjà éprouvée par LedPart.jsx (gradients namespacés par
 * `uid`, pattes à double trait métal+reflet) vers une seconde famille de
 * composants — sans redessiner la LED elle-même. Justification du choix
 * (voir aussi le rapport final) : composant le plus visible de la
 * bibliothèque (présent dans la quasi-totalité des circuits de démo),
 * géométrie la plus simple (2 pins, boîte rectangulaire) donc risque
 * architectural minimal, et rendu antérieur le plus plat (3 rects + 2 lignes,
 * aucun gradient) donc le gain visuel immédiat le plus fort.
 *
 * Composant STATIQUE : `uid` est la seule prop consommée, uniquement pour
 * namespacer les ids de gradient SVG (même rôle que dans LedPart.jsx — évite
 * la collision d'id constatée sur CapacitorPart.jsx lors de l'audit
 * MB-VIS-RENDER-009 quand plusieurs instances du même type coexistent sur le
 * canvas). Ce n'est pas une prop électrique/dynamique : le rendu reste
 * strictement déterministe pour un `uid` donné (TEST T8, RENDER-009).
 *
 * Contrat géométrique inchangé : viewBox/dimensions 84×28
 * (componentDefinitions.js), pattes centrées sur y=14, boîtier contenu dans
 * la boîte canonique — AUCUNE valeur ni coordonnée n'est recalculée ici,
 * uniquement dérivée de getComponentDef("RESISTOR").
 *
 * Les 4 bagues restent un repère visuel FIXE, pas un code couleur dynamique :
 * aucune valeur de résistance par instance n'existe dans le modèle actuel
 * (seul un defaultValue de schéma existe dans canonicalRegistry.js —
 * DECLARED_DEFAULT_PARAMETERS.RESISTOR = 220 — non lié à une instance sur le
 * canvas). La séquence rouge-rouge-marron-or reprise ici correspond au code
 * couleur standard de cette unique valeur par défaut (220 Ω), mais reste
 * câblée en dur pour TOUTES les instances, exactement comme les 2 bagues
 * qu'elle remplace (cf. GATE 1 MB-VIS-002, section D, principe inchangé) —
 * ce n'est PAS une préparation à un futur système de code couleur dynamique.
 */
export function ResistorPart({ uid } = {}) {
  const def = getComponentDef("RESISTOR")
  const width = def?.width ?? 84
  const height = def?.height ?? 28
  const id = String(uid ?? 'resistor').replace(/[^a-zA-Z0-9_-]/g, '_')

  return (
    <div className="part-resistor" aria-label="Résistance">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true" overflow="visible" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          {/* Reprend telle quelle la technique de patte métallique de LedPart.jsx */}
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#555b60" />
            <stop offset="20%" stopColor="#aeb5ba" />
            <stop offset="53%" stopColor="#f5f6f6" />
            <stop offset="82%" stopColor="#969ea4" />
            <stop offset="100%" stopColor="#5b6268" />
          </linearGradient>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4dfae" />
            <stop offset="18%" stopColor="#e3c393" />
            <stop offset="58%" stopColor="#c9a066" />
            <stop offset="100%" stopColor="#8a6a3a" />
          </linearGradient>
        </defs>

        {/* Pattes métalliques : trait de base + fin reflet, même patron que LedPart.jsx */}
        <line x1="0" y1="14" x2="18" y2="14" stroke={`url(#${id}-metal)`} strokeWidth="3" strokeLinecap="round" />
        <line x1="66" y1="14" x2="84" y2="14" stroke={`url(#${id}-metal)`} strokeWidth="3" strokeLinecap="round" />
        <line x1="1" y1="13" x2="17" y2="13" stroke="#f8fafb" strokeWidth="0.6" strokeLinecap="round" opacity="0.7" />
        <line x1="67" y1="13" x2="83" y2="13" stroke="#f8fafb" strokeWidth="0.6" strokeLinecap="round" opacity="0.7" />

        {/* Corps cylindrique : dégradé vertical (haut clair -> bas sombre) pour un relief perceptible sans toucher à la géométrie canonique. */}
        <rect x="18" y="4" width="54" height="20" rx="9" fill={`url(#${id}-body)`} stroke="#6b4a1f" strokeWidth="1.25" />
        {/* Reflet supérieur unifié (corps + bagues), une seule forme pour rester économe en primitives. */}
        <rect x="20" y="5.5" width="50" height="6" rx="4" fill="#ffffff" opacity="0.28" />

        {/* Bagues : repère visuel fixe (voir commentaire d'en-tête) — séquence 220 Ω. */}
        <rect x="30" y="4" width="5" height="20" fill="#b8382d" />
        <rect x="39" y="4" width="5" height="20" fill="#b8382d" />
        <rect x="48" y="4" width="5" height="20" fill="#6b4226" />
        <rect x="60" y="4" width="4" height="20" fill="#c8a13c" />
      </svg>
    </div>
  )
}
