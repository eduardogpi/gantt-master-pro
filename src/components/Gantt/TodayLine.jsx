import React from 'react';
import dayjs from 'dayjs';
import { calculateLeft } from '../../utils/ganttUtils.js';

const TodayLine = ({ zoomLevel, startDate }) => {
    if (!startDate) return null;
    const left = calculateLeft(dayjs(), zoomLevel, startDate);
    return (
        <div
            className="absolute top-0 h-full border-l border-red-500 z-20 pointer-events-none"
            style={{ left }}
            title={`Hoje: ${dayjs().format('DD/MM/YYYY')}`}
        >
            <div className="absolute -top-1 -left-[3px] w-[7px] h-[7px] bg-red-500 rounded-full shadow-sm" />
            <div className="absolute top-2 left-1 text-[9px] bg-red-100 text-red-600 px-1 rounded border border-red-200 whitespace-nowrap opacity-80">
                Hoje
            </div>
        </div>
    );
};

export default TodayLine;
