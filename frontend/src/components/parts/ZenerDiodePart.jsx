import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * ZENER_DIODE â€” corps raster Founder PASS/FROZEN + pattes physiques gÃ©nÃ©riques.
 *
 * A5-ZENER_DIODE : mÃªme patron que DiodePart.jsx â€” le raster cuit ses pattes
 * mÃ©talliques jusqu'aux bords du boÃ®tier canonique (pixel-probe rÃ©el confirme
 * un alpha opaque continu de x=0 a x=143 sur la ligne mediane dy=35), donc ce
 * renderer ne montre que la fenÃªtre centrale du corps (cylindre de verre +
 * bande cathode) tandis qu'AssemblyLeadsLayer (CircuitComponent.jsx) dessine
 * les deux pattes fonctionnelles depuis les racines mÃ©caniques mesurÃ©es
 * (visualization/assemblyProfiles.js) jusqu'aux pins canoniques A/K.
 *
 * Aucune donnÃ©e Ã©lectrique ici : A=(0,35), K=(144,35), forwardVoltage /
 * onResistance / breakdownVoltage / breakdownResistance sont portÃ©s par
 * canonicalRegistry.js / dcContributionRegistry.js. Asset FOUNDER PASS /
 * FROZEN : ne jamais rÃ©gÃ©nÃ©rer, redessiner, recolorer ni recadrer.
 */
const ASSET_DIR = '/assets/components/zener-diode'
const WEBP_SRCSET = `${ASSET_DIR}/zener-diode.default.1x.webp 1x, ${ASSET_DIR}/zener-diode.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/zener-diode.default.1x.png 1x, ${ASSET_DIR}/zener-diode.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/zener-diode.default.3x.png`

// Contrat mÃ©canique A5-ZENER_DIODE : le corps rÃ©ellement opaque (verre +
// bande cathode) du raster est centrÃ© entre x=34 et x=108 dans la boÃ®te
// canonique 144Ã—72 (pixel-probe par saturation couleur, hors zone de
// marquage imprimÃ© â€” voir assemblyProfiles.js pour la mÃ©thode complÃ¨te).
// Les segments extÃ©rieurs sont remplacÃ©s par AssemblyLeadsLayer ; les
// racines du profil ZENER_DIODE utilisent exactement ces mÃªmes abscisses.
const BODY_WINDOW = Object.freeze({
  left: 34,
  right: 108,
})

export function ZenerDiodePart() {
  const def = getComponentDef('ZENER_DIODE')
  const width = def?.width ?? 144
  const height = def?.height ?? 72

  const leftPercent = (BODY_WINDOW.left / width) * 100
  const rightPercent = ((width - BODY_WINDOW.right) / width) * 100

  return (
    <div
      className="part-zener-diode"
      aria-label="Diode Zener"
      data-body-window={`${BODY_WINDOW.left}-${BODY_WINDOW.right}`}
      style={{ position: 'relative', width, height, pointerEvents: 'none' }}
    >
      <picture
        className="part-zener-diode__picture"
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: `inset(0 ${rightPercent}% 0 ${leftPercent}%)`,
          pointerEvents: 'none',
        }}
      >
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-zener-diode__img"
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
