import React from 'react'

/**
 * Rendu visuel Résistance (MB-VIS-002).
 *
 * Composant statique (STATIC, §8 du ticket) : aucune prop dynamique reçue,
 * comportement inchangé (toujours zéro prop, comme avant ce ticket).
 *
 * Boîtier cylindrique + fils métalliques, contenu strictement dans la boîte
 * 90×28 définie par componentDefinitions.js (non modifié). Les deux bagues
 * sombres sont un simple repère visuel de silhouette — PAS un code couleur :
 * aucune valeur de résistance par instance n'existe dans le modèle actuel
 * (seul un defaultValue de schéma existe dans canonicalRegistry.js, non lié
 * à une instance sur le canvas), donc aucune donnée n'est encodée ici
 * (cf. GATE 1 MB-VIS-002, section D).
 */
export function ResistorPart() {
  return (
    <div className="part-resistor" aria-label="Résistance">
      <svg viewBox="0 0 90 28" width="90" height="28" role="img" aria-hidden="true">
        <line x1="0" y1="14" x2="18" y2="14" className="part-resistor__lead" />
        <line x1="72" y1="14" x2="90" y2="14" className="part-resistor__lead" />
        <rect x="18" y="4" width="54" height="20" rx="9" className="part-resistor__body" />
        <rect x="32" y="4" width="5" height="20" className="part-resistor__band" />
        <rect x="44" y="4" width="5" height="20" className="part-resistor__band" />
      </svg>
    </div>
  )
}
