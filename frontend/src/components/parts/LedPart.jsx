/**
 * Rendu visuel LED — couleur selon simulation.
 */
export function LedPart({ isOn }) {
  return (
    <div
      className={`part-led ${isOn ? "part-led--on" : ""}`}
      aria-label={isOn ? "LED allumée" : "LED éteinte"}
    >
      <span className="part-led__bulb">💡</span>
    </div>
  )
}
