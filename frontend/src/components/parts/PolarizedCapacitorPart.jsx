import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * POLARIZED_CAPACITOR — rendu FT-C-COMP-002, backend RASTER.
 *
 * Condensateur électrolytique radial polarisé (100 µF / 25 V), corps bleu,
 * bande négative visible à GAUCHE, marquage cuit dans l'asset. Suit le patron
 * raster de RESISTOR / CAPACITOR / DIODE / LED : `<picture>` + `<source webp>`
 * + `<img>` srcset (1x / 3x), aucun fallback JS.
 *
 * Chemin des assets : `frontend/public/` est servi à la racine web, donc
 * `/assets/components/polarized-capacitor/...` — conforme à `ASSET_CONTRACT`
 * de `visualization/visualContract.js`
 * (`{root}/{typeKebab}/{typeKebab}.{state}.{res}.{ext}`, typeKebab
 * `polarized-capacitor`, état unique `default`).
 *
 * Invariants :
 *  - identité électrique canonique `plus` / `minus` — jamais pinA/pinB, jamais
 *    de pin électrique parallèle créé ici ;
 *  - rendu déterministe pour toute instance (aucun `<defs>` / id SVG à
 *    namespacer) : ce renderer n'accepte donc aucune prop `uid` ;
 *  - dimensions dérivées de `getComponentDef("POLARIZED_CAPACITOR")` (33×120 =
 *    pixels natifs @1x) — aucune valeur recopiée ;
 *  - AUCUNE logique de simulation ;
 *  - les pattes fonctionnelles sont rendues par AssemblyLeadsLayer (profil
 *    `visualization/assemblyProfiles.js`) ; les pattes cuites dans le raster
 *    sont masquées par `bodyClip` appliqué génériquement par
 *    CircuitComponent.jsx — ce renderer ne dessine donc pas de patte et ne
 *    produit surtout pas de double patte ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité exclusive du wrapper `.circuit-component`.
 */
const ASSET_DIR = '/assets/components/polarized-capacitor'
const WEBP_SRCSET = `${ASSET_DIR}/polarized-capacitor.default.1x.webp 1x, ${ASSET_DIR}/polarized-capacitor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/polarized-capacitor.default.1x.png 1x, ${ASSET_DIR}/polarized-capacitor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/polarized-capacitor.default.3x.png`

export function PolarizedCapacitorPart() {
  const def = getComponentDef('POLARIZED_CAPACITOR')
  const width = def?.width ?? 33
  const height = def?.height ?? 120

  return (
    <div className="part-polarized-capacitor" aria-label="Condensateur polarisé">
      <picture className="part-polarized-capacitor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-polarized-capacitor__img"
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
