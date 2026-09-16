// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * LIGHT_BULB — rendu raster A6-OUT2.
 *
 * Même mécanisme déclaratif que VibrationMotorPart.jsx / BuzzerPart.jsx /
 * PolarizedCapacitorPart.jsx / SlideSwitchPart.jsx : paquet d'assets raster
 * réaliste Founder-approved (ampoule filament, vue de face, asset 72×96 @1x /
 * 216×288 @3x, alpha réel, état unique `default`), backend `raster` déclaré
 * dans `defaultRegistrations.js`, `frontend/public/` servi à la racine web ->
 * `/assets/components/light-bulb/…`, priorité WebP via `<picture>`, fallback
 * PNG, aucune logique JS de sélection d'asset.
 *
 * Le modèle électrique (`canonicalRegistry` : pins non polarisées `A`/`B`,
 * réutilise `resistorDc` via `simulator/dcContributionRegistry.js` — charge
 * résistive DC simple, aucun modèle thermique de filament) N'EST PAS modifié
 * par ce renderer. PhysicalContacts A(24,84) / B(48,84) déclarés dans
 * `PIN_PRESENTATION_BY_TYPE` (entraxe 24 = 2 × BREADBOARD_PITCH), produits
 * par CircuitComponent/Pin, jamais dessinés ici ; les pattes fonctionnelles
 * sont rendues par AssemblyLeadsLayer depuis les racines mesurées par
 * pixel-probe (cf. assemblyProfiles.js).
 *
 * L'<img> ne porte aucun gestionnaire, `draggable={false}`,
 * `pointer-events: none` -> drag / sélection / câblage / hit-test / zoom
 * restent la responsabilité du wrapper `.circuit-component`. Composant
 * STATIQUE (aucune prop reçue ni consommée, état unique `default`).
 */
const ASSET_DIR = '/assets/components/light-bulb'
const WEBP_SRCSET = `${ASSET_DIR}/light-bulb.default.1x.webp 1x, ${ASSET_DIR}/light-bulb.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/light-bulb.default.1x.png 1x, ${ASSET_DIR}/light-bulb.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/light-bulb.default.3x.png`

export function LightBulbPart() {
  const def = getComponentDef('LIGHT_BULB')
  const width = def?.width ?? 72
  const height = def?.height ?? 96

  return (
    <div className="part-light-bulb" aria-label="Ampoule">
      <picture className="part-light-bulb__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-light-bulb__img"
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
