import React from "react"
import { useCircuitState } from "../hooks/useCircuitState.js"
import { CircuitContext } from "./CircuitContext.js"

/**
 * Fournit l'état circuit unifié
 * (composants, fils, câblage, drag, simulation).
 *
 * MB-ARDUINO-BRIDGE-001 (Blueprint §3) : `orchestrators` (optionnel) est le
 * container runtime Arduino (Map<uid, RuntimeOrchestrator>), possédé au
 * niveau application (App.jsx) et simplement relayé ici — ce fichier ne crée
 * ni RuntimeOrchestrator ni ArduinoSimulator, et ne possède aucun état
 * propre au sujet du runtime. Si omis (ex. tests existants ne fournissant
 * aucun prop), useCircuitState() applique son propre repli interne.
 */
export function CircuitProvider({ children, canvasRef, orchestrators }) {
  const value = useCircuitState(canvasRef, orchestrators)

  return (
    <CircuitContext.Provider value={value}>
      {children}
    </CircuitContext.Provider>
  )
}