import React from 'react'

/**
 * Rendu visuel Interrupteur à bascule / BUTTON_LATCHING (MB-COMPONENT-LIBRARY-002).
 *
 * Contrat de props strictement inchangé (state, onPointerDown, onClick —
 * fournis par CircuitComponent.jsx, non touché par ce ticket). Interrupteur
 * à levier (rocker switch), contenu dans la boîte 60×60 définie par
 * componentDefinitions.js (non modifiée, pins pin1 dx=0/pin2 dx=60 à
 * dy=30). L'état on/off reste piloté uniquement par la classe is-on sur
 * l'élément racine, comme avant ce ticket (LOCK-19, VIS-TEST-08).
 */
export function LatchingButtonPart({
  state,
  onPointerDown,
  onClick,
}) {
  const isOn = state === "on"

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
      <svg viewBox="0 0 60 60" width="60" height="60" role="img" aria-hidden="true">
        <line x1="0" y1="30" x2="14" y2="30" className="part-latching-button__lead" />
        <line x1="46" y1="30" x2="60" y2="30" className="part-latching-button__lead" />
        <rect x="10" y="20" width="40" height="20" rx="6" className="part-latching-button__housing" />
        <rect
          x={isOn ? "30" : "12"}
          y="22"
          width="18"
          height="16"
          rx="4"
          className="part-latching-button__lever"
        />
      </svg>
    </div>
  )
}
