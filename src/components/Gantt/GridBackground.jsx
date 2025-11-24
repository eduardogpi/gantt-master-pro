import React from 'react';

const GridBackground = ({ zoomLevel, startDate, totalMonths }) => {
    if (!startDate) return null;

    return (
        <div className="absolute top-0 left-0 w-full h-full flex pointer-events-none">
            {Array.from({ length: totalMonths }).map((_, i) => {
                const monthStart = startDate.add(i, 'month');
                const daysInMonth = monthStart.daysInMonth();

                if (zoomLevel >= 40) {
                    return (
                        <div key={i} className="flex" style={{ width: daysInMonth * zoomLevel }}>
                            {Array.from({ length: daysInMonth }).map((_, d) => (
                                <div key={d} className="border-l border-dashed border-slate-100 dark:border-slate-800 h-full transition-colors duration-300" style={{ width: zoomLevel }} />
                            ))}
                        </div>
                    );
                } else if (zoomLevel >= 15) {
                    return (
                        <div key={i} className="flex" style={{ width: daysInMonth * zoomLevel }}>
                            {Array.from({ length: Math.ceil(daysInMonth / 7) }).map((_, w) => {
                                const wWidth = (w === Math.ceil(daysInMonth / 7) - 1) ? (daysInMonth - (w * 7)) * zoomLevel : 7 * zoomLevel;
                                return <div key={w} className="border-l border-dashed border-slate-200 dark:border-slate-800 h-full transition-colors duration-300" style={{ width: wWidth }} />;
                            })}
                        </div>
                    );
                } else {
                    return <div key={i} className="border-l border-dashed border-slate-300 dark:border-slate-700 h-full transition-colors duration-300" style={{ width: daysInMonth * zoomLevel }} />;
                }
            })}
        </div>
    );
};

export default GridBackground;
