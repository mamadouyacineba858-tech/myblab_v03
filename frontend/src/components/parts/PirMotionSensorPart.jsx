// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * PIR_MOTION_SENSOR — rendu raster A7-C4-PIR.
 *
 * Même mécanisme déclaratif que SoilMoistureSensorPart.jsx / Tmp36Part.jsx /
 * ForceSensorPart.jsx : paquet d'assets raster réaliste Founder-approved
 * (HC-SR501-style, vue de face, asset 120×96 @1x / 360×288 @3x, alpha réel,
 * état unique `default`), backend `raster` déclaré dans
 * `defaultRegistrations.js`, `frontend/public/` servi à la racine web ->
 * `/assets/components/pir-motion-sensor/…`, priorité WebP via `<picture>`,
 * fallback PNG, aucune logique JS de sélection d'asset.
 *
 * Le modèle électrique (`canonicalRegistry` : pins directionnelles VCC/OUT/
 * GND, contribution numérique dédiée `pirMotionSensorDigital` dans
 * `simulator/digitalContributionRegistry.js` pour OUT ; le paramètre effectif
 * `motionDetected` dépend du stimulus environnemental MOTION via
 * `simulator/environmentalResponseRegistry.js`, contrat générique A7-C0.
 * Aucune contribution DC : PIR n'expose aucune sortie analogique) N'EST PAS
 * modifié par ce renderer. PhysicalContacts VCC(48,92) / OUT(60,92) /
 * GND(72,92) déclarés dans `componentDefinitions.js`, produits par
 * CircuitComponent/Pin, jamais dessinés ici ; les pattes fonctionnelles sont
 * rendues par AssemblyLeadsLayer depuis les racines mesurées par pixel-probe
 * (cf. assemblyProfiles.js).
 *
 * L'<img> ne porte aucun gestionnaire, `draggable={false}`,
 * `pointer-events: none` -> drag / sélection / câblage / hit-test / zoom
 * restent la responsabilité du wrapper `.circuit-component`. Composant
 * STATIQUE (aucune prop reçue ni consommée, état unique `default`).
 */
const ASSET_DIR = '/assets/components/pir-motion-sensor'
const WEBP_SRCSET = `${ASSET_DIR}/pir-motion-sensor.default.1x.webp 1x, ${ASSET_DIR}/pir-motion-sensor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/pir-motion-sensor.default.1x.png 1x, ${ASSET_DIR}/pir-motion-sensor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/pir-motion-sensor.default.3x.png`

export function PirMotionSensorPart() {
  const def = getComponentDef('PIR_MOTION_SENSOR')
  const width = def?.width ?? 120
  const height = def?.height ?? 96

  return (
    <div className="part-pir-motion-sensor" aria-label="Capteur de mouvement PIR">
      <picture className="part-pir-motion-sensor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-pir-motion-sensor__img"
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
