import { useState } from "react"
import "./Pin.css"

/**
 * Pin cliquable avec hover — ne déclenche pas le drag du composant parent.
 */
export function Pin({
  pinId,
  label,
  left,
  top,
  isPending,
  isConnected,
  onPinClick,
}) {
  const [hover, setHover] = useState(false)

  const handleMouseDown = (e) => {
    e.stopPropagation()
  }

  const handleClick = (e) => {
    e.stopPropagation()
    onPinClick(pinId)
  }

  return (
    <button
      type="button"
      className={[
        "myblab-pin",
        hover && "myblab-pin--hover",
        isPending && "myblab-pin--pending",
        isConnected && "myblab-pin--connected",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: Number.isFinite(left) ? left : 0,
        top: Number.isFinite(top) ? top : 0,
      }}
      title={label ?? pinId}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={label ?? pinId}
    />
  )
}
