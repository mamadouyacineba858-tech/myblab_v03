import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { encodeCapacitorMarking } from '../../visualization/capacitorMarking.js'

/**
 * CAPACITOR — rendu raster réaliste + marquage dynamique.
 *
 * MB-L1-PROP-005-R1 : le Canvas Gate du premier asset (Candidate C) a validé
 * toute la logique capacitance → marquage mais a rejeté la silhouette physique
 * trop plate. Le corps `capacitor.base.*` est donc remplacé par la cible V2
 * approuvée par le CTO : disque céramique radial orange plus rond/volumétrique,
 * reflet de glaçure visible, pieds de corps alignés sur les racines mécaniques.
 * Les longues pattes restent rendues par AssemblyLeadsLayer afin de préserver
 * exactement les PhysicalContacts ; leur profil déclare désormais le style
 * `metallic-wire` (métal poli, même lecture visuelle que les leads RESISTOR).
 *
 * Le marquage EIA 3 chiffres (« 104 », etc.) reste dérivé à CHAQUE rendu depuis
 * `parameters.capacitance` (source de vérité unique, résolue génériquement par
 * PartRenderer) via `encodeCapacitorMarking` — jamais persisté et jamais peint
 * dans le raster.
 *
 * Représentabilité : une valeur non exactement représentable par le code ABN,
 * ou hors du domaine physique qualifié V1 (10 pF..1 µF), rend le corps neutre.
 * Aucun arrondi silencieux, aucune mutation de la valeur électrique.
 */
const ASSET_DIR = '/assets/components/capacitor'
const WEBP_SRCSET = `${ASSET_DIR}/capacitor.base.1x.webp 1x, ${ASSET_DIR}/capacitor.base.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/capacitor.base.1x.png 1x, ${ASSET_DIR}/capacitor.base.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/capacitor.base.3x.png`

// Zone sûre V2 : x=78..132, y=30..60 sur le master 210×120. Elle reste
// exprimée en pourcentage de la boîte canonique 70×40 afin de suivre le zoom
// et le localScale sans correction parallèle.
const MARKING_ZONE = Object.freeze({
  leftPercent: 37.14,
  topPercent: 25,
  widthPercent: 25.71,
  heightPercent: 25,
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
