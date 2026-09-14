import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { resolvePotentiometerVisualPosition } from '../../visualization/potentiometerPosition.js'

/**
 * Rendu visuel Potentiomètre — backend RASTER.
 *
 * FT-C-COMP-003 (Rotary Physical Reconciliation) : l'asset MB-VIS-COMP-032
 * (potentiomètre schématique 90×50) est remplacé par le potentiomètre
 * ROTATIF réaliste validé par le Product Owner — bouton noir vertical + trait
 * blanc de position, écrou / rondelle métallique, corps circulaire
 * métallique, embase bleue, 3 cosses verticales, vue de face légèrement
 * supérieure, fond transparent (probe : 4 fichiers, 1x 120×120 / 3x 360×360,
 * RGBA, 3x = 3×1x). Le concept « slider / linéaire » est abandonné — aucun
 * asset slider.
 *
 * MB-L1-PROP-008 : le repère blanc du bouton n'est plus statique. Sa rotation
 * est dérivée directement de `parameters.position` via la primitive pure
 * `resolvePotentiometerVisualPosition()` : 0 -> -135°, 0.5 -> 0°, 1 -> +135°.
 * Aucune seconde vérité n'est persistée ; `resistance` ne pilote pas l'angle.
 *
 * Intégré via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('POTENTIOMETER')` → wrapper `data-bare-body` +
 * pins `markerless`), sans aucun `type === "POTENTIOMETER"` ni règle CSS
 * spécifique dans le renderer central. Patron identique à
 * `ResistorPart.jsx` / `LdrPart.jsx` : `frontend/public/` servi à la racine
 * web → `/assets/components/potentiometer/…`, priorité WebP via `<picture>`,
 * fallback PNG, aucune logique JS de sélection d'asset.
 *
 * Comportement électrique STRICTEMENT inchangé : le modèle canonique garde
 * left/passive, wiper/output, right/passive ; `resistance` et `position` sont
 * toujours résolus par le pipeline générique PartRenderer. PROP-008 ne crée
 * ni interaction souris sur le bouton, ni nouvel état runtime, ni mutation.
 *
 * Contrat :
 *  - dimensions dérivées de `getComponentDef("POTENTIOMETER")` (120×120,
 *    FT-C-COMP-003) — aucune valeur recopiée, aucune géométrie recalculée
 *    selon le zoom ;
 *  - PhysicalContacts left / wiper / right sont déclarés dans
 *    `PIN_PRESENTATION_BY_TYPE`, produits par CircuitComponent/Pin, jamais
 *    dessinés ici ; les cosses cuites dans le raster sont masquées par
 *    `bodyClip` (`assemblyProfiles.js`), les cosses fonctionnelles sont
 *    rendues par AssemblyLeadsLayer ;
 *  - le raster source contient encore deux coins blancs résiduels autour de
 *    la base des cosses. Un clip polygonal local au renderer retire uniquement
 *    ces zones de fond aux coins inférieurs tout en conservant l'embase bleue ;
 *  - l'`<img>` et le repère ne portent aucun événement : drag / sélection /
 *    câblage / hit-test / zoom restent la responsabilité du wrapper ;
 *  - rendu déterministe pour un même jeu de paramètres, aucun id DOM.
 */
const ASSET_DIR = '/assets/components/potentiometer'
const WEBP_SRCSET = `${ASSET_DIR}/potentiometer.default.1x.webp 1x, ${ASSET_DIR}/potentiometer.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/potentiometer.default.1x.png 1x, ${ASSET_DIR}/potentiometer.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/potentiometer.default.3x.png`

export function PotentiometerPart({ parameters = {} } = {}) {
  const def = getComponentDef("POTENTIOMETER")
  const width = def?.width ?? 120
  const height = def?.height ?? 120
  const visualPosition = resolvePotentiometerVisualPosition(parameters.position)

  return (
    <div
      className="part-potentiometer"
      aria-label="Potentiomètre"
      data-position={String(visualPosition.position)}
      data-angle-deg={String(visualPosition.angleDeg)}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <picture className="part-potentiometer__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-potentiometer__img"
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
            clipPath: 'polygon(8% 0, 92% 0, 100% 70%, 91% 84%, 86% 100%, 14% 100%, 9% 84%, 0 70%)',
          }}
        />
      </picture>
      <span
        className="part-potentiometer__indicator"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '8%',
          width: '4%',
          height: '22%',
          transform: `translateX(-50%) rotate(${visualPosition.angleDeg}deg)`,
          transformOrigin: '50% 100%',
          borderRadius: '999px',
          background: '#f4f4f2',
          boxShadow: '0 0 1px rgba(0,0,0,0.65)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
