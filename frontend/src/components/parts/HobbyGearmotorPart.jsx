// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * HOBBY_GEARMOTOR — rendu raster A6-OUT3.
 *
 * Même mécanisme déclaratif que VibrationMotorPart.jsx / LightBulbPart.jsx /
 * BuzzerPart.jsx / PolarizedCapacitorPart.jsx : paquet d'assets raster
 * réaliste Founder-approved "VERTICAL FINAL" (motoréducteur hobby, corps
 * réducteur jaune + carter moteur métallique + fils rouge/noir, vue de face,
 * asset 72×120 @1x / 216×360 @3x, alpha réel, état unique `default`),
 * backend `raster` déclaré dans `defaultRegistrations.js`,
 * `frontend/public/` servi à la racine web ->
 * `/assets/components/hobby-gearmotor/…`, priorité WebP via `<picture>`,
 * fallback PNG, aucune logique JS de sélection d'asset.
 *
 * L'asset source est déjà VERTICAL (largeur < hauteur) : AUCUNE rotation CSS
 * n'est appliquée ici, ni nulle part ailleurs dans ce renderer — la boîte
 * canonique 72×120 (componentDefinitions.js) est directement celle du
 * fichier livré, sans transformation géométrique d'aucune sorte.
 *
 * Le modèle électrique (`canonicalRegistry` : pins `plus`/`minus`, réutilise
 * `dcMotorDc` via `simulator/dcContributionRegistry.js`, exactement comme
 * DC_MOTOR/VIBRATION_MOTOR) N'EST PAS modifié par ce renderer. PhysicalContacts
 * plus(18,97) / minus(17,89) déclarés dans `PIN_PRESENTATION_BY_TYPE`
 * (dérivés d'un pixel-probe réel du raster livré, cf. componentDefinitions.js)
 * sont produits par CircuitComponent/Pin, jamais dessinés ici. Composant
 * WIRE-ONLY (wireConnectable:true / breadboardInsertable:false sur les deux
 * broches) : aucune patte traversante, aucun `AssemblyProfile`/
 * `AssemblyLeadsLayer` — le raster porte déjà ses fils visuellement jusqu'aux
 * points de contact.
 *
 * L'<img> ne porte aucun gestionnaire, `draggable={false}`,
 * `pointer-events: none` -> drag / sélection / câblage / hit-test / zoom
 * restent la responsabilité du wrapper `.circuit-component`. Composant
 * STATIQUE (aucune prop reçue ni consommée, état unique `default`).
 */
const ASSET_DIR = '/assets/components/hobby-gearmotor'
const WEBP_SRCSET = `${ASSET_DIR}/hobby-gearmotor.default.1x.webp 1x, ${ASSET_DIR}/hobby-gearmotor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/hobby-gearmotor.default.1x.png 1x, ${ASSET_DIR}/hobby-gearmotor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/hobby-gearmotor.default.3x.png`

export function HobbyGearmotorPart() {
  const def = getComponentDef('HOBBY_GEARMOTOR')
  const width = def?.width ?? 72
  const height = def?.height ?? 120

  return (
    <div className="part-hobby-gearmotor" aria-label="Motoréducteur">
      <picture className="part-hobby-gearmotor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-hobby-gearmotor__img"
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
