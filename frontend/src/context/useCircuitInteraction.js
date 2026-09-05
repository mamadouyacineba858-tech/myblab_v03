import { useContext } from "react"
import { CircuitInteractionContext } from "./CircuitContext.js"

/**
 * MB-VIS-CANVAS-051 — Accède au state haute fréquence du circuit (viewport,
 * aperçus de drag/breadboard/marquee, géométrie dérivée qui suit le preview).
 *
 * Séparé de useCircuit() (state stable/Document) afin qu'un consommateur qui
 * n'a besoin QUE du state stable (CircuitComponent.jsx, Sidebar.jsx, etc.) ne
 * souscrive jamais à ce contexte, et ne re-rende donc plus pendant un
 * drag/pan/marquee — voir CircuitContext.jsx pour la répartition exacte des
 * champs entre les deux contextes.
 */
export function useCircuitInteraction() {
  const ctx = useContext(CircuitInteractionContext)

  if (!ctx) {
    throw new Error("useCircuitInteraction doit être utilisé dans CircuitProvider")
  }

  return ctx
}
