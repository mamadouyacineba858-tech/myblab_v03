// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * HC_SR04 — rendu raster A7-C5.
 *
 * Même mécanisme déclaratif que SoilMoistureSensorPart.jsx /
 * PirMotionSensorPart.jsx / TiltSensorPart.jsx / IrReceiverPart.jsx : paquet
 * d'assets raster réaliste Founder-approved (vue de face, asset 144×96 @1x /
 * 432×288 @3x, alpha réel, état unique `default`), backend `raster` déclaré
 * dans `defaultRegistrations.js`, `frontend/public/` servi à la racine web ->
 * `/assets/components/hc-sr04/…`, priorité WebP via `<picture>`, fallback
 * PNG, aucune logique JS de sélection d'asset.
 *
 * Le modèle électrique (`canonicalRegistry` : pins directionnelles
 * VCC/TRIG/ECHO/GND, contribution TEMPORELLE dédiée `hcSr04TimedDigital` dans
 * `simulator/timedDigitalContributionRegistry.js` pour ECHO (premier
 * producteur réel de A7-C5-PREQ) ; le paramètre effectif `distanceCm` dépend
 * du stimulus environnemental DISTANCE via
 * `simulator/environmentalResponseRegistry.js`, contrat générique A7-C0)
 * N'EST PAS modifié par ce renderer. PhysicalContacts VCC(54,92) /
 * TRIG(66,92) / ECHO(78,92) / GND(90,92) déclarés dans
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
const ASSET_DIR = '/assets/components/hc-sr04'
const WEBP_SRCSET = `${ASSET_DIR}/hc-sr04.default.1x.webp 1x, ${ASSET_DIR}/hc-sr04.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/hc-sr04.default.1x.png 1x, ${ASSET_DIR}/hc-sr04.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/hc-sr04.default.3x.png`

export function HcSr04Part() {
  const def = getComponentDef('HC_SR04')
  const width = def?.width ?? 144
  const height = def?.height ?? 96

  return (
    <div className="part-hc-sr04" aria-label="Capteur de distance à ultrasons">
      <picture className="part-hc-sr04__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-hc-sr04__img"
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
