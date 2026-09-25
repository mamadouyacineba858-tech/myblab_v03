import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'
import { resolveContacts } from '../../utils/contactModel.js'

const ASSET_DIR = '/assets/components/seven-segment-sc56-11ewa/'
const BASE = `${ASSET_DIR}seven-segment-sc56-11ewa.default`

/**
 * A10-DISP1 — géométrie d'ÉMISSION interne des segments, repère runtime 72x114. Présentation
 * uniquement : contours des zones claires (segments diffusants) du raster runtime FROZEN, mesurés
 * en lecture seule sur le 3x (enveloppe convexe simplifiée, /3). Aucun lien avec les
 * PhysicalContacts ni avec la géométrie électrique.
 */
const SEGMENT_EMISSION_SHAPES = Object.freeze({
  a: 'polygon(24.3px 29.7px, 27px 27.3px, 52.7px 27.3px, 55px 29.7px, 55px 30.7px, 50.3px 34.7px, 28px 34.7px, 24.3px 30.7px)',
  b: 'polygon(51.3px 35.7px, 55.3px 32px, 56.7px 31.7px, 59px 34.7px, 55.7px 54.3px, 55px 55.7px, 51.3px 58.3px, 48px 54.7px)',
  c: 'polygon(47px 64px, 51px 60.7px, 52px 60.7px, 54px 63px, 54px 66.7px, 51px 84.3px, 48.3px 87px, 47.3px 87px, 44px 83.3px)',
  d: 'polygon(16.3px 87.7px, 20.3px 84px, 43px 84px, 46.3px 87.7px, 46.3px 89px, 44px 91px, 18.3px 91px, 16.3px 89px)',
  e: 'polygon(15.7px 63.3px, 18.7px 60.7px, 20px 60.7px, 22.7px 63.7px, 20px 82.7px, 15.7px 86.7px, 14.3px 86.7px, 12.3px 84.3px)',
  f: 'polygon(20px 33.7px, 22.3px 31.7px, 23.3px 31.7px, 27px 35.7px, 24px 54.3px, 19.7px 58.3px, 19px 58.3px, 16.3px 55px)',
  g: 'polygon(21px 58.7px, 24.7px 55.7px, 46.7px 55.7px, 50px 58.7px, 50px 59.7px, 46.3px 63px, 23.7px 63px, 20.7px 59.7px)',
  DP: 'circle(4.2px at 57.5px 87px)',
})
const SEGMENT_ORDER = Object.freeze(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'DP'])

/**
 * A10-DISP1-VIS-CORR-001 — intégration breadboard, présentation LOCALE uniquement.
 *
 * Le raster FROZEN est une vue frontale : ses pattes partent du corps VERS L'EXTÉRIEUR (y 0->16 et
 * 99.67->112.33, repère 1x), alors que les PhysicalContacts CSA LOCKED (géométrie PCB, rangées
 * y=21 / y=93) sont SOUS le corps (y 16 -> 99.67). Inséré, le vrai trou était donc caché et la
 * patte dessinée traversait le trou voisin. Correction, sans toucher l'asset ni les contacts :
 *  1. le raster est découpé à la bande du corps mesurée (RASTER_BODY_BAND : premières / dernières
 *     rangées du 3x dont la largeur opaque alpha>=128 dépasse 150 px, /3) — ses pattes d'origine
 *     ne sont plus affichées ;
 *  2. cette bande (corps + segments + DP + émission) est ramenée, sans déformation horizontale,
 *     dans PRESENTED_BODY_BAND, entre les deux rangées de contacts ;
 *  3. dix pattes locales relient le corps à chaque PhysicalContact : leur extrémité EST le contact,
 *     lu dans le catalogue (componentDefinitions -> resolveContacts), jamais redéclaré ici.
 * Ces pattes ne sont ni hit targets ni endpoints électriques (pointer-events: none) : les <Pin>
 * et PhysicalContacts existants restent l'unique autorité.
 */
