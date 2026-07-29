export function ButtonPart({ 
  state, 
  onPointerDown, 
  onPointerUp, 
  onPointerCancel, 
  onLostPointerCapture, 
  onMouseDown 
}) {
  const isPressed = state === "pressed"

  return (
    <div 
      className={`part-button${isPressed ? " part-button--pressed" : ""}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      onMouseDown={onMouseDown}
      style={{
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div className="part-button__cap" />
    </div>
  )
}