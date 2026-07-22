import { useRef } from "react";
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

  return (
    <CircuitProvider canvasRef={canvasRef}>
      <AppShell />
    </CircuitProvider>
  );
}