import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Moteur DC — backend RASTER (MB-VIS-PROTOTYPE-007,
 * MB-L1-PROP-009).
 *
 * Le corps moteur réaliste reste l'asset raster validé (carter métallique,
 * capot arrière, arbre, bague, évents). MB-L1-PROP-009 corrige uniquement la
 * présentation physique des bornes : l'ancienne cosse latérale unique est
 * masquée par un crop de 15 px à gauche et remplacée par un overlay asset
 * déclaratif `dc-motor.terminals.svg` qui montre DEUX vraies cosses
 * électriques distinctes côté arrière. L'arbre mécanique reste à droite et
 * n'est jamais une borne électrique.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("DC_MOTOR")` (84×50) ;
 *  - coordonnées électriques canoniques conservées dans componentDefinitions
 *    (+ : 0,25 / - : 84,25) ;
 *  - les PhysicalContacts de présentation, eux, sont déclarés séparément dans
 *    componentDefinitions.js et tombent sur les deux trous de cosse de
 *    l'overlay : plus(3.5,16), minus(3.5,34) ;
 *  - aucun changement du modèle DC, du paramètre resistance, du drag, du zoom
 *    ou de la sélection ;
 *  - aucun gestionnaire porté par les images, `pointer-events: none`.
 */
const ASSET_DIR = '/assets/components/dc-motor'
const WEBP_SRCSET = `${ASSET_DIR}/dc-motor.default.1x.webp 1x, ${ASSET_DIR}/dc-motor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/dc-motor.default.1x.png 1x, ${ASSET_DIR}/dc-motor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/dc-motor.default.3x.png`
const TERMINAL_OVERLAY = `${ASSET_DIR}/dc-motor.terminals.svg`

export function DcMotorPart() {
  const def = getComponentDef("DC_MOTOR")
  const width = def?.width ?? 84
  const height = def?.height ?? 50

  return (
    <div
      className="part-dc-motor"
      aria-label="Moteur DC"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible' }}
    >
      <img
        className="part-dc-motor__terminals"
        src={TERMINAL_OVERLAY}
        width={width}
        height={height}
        draggable={false}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <picture className="part-dc-motor__picture" style={{ position: 'relative', zIndex: 1 }}>
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-dc-motor__img"
          src={PNG_FALLBACK}
          srcSet={PNG_SRCSET}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
            clipPath: 'inset(0 0 0 15px)',
          }}
        />
      </picture>
    </div>
  )
}
