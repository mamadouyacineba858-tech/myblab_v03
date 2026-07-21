import { createContext, useContext } from "react"
import { useCircuitState } from "../hooks/useCircuitState.js"

const CircuitContext = createContext(null)

/**
 * Fournit l'état circuit unifié (composants, fils, câblage, drag, simulation).
 */
export function CircuitProvider({ children, canvasRef }) {
  const value = useCircuitState(canvasRef)

  return (
    <CircuitContext.Provider value={value}>
      {children}
    </CircuitContext.Provider>
  )
}

/** @returns {ReturnType<typeof useCircuitState>} */
export function useCircuit() {
  const ctx = useContext(CircuitContext)
  if (!ctx) {
    throw new Error("useCircuit doit être utilisé dans CircuitProvider")
  }
  return ctx
}
