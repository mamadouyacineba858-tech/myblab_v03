import { createContext } from "react"

export const CircuitContext = createContext(null)

// MB-VIS-CANVAS-051 : second contexte, réservé au state haute fréquence
// (viewport, aperçus de drag/pan/marquee/breadboard — voir CircuitContext.jsx
// pour la répartition exacte). Séparé de CircuitContext ci-dessus afin qu'une
// mise à jour haute fréquence n'invalide QUE les consommateurs qui en ont
// réellement besoin (SimulationCanvas.jsx, WiresLayer.jsx pour `viewport`),
// jamais les consommateurs du state stable (CircuitComponent.jsx, Sidebar.jsx,
// Navbar.jsx, StatusBar.jsx, etc.) qui continuent de lire exclusivement
// CircuitContext.
export const CircuitInteractionContext = createContext(null)