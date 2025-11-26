import { useEffect, useCallback } from 'react';

/**
 * Hook para gerenciar atalhos de teclado do Gantt
 * @param {Object} handlers - Objeto com funções de callback para cada atalho
 * @param {Function} handlers.onUndo - Callback para Ctrl+Z
 * @param {Function} handlers.onRedo - Callback para Ctrl+Y ou Ctrl+Shift+Z
 * @param {Function} handlers.onSave - Callback para Ctrl+S
 * @param {Function} handlers.onNew - Callback para Ctrl+N
 * @param {Function} handlers.onDelete - Callback para Delete (quando item selecionado)
 * @param {boolean} enabled - Se os atalhos estão habilitados (desabilitar quando modal aberto)
 */
export function useKeyboardShortcuts(handlers, enabled = true) {
    const handleKeyDown = useCallback((event) => {
        if (!enabled) return;

        // Ignorar se estiver digitando em um input
        const tagName = event.target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || event.target.isContentEditable) {
            return;
        }

        const { ctrlKey, metaKey, shiftKey, key } = event;
        const isCtrl = ctrlKey || metaKey; // Suporte para Mac (Cmd)

        // Ctrl+Z - Undo
        if (isCtrl && key.toLowerCase() === 'z' && !shiftKey) {
            event.preventDefault();
            handlers.onUndo?.();
            return;
        }

        // Ctrl+Y ou Ctrl+Shift+Z - Redo
        if (isCtrl && (key.toLowerCase() === 'y' || (key.toLowerCase() === 'z' && shiftKey))) {
            event.preventDefault();
            handlers.onRedo?.();
            return;
        }

        // Ctrl+S - Save
        if (isCtrl && key.toLowerCase() === 's') {
            event.preventDefault();
            handlers.onSave?.();
            return;
        }

        // Ctrl+N - New Action
        if (isCtrl && key.toLowerCase() === 'n') {
            event.preventDefault();
            handlers.onNew?.();
            return;
        }

        // Delete - Delete selected item
        if (key === 'Delete' || key === 'Backspace') {
            // Só dispara se não estiver em um campo de texto
            handlers.onDelete?.();
            return;
        }

        // Escape - Close modals / Deselect
        if (key === 'Escape') {
            handlers.onEscape?.();
            return;
        }

    }, [handlers, enabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
