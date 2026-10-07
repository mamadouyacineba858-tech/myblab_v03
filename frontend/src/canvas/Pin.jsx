// MB-COMPONENT-LIBRARY-002 (correction disclosed, même raison que
// CircuitComponent.jsx) : import React explicite requis par la config
// vitest secondaire pour tout .jsx rendu sous cette config. Aucun
// changement de comportement.
import React, { useState } from "react"
import "./Pin.css"

/**
 * Pin cliquable avec hover — ne déclenche pas le drag du composant parent.
 */
export function Pin({
  pinId,
  contactId,
  componentUid,
  startWireGesture,
  label,
  left,
  top,
  isPending,
  isConnected,
  onPinClick,
  hideVisualMarker = false,
}) {
  const [hover, setHover] = useState(false)

  const handleMouseDown = (e) => {
    e.stopPropagation()
  }

  const handleClick = (e) => {
    e.stopPropagation()
    // [FT-B-001-S2] Le câblage par double-clic transporte aussi l'ancre de
    // contact physique (identique au geste de drag).
    onPinClick(pinId, contactId)
  }

  return (
    <button
      type="button"
      data-wire-uid={componentUid}
      data-wire-pin={pinId}
      {...(contactId != null ? { "data-wire-contact": contactId } : {})}
      onPointerDown={(e) => {
        e.stopPropagation()
        // [FT-B-001-S2] `contactId` transmis à la gesture (ancre de contact
        // physique). Undefined pour une pin mono-contact ⇒ comportement
        // historique.
        startWireGesture?.(e, componentUid, pinId, contactId)
      }}
      className={[
        "myblab-pin",
        hover && "myblab-pin--hover",
        isPending && "myblab-pin--pending",
        isConnected && "myblab-pin--connected",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: Number.isFinite(left) ? left : 0,
        top: Number.isFinite(top) ? top : 0,
        opacity: hideVisualMarker ? 0 : 1,
      }}
      title={label ?? pinId}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={label ?? pinId}
    />
  )
}
