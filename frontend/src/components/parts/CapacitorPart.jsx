import React from 'react'

/**
 * Rendu visuel Condensateur (MB-VIS-002).
 *
 * Composant statique (STATIC, §8 du ticket) : aucune prop dynamique reçue,
 * comportement inchangé. Disque céramique + fils métalliques, contenu
 * strictement dans la boîte 70×40 définie par componentDefinitions.js (non
 * modifiée). Aucune polarité ni marquage n'est représenté : le modèle
 * actuel (canonicalRegistry.js) ne distingue aucun variant de condensateur
 * (pas de CAPACITOR_ELECTROLYTIC), donc aucune donnée de polarité n'existe
 * à représenter (cf. GATE 1 MB-VIS-002, section A).
 */
export function CapacitorPart() {
  return (
    <div className="part-capacitor" aria-label="Condensateur">
      <svg viewBox="0 0 70 40" width="70" height="40" role="img" aria-hidden="true">
        <line x1="0" y1="20" x2="18" y2="20" className="part-capacitor__lead" />
        <line x1="52" y1="20" x2="70" y2="20" className="part-capacitor__lead" />
        <ellipse cx="35" cy="20" rx="17" ry="14" className="part-capacitor__disc" />
        <ellipse cx="35" cy="20" rx="17" ry="14" className="part-capacitor__disc-outline" />
      </svg>
    </div>
  )
}
