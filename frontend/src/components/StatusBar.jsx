import React from 'react'
import { useCircuit } from "../context/useCircuit.js";
import "./StatusBar.css";

export function StatusBar() {
  const { isWiringActive, simulationActive, documentCounts } = useCircuit();
  // Always count persisted document objects, never transient drag previews.
  const componentCount = documentCounts?.components ?? 0;
  const wireCount = documentCounts?.wires ?? 0;
  const boardCount = documentCounts?.breadboards ?? 0;
  const circuitEmpty = componentCount === 0 && wireCount === 0 && boardCount === 0;


  return (
    <footer className="myblab-statusbar">
      <span className="myblab-statusbar__item">
        🧩 Composants : {componentCount}
      </span>

      <span className="myblab-statusbar__item">
        🔌 Fils : {wireCount}
      </span>

      <span className="myblab-statusbar__item">
        Plaques : {boardCount}
      </span>

      <span className="myblab-statusbar__item">
        {isWiringActive ? "✏️ Câblage en cours..." : "✅ Prêt (éditeur)"}
      </span>

      <span className="myblab-statusbar__item">
        {simulationActive ? "▶ Simulation active" : "⏹ Simulation arrêtée"}
      </span>

      {circuitEmpty && (
        <span className="myblab-statusbar__item" role="status">
          Circuit vide — aucun élément enregistré
        </span>
      )}
    </footer>
  );
}