const RASTER_BODY_BAND = Object.freeze({ top: 16, bottom: 99.667 })
const PRESENTED_BODY_BAND = Object.freeze({ top: 26, bottom: 88 })
const BODY_SCALE_Y = (PRESENTED_BODY_BAND.bottom - PRESENTED_BODY_BAND.top) / (RASTER_BODY_BAND.bottom - RASTER_BODY_BAND.top)
const BODY_OFFSET_Y = PRESENTED_BODY_BAND.top - RASTER_BODY_BAND.top * BODY_SCALE_Y
const LEAD_WIDTH = 3.2
// Recouvrement sous le corps : la racine de la patte naît sous le bord du boîtier.
const LEAD_ROOT_OVERLAP = 1.5
const LEAD_FILL = 'linear-gradient(90deg, #625d53 0%, #b9b3a6 30%, #f1eee8 50%, #aaa396 72%, #5d584e 100%)'

/** Pattes de présentation dérivées des PhysicalContacts du catalogue (une par contact physique). */
function presentationLeads(def) {
  const bodyCenterY = (PRESENTED_BODY_BAND.top + PRESENTED_BODY_BAND.bottom) / 2
  return def.pins.flatMap((pin) => resolveContacts(pin).map((contact) => {
    const fromTop = contact.dy < bodyCenterY
    const top = fromTop ? contact.dy : PRESENTED_BODY_BAND.bottom - LEAD_ROOT_OVERLAP
    const bottom = fromTop ? PRESENTED_BODY_BAND.top + LEAD_ROOT_OVERLAP : contact.dy
    return { pinId: pin.id, contactId: contact.id, tip: { x: contact.dx, y: contact.dy }, top, height: bottom - top }
  }))
}

/**
 * Corps = raster FROZEN SC56-11EWA (segments éteints blanc/gris diffusés d'origine). Chaque
 * segment allumé (`segments[id] === true`, Visual State Registry) ajoute une émission rouge
 * découpée à sa forme ; un segment éteint ne dessine rien. Aucune logique électrique ici.
 */
export function SevenSegmentDisplayPart({ segments } = {}) {
  const def = getComponentDef('SEVEN_SEGMENT_DISPLAY')
  const { width, height } = def
  const lit = SEGMENT_ORDER.filter((id) => segments?.[id] === true)
  return (
    <div
      className="part-seven-segment-display"
      aria-label="7-Segment Display SC56-11EWA"
      data-lit-segments={lit.join(' ')}
      style={{ position: 'relative', width, height, overflow: 'visible' }}
    >
      <div className="part-seven-segment-display__leads" aria-hidden={true} style={{ position: 'absolute', left: 0, top: 0, width, height, pointerEvents: 'none' }}>
        {presentationLeads(def).map((lead) => (
          <div
            key={lead.contactId}
            className="part-seven-segment-display__lead"
            data-pin={lead.pinId}
            data-contact={lead.contactId}
            data-tip-x={lead.tip.x}
            data-tip-y={lead.tip.y}
            style={{ position: 'absolute', left: lead.tip.x - LEAD_WIDTH / 2, top: lead.top, width: LEAD_WIDTH, height: lead.height, background: LEAD_FILL, borderRadius: 0.6, pointerEvents: 'none' }}
          />
        ))}
      </div>
      <div
        className="part-seven-segment-display__body"
        style={{ position: 'absolute', left: 0, top: 0, width, height, pointerEvents: 'none', transformOrigin: '0 0', transform: `translateY(${BODY_OFFSET_Y}px) scaleY(${BODY_SCALE_Y})`, clipPath: `inset(${RASTER_BODY_BAND.top}px 0 ${+(height - RASTER_BODY_BAND.bottom).toFixed(3)}px 0)` }}
      >
        <picture>
          <source type="image/webp" srcSet={`${BASE}.1x.webp 1x, ${BASE}.3x.webp 3x`} />
          <img
            src={`${BASE}.1x.png`}
            srcSet={`${BASE}.1x.png 1x, ${BASE}.3x.png 3x`}
            width={width}
            height={height}
            draggable={false}
            alt=""
            aria-hidden={true}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
          />
        </picture>
        <div
          className="part-seven-segment-display__emission"
          aria-hidden={true}
          style={{ position: 'absolute', left: 0, top: 0, width, height, pointerEvents: 'none', filter: 'drop-shadow(0 0 1.5px rgba(255, 48, 24, 0.9))' }}
        >
          {lit.map((id) => (
            <div
              key={id}
              className="part-seven-segment-display__segment"
              data-segment={id}
              style={{ position: 'absolute', left: 0, top: 0, width, height, clipPath: SEGMENT_EMISSION_SHAPES[id], background: 'linear-gradient(180deg, #ff5a3c 0%, #f01e0c 100%)' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
