// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * SOIL_MOISTURE_SENSOR — rendu raster A7-C3.
 *
 * Même mécanisme déclaratif que Tmp36Part.jsx / ForceSensorPart.jsx /
 * FlexSensorPart.jsx : paquet d'assets raster réaliste Founder-approved
 * (YL-69 probe + YL-38 interface module, vue de face, asset 144×144 @1x /
 * 432×432 @3x, alpha réel, état unique `default`), backend `raster` déclaré
 * dans `defaultRegistrations.js`, `frontend/public/` servi à la racine web ->
 * `/assets/components/soil-moisture-sensor/…`, priorité WebP via
 * `<picture>`, fallback PNG, aucune logique JS de sélection d'asset.
 *
 * Le modèle électrique (`canonicalRegistry` : pins directionnelles
 * VCC/AO/DO/GND, contribution DC dédiée `soilMoistureSensorDc` dans
 * `simulator/dcContributionRegistry.js` pour AO, contribution numérique
 * dédiée `soilMoistureSensorDigital` dans
 * `simulator/digitalContributionRegistry.js` pour DO ; le paramètre effectif
 * `analogRatio` dépend du stimulus environnemental MOISTURE via
 * `simulator/environmentalResponseRegistry.js`, contrat générique A7-C0)
 * N'EST PAS modifié par ce renderer. PhysicalContacts VCC(80,140) /
 * AO(92,140) / DO(104,140) / GND(116,140) déclarés dans
 * `componentDefinitions.js`, produits par CircuitComponent/Pin, jamais
 * dessinés ici ; les pattes fonctionnelles sont rendues par
 * AssemblyLeadsLayer depuis les racines mesurées par pixel-probe (cf.
 * assemblyProfiles.js).
 *
 * L'<img> ne porte aucun gestionnaire, `draggable={false}`,
 * `pointer-events: none` -> drag / sélection / câblage / hit-test / zoom
 * restent la responsabilité du wrapper `.circuit-component`. Composant
 * STATIQUE (aucune prop reçue ni consommée, état unique `default`).
 */
const ASSET_DIR = '/assets/components/soil-moisture-sensor'
const WEBP_SRCSET = `${ASSET_DIR}/soil-moisture-sensor.default.1x.webp 1x, ${ASSET_DIR}/soil-moisture-sensor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/soil-moisture-sensor.default.1x.png 1x, ${ASSET_DIR}/soil-moisture-sensor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/soil-moisture-sensor.default.3x.png`

export function SoilMoistureSensorPart() {
  const def = getComponentDef('SOIL_MOISTURE_SENSOR')
  const width = def?.width ?? 144
  const height = def?.height ?? 144

  return (
    <div className="part-soil-moisture-sensor" aria-label="Capteur d'humidité du sol">
      <picture className="part-soil-moisture-sensor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-soil-moisture-sensor__img"
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
