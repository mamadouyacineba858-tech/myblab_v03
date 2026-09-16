import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu raster du bouton-poussoir.
 *
 * A3-GATE-FIX : l'actionneur central et le corps ont désormais deux rôles
 * d'interaction distincts. L'actionneur reçoit les événements momentary et
 * bloque le mousedown de compatibilité afin qu'une pression ne démarre pas
 * startDrag() sur le wrapper CircuitComponent. La couronne/base reste sans
 * handler pointer : un drag initié dessus remonte normalement au wrapper et
 * conserve donc la possibilité de déplacer le composant.
 *
 * L'état visuel reste dérivé exclusivement de `state` : released/pressed.
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
  onPointerLeave,
  onLostPointerCapture,
}) {
  const def = getComponentDef('BUTTON')
  const width = def?.width ?? 60
  const height = def?.height ?? 60
  const isPressed = state === 'pressed'
  const source = isPressed ? ASSET_SOURCES.pressed : ASSET_SOURCES.released

  // Pointer Events génère normalement un mousedown de compatibilité après
  // pointerdown. CircuitComponent utilise ce mousedown pour startDrag().
  // Sur l'actionneur, preventDefault() supprime uniquement ce mousedown :
  // la pression momentary reste donc une pression et ne déplace pas le bouton.
  const handleActuatorPointerDown = (event) => {
    event.preventDefault()
    onPointerDown?.(event)
  }

  return (
    <div
      className={`part-button${isPressed ? ' part-button--pressed' : ''}`}
      aria-label="Bouton"
      style={{
        cursor: 'default',
        userSelect: 'none',
        position: 'relative',
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

      <div
        className="part-button__actuator"
        data-button-actuator="true"
        aria-hidden="true"
        onPointerDown={handleActuatorPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
        onLostPointerCapture={onLostPointerCapture}
        style={{
          position: 'absolute',
          left: '25%',
          top: '25%',
          width: '50%',
          height: '50%',
          borderRadius: '50%',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      />
    </div>
  )
}
