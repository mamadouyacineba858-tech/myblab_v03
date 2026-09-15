import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * A3-SW1 — Slide Switch (SPDT), renderer CSS/DOM pur : aucun asset raster
 * réaliste n'a été validé pour ce composant, le ticket vise d'abord la
 * parité fonctionnelle (§9). Contrat de props identique à
 * LatchingButtonPart.jsx : `state` / `onPointerDown` / `onPointerMove` /
 * `onClick` sont fournis par CircuitComponent.jsx via la capacité
 * déclarative `interaction.type === "state-toggle"`
 * (componentDefinitions.js) — ce fichier ne connaît lui-même aucun
 * mécanisme d'historique/undo, ni aucun autre type de composant.
 */
export function SlideSwitchPart({
  state,
  onPointerDown,
  onPointerMove,
  onClick,
}) {
  const def = getComponentDef("SLIDE_SWITCH")
  const width = def?.width ?? 72
  const height = def?.height ?? 48
  const isRight = state === "right"
  const knobWidth = 24
  const knobLeft = isRight ? width - knobWidth - 4 : 4

  return (
    <div
      className={`part-slide-switch${isRight ? " is-right" : " is-left"}`}
      aria-label={isRight ? "Interrupteur à glissière : position droite" : "Interrupteur à glissière : position gauche"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onClick={onClick}
      style={{
        position: "relative",
        width,
        height,
        boxSizing: "border-box",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div
        className="part-slide-switch__housing"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 6,
          background: "#374151",
          border: "1px solid #1f2937",
        }}
      />
      <div
        className="part-slide-switch__track"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 4,
          top: height / 2 - 6,
          width: width - 8,
          height: 12,
          borderRadius: 6,
          background: "#111827",
        }}
      />
      <div
        className="part-slide-switch__knob"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: height / 2 - 12,
          left: knobLeft,
          width: knobWidth,
          height: 24,
          borderRadius: 4,
          background: "#e5e7eb",
          border: "1px solid #94a3b8",
          boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
          transition: "left 0.12s ease-out",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
