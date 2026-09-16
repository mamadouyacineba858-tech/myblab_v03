// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * VIBRATION_MOTOR — rendu raster A6-OUT1-R1.
 *
 * Remplace le renderer CSS/DOM provisoire d'A6-OUT1 (VibrationMotorPart.jsx
 * dessinait lui-même un corps cylindrique + deux pattes-fil) par le paquet
 * d'assets raster réaliste Founder-approved (moteur vibreur coin-type ERM,
 * corps métallique circulaire, vue de dessus, asset 72×96 @1x / 216×288 @3x,
 * alpha réel) — même mécanisme déclaratif que BuzzerPart.jsx /
 * PolarizedCapacitorPart.jsx / SlideSwitchPart.jsx (backend `raster` via
 * `defaultRegistrations.js`, `frontend/public/` servi à la racine web ->
 * `/assets/components/vibration-motor/…`, priorité WebP via `<picture>`,
 * fallback PNG, aucune logique JS de sélection d'asset).
 *
 * Le modèle électrique (`canonicalRegistry` : pins `plus`/`minus`, réutilise
 * `dcMotorDc` via `simulator/dcContributionRegistry.js`) N'EST PAS modifié
 * par ce ticket. PhysicalContacts plus(24,84) / minus(48,84) déclarés dans
 * `PIN_PRESENTATION_BY_TYPE` (entraxe 24 = 2 × BREADBOARD_PITCH), produits
 * par CircuitComponent/Pin, jamais dessinés ici ; les pattes fonctionnelles
 * (très courtes — pixel-probe : le raster est déjà opaque quasiment jusqu'aux
 * contacts, cf. assemblyProfiles.js) sont rendues par AssemblyLeadsLayer.
 *
 * L'`<img>` ne porte aucun gestionnaire, `draggable={false}`,
 * `pointer-events: none` -> drag / sélection / câblage / hit-test / zoom
 * restent la responsabilité du wrapper `.circuit-component`. Composant
 * STATIQUE (aucune prop reçue ni consommée, état unique `default`).
 */
const ASSET_DIR = '/assets/components/vibration-motor'
const WEBP_SRCSET = `${ASSET_DIR}/vibration-motor.default.1x.webp 1x, ${ASSET_DIR}/vibration-motor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/vibration-motor.default.1x.png 1x, ${ASSET_DIR}/vibration-motor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/vibration-motor.default.3x.png`

export function VibrationMotorPart() {
  const def = getComponentDef('VIBRATION_MOTOR')
  const width = def?.width ?? 72
  const height = def?.height ?? 96

  return (
    <div className="part-vibration-motor" aria-label="Moteur à vibration">
      <picture className="part-vibration-motor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-vibration-motor__img"
          src={PNG_FALLBACK}
          srcSet={PNG_SRCSET}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
        />
      </picture>
    </div>
  )
}
