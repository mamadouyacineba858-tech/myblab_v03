import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { ReactDocumentMapper } from "../bridge/ReactDocumentMapper.js"
import { toEngineInput } from "../simulator/engineAdapter.js"
import { SIMULATION_STEP_MS } from "../simulator/simulationRuntimeIntegration.js"
import { getInstrumentsVersion, subscribeInstruments } from "./instrumentsStore.js"
import { advanceLive, configureLive, stopLive } from "./liveSimulation.js"

/** Pilote la simulation temporelle à chaque trame du moteur ; ne rend rien. */
export function LiveSimulationDriver() {
  const { wires, pinSignals, simulationActive } = useCircuit()
  const { components, breadboards } = useCircuitInteraction()
  const instrumentsVersion = useSyncExternalStore(subscribeInstruments, getInstrumentsVersion)
  const adapted = useMemo(() => {
    try {
      return toEngineInput(ReactDocumentMapper.toCore({ components, wires, breadboards }))
    } catch {
      return { components: [], wires: [] }
    }
  }, [components, wires, breadboards])
  const pwmActive = useMemo(
    () => components.some((c) => c.type === "ARDUINO" && typeof c.firmware?.source === "string" && c.firmware.source.includes("analogWrite")),
    [components],
  )
  const hasFirmware = useMemo(
    () => components.some((c) => c.type === "ARDUINO" && typeof c.firmware?.source === "string" && c.firmware.source.trim() !== ""),
    [components],
  )
  const lastSignals = useRef(null)

  useEffect(() => {
    if (!simulationActive) {
      stopLive()
      lastSignals.current = null
      return
    }
    configureLive(adapted.components, adapted.wires)
  }, [simulationActive, adapted, instrumentsVersion])

  // Avec firmware : le temps simulé suit les trames du moteur (même horloge que le programme).
  useEffect(() => {
    if (!simulationActive || !hasFirmware || !pinSignals || pinSignals === lastSignals.current) return
    lastSignals.current = pinSignals
    advanceLive(SIMULATION_STEP_MS / 1000, pwmActive)
  }, [simulationActive, hasFirmware, pinSignals, pwmActive])

  // Sans firmware : le moteur n'émet pas de trames ; une boucle d'animation avance le temps simulé.
  useEffect(() => {
    if (!simulationActive || hasFirmware) return undefined
    let raf = 0
    const tick = () => {
      advanceLive(SIMULATION_STEP_MS / 1000, false)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [simulationActive, hasFirmware])

  return null
}
