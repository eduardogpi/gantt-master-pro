import React from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const TimelineHeader = ({ zoomLevel, startDate, totalMonths }) => {
    if (!startDate) return null;

    return (
        <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm select-none transition-colors duration-300">
            <div className="relative h-[50px] flex">
                {Array.from({ length: totalMonths }).map((_, i) => {
                    const monthStart = startDate.add(i, 'month');
                    const daysInMonth = monthStart.daysInMonth();
                    const monthWidth = daysInMonth * zoomLevel;

                    return (
                        <div
                            key={i}
                            className="border-r border-slate-200 dark:border-slate-700 box-border flex flex-col transition-colors duration-300"
                            style={{ width: monthWidth, minWidth: monthWidth }}
                        >
                            {/* Linha Superior: Nome do Mês */}
                            <div className="h-[25px] flex items-center justify-center bg-slate-50 dark:bg-slate-700 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 uppercase border-b border-slate-100 dark:border-slate-600 transition-colors duration-300">
                                {monthStart.format('MMMM YYYY')}
                            </div>

                            {/* Linha Inferior: Granularidade (Dias ou Semanas) */}
                            <div className="h-[25px] flex bg-white dark:bg-slate-800 transition-colors duration-300">
                                {zoomLevel >= 40 ? (
                                    // MODO DIAS: 1, 2, 3...
                                    Array.from({ length: daysInMonth }).map((_, d) => (
                                        <div
                                            key={d}
                                            className="flex items-center justify-center border-r border-slate-100 dark:border-slate-700 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 transition-colors duration-300"
                                            style={{ width: zoomLevel, minWidth: zoomLevel }}
                                        >
                                            {d + 1}
                                        </div>
                                    ))
                                ) : zoomLevel >= 15 ? (
                                    // MODO SEMANAS: S1, S2...
                                    Array.from({ length: Math.ceil(daysInMonth / 7) }).map((_, w) => {
                                        const weekWidth = (w === Math.ceil(daysInMonth / 7) - 1)
                                            ? (daysInMonth - (w * 7)) * zoomLevel
                                            : 7 * zoomLevel;

                                        return (
                                            <div
                                                key={w}
                                                className="flex items-center justify-center border-r border-slate-100 dark:border-slate-700 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-700/50 transition-colors duration-300"
                                                style={{ width: weekWidth, minWidth: weekWidth }}
                                            >
                                                S{w + 1}
                                            </div>
                                        );
                                    })
                                ) : (
                                    // MODO MÊS (Limpo)
                                    <div className="w-full h-full"></div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TimelineHeader;
