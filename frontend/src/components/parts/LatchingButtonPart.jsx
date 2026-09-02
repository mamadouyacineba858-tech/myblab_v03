import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Interrupteur à bascule / BUTTON_LATCHING — backend RASTER
 * (MB-VIS-PROTOTYPE-008).
 *
 * Remplace l'ancien rendu SVG (boîtier + levier dessinés en primitives SVG,
 * position du levier pilotée par l'attribut `x` conditionnel) par le paquet
 * d'assets raster produit et vérifié pour MB-VIS-PROTOTYPE-008 (probe pixel
 * v3.2 PASS), intégré via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('BUTTON_LATCHING')` → wrapper `data-bare-body` +
 * pins `markerless`, sans aucun `type === "BUTTON_LATCHING"` ni règle CSS
 * spécifique dans le renderer central).
 *
 * Patron identique à `ButtonPart.jsx` / `LedPart.jsx` : `frontend/public/`
 * est servi à la racine web → `/assets/components/button-latching/…`,
 * priorité WebP via `<picture>`, fallback PNG, aucune logique JS de
 * sélection d'asset au-delà du choix off/on.
 *
 * BUTTON_LATCHING reste un composant INTERACTIF. Le contrat de props et de
 * handlers de ce fichier avant ce ticket est STRICTEMENT CONSERVÉ et reste
 * attaché à l'élément racine, exactement comme avant :
 *  - state, onPointerDown, onClick — tous fournis par CircuitComponent.jsx
 *    (mécanisme `ToggleLatchingButtonCommand` / undo-redo non touché) ;
 *  - classes `part-latching-button` / `is-on` (LOCK-19, VIS-TEST-08) ;
 *  - `aria-label` dynamique (« Interrupteur activé » / « Interrupteur
 *    désactivé »).
 * Le `<picture>`/`<img>` ajouté est purement visuel et non interactif :
 * `pointer-events: none`, `draggable={false}` — le hit-test et le câblage
 * restent entièrement gérés par le wrapper `.circuit-component` / cet
 * élément racine, jamais par l'image.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("BUTTON_LATCHING")` (60×60) —
 *    aucune valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins pin1(0,30) / pin2(60,30) : produits par CircuitComponent/Pin,
 *    jamais dessinés dans l'asset ni ici ;
 *  - sélection d'asset : off → `button-latching.off.*`, on →
 *    `button-latching.on.*` — dérivée exclusivement de la prop `state`
 *    existante, aucune logique électrique déplacée ici. Le rocker rouge
 *    reste visible dans les deux états (cuit dans les deux assets).
 */
const ASSET_DIR = '/assets/components/button-latching'

const ASSET_SOURCES = {
  off: {
    webp: `${ASSET_DIR}/button-latching.off.1x.webp 1x, ${ASSET_DIR}/button-latching.off.3x.webp 3x`,
    png: `${ASSET_DIR}/button-latching.off.1x.png 1x, ${ASSET_DIR}/button-latching.off.3x.png 3x`,
    fallback: `${ASSET_DIR}/button-latching.off.3x.png`,
  },
  on: {
    webp: `${ASSET_DIR}/button-latching.on.1x.webp 1x, ${ASSET_DIR}/button-latching.on.3x.webp 3x`,
    png: `${ASSET_DIR}/button-latching.on.1x.png 1x, ${ASSET_DIR}/button-latching.on.3x.png 3x`,
    fallback: `${ASSET_DIR}/button-latching.on.3x.png`,
  },
}

export function LatchingButtonPart({
  state,
  onPointerDown,
  onClick,
}) {
  const def = getComponentDef("BUTTON_LATCHING")
  const width = def?.width ?? 60
  const height = def?.height ?? 60
  const isOn = state === "on"
  const source = isOn ? ASSET_SOURCES.on : ASSET_SOURCES.off

  return (
    <div
      className={`part-latching-button${isOn ? " is-on" : ""}`}
      aria-label={isOn ? "Interrupteur activé" : "Interrupteur désactivé"}
      onPointerDown={onPointerDown}
      onClick={onClick}
      style={{
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <picture className="part-latching-button__picture">
        <source type="image/webp" srcSet={source.webp} />
        <img
          className="part-latching-button__img"
          src={source.fallback}
          srcSet={source.png}
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
