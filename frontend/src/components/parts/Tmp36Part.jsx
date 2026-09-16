// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * TMP36 — rendu raster A7-C1.
 *
 * Même mécanisme déclaratif que LightBulbPart.jsx / VibrationMotorPart.jsx /
 * HobbyGearmotorPart.jsx : paquet d'assets raster réaliste Founder-approved
 * (R3, vue de face, asset 60×72 @1x / 180×216 @3x, alpha réel, état unique
 * `default`), backend `raster` déclaré dans `defaultRegistrations.js`,
 * `frontend/public/` servi à la racine web -> `/assets/components/tmp36/…`,
 * priorité WebP via `<picture>`, fallback PNG, aucune logique JS de
 * sélection d'asset.
 *
 * Le modèle électrique (`canonicalRegistry` : pins directionnelles
 * plus/vout/gnd, contribution DC dédiée `tmp36Dc` dans
 * `simulator/dcContributionRegistry.js` ; la tension Vout EFFECTIVE dépend
 * du stimulus environnemental TEMPERATURE via
 * `simulator/environmentalResponseRegistry.js`, contrat générique A7-C0)
 * N'EST PAS modifié par ce renderer. PhysicalContacts plus(18,68) /
 * vout(30,68) / gnd(42,68) déclarés dans `componentDefinitions.js`, produits
 * par CircuitComponent/Pin, jamais dessinés ici ; les pattes fonctionnelles
 * sont rendues par AssemblyLeadsLayer depuis les racines mesurées par
 * pixel-probe (cf. assemblyProfiles.js).
 *
 * L'<img> ne porte aucun gestionnaire, `draggable={false}`,
 * `pointer-events: none` -> drag / sélection / câblage / hit-test / zoom
 * restent la responsabilité du wrapper `.circuit-component`. Composant
 * STATIQUE (aucune prop reçue ni consommée, état unique `default`).
 */
const ASSET_DIR = '/assets/components/tmp36'
const WEBP_SRCSET = `${ASSET_DIR}/tmp36.default.1x.webp 1x, ${ASSET_DIR}/tmp36.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/tmp36.default.1x.png 1x, ${ASSET_DIR}/tmp36.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/tmp36.default.3x.png`

export function Tmp36Part() {
  const def = getComponentDef('TMP36')
  const width = def?.width ?? 60
  const height = def?.height ?? 72

  return (
    <div className="part-tmp36" aria-label="Capteur de température TMP36">
      <picture className="part-tmp36__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-tmp36__img"
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
