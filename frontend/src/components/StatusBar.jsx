import { useCircuit } from "../context/useCircuit.js";
import "./StatusBar.css";

export function StatusBar() {
  const { components, wirePaths, isWiringActive, simulationActive } = useCircuit();


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