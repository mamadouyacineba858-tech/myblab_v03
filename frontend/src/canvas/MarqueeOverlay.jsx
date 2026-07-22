import "./MarqueeOverlay.css"

/**
 * Affiche le rectangle de sélection pendant un marquee.
 * Composant purement visuel, sans logique métier.
 * 
 * @param {Object} props
 * @param {Object} props.rect - { start: {x, y}, current: {x, y} } ou null
 */
export function MarqueeOverlay({ rect }) {
    if (!rect) return null
    
    const { start, current } = rect
    if (!start || !current) return null
    
    const x = Math.min(start.x, current.x)
    const y = Math.min(start.y, current.y)
    const width = Math.abs(current.x - start.x)
    const height = Math.abs(current.y - start.y)
    
    // Ne pas afficher si le rectangle est trop petit
    if (width < 2 && height < 2) return null
    
    return (
        <div 
            className="marquee-overlay"
            style={{
                left: x,
                top: y,
                width: width,
                height: height,
            }}
        />
    )
}