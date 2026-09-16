// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * VIBRATION_MOTOR — A6-OUT1.
 *
 * Renderer CSS/DOM PROVISOIRE (aucun asset raster Founder-approved n'existe
 * encore pour ce composant — ticket A6-OUT1 §8) : suggère sobrement un petit
 * moteur vibreur cylindrique à masse excentrique (« pager motor »), en vue de
 * dessus, avec deux pattes-fil souples sortant du bas du corps. Ni
 * photographique ni raster, et volontairement distinct du carter
 * rectangulaire à cosses arrière du DC_MOTOR (DcMotorPart.jsx, asset raster
 * validé MB-VIS-PROTOTYPE-007) — même famille électrique, silhouette
 * différente. Un futur ticket Founder-approved pourra le remplacer par un
 * asset raster sans changer le contrat électrique (canonicalRegistry.js) ni
 * la géométrie des pins (componentDefinitions.js) : les deux PhysicalContacts
 * plus/minus sont ancrés à l'extrémité basse des pattes dessinées ici.
 *
 * Modèle électrique : réutilise le contrat resistiveTwoTerminalDc de
 * DC_MOTOR via simulator/dcContributionRegistry.js (dcMotorDc, littéralement
 * la même fonction — aucune nouvelle physique). Ce renderer ne porte lui-même
 * aucune logique de simulation.
 */
export function VibrationMotorPart() {
  const def = getComponentDef('VIBRATION_MOTOR')
  const width = def?.width ?? 50
  const height = def?.height ?? 70

  return (
    <div
      className="part-vibration-motor"
      aria-label="Moteur à vibration"
      style={{
        position: 'relative',
        width,
        height,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {/* Corps cylindrique métallique, vu de dessus. */}
      <div
        className="part-vibration-motor__body"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 5,
          top: 2,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 34% 28%, #dfe3e7 0%, #9aa0a8 45%, #5b6068 75%, #34373c 100%)',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}
      />

      {/* Masse excentrique : petit disque sombre décalé du centre, signature
          visuelle d'un moteur vibreur (jamais présente sur DC_MOTOR). */}
      <div
        className="part-vibration-motor__eccentric"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 27,
          top: 7,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 32%, #55595f 0%, #1d1f22 72%)',
          boxShadow: '0 0 2px rgba(0,0,0,0.65)',
          pointerEvents: 'none',
        }}
      />

      {/* Deux pattes-fil souples (rouge = plus, noir = minus), de la base du
          corps jusqu'aux PhysicalContacts déclarés (plus 18,68 / minus 32,68
          dans componentDefinitions.js). */}
      <div
        className="part-vibration-motor__lead part-vibration-motor__lead--plus"
        aria-hidden="true"
        style={{ position: 'absolute', left: 17, top: 40, width: 2, height: 28, background: '#c0392b', borderRadius: 1, pointerEvents: 'none' }}
      />
      <div
        className="part-vibration-motor__lead part-vibration-motor__lead--minus"
        aria-hidden="true"
        style={{ position: 'absolute', left: 31, top: 40, width: 2, height: 28, background: '#1c1c1c', borderRadius: 1, pointerEvents: 'none' }}
      />
    </div>
  )
}
