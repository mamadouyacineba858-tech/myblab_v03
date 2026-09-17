// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * FLEX_SENSOR — rendu raster A7-C2.
 *
 * Même mécanisme déclaratif que Tmp36Part.jsx / ForceSensorPart.jsx /
 * LightBulbPart.jsx / VibrationMotorPart.jsx / HobbyGearmotorPart.jsx :
 * paquet d'assets raster réaliste Founder-approved (vue de face, asset
 * 72×180 @1x / 216×540 @3x, alpha réel, état unique `default`), backend
 * `raster` déclaré dans `defaultRegistrations.js`, `frontend/public/` servi
 * à la racine web -> `/assets/components/flex-sensor/…`, priorité WebP via
 * `<picture>`, fallback PNG, aucune logique JS de sélection d'asset.
 *
 * Le modèle électrique (`canonicalRegistry` : pins non polarisées A/B,
 * contribution DC réutilisant directement `resistorDc` dans
 * `simulator/dcContributionRegistry.js` ; la résistance EFFECTIVE dépend du
 * stimulus environnemental FLEX via
 * `simulator/environmentalResponseRegistry.js`, contrat générique A7-C0)
 * N'EST PAS modifié par ce renderer. PhysicalContacts A(30,180) / B(42,180)
 * déclarés dans `componentDefinitions.js` (correctif A7-C2-R1, entraxe
 * 1×BREADBOARD_PITCH, enfichable breadboard — racines mécaniques mesurées
 * du raster A(33,162)/B(41,163) reliées à ces contacts par
 * AssemblyLeadsLayer via `assemblyProfiles.js`), produits par
 * CircuitComponent/Pin, jamais dessinés ici.
 *
 * L'<img> ne porte aucun gestionnaire, `draggable={false}`,
 * `pointer-events: none` -> drag / sélection / câblage / hit-test / zoom
 * restent la responsabilité du wrapper `.circuit-component`. Composant
 * STATIQUE (aucune prop reçue ni consommée, état unique `default`).
 */
const ASSET_DIR = '/assets/components/flex-sensor'
const WEBP_SRCSET = `${ASSET_DIR}/flex-sensor.default.1x.webp 1x, ${ASSET_DIR}/flex-sensor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/flex-sensor.default.1x.png 1x, ${ASSET_DIR}/flex-sensor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/flex-sensor.default.3x.png`

export function FlexSensorPart() {
  const def = getComponentDef('FLEX_SENSOR')
  const width = def?.width ?? 72
  const height = def?.height ?? 180

  return (
    <div className="part-flex-sensor" aria-label="Capteur de flexion">
      <picture className="part-flex-sensor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-flex-sensor__img"
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
