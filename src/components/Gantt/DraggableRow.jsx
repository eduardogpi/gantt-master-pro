import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Popover, Tag, Button } from 'antd';
import { ThunderboltOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { calculateTop, calculateLeft, calculateWidth } from '../../utils/ganttUtils.js';
import { ROW_HEIGHT, MOBILE_ROW_HEIGHT } from '../../constants/config.js';
import TaskBar from './TaskBar.jsx';

const DraggableRow = React.memo(({ item, index, zoomLevel, showBaseline, isConflicted, onEdit, onDelete, onAddLooseTask, globalRank, interactionMode, allData, startDate, onTaskClick, isMobile = false }) => {
    const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({ id: item.id });
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: item.id,
        disabled: interactionMode !== 'vertical'
    });

    const rowHeight = isMobile ? MOBILE_ROW_HEIGHT : ROW_HEIGHT;

    const top = calculateTop(index, isMobile);
    const left = calculateLeft(item.startDate, zoomLevel, startDate);
    const width = calculateWidth(item.startDate, item.finalDate, zoomLevel);

    const baseLeft = calculateLeft(item.originalStartDate, zoomLevel, startDate);
    const baseWidth = calculateWidth(item.originalStartDate, item.originalFinalDate, zoomLevel);

    const isCritical = item.dependencies.length > 0 || item.finalDate.isAfter(item.originalFinalDate);
    const cursorClass = isMobile ? 'cursor-pointer' : (interactionMode === 'horizontal' ? 'cursor-ew-resize' : 'cursor-ns-resize');
    const rowStyle = isOver && interactionMode === 'vertical' ? 'bg-blue-50 border-blue-300 z-10' : '';

    const [popoverOpen, setPopoverOpen] = React.useState(false);
    const longPressTimer = React.useRef(null);
    const isLongPress = React.useRef(false);
    const touchStartTime = React.useRef(0);

    const handleContextMenu = (e) => {
        e.preventDefault();
        setPopoverOpen(true);
    };

    const handleTouchStart = () => {
        isLongPress.current = false;
        touchStartTime.current = Date.now();
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            setPopoverOpen(false); // Fechar popover se estiver aberto
            if (onTaskClick) onTaskClick(item); // Long press -> Modal
        }, 500); // 500ms for long press
    };

    const handleTouchEnd = (e) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
        
        // Só abre popover se foi um tap rápido (não long press)
        if (!isLongPress.current && Date.now() - touchStartTime.current < 500) {
            e.preventDefault();
            e.stopPropagation();
            setPopoverOpen(prev => !prev);
        }
        
        // Reset
        isLongPress.current = false;
    };

    const handleTouchMove = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            isLongPress.current = false; // Cancel long press on move
        }
    };

    const handleClick = (e) => {
        // No mobile, o clique é tratado pelos eventos de touch
        if (isMobile) {
            return;
        }
        
        // Desktop: clique simples abre o modal
        if (onTaskClick) onTaskClick(item);
    };

    return (
        <div
            ref={setDroppableRef}
            style={{ position: 'absolute', top, left: 0, width: '100%', height: rowHeight, transition: isDragging ? 'none' : 'top 0.3s ease' }}
            className={`group flex items-center border-b border-slate-100 dark:border-slate-800 transition-colors ${rowStyle}`}
            onDoubleClick={() => !isMobile && onEdit(item)}
        >
            {/* Indicador de Hierarquia (Linha em L ao lado da ação) */}
            {item.depth > 0 && (() => {
                const parentLeft = item.parentStart ? calculateLeft(item.parentStart, zoomLevel, startDate) : (left - 20);
                const lineLeft = item.parentStart ? parentLeft + 20 : left - 20;
                const lineWidth = Math.max(20, left - lineLeft);
                return (
                    <div
                        className="absolute border-l-2 border-b-2 border-slate-300 dark:border-slate-600 rounded-bl-md opacity-50"
                        style={{
                            left: lineLeft,
                            top: -20,
                            width: lineWidth,
                            height: 50,
                            zIndex: 0
                        }}
                    />
                );
            })()}

            {showBaseline && (
                <div
                    className="absolute h-[36px] border-2 border-dashed border-slate-300 rounded-full opacity-30 pointer-events-none"
                    style={{ left: baseLeft, width: baseWidth, top: '50%', transform: 'translateY(-50%)' }}
                />
            )}

            <div
                ref={setDraggableRef}
                {...listeners}
                {...attributes}
                style={{ position: 'absolute', left: left, width: width, opacity: isDragging ? 0 : 1, zIndex: 10 }}
                className={cursorClass}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
            >
                <Popover
                    open={popoverOpen}
                    onOpenChange={(open) => {
                        // No mobile, só permitir fechar pelo onOpenChange (clicar fora)
                        // Abrir é controlado manualmente pelos touch handlers
                        if (isMobile && open) return;
                        setPopoverOpen(open);
                    }}
                    content={
                        <div className="text-xs w-56">
                            <div className="flex justify-between items-center border-b pb-1 mb-1 dark:border-slate-700">
                                <span className="font-bold text-sm truncate max-w-[120px] dark:text-slate-200">{item.actionName}</span>
                                <Tag color="blue">#{globalRank}</Tag>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 my-2">
                                <div>Início: <span className="text-black dark:text-slate-200">{item.startDate.format('DD/MM')}</span></div>
                                <div>Fim: <span className="text-black dark:text-slate-200">{item.finalDate.format('DD/MM')}</span></div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <Button size="small" block icon={<ThunderboltOutlined />} className="text-orange-700 border-orange-300 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400" onClick={() => { setPopoverOpen(false); onAddLooseTask(item); }}>
                                    Adicionar Tarefa Avulsa
                                </Button>
                                <div className="flex gap-2">
                                    <Button size="small" block icon={<EditOutlined />} onClick={() => { setPopoverOpen(false); onEdit(item); }}>Editar</Button>
                                    <Button size="small" block danger icon={<DeleteOutlined />} onClick={() => { setPopoverOpen(false); onDelete(item.id); }}>Excluir</Button>
                                </div>
                            </div>
                        </div>
                    } title={null} trigger={isMobile ? [] : "click"}>
                    <div>
                        <TaskBar
                            item={item}
                            width={width}
                            isDragging={isDragging}
                            isCritical={isCritical}
                            isConflicted={isConflicted}
                            showBaseline={false}
                            rank={globalRank}
                            zoomLevel={zoomLevel}
                            allData={allData}
                            isMobile={isMobile}
                        />
                    </div>
                </Popover>
            </div>
        </div>
    );
});

export default DraggableRow;
