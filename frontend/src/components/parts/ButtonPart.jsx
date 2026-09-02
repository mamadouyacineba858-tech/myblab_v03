import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Bouton-poussoir — backend RASTER (MB-VIS-PROTOTYPE-008).
 *
 * Remplace l'ancien rendu SVG (base carrée + capuchon rond dessinés en
 * primitives SVG) par le paquet d'assets raster produit et vérifié pour
 * MB-VIS-PROTOTYPE-008 (probe pixel v3.2 PASS), intégré via le mécanisme
 * déclaratif de MB-VIS-INDUSTRIAL-001 (`defaultRegistrations` →
 * `visual: { backend: 'raster' }` → `getComponentPresentation('BUTTON')` →
 * wrapper `data-bare-body` + pins `markerless`, sans aucun `type === "BUTTON"`
 * ni règle CSS spécifique dans le renderer central).
 *
 * Patron identique à `LedPart.jsx` / `ResistorPart.jsx` : `frontend/public/`
 * est servi à la racine web → `/assets/components/button/…`, priorité WebP
 * via `<picture>`, fallback PNG, aucune logique JS de sélection d'asset
 * au-delà du choix released/pressed.
 *
 * Différence structurelle majeure avec LedPart (composant purement passif) :
 * BUTTON reste un composant INTERACTIF. Le contrat de props et de handlers
 * de ce fichier avant ce ticket est STRICTEMENT CONSERVÉ et reste attaché à
 * l'élément racine (le `<div>` reste la cible des événements pointer/mouse,
 * exactement comme avant) :
 *  - state, onPointerDown, onPointerUp, onPointerCancel,
 *    onLostPointerCapture, onMouseDown — tous fournis par
 *    CircuitComponent.jsx, non touché par ce ticket ;
 *  - classes `part-button` / `part-button--pressed` (LOCK-19, VIS-TEST-08) ;
 *  - `aria-label="Bouton"`.
 * Le `<picture>`/`<img>` ajouté est purement visuel et non interactif :
 * `pointer-events: none`, `draggable={false}` — le hit-test, le drag et le
 * câblage restent entièrement gérés par le wrapper `.circuit-component` /
 * cet élément racine, jamais par l'image.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("BUTTON")` (60×60) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins pin1(0,30) / pin2(60,30) : produits par CircuitComponent/Pin,
 *    jamais dessinés dans l'asset ni ici ;
 *  - sélection d'asset : released → `button.released.*`, pressed →
 *    `button.pressed.*` — dérivée exclusivement de la prop `state` existante,
 *    aucune logique de simulation déplacée ici.
 */
const ASSET_DIR = '/assets/components/button'

const ASSET_SOURCES = {
  released: {
    webp: `${ASSET_DIR}/button.released.1x.webp 1x, ${ASSET_DIR}/button.released.3x.webp 3x`,
    png: `${ASSET_DIR}/button.released.1x.png 1x, ${ASSET_DIR}/button.released.3x.png 3x`,
    fallback: `${ASSET_DIR}/button.released.3x.png`,
  },
  pressed: {
    webp: `${ASSET_DIR}/button.pressed.1x.webp 1x, ${ASSET_DIR}/button.pressed.3x.webp 3x`,
    png: `${ASSET_DIR}/button.pressed.1x.png 1x, ${ASSET_DIR}/button.pressed.3x.png 3x`,
    fallback: `${ASSET_DIR}/button.pressed.3x.png`,
  },
}

export function ButtonPart({
  state,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onMouseDown,
}) {
  const def = getComponentDef("BUTTON")
  const width = def?.width ?? 60
  const height = def?.height ?? 60
  const isPressed = state === "pressed"
  const source = isPressed ? ASSET_SOURCES.pressed : ASSET_SOURCES.released

  return (
    <div
      className={`part-button${isPressed ? " part-button--pressed" : ""}`}
      aria-label="Bouton"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      onMouseDown={onMouseDown}
      style={{
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <picture className="part-button__picture">
        <source type="image/webp" srcSet={source.webp} />
        <img
          className="part-button__img"
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
