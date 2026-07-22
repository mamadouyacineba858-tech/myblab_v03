import { useCircuitState } from "../hooks/useCircuitState.js"
import { CircuitContext } from "./CircuitContext.js"

/**
 * Fournit l'état circuit unifié
 * (composants, fils, câblage, drag, simulation).
 */
export function CircuitProvider({ children, canvasRef }) {
  const value = useCircuitState(canvasRef)

  return (
    <CircuitContext.Provider value={value}>
      {children}
    </CircuitContext.Provider>
  )
}