import { useCircuit } from "../context/useCircuit.js";
import { useCircuitInteraction } from "../context/useCircuitInteraction.js";
import "./StatusBar.css";

export function StatusBar() {
  const { isWiringActive, simulationActive } = useCircuit();
  // MB-VIS-CANVAS-051 : `components`/`wirePaths` (comptage seul) relèvent du
  // state haute fréquence côté useCircuitState.js (componentsForRender/
  // wirePaths suivent le preview de drag) — inchangé fonctionnellement ici,
  // seule la source de lecture est désormais explicite.
  const { components, wirePaths } = useCircuitInteraction();


  return (
    <footer className="myblab-statusbar">
      <span className="myblab-statusbar__item">
        🧩 Composants : {components.length}
      </span>

      <span className="myblab-statusbar__item">
        🔌 Fils : {wirePaths.length}
      </span>

      <span className="myblab-statusbar__item">
        {isWiringActive ? "✏️ Câblage en cours..." : "✅ Prêt"}
      </span>

      <span className="myblab-statusbar__item">
        {simulationActive ? "▶ Simulation active" : "⏹ Simulation arrêtée"}
      </span>
    </footer>
  );
}