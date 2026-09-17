// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * IR_RECEIVER — rendu raster A7-C4-IR.
 *
 * Même mécanisme déclaratif que TiltSensorPart.jsx / PirMotionSensorPart.jsx :
 * paquet d'assets raster réaliste Founder-approved (TSOP4838-style, vue de
 * face, asset 72×120 @1x / 216×360 @3x, alpha réel, état unique `default`),
 * backend `raster` déclaré dans `defaultRegistrations.js`, `frontend/public/`
 * servi à la racine web -> `/assets/components/ir-receiver/…`, priorité WebP
 * via `<picture>`, fallback PNG, aucune logique JS de sélection d'asset.
 *
 * Le modèle électrique (`canonicalRegistry` : pins directionnelles SIGNAL/
 * GND/VCC ; contribution numérique dédiée `irReceiverDigital` dans
 * `simulator/digitalContributionRegistry.js` pour SIGNAL en logique
 * active-low ; le paramètre effectif `infraredDetected` dépend du stimulus
 * environnemental INFRARED via `simulator/environmentalResponseRegistry.js`,
 * contrat générique A7-C0. Aucune contribution DC : ce module n'expose
 * aucune sortie analogique) N'EST PAS modifié par ce renderer.
 * PhysicalContacts SIGNAL(24,108)/GND(36,108)/VCC(48,108) déclarés dans
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
const ASSET_DIR = '/assets/components/ir-receiver'
const WEBP_SRCSET = `${ASSET_DIR}/ir-receiver.default.1x.webp 1x, ${ASSET_DIR}/ir-receiver.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/ir-receiver.default.1x.png 1x, ${ASSET_DIR}/ir-receiver.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/ir-receiver.default.3x.png`

export function IrReceiverPart() {
  const def = getComponentDef('IR_RECEIVER')
  const width = def?.width ?? 72
  const height = def?.height ?? 120

  return (
    <div className="part-ir-receiver" aria-label="Récepteur IR">
      <picture className="part-ir-receiver__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-ir-receiver__img"
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
