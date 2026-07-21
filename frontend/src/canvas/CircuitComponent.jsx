import { useCallback, useMemo } from "react"
import { getComponentDef } from "../config/componentDefinitions.js"
import { useCircuit } from "../context/CircuitContext.jsx"
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
      
      // CORRECTION 2 : Prise de contrôle totale de l'interaction souris
      e.preventDefault()
      e.stopPropagation()

      const isMultiSelect = e.ctrlKey || e.metaKey // metaKey pour la compatibilité Mac (Cmd)

      // CORRECTION 1 : Ctrl+clic modifie la sélection mais ne lance PAS le drag
      if (isMultiSelect) {
        toggleSelection({ type: 'component', id: uid })
        return // On s'arrête ici, pas de startDrag
      }

      // Comportement normal : sélection unique + préparation au drag
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

  if (!uid || !def) return null

  const pins = def.pins ?? []

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
      <div className="circuit-component__body">
        <PartRenderer
          type={type}
          uid={uid}
          pinSignals={pinSignals}
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