import React from 'react';
import { calculateTop, calculateLeft, calculateWidth } from '../../utils/ganttUtils.js';
import { ROW_HEIGHT } from '../../constants/config.js';

const DependencyLines = ({ items, pixelsPerDay, startDate }) => {
    if (!startDate) return null;

    return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" className="fill-slate-300 dark:fill-slate-600 transition-colors duration-300" />
                </marker>
            </defs>
            {items.map((item, index) => {
                if (!item.dependencies || item.dependencies.length === 0) return null;

                const destY = calculateTop(index) + (ROW_HEIGHT / 2);
                const destX = calculateLeft(item.startDate, pixelsPerDay, startDate);

                return item.dependencies.map(depId => {
                    const depIndex = items.findIndex(i => i.id === depId);
                    if (depIndex === -1) return null;

                    const depItem = items[depIndex];
                    const sourceY = calculateTop(depIndex) + (ROW_HEIGHT / 2);

                    // Ajuste: Usar a largura visual calculada para o ponto de partida (sourceX)
                    const sourceWidth = calculateWidth(depItem.startDate, depItem.finalDate, pixelsPerDay);
                    const sourceX = calculateLeft(depItem.startDate, pixelsPerDay, startDate) + sourceWidth;

                    const controlGap = 40;
                    const controlX1 = sourceX + controlGap;
                    const controlX2 = destX - controlGap;

                    return (
                        <path
                            key={`${depId}-${item.id}`}
                            d={`M ${sourceX} ${sourceY} C ${controlX1} ${sourceY}, ${controlX2} ${destY}, ${destX} ${destY}`}
                            className="stroke-slate-300 dark:stroke-slate-600 transition-colors duration-300"
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                            strokeDasharray="6,4"
                        />
                    );
                });
            })}
        </svg>
    );
};

export default DependencyLines;
