export function RgbLedPart({ r, g, b }) {
  const isR = r === true
  const isG = g === true
  const isB = b === true

  const baseDotStyle = {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    display: "inline-block",
    transition: "background 0.15s ease, box-shadow 0.15s ease",
  }

  const rStyle = {
    ...baseDotStyle,
    background: isR ? "#ef4444" : "#4b1515",
    boxShadow: isR ? "0 0 8px rgba(239, 68, 68, 0.8)" : "none",
  }

  const gStyle = {
    ...baseDotStyle,
    background: isG ? "#22c55e" : "#0f3d1f",
    boxShadow: isG ? "0 0 8px rgba(34, 197, 94, 0.8)" : "none",
  }

  const bStyle = {
    ...baseDotStyle,
    background: isB ? "#3b82f6" : "#142547",
    boxShadow: isB ? "0 0 8px rgba(59, 130, 246, 0.8)" : "none",
  }

  return (
    <div className="part-rgb-led">
      <span
        className="part-rgb-led__dot part-rgb-led__dot--r"
        style={rStyle}
      />
      <span
        className="part-rgb-led__dot part-rgb-led__dot--g"
        style={gStyle}
      />
      <span
        className="part-rgb-led__dot part-rgb-led__dot--b"
        style={bStyle}
      />
    </div>
  )
}