import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Bouton-poussoir (MB-COMPONENT-LIBRARY-002).
 *
 * Contrat de props strictement inchangé (state, onPointerDown, onPointerUp,
 * onPointerCancel, onLostPointerCapture, onMouseDown — tous fournis par
 * CircuitComponent.jsx, non touché par ce ticket). Les gestionnaires
 * d'événements restent attachés à l'élément racine, exactement comme avant
 * ce ticket — le SVG ajouté est purement visuel (aucun handler dessus).
 *
 * Bouton-poussoir tactile (base carrée + capuchon rond), contenu dans la
 * boîte 60×60 définie par componentDefinitions.js (non modifiée, pins
 * pin1 dx=0/pin2 dx=60 à dy=30). L'état pressé/relâché reste piloté
 * uniquement par la classe part-button--pressed, comme avant ce ticket
 * (LOCK-19, VIS-TEST-08).
 */
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
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true">
        <line x1="0" y1="30" x2="15" y2="30" className="part-button__lead" />
        <line x1="45" y1="30" x2="60" y2="30" className="part-button__lead" />
        <rect x="12" y="12" width="36" height="36" rx="4" className="part-button__base" />
        <circle cx="30" cy="30" r="13" className="part-button__cap" />
        <circle cx="26" cy="26" r="4" className="part-button__cap-highlight" />
      </svg>
    </div>
  )
}
