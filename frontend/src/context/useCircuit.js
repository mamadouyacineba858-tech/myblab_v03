import { useContext } from "react"
import { CircuitContext } from "./CircuitContext.js"

/**
 * Accède à l'état global du circuit.
 */
export function useCircuit() {
  const ctx = useContext(CircuitContext)

  if (!ctx) {
    throw new Error("useCircuit doit être utilisé dans CircuitProvider")
  }

  return ctx
}