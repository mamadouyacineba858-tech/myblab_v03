// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { formatPolarizedCapacitanceMarking } from '../../visualization/polarizedCapacitorMarking.js'

/**
 * POLARIZED_CAPACITOR — rendu FT-C-COMP-002 + MB-L1-PROP-010.
 *
 * Le corps électrolytique radial bleu, la bande négative, la tension nominale
 * 25 V, les PhysicalContacts et AssemblyLeadsLayer restent inchangés.
 * MB-L1-PROP-010 ajoute uniquement une projection visuelle dérivée de
 * `parameters.capacitance` : la capacitance affichée sur le corps suit donc
 * l'Inspector/Document à chaque rendu, sans seconde source de vérité.
 *
 * L'asset historique porte un marquage 100 µF / 25 V cuit dans le raster.
 * Une petite zone de corps centrale le masque visuellement puis réaffiche :
 *   - ligne 1 : capacitance dynamique (ex. 47µF) ;
 *   - ligne 2 : 25V fixe, car aucun paramètre `voltageRating` n'existe.
 * La bande négative à gauche et la silhouette ne sont pas recouvertes.
 */
const ASSET_DIR = '/assets/components/polarized-capacitor'
const WEBP_SRCSET = `${ASSET_DIR}/polarized-capacitor.default.1x.webp 1x, ${ASSET_DIR}/polarized-capacitor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/polarized-capacitor.default.1x.png 1x, ${ASSET_DIR}/polarized-capacitor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/polarized-capacitor.default.3x.png`

// Zone volontairement limitée au centre du fût pour préserver la bande
// négative à gauche et les contours/hauts reflets du raster.
const MARKING_PATCH = Object.freeze({ left: 9, top: 34, width: 21, height: 30 })

export function PolarizedCapacitorPart({ parameters } = {}) {
  const def = getComponentDef('POLARIZED_CAPACITOR')
  const width = def?.width ?? 33
  const height = def?.height ?? 120
  const marking = formatPolarizedCapacitanceMarking(parameters?.capacitance)

  // Le renderer direct sans paramètres conserve le libellé historique exact
  // utilisé par les tests FT-C-COMP-002. Dans le pipeline réel, PartRenderer
  // fournit toujours les paramètres résolus et le label devient descriptif.
  const ariaLabel = marking.exact
    ? `Condensateur polarisé ${marking.marking}, 25 V`
    : 'Condensateur polarisé'

  return (
    <div
      className="part-polarized-capacitor"
      aria-label={ariaLabel}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible' }}
    >
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

      <span
        className="part-polarized-capacitor__marking-patch"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: MARKING_PATCH.left,
          top: MARKING_PATCH.top,
          width: MARKING_PATCH.width,
          height: MARKING_PATCH.height,
          boxSizing: 'border-box',
          borderRadius: 4,
          background: 'linear-gradient(90deg, #1c4f86 0%, #28669f 48%, #174775 100%)',
          boxShadow: 'inset 1px 0 rgba(255,255,255,0.08), inset -1px 0 rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 2,
          color: '#f2f6fb',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontWeight: 700,
          lineHeight: 1,
          textShadow: '0 1px 1px rgba(0,0,0,0.85)',
          userSelect: 'none',
        }}
      >
        {marking.exact ? (
          <span
            className="part-polarized-capacitor__capacitance-marking"
            style={{ fontSize: marking.marking.length > 6 ? 5 : 6 }}
          >
            {marking.marking}
          </span>
        ) : null}
        <span className="part-polarized-capacitor__voltage-marking" style={{ fontSize: 6 }}>
          25V
        </span>
      </span>
    </div>
  )
}
