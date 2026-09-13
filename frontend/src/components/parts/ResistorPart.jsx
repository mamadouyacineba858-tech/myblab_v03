import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { encodeResistorColorCode } from '../../visualization/resistorColorCode.js'
import { getResistorBandLayout } from '../../visualization/resistorBandLayout.js'

/**
 * Rendu visuel Résistance — backend RASTER + projection dynamique
 * (MB-L1-PROP-004, sur la base raster MB-VIS-PROTOTYPE-001C).
 *
 * Le corps réaliste reste un asset raster neutre (`resistor.base.*`, sans
 * aucune bande peinte — cf. `resistor.default.*`, historique et inchangé,
 * conservé pour tout autre usage). Les bandes de code couleur sont
 * dérivées à CHAQUE rendu depuis `parameters.resistance` (seule source de
 * vérité, cf. `resolveComponentParameters` dans PartRenderer.jsx) via
 * `encodeResistorColorCode` — jamais persistées, jamais recalculées à
 * partir d'un état visuel stocké.
 *
 * Chemin des assets : `frontend/public/` est servi à la racine web, donc
 * `/assets/components/resistor/...` — conforme à `ASSET_CONTRACT` de
 * `visualization/visualContract.js`
 * (`{root}/{typeKebab}/{typeKebab}.{state}.{res}.{ext}`). Priorité WebP @3x
 * (source raster haute résolution, §7), variantes @1x pour les DPR ~1,
 * fallback PNG via `<picture>` — aucune logique JS de fallback.
 *
 * Représentabilité (§8/§9 du ticket) : une valeur électrique non
 * exactement représentable par le modèle à 4 bandes (2 chiffres
 * significatifs) ne produit JAMAIS de bandes — `encodeResistorColorCode`
 * retourne alors `exact: false`, et seul le corps neutre est rendu. Aucun
 * arrondi silencieux, aucun mensonge visuel.
 *
 * Géométrie des bandes : contrat unique centralisé dans
 * `visualization/resistorBandLayout.js`, exprimé en POURCENTAGE de la
 * boîte canonique 84×28 — suit donc automatiquement zoom global et
 * `localScale` sans aucune correction ici (§13/§15).
 *
 * Contrat inchangé vis-à-vis de 001C :
 *  - dimensions dérivées de `getComponentDef("RESISTOR")` (84×28) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins A(0,14) / B(84,14) : produits par CircuitComponent/Pin, **jamais
 *    dessinés dans l'asset ni ici** ;
 *  - l'`<img>` et les bandes ne portent AUCUN gestionnaire,
 *    `draggable={false}` sur l'image, `pointer-events: none` sur l'image
 *    ET sur la couche de bandes → drag / sélection / câblage / hit-test /
 *    zoom restent la responsabilité exclusive du wrapper
 *    `.circuit-component` et de la couche canvas globale ;
 *  - `uid` reste accepté (contrat de props inchangé) mais n'est pas
 *    consommé par le rendu.
 */
const ASSET_DIR = '/assets/components/resistor'
const WEBP_SRCSET = `${ASSET_DIR}/resistor.base.1x.webp 1x, ${ASSET_DIR}/resistor.base.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/resistor.base.1x.png 1x, ${ASSET_DIR}/resistor.base.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/resistor.base.3x.png`

// Marron/noir/rouge/or : repris tels quels des pixels moyens de l'ancien
// asset figé (`resistor.default.3x.png`, avant neutralisation MB-L1-PROP-004)
// pour une continuité visuelle parfaite avec le corps réaliste. Les autres
// teintes suivent la palette standard du code couleur des résistances.
const BAND_CSS_COLOR = {
  black: '#222220',
  brown: '#5e381e',
  red: '#b02121',
  orange: '#c8722a',
  yellow: '#d4b62a',
  green: '#3f7a4e',
  blue: '#35597a',
  violet: '#6b4c7a',
  gray: '#8a8a8a',
  white: '#e8e4da',
  gold: '#a57f40',
  silver: '#b8b8b8',
}

// Léger dégradé de lumière superposé à la couleur pleine de chaque bande,
// pour préserver l'impression de volume/enroulement autour du corps
// cylindrique (§14) plutôt qu'un simple rectangle plat.
const BAND_HIGHLIGHT_OVERLAY =
  'linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 25%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.22) 100%)'

export function ResistorPart({ uid, parameters } = {}) {
  const def = getComponentDef("RESISTOR")
  const width = def?.width ?? 84
  const height = def?.height ?? 28

  const code = encodeResistorColorCode(parameters?.resistance)
  const layout = code.exact ? getResistorBandLayout(code.bandCount) : []

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

      {code.exact ? (
        <div className="part-resistor__bands" aria-hidden="true" style={{ pointerEvents: 'none' }}>
          {code.bands.map((band, index) => {
            const slot = layout[index]
            if (!slot) return null
            const color = BAND_CSS_COLOR[band.color] ?? band.color
            return (
              <span
                key={`${slot.slot}-${index}`}
                className="part-resistor__band"
                data-role={band.role}
                data-color={band.color}
                style={{
                  left: `${slot.leftPercent}%`,
                  width: `${slot.widthPercent}%`,
                  top: `${slot.topPercent}%`,
                  height: `${slot.heightPercent}%`,
                  background: `${BAND_HIGHLIGHT_OVERLAY}, ${color}`,
                }}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
