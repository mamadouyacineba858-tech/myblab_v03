import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { getInstruments, getInstrumentsVersion, subscribeInstruments, updateInstruments } from "./instrumentsStore.js"

const PROBES = [
  { id: "voltmeter-plus", label: "V+", color: "#ef4444", group: "voltmeter", key: "plus" },
  { id: "voltmeter-minus", label: "V−", color: "#2563eb", group: "voltmeter", key: "minus" },
  { id: "ammeter-a", label: "A", color: "#f97316", group: "ammeter", key: "a" },
  { id: "ammeter-b", label: "COM", color: "#2563eb", group: "ammeter", key: "b" },
  { id: "scope-ch1", label: "CH1", color: "#22c55e", group: "scope", channel: "ch1", key: "plus" },
  { id: "scope-ch1-ref", label: "CH1−", color: "#15803d", group: "scope", channel: "ch1", key: "minus" },
  { id: "scope-ch2", label: "CH2", color: "#eab308", group: "scope", channel: "ch2", key: "plus" },
  { id: "scope-ch2-ref", label: "CH2−", color: "#a16207", group: "scope", channel: "ch2", key: "minus" },
]

function readProbe(probe, instruments) {
  if (probe.group === "scope") return instruments.scope[probe.channel][probe.key]
  return instruments[probe.group][probe.key]
}

function writeProbe(probe, pin) {
  updateInstruments((next) => {
    if (probe.group === "scope") next.scope[probe.channel][probe.key] = pin
    else next[probe.group][probe.key] = pin
  })
}

export function ProbeOverlay({ canvasRef, components, viewport }) {
  useSyncExternalStore(subscribeInstruments, getInstrumentsVersion)
  const instruments = getInstruments()
  const [positions, setPositions] = useState({})
  const [drag, setDrag] = useState(null)
  const dragRef = useRef(null)

  useLayoutEffect(() => {
    const canvas = canvasRef?.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const pins = [...canvas.querySelectorAll(".myblab-pin[data-wire-uid][data-wire-pin]")]
    const next = {}
    for (const probe of PROBES) {
      const pin = readProbe(probe, instruments)
      if (!pin) continue
      const element = pins.find((candidate) => candidate.dataset.wireUid === pin.uid && candidate.dataset.wirePin === pin.pin)
      if (!element) continue
      const bounds = element.getBoundingClientRect()
      next[probe.id] = { x: bounds.left + bounds.width / 2 - rect.left, y: bounds.top + bounds.height / 2 - rect.top }
    }
    setPositions(next)
  }, [canvasRef, components, instruments, viewport])

  useEffect(() => {
    const move = (event) => {
      const active = dragRef.current
      const rect = canvasRef?.current?.getBoundingClientRect()
      if (!active || !rect) return
      active.x = event.clientX - rect.left
      active.y = event.clientY - rect.top
      setDrag({ ...active })
    }
    const up = (event) => {
      const active = dragRef.current
      if (!active) return
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".myblab-pin[data-wire-uid][data-wire-pin]")
      if (target) writeProbe(active.probe, { uid: target.dataset.wireUid, pin: target.dataset.wirePin })
      dragRef.current = null
      setDrag(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [canvasRef])

  return React.createElement(
    React.Fragment,
    null,
    <div className="probe-overlay" aria-label="Sondes d'instrument">
      {PROBES.map((probe, index) => {
        const pin = readProbe(probe, instruments)
        const position = drag?.probe.id === probe.id ? drag : positions[probe.id]
        if (!pin || !position) return null
        return (
          <button
            key={probe.id}
            type="button"
            className="probe-overlay__marker"
            data-testid={`probe-marker-${probe.id}`}
            aria-label={`Sonde ${probe.label}, broche ${pin.pin}. Faire glisser vers une autre broche.`}
            title={`${probe.label} · glisser vers une autre broche`}
            style={{ left: position.x + (index % 2 ? 10 : -10), top: position.y + (index % 3 ? -12 : 12), "--probe-color": probe.color }}
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              dragRef.current = { probe, x: position.x, y: position.y }
              setDrag({ ...dragRef.current })
            }}
            onClick={(event) => { event.preventDefault(); event.stopPropagation() }}
          >
            {probe.label}
          </button>
        )
      })}
    </div>
  )
}