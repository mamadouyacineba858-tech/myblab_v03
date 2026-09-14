import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * DIODE — corps raster conservé + pattes physiques génériques.
 *
 * MB-L1-PROP-007 : l'ancien raster reste la source de vérité du CORPS
 * (boîtier axial + bande cathode), mais ses prolongements métalliques externes
 * ne sont plus exposés. Le renderer ne montre que la fenêtre centrale du corps
 * tandis que AssemblyLeadsLayer dessine les deux pattes fonctionnelles depuis
 * les racines mécaniques jusqu'aux pins canoniques anode/cathode.
 *
 * Cette consolidation ne modifie aucune donnée électrique :
 * - anode = (0,15), cathode = (84,15) ;
 * - forwardVoltage / onResistance inchangés ;
 * - aucune relation artificielle paramètres -> apparence ;
 * - aucun état de simulation introduit.
 */
const ASSET_DIR = '/assets/components/diode'
const WEBP_SRCSET = `${ASSET_DIR}/diode.default.1x.webp 1x, ${ASSET_DIR}/diode.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/diode.default.1x.png 1x, ${ASSET_DIR}/diode.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/diode.default.3x.png`

// Contrat mécanique PROP-007 : le corps utile reste centré entre x=24 et x=60
// dans la boîte canonique 84×30. Les segments extérieurs sont remplacés par
// AssemblyLeadsLayer (profil DIODE, style metallic-wire).
const BODY_WINDOW = Object.freeze({
  left: 24,
  right: 60,
})

export function DiodePart() {
  const def = getComponentDef('DIODE')
  const width = def?.width ?? 84
  const height = def?.height ?? 30

  const leftPercent = (BODY_WINDOW.left / width) * 100
  const rightPercent = ((width - BODY_WINDOW.right) / width) * 100

  return (
    <div
      className="part-diode"
      aria-label="Diode"
      data-body-window={`${BODY_WINDOW.left}-${BODY_WINDOW.right}`}
      style={{ position: 'relative', width, height, pointerEvents: 'none' }}
    >
      <picture
        className="part-diode__picture"
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: `inset(0 ${rightPercent}% 0 ${leftPercent}%)`,
          pointerEvents: 'none',
        }}
      >
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-diode__img"
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
