import { HEADER_HEIGHT, ROW_HEIGHT } from '../constants/config.js';

/**
 * Função auxiliar para extrair todas as datas recursivamente
 */
export const getAllDates = (items) => {
    let dates = [];
    items.forEach(item => {
        dates.push(item.startDate, item.finalDate);
        if (item.children && item.children.length > 0) {
            dates = [...dates, ...getAllDates(item.children)];
        }
    });
    return dates;
};

/**
 * Calcula a posição horizontal (left) baseada na data.
 * @param {dayjs.Dayjs} date - Data a ser convertida.
 * @param {number} pixelsPerDay - Nível de zoom (pixels por dia).
 * @param {dayjs.Dayjs} baseDate - Data inicial do gráfico.
 */
export function calculateLeft(date, pixelsPerDay, baseDate) {
    if (!baseDate) return 0;
    const diffDays = date.diff(baseDate, 'day');
    return diffDays * pixelsPerDay;
}

/**
 * Calcula a largura de um elemento baseado na duração.
 * @param {dayjs.Dayjs} startDate - Data de início.
 * @param {dayjs.Dayjs} finalDate - Data de fim.
 * @param {number} pixelsPerDay - Nível de zoom.
 */
export function calculateWidth(startDate, finalDate, pixelsPerDay) {
    const diffDays = finalDate.diff(startDate, 'day');
    return Math.max(diffDays * pixelsPerDay, 40);
}

/**
 * Calcula a posição vertical (top) baseada no índice da linha.
 * @param {number} index - Índice do item na lista.
 */
export function calculateTop(index) {
    return HEADER_HEIGHT + (index * ROW_HEIGHT);
}

/**
 * Identifica IDs de ações que possuem conflitos de agendamento (mesmo desenvolvedor em múltiplas ações).
 * @param {Array} items - Lista de ações.
 * @param {number} limit - Limite de concorrência permitido.
 */
export function getConflictedIds(items, limit) {
    const conflicts = new Set();
    const devMap = {};
    items.forEach(item => {
        item.developers.forEach(dev => {
            if (!devMap[dev.name]) devMap[dev.name] = [];
            devMap[dev.name].push({ id: item.id, start: item.startDate, end: item.finalDate });
        });
    });
    Object.keys(devMap).forEach(devName => {
        const assignments = devMap[devName];
        for (let i = 0; i < assignments.length; i++) {
            let currentOverlaps = 1;
            for (let j = 0; j < assignments.length; j++) {
                if (i === j) continue;
                const a = assignments[i];
                const b = assignments[j];
                const overlap = (a.start.isBefore(b.end) || a.start.isSame(b.end)) &&
                    (a.end.isAfter(b.start) || a.end.isSame(b.start));
                if (overlap) currentOverlaps++;
            }
            if (currentOverlaps > limit) conflicts.add(assignments[i].id);
        }
    });
    return conflicts;
}

/**
 * Encontra a data mais antiga entre as tarefas filhas (âncora).
 * @param {Array} items - Lista de tarefas filhas.
 */
export function findEarliestAnchor(items) {
    let anchor = null;
    const traverse = (nodeList) => {
        if (!nodeList) return;
        nodeList.forEach(item => {
            const isAnchor = item.status === 'concluded' || item.status === 'in_progress';
            if (isAnchor) {
                if (!anchor || item.startDate.isBefore(anchor.date)) {
                    anchor = { date: item.startDate, name: item.actionName };
                }
            }
            if (item.children) traverse(item.children);
        });
    };
    traverse(items);
    return anchor;
}

/**
 * Aplica um deslocamento de dias recursivamente a todas as tarefas filhas.
 * @param {Array} children - Lista de tarefas filhas.
 * @param {number} diffDays - Dias a adicionar.
 */
export function applyDeltaToChildren(children, diffDays) {
    if (!children) return [];
    return children.map(child => ({
        ...child,
        startDate: child.startDate.add(diffDays, 'day'),
        finalDate: child.finalDate.add(diffDays, 'day'),
        children: applyDeltaToChildren(child.children, diffDays)
    }));
}

/**
 * Modificador do dnd-kit para restringir movimento ao eixo vertical.
 */
export const restrictToVerticalAxis = ({ transform }) => ({
    ...transform,
    x: 0,
});

/**
 * Modificador do dnd-kit para restringir movimento ao eixo horizontal.
 */
export const restrictToHorizontalAxis = ({ transform }) => ({
    ...transform,
    y: 0,
});
