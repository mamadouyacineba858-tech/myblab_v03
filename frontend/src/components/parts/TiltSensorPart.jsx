// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * TILT_SENSOR — rendu raster A7-C4-TILT.
 *
 * Même mécanisme déclaratif que PirMotionSensorPart.jsx / SoilMoistureSensorPart.jsx :
 * paquet d'assets raster réaliste Founder-approved (SW-520D-style, vue de
 * face, asset 72×120 @1x / 216×360 @3x, alpha réel, état unique `default`),
 * backend `raster` déclaré dans `defaultRegistrations.js`, `frontend/public/`
 * servi à la racine web -> `/assets/components/tilt-sensor/…`, priorité WebP
 * via `<picture>`, fallback PNG, aucune logique JS de sélection d'asset.
 *
 * Le modèle électrique (`canonicalRegistry` : pins directionnelles DO/GND —
 * aucune VCC, le pack Founder PASS n'en expose aucune ; contribution
 * numérique dédiée `tiltSensorDigital` dans
 * `simulator/digitalContributionRegistry.js` pour DO ; le paramètre effectif
 * `tiltDetected` dépend du stimulus environnemental TILT via
 * `simulator/environmentalResponseRegistry.js`, contrat générique A7-C0.
 * Aucune contribution DC : ce module n'expose aucune sortie analogique)
 * N'EST PAS modifié par ce renderer. PhysicalContacts DO(29,108) / GND(41,108)
 * déclarés dans `componentDefinitions.js`, produits par CircuitComponent/Pin,
 * jamais dessinés ici ; les pattes fonctionnelles sont rendues par
 * AssemblyLeadsLayer depuis les racines mesurées par pixel-probe (cf.
 * assemblyProfiles.js).
 *
 * L'<img> ne porte aucun gestionnaire, `draggable={false}`,
 * `pointer-events: none` -> drag / sélection / câblage / hit-test / zoom
 * restent la responsabilité du wrapper `.circuit-component`. Composant
 * STATIQUE (aucune prop reçue ni consommée, état unique `default`).
 */
const ASSET_DIR = '/assets/components/tilt-sensor'
const WEBP_SRCSET = `${ASSET_DIR}/tilt-sensor.default.1x.webp 1x, ${ASSET_DIR}/tilt-sensor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/tilt-sensor.default.1x.png 1x, ${ASSET_DIR}/tilt-sensor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/tilt-sensor.default.3x.png`

export function TiltSensorPart() {
  const def = getComponentDef('TILT_SENSOR')
  const width = def?.width ?? 72
  const height = def?.height ?? 120

  return (
    <div className="part-tilt-sensor" aria-label="Capteur d'inclinaison">
      <picture className="part-tilt-sensor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-tilt-sensor__img"
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
