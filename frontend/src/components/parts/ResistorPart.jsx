import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Résistance — backend RASTER (MB-VIS-PROTOTYPE-001C).
 *
 * Remplace l'ancien rendu SVG volumétrique (MB-VIS-LED-010 : `<defs>` +
 * gradients + `<line>`/`<rect>`) par l'asset raster professionnel validé en
 * MB-VIS-PROTOTYPE-001B (CSA VISUAL GO — RESISTOR, score 4.63/5).
 *
 * Chemin des assets : `frontend/public/` est servi à la racine web, donc
 * `/assets/components/resistor/...` — conforme à `ASSET_CONTRACT` de
 * `visualization/visualContract.js`
 * (`{root}/{typeKebab}/{typeKebab}.{state}.{res}.{ext}`). Priorité WebP @3x
 * (source raster haute résolution, §7), variantes @1x pour les DPR ~1,
 * fallback PNG via `<picture>` — aucune logique JS de fallback.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("RESISTOR")` (84×28) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins A(0,14) / B(84,14) : produits par CircuitComponent/Pin, **jamais
 *    dessinés dans l'asset ni ici** ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité exclusive du wrapper `.circuit-component` et
 *    de la couche canvas globale ;
 *  - `uid` reste accepté (contrat de props inchangé) mais n'est plus
 *    consommé : plus de `<defs>` à namespacer, rendu déterministe pour
 *    toute instance.
 */
const ASSET_DIR = '/assets/components/resistor'
const WEBP_SRCSET = `${ASSET_DIR}/resistor.default.1x.webp 1x, ${ASSET_DIR}/resistor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/resistor.default.1x.png 1x, ${ASSET_DIR}/resistor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/resistor.default.3x.png`

export function ResistorPart({ uid } = {}) {
  const def = getComponentDef("RESISTOR")
  const width = def?.width ?? 84
  const height = def?.height ?? 28

  return (
    <div className="part-resistor" aria-label="Résistance">
      <picture className="part-resistor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-resistor__img"
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
