import { useRef, useState } from "react";
import { CircuitProvider } from "./context/CircuitContext.jsx"
import { useCircuit } from "./context/useCircuit.js"

import { Navbar } from "./components/Navbar.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { SimulationCanvas } from "./canvas/SimulationCanvas.jsx";
import { StatusBar } from "./components/StatusBar.jsx";

import "./App.css";

/**
 * Contenu de l'application, à l'intérieur du CircuitProvider
 * pour pouvoir lire le thème depuis le contexte.
 */
function AppShell() {
  const { theme } = useCircuit();

  return (
    <div className={`myblab-root theme-${theme}`}>
      <Navbar />
      <div className="myblab-app">
        <Sidebar />
        <SimulationCanvas />
      </div>
      <StatusBar />
    </div>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  // MB-ARDUINO-BRIDGE-001 (Blueprint §3/§4) : container runtime Arduino
  // (Map<uid, RuntimeOrchestrator>), possédé au niveau application — même
  // principe d'injection que canvasRef (App.jsx en reste le propriétaire,
  // CircuitProvider ne fait que le relayer). Ne contient, à la création,
  // aucune instance RuntimeOrchestrator/ArduinoSimulator : celles-ci ne sont
  // créées que lazily par simulationRuntimeIntegration.js
  // (runSimulationWithRuntime), au premier composant ARDUINO effectivement
  // rencontré — App.jsx n'importe ni RuntimeOrchestrator ni ArduinoSimulator.
  // useState (et non useRef) : sa valeur est lue pendant le rendu (passée en
  // prop JSX à CircuitProvider), ce qui est interdit pour un ref (règle
  // react-hooks/refs) ; l'initialisation paresseuse garantit que `new Map()`
  // n'est construit qu'une seule fois, à l'instar de canvasRef ci-dessus pour
  // son propre objet.
  const [arduinoRuntime] = useState(() => new Map());

  return (
    <CircuitProvider canvasRef={canvasRef} orchestrators={arduinoRuntime}>
      <AppShell />
    </CircuitProvider>
  );
}