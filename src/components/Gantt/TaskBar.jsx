import React from 'react';
import dayjs from 'dayjs';
import { Tooltip } from 'antd';
import { calculateWidth } from '../../utils/ganttUtils.js';

const TaskBar = ({ item, width, isCritical, isConflicted, showBaseline, baseLeft, baseWidth, rank, zoomLevel, allData = [] }) => {
    let bgClass = "bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700";
    let progressClass = "bg-blue-500";
    let textClass = "text-slate-700 dark:text-slate-200";
    let borderClass = "border-blue-200 dark:border-blue-700";

    // Estilo distinto para sub-tarefas (Módulos)
    const isSubTask = item.depth > 0;
    const barHeight = isSubTask ? 28 : 36;
    const fontSize = isSubTask ? "text-[10px]" : "text-xs";

    if (isCritical) {
        bgClass = "bg-red-50 dark:bg-red-900/30";
        borderClass = "border-red-300 dark:border-red-800";
        progressClass = "bg-red-500";
        textClass = "text-red-800 dark:text-red-200";
    } else if (isConflicted) {
        bgClass = "bg-orange-50 dark:bg-orange-900/30";
        borderClass = "border-orange-300 dark:border-orange-800";
        progressClass = "bg-orange-500";
        textClass = "text-orange-800 dark:text-orange-200";
    } else if (item.percent === 100) {
        bgClass = "bg-green-50 dark:bg-green-900/30";
        borderClass = "border-green-300 dark:border-green-800";
        progressClass = "bg-green-500";
        textClass = "text-green-800 dark:text-green-200";
    } else if (isSubTask) {
        // Estilo específico para módulos/sub-tarefas normais
        bgClass = "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800";
        progressClass = "bg-indigo-500";
        borderClass = "border-indigo-200 dark:border-indigo-700";
    }

    const impactDays = item.impacts?.reduce((acc, curr) => acc + curr.days, 0) || 0;
    const hasImpact = impactDays > 0;

    const impactWidth = impactDays * zoomLevel;
    const safeWidth = Math.max(0, width - impactWidth);

    const lastImpactReason = hasImpact ? item.impacts[item.impacts.length - 1].reason : '';
    const looseTasks = item.children?.filter(c => c.status === 'loose-task') || [];

    // Lógica de Dependência (Waiting Bar)
    const waitingBars = item.dependencies?.map(depId => {
        // Busca recursiva em allData para encontrar o pai, pois pode ser uma sub-tarefa
        const findItem = (list, id) => {
            for (let i of list) {
                if (i.id === id) return i;
                if (i.children) {
                    const found = findItem(i.children, id);
                    if (found) return found;
                }
            }
            return null;
        };

        const parent = findItem(allData, depId);
        if (!parent) return null;

        if (item.startDate.isAfter(parent.finalDate)) {
            const gapDays = item.startDate.diff(parent.finalDate, 'day');
            if (gapDays <= 0) return null;

            const gapWidth = gapDays * zoomLevel;

            return (
                <Tooltip key={depId} title={
                    <div className="text-center">
                        <div className="font-bold text-amber-500">Aguardando Dependência</div>
                        <div>{parent.actionName}</div>
                        <div className="text-xs opacity-75">({parent.developers.map(d => d.name).join(', ')})</div>
                        <div className="text-xs mt-1">{gapDays} dias de espera</div>
                    </div>
                }>
                    <div
                        className="absolute h-[16px] top-[10px] border-y border-l border-dashed border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-800/50 z-0 flex items-center justify-center"
                        style={{
                            left: -gapWidth,
                            width: gapWidth,
                            borderRight: 'none',
                            backgroundImage: 'linear-gradient(45deg, #00000005 25%, transparent 25%, transparent 50%, #00000005 50%, #00000005 75%, transparent 75%, transparent)'
                        }}
                    >
                        <div className="text-[8px] text-slate-400 uppercase tracking-widest w-full text-center truncate px-1">
                            Aguardando...
                        </div>
                    </div>
                </Tooltip>
            );
        }
        return null;
    });

    return (
        <div className="relative w-full h-full flex items-center">
            {/* Renderizar Waiting Bars (Dependências) */}
            {waitingBars}

            {showBaseline && (
                <div
                    className={`absolute border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-full opacity-40 box-border`}
                    style={{
                        left: baseLeft !== undefined ? baseLeft : 0,
                        width: baseWidth !== undefined ? baseWidth : width,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: barHeight - 4,
                        zIndex: -1
                    }}
                />
            )}

            <div className={`relative flex items-center shadow-sm hover:shadow-md transition-shadow rounded-full overflow-visible`} style={{ height: barHeight }}>
                <div
                    className={`
                        relative h-full flex items-center px-2 cursor-grab active:cursor-grabbing transition-all overflow-visible
                        ${bgClass} ${borderClass} border-y border-l 
                        ${hasImpact ? 'rounded-l-full border-r-0' : 'rounded-full border-r'}
                    `}
                    style={{ width: safeWidth }}
                >
                    <div className={`absolute top-0 left-0 w-full h-full overflow-hidden ${hasImpact ? 'rounded-l-full' : 'rounded-full'}`}>
                        <div className={`absolute top-0 left-0 h-full ${progressClass} opacity-10 transition-all`} style={{ width: `${item.percent}%` }} />
                        <div className={`absolute bottom-0 left-0 h-[3px] ${progressClass} transition-all`} style={{ width: `${item.percent}%` }} />
                    </div>
                </div>

                {hasImpact && (
                    <Tooltip title={
                        <div className="text-center">
                            <div className="font-bold">Atraso: +{impactDays} dias</div>
                            <div>Motivo: {lastImpactReason}</div>
                        </div>
                    }>
                        <div
                            className="h-full flex items-center justify-center px-2 cursor-help border-y border-r border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/50 rounded-r-full relative overflow-hidden z-0"
                            style={{
                                width: impactWidth,
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,0,0,0.05) 5px, rgba(255,0,0,0.05) 10px)'
                            }}
                        >
                            <div className="flex flex-col items-center justify-center leading-none overflow-hidden w-full z-0 opacity-50">
                                <span className="text-[8px] text-red-400 font-bold uppercase tracking-tighter truncate w-full text-center">ATRASO</span>
                                <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">+{impactDays}d</span>
                            </div>
                        </div>
                    </Tooltip>
                )}

                {/* Content Overlay (Text & Rank) */}
                <div className="absolute top-0 left-0 w-full h-full flex items-center px-2 pointer-events-none z-50">
                    <div className={`flex-shrink-0 mr-2 ${isSubTask ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'} bg-slate-800 dark:bg-slate-950 text-white rounded-full flex items-center justify-center font-bold shadow-sm`}>
                        #{rank}
                    </div>

                    <div className="flex flex-col justify-center leading-none overflow-hidden flex-1">
                        <span className={`${fontSize} font-bold truncate ${textClass} select-none`}>{item.actionName}</span>
                        {!hasImpact && !isSubTask && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                {dayjs(item.startDate).format("DD/MM")} - {dayjs(item.finalDate).format("DD/MM")}
                            </span>
                        )}
                    </div>
                </div>

                {looseTasks.map((task) => {
                    const relativeStartDays = task.startDate.diff(item.startDate, 'day');
                    const taskLeft = relativeStartDays * zoomLevel;
                    const taskWidth = calculateWidth(task.startDate, task.finalDate, zoomLevel);
                    const isImpactTask = task.mode === 'impact';
                    const taskColor = isImpactTask ? 'bg-red-500' : 'bg-amber-400';
                    const taskBorder = isImpactTask ? 'border-red-700' : 'border-amber-600';

                    return (
                        <Tooltip title={`${task.actionName} (${task.responsible})`} key={task.id}>
                            <div
                                className={`absolute h-[10px] top-[${isSubTask ? '20px' : '26px'}] rounded-full border ${taskColor} ${taskBorder} shadow-sm z-30 cursor-help hover:scale-110 transition-transform`}
                                style={{ left: taskLeft, width: taskWidth, minWidth: 8 }}
                            />
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
};

export default TaskBar;
