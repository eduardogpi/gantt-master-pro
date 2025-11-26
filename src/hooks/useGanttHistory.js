import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar histórico de Undo/Redo do Gantt
 * @param {any} initialData - Estado inicial dos dados
 * @returns {Object} - { data, setData, updateDataWithHistory, undo, redo, canUndo, canRedo }
 */
export function useGanttHistory(initialData) {
    const [data, setData] = useState(initialData);
    const [history, setHistory] = useState({
        past: [],
        present: initialData,
        future: []
    });

    /**
     * Atualiza os dados mantendo o histórico para undo/redo
     */
    const updateDataWithHistory = useCallback((newData) => {
        setHistory(curr => ({
            past: [...curr.past, curr.present],
            present: newData,
            future: []
        }));
        setData(newData);
    }, []);

    /**
     * Desfaz a última alteração
     */
    const undo = useCallback(() => {
        if (history.past.length === 0) return;
        
        const previous = history.past[history.past.length - 1];
        const newPast = history.past.slice(0, -1);
        
        setHistory({
            past: newPast,
            present: previous,
            future: [history.present, ...history.future]
        });
        setData(previous);
    }, [history]);

    /**
     * Refaz a última alteração desfeita
     */
    const redo = useCallback(() => {
        if (history.future.length === 0) return;
        
        const next = history.future[0];
        const newFuture = history.future.slice(1);
        
        setHistory({
            past: [...history.past, history.present],
            present: next,
            future: newFuture
        });
        setData(next);
    }, [history]);

    /**
     * Reseta o histórico com novos dados (usado ao salvar)
     */
    const resetHistory = useCallback((newData) => {
        setHistory({
            past: [],
            present: newData,
            future: []
        });
        setData(newData);
    }, []);

    return {
        data,
        setData,
        updateDataWithHistory,
        undo,
        redo,
        resetHistory,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0
    };
}

export default useGanttHistory;
