export function LatchingButtonPart({
  state,
  onPointerDown,
  onClick,
}) {
  const isOn = state === "on"

  return (
    <div
      className={`part-latching-button${isOn ? " is-on" : ""}`}
      onPointerDown={onPointerDown}
      onClick={onClick}
      style={{
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div className="part-latching-button__cap" />
    </div>
  )
}
