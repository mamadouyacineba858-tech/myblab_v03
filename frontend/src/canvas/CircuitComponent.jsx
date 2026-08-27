// MB-COMPONENT-LIBRARY-002 (correction disclosed, hors périmètre strict des
// Part renderers mais nécessaire) : import React explicite requis par la
// config vitest secondaire (frontend/src/simulator/vitest.config.ts, sans
// @vitejs/plugin-react) pour tout .jsx rendu sous cette config — même
// convention déjà appliquée à chaque Part renderer. Ce fichier n'avait
// jamais été rendu directement sous cette config avant les tests
// d'intégration CircuitComponent -> PartRenderer ajoutés par ce ticket
// (RealisticRenderers.test.jsx). Aucun changement de comportement : ajout
// d'import pur, aucune ligne de logique modifiée.
import React, { useCallback, useEffect, useMemo } from "react"
import { getComponentDef } from "../config/componentDefinitions.js"
import { useCircuit } from "../context/useCircuit.js"
import { Pin } from "./Pin.jsx"
import { PartRenderer } from "../components/parts/PartRenderer.jsx"
import "./CircuitComponent.css"

export function CircuitComponent({ component }) {
  const {
    startDrag,
    onPinClick,
    isPinPending,
    isPinConnected,
    pinSignals,
    selectOnly,
    toggleSelection,
    isSelected,
    setButtonState,
    toggleLatchingButton,
  } = useCircuit()

  const uid = component?.uid
  const type = component?.type
  const x = component?.x ?? 0
  const y = component?.y ?? 0

  const def = useMemo(() => getComponentDef(type), [type])

  const selected = isSelected({ type: 'component', id: uid })

  const handleBodyMouseDown = useCallback(
    (e) => {
      if (e.button !== 0 || !uid) return
      e.preventDefault()
      e.stopPropagation()

      const isMultiSelect = e.ctrlKey || e.metaKey
      if (isMultiSelect) {
        toggleSelection({ type: 'component', id: uid })
        return
      }

      selectOnly({ type: 'component', id: uid })
      startDrag(e, uid, x, y)
    },
    [startDrag, uid, x, y, selectOnly, toggleSelection]
  )

  const handlePinClick = useCallback(
    (pinId) => {
      if (uid) onPinClick(uid, pinId)
    },
    [onPinClick, uid]
  )

  const isButton = type === "BUTTON"

  const handleButtonPointerDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setButtonState(uid, "pressed")
    if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
  }, [setButtonState, uid])

  const handleButtonPointerUp = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setButtonState(uid, "released")
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    }
  }, [setButtonState, uid])

  const handleButtonPointerCancel = useCallback((e) => {
    e.stopPropagation()
    setButtonState(uid, "released")
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    }
  }, [setButtonState, uid])

  const handleButtonLostPointerCapture = useCallback((e) => {
    e.stopPropagation()
    setButtonState(uid, "released")
  }, [setButtonState, uid])

  const handleButtonMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])
  const isLatchingButton = type === "BUTTON_LATCHING"

  const handleLatchingButtonPointerDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleLatchingButtonClick = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleLatchingButton(uid)
  }, [toggleLatchingButton, uid])

  useEffect(() => {
    if (!isButton) return

    const handleWindowBlur = () => {
      if (component.state === "pressed") {
        setButtonState(uid, "released")
      }
    }

    window.addEventListener("blur", handleWindowBlur)
    return () => window.removeEventListener("blur", handleWindowBlur)
  }, [isButton, uid, component.state, setButtonState])

  if (!uid || !def) return null

  const pins = def.pins ?? []
  const bodyClassName = type === "RESISTOR" || type === "LED" || type === "CAPACITOR"
    ? `circuit-component__body circuit-component__body--${type.toLowerCase()}`
    : "circuit-component__body"
  const isTransparentPart = type === "RESISTOR" || type === "LED" || type === "CAPACITOR"
  const bodyStyle = isTransparentPart
    ? { background: "transparent", border: 0, borderRadius: 0, boxShadow: "none" }
    : undefined

  return (
    <div
      className="circuit-component"
      style={{
        left: x,
        top: y,
        width: def.width ?? 80,
        height: def.height ?? 40,
        outline: selected ? '2px solid #22c55e' : 'none',
        outlineOffset: '2px',
      }}
      onMouseDown={handleBodyMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={bodyClassName} style={bodyStyle}>
        <PartRenderer
          type={type}
          uid={uid}
          pinSignals={pinSignals}
          {...(isButton ? {
            state: component.state,
            onPointerDown: handleButtonPointerDown,
            onPointerUp: handleButtonPointerUp,
            onPointerCancel: handleButtonPointerCancel,
            onLostPointerCapture: handleButtonLostPointerCapture,
            onMouseDown: handleButtonMouseDown,
          } : {})}
          {...(isLatchingButton ? {
            state: component.state,
            onPointerDown: handleLatchingButtonPointerDown,
            onClick: handleLatchingButtonClick,
          } : {})}
        />
      </div>

      {pins.map((pin) => (
        <Pin
          key={pin.id}
          pinId={pin.id}
          label={pin.label ?? pin.id}
          left={pin.dx ?? 0}
          top={pin.dy ?? 0}
          isPending={isPinPending(uid, pin.id)}
          isConnected={isPinConnected(uid, pin.id)}
          onPinClick={handlePinClick}
        />
      ))}
    </div>
  )
}
