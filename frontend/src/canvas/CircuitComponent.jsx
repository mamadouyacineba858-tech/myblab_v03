// MB-COMPONENT-LIBRARY-002 (correction disclosed, hors périmètre strict des
// Part renderers mais nécessaire) : import React explicite requis par la
// config vitest secondaire (frontend/src/simulator/vitest.config.ts, sans
// @vitejs/plugin-react) pour tout fichier JSX rendu sous cette config — même
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
import { getComponentPresentation } from "../visualization/defaultRegistrations.js"
import { getPinPresentationPosition } from "../utils/pinPresentationGeometry.js"
import "./CircuitComponent.css"

// MB-VIS-CANVAS-051 (Blueprint C3/D4) : React.memo — SimulationCanvas.jsx
// (qui consomme le state haute fréquence via useCircuitInteraction()) re-rend
// à chaque frame de drag/pan/marquee et reconstruit `componentsForRender`
// (useCircuitState.js) par un nouveau `.map()`, mais préserve la RÉFÉRENCE de
// chaque objet composant non concerné par le preview courant (retourné tel
// quel — `c`, jamais `{...c}` — quand `dragPreview.get(c.uid)` est absent).
// Combiné à cette mémoïsation (comparaison par défaut, shallow, sur la seule
// prop `component`), les instances de CircuitComponent dont le composant
// Document réel n'a pas bougé sautent leur re-rendu, même si leur parent se
// re-rend — condition nécessaire pour que le fan-out sur un circuit à 100+
// composants ne dépende plus du nombre total de composants mais du nombre de
// composants réellement affectés par l'interaction en cours. Ce composant ne
// lit lui-même QUE le state stable (useCircuit(), jamais
// useCircuitInteraction()) : voir CircuitContext.jsx pour la répartition —
// c'est cette combinaison (contexte stable + mémoïsation) qui élimine le
// re-rendu, la mémoïsation seule ne suffisant pas face à un Context consommé
// directement (React re-rend tout consommateur d'un Context dont la valeur
// change, quel que soit React.memo).
function CircuitComponentImpl({ component }) {
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

  // MB-VIS-INDUSTRIAL-001 : présentation DÉCLARATIVE (backend / bareBody /
  // markerless) dérivée de l'entrée de registre — remplace les anciens
  // branchements `type === "LED"` (habillage du body + masquage du marqueur).
  const presentation = useMemo(() => getComponentPresentation(type), [type])

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

  // MB-VIS-COMP-002 : dérivé de la capacité déclarative `interaction`
  // (componentDefinitions.js) au lieu de tester littéralement le type.
  // Comportement strictement inchangé : seul BUTTON déclare
  // interaction.type === "momentary", seul BUTTON_LATCHING déclare
  // interaction.type === "latching" — voir componentDefinitions.js.
  const isButton = def?.interaction?.type === "momentary"

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
  const isLatchingButton = def?.interaction?.type === "latching"

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

    return () => {
      window.removeEventListener("blur", handleWindowBlur)
    }
  }, [isButton, uid, component.state, setButtonState])
  if (!uid || !def) return null

  const pins = def.pins ?? []

  return (
    <div
      className="circuit-component"
      data-backend={presentation.backend}
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
      <div
        className="circuit-component__body"
        data-bare-body={presentation.bareBody ? "" : undefined}
      >
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

      {pins.map((pin) => {
        const presentationPosition = getPinPresentationPosition(component, pin)
        const left = presentationPosition ? presentationPosition.x - x : pin.dx ?? 0
        const top = presentationPosition ? presentationPosition.y - y : pin.dy ?? 0
        return (
          <Pin
            key={pin.id}
            pinId={pin.id}
            label={pin.label ?? pin.id}
            left={left}
            top={top}
            isPending={isPinPending(uid, pin.id)}
            isConnected={isPinConnected(uid, pin.id)}
            onPinClick={handlePinClick}
            hideVisualMarker={presentation.markerless}
          />
        )
      })}
    </div>
  )
}

export const CircuitComponent = React.memo(CircuitComponentImpl)