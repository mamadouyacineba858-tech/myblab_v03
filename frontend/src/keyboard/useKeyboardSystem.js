import { useEffect } from "react"
import { useCircuit } from "../context/CircuitContext.jsx"

/**
 * Hook pour la gestion des raccourcis clavier.
 * Gère :
 * - Escape : annulation du marquee, du câblage, ou désélection
 * - Delete : suppression de la sélection (si implémenté)
 */
export function useKeyboardSystem() {
    const {
    cancelMarquee,
    clearSelection,
    activeItem,
    isWiringActive,
    cancelWiring,
    deleteSelection,
    undo,
    redo,
    canUndo,
    canRedo,
} = useCircuit()

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Échap : priorité au marquee
            if (e.key === 'Escape') {
                const marqueeCancelled = cancelMarquee()
                if (marqueeCancelled) {
                    e.preventDefault()
                    return
                }
                
                // Si pas de marquee, comportement existant
                if (isWiringActive) {
                    cancelWiring()
                    e.preventDefault()
                    return
                }
                
                if (activeItem) {
                    clearSelection()
                    e.preventDefault()
                    return
                }
                
                return
            }
// Ctrl+Z / Cmd+Z : Undo
if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    if (canUndo()) {
        undo()
    }
    e.preventDefault()
    return
}

// Ctrl+Y ou Ctrl+Shift+Z / Cmd+Shift+Z : Redo
if (
    ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
    ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
) {
    if (canRedo()) {
        redo()
    }
    e.preventDefault()
    return
}
            // Delete / Backspace : supprimer la sélection
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Ne pas supprimer si le marquee est actif
                const marqueeCancelled = cancelMarquee()
                if (marqueeCancelled) {
                    e.preventDefault()
                    return
                }
                
                // Ne pas supprimer si le câblage est actif
                if (isWiringActive) {
                    return
                }
                
                // Si on est dans un input, ne pas supprimer
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return
                }
                
                deleteSelection()
                e.preventDefault()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [cancelMarquee, isWiringActive, cancelWiring, activeItem, clearSelection, deleteSelection])
}