import { useEffect } from "react"
import { useCircuit } from "../context/useCircuit.js"

/**
 * Hook pour la gestion des raccourcis clavier.
 * Gère :
 * - Enter : entrée en focus du composant sélectionné (MB-VIS-CANVAS-052)
 * - Escape : sortie du focus, puis annulation du marquee, du câblage, ou désélection
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
    // MB-VIS-CANVAS-052 : entrée/sortie du focus de composant (D3 du
    // Blueprint — « sélectionner un composant + Enter » / « Escape »).
    focusedComponentId,
    focusComponent,
    exitFocus,
} = useCircuit()

    useEffect(() => {
        const handleKeyDown = (e) => {
            // MB-VIS-CANVAS-052 : Enter — focalise le composant actuellement
            // sélectionné (sélection métier inchangée, le focus ne la
            // remplace pas — Blueprint G). No-op si la sélection active
            // n'est pas un composant (ex. un wire), ou depuis un champ de
            // saisie (même garde que Delete/Backspace ci-dessous).
            if (e.key === 'Enter') {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return
                }
                if (activeItem?.type === 'component') {
                    focusComponent(activeItem.id)
                    e.preventDefault()
                }
                return
            }

            // Échap : priorité à la sortie du focus (MB-VIS-CANVAS-052),
            // puis au marquee, comportement 049 inchangé pour le reste.
            if (e.key === 'Escape') {
                if (focusedComponentId) {
                    exitFocus()
                    e.preventDefault()
                    return
                }

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
   }, [
    cancelMarquee,
    isWiringActive,
    cancelWiring,
    activeItem,
    clearSelection,
    deleteSelection,
    canUndo,
    canRedo,
    undo,
    focusedComponentId,
    focusComponent,
    exitFocus,
    redo,
])
}