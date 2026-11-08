import React from 'react'
import { useCircuit } from "../context/useCircuit.js";
import { useCircuitInteraction } from "../context/useCircuitInteraction.js";
import "./StatusBar.css";

export function StatusBar() {
  const { isWiringActive, simulationActive, wires } = useCircuit();
  // MB-VIS-CANVAS-051 : `components`/`wirePaths` (comptage seul) relèvent du
  // state haute fréquence côté useCircuitState.js (componentsForRender/
  // wirePaths suivent le preview de drag) — inchangé fonctionnellement ici,
  // seule la source de lecture est désormais explicite.
  const { components, breadboards } = useCircuitInteraction();
  // Les fils vers un trou de breadboard ne sont pas dans wirePaths : on compte les fils persistés.
  const wireCount = Array.isArray(wires) ? wires.length : 0;
  const boardCount = Array.isArray(breadboards) ? breadboards.length : 0;
  const componentCount = Array.isArray(components) ? components.length : 0;
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