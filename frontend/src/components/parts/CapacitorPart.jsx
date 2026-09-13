import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { encodeCapacitorMarking } from '../../visualization/capacitorMarking.js'

/**
 * CAPACITOR — rendu raster réaliste (Candidate C) + marquage dynamique
 * (MB-L1-PROP-005, sur l'audit du renderer CSS/DOM précédent MB-L1-CONS-002).
 *
 * Le corps réaliste est un asset raster neutre (`capacitor.base.*`, disque
 * céramique radial non polarisé, silhouette Candidate C sélectionnée par le
 * CSA/CTO après R&D — aucune valeur de capacitance peinte). Le marquage EIA
 * 3 chiffres (« 104 », etc.) est dérivé à CHAQUE rendu depuis
 * `parameters.capacitance` (seule source de vérité, résolue génériquement
 * par `resolveComponentParameters` dans PartRenderer.jsx) via
 * `encodeCapacitorMarking` — jamais persisté, jamais recalculé à partir d'un
 * état visuel stocké.
 *
 * Représentabilité (§16/§17 du ticket) : une valeur électrique non
 * exactement représentable par le code ABN, ou hors du domaine physique
 * qualifié V1 (10 pF..1 µF), ne produit JAMAIS de marquage — le corps neutre
 * seul est rendu. Aucun arrondi silencieux, aucun mensonge visuel (ex. 123 nF
 * reste 123 nF électriquement, le Canvas ne montre aucun faux code).
 *
 * Zone de marquage : mesurée par probe pixel sur l'asset Candidate C
 * (R&D CAPACITOR-ASSET-RD-REPORT.md, safe_marking_zone_native3x), exprimée
 * en POURCENTAGE de la boîte canonique 70×40 — suit donc automatiquement
 * zoom global et `localScale` sans aucune correction ici, comme les bandes
 * RESISTOR (MB-L1-PROP-004).
 *
 * Contrat :
 *  - dimensions dérivées de `getComponentDef("CAPACITOR")` (70×40) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins pinA(0,20) / pinB(70,20) : produits par CircuitComponent/Pin,
 *    **jamais dessinés dans l'asset ni ici** ;
 *  - l'`<img>` et le marquage ne portent AUCUN gestionnaire, `draggable=false`
 *    sur l'image, `pointer-events: none` sur l'image ET le marquage → drag /
 *    sélection / câblage / hit-test / zoom restent la responsabilité
 *    exclusive du wrapper `.circuit-component` et de la couche canvas
 *    globale.
 */
const ASSET_DIR = '/assets/components/capacitor'
const WEBP_SRCSET = `${ASSET_DIR}/capacitor.base.1x.webp 1x, ${ASSET_DIR}/capacitor.base.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/capacitor.base.1x.png 1x, ${ASSET_DIR}/capacitor.base.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/capacitor.base.3x.png`

// Zone sûre de marquage (Candidate C), en % de la boîte canonique 70×40 —
// dérivée de probes/candidate-C.json (safe_marking_zone_native3x =
// [74.0, 29.8, 135.0, 62.2] sur un canevas natif 210×120 = 3× la boîte).
const MARKING_ZONE = Object.freeze({
  leftPercent: 35.24,
  topPercent: 24.83,
  widthPercent: 29.05,
  heightPercent: 27,
})

export function CapacitorPart({ parameters } = {}) {
  const def = getComponentDef('CAPACITOR')
  const width = def?.width ?? 70
  const height = def?.height ?? 40

  const code = encodeCapacitorMarking(parameters?.capacitance)
  const ariaLabel = code.exact
    ? `Condensateur céramique non polarisé, marquage ${code.marking}`
    : 'Condensateur céramique non polarisé'

  return (
    <div className="part-capacitor" aria-label={ariaLabel}>
      <picture className="part-capacitor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-capacitor__img"
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
        <span
          className="part-capacitor__marking"
          aria-hidden="true"
          style={{
            left: `${MARKING_ZONE.leftPercent}%`,
            top: `${MARKING_ZONE.topPercent}%`,
            width: `${MARKING_ZONE.widthPercent}%`,
            height: `${MARKING_ZONE.heightPercent}%`,
            pointerEvents: 'none',
          }}
        >
          {code.marking}
        </span>
      ) : null}
    </div>
  )
}
