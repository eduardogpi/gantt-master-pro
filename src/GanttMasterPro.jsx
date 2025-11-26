//@ts-nocheck
"use client"
import React, { useState, useMemo, useEffect } from "react";
import { Layout, Typography, Button, Modal, Slider, Input, Tag, Popover, Form, Select, List, DatePicker, ConfigProvider, theme, message, Tooltip, Segmented, Switch } from "antd";
import ptBR from 'antd/locale/pt_BR';
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
import 'dayjs/locale/pt-br';
import {
    DndContext, useSensor, useSensors, PointerSensor, KeyboardSensor, DragOverlay
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
    UndoOutlined, RedoOutlined, WarningOutlined,
    CalendarOutlined, PlusOutlined,
    DeleteOutlined, EditOutlined,
    ZoomInOutlined, ZoomOutOutlined, SaveOutlined, DiffOutlined,
    ColumnHeightOutlined, ColumnWidthOutlined,
    ThunderboltOutlined, BlockOutlined, GlobalOutlined,
    MoonOutlined, SunOutlined, FileAddOutlined
} from "@ant-design/icons";

import { initialMockData } from './data/mockData.js';
import { HEADER_HEIGHT, ROW_HEIGHT } from './constants/config.js';
import {
    getAllDates, calculateLeft, calculateWidth, calculateTop,
    getConflictedIds, findEarliestAnchor, applyDeltaToChildren,
    restrictToVerticalAxis, restrictToHorizontalAxis
} from './utils/ganttUtils.js';

import TimelineHeader from './components/Gantt/TimelineHeader.jsx';
import GridBackground from './components/Gantt/GridBackground.jsx';
import ScrollControls from './components/Gantt/ScrollControls.jsx';
import TodayLine from './components/Gantt/TodayLine.jsx';
import DependencyLines from './components/Gantt/DependencyLines.jsx';
import TaskBar from './components/Gantt/TaskBar.jsx';
import DraggableRow from './components/Gantt/DraggableRow.jsx';
import TaskDetailsModal from './components/Modals/TaskDetailsModal.jsx';

dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.locale('pt-br');

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const GanttGeral = () => {
    // --- Estado de Dados ---
    const [data, setData] = useState(initialMockData); // Dados principais da ação
    const [lastSavedData, setLastSavedData] = useState(initialMockData); // Snapshot para comparação de alterações (Salvar)
    const [messageApi, contextHolder] = message.useMessage(); // API de mensagens do AntD

    // --- Estado de Visualização ---
    const [zoomLevel, setZoomLevel] = useState(20); // Nível de zoom (pixels por dia)
    const [concurrencyLimit] = useState(2); // Limite de tarefas simultâneas por dev (para detecção de conflito)
    const [showBaseline] = useState(true); // Mostrar linha de base (planejado vs realizado)
    const [showCriticalPath] = useState(false); // Destacar caminho crítico (não implementado visualmente ainda)
    const [selectedResponsible, setSelectedResponsible] = useState("Todos"); // Filtro por desenvolvedor
    const [interactionMode, setInteractionMode] = useState('horizontal'); // 'horizontal' (Cronograma) ou 'vertical' (Prioridade)
    const [darkMode, setDarkMode] = useState(true); // Tema escuro/claro
    const [showSubtasks, setShowSubtasks] = useState(true); // Mostrar subtarefas

    // --- Estado de Histórico (Undo/Redo) ---
    const [history, setHistory] = useState({ past: [], present: initialMockData, future: [] });

    // --- Estado de Interação ---
    const [activeId, setActiveId] = useState(null); // ID do item sendo arrastado

    // --- Estado de Modais ---
    const [modalAuditoria, setModalAuditoria] = useState({ visible: false, pendingData: null, reason: '', details: '' }); // Modal de justificativa de mudança
    const [modalEdit, setModalEdit] = useState({ visible: false, item: null }); // Modal de edição/criação de ação
    const [saveModalOpen, setSaveModalOpen] = useState(false); // Modal de resumo de alterações antes de salvar
    const [changesList, setChangesList] = useState([]); // Lista de alterações calculadas

    const [looseTaskModal, setLooseTaskModal] = useState({ visible: false, parentProject: null }); // Modal de nova tarefa avulsa
    const [newTaskModal, setNewTaskModal] = useState({ visible: false }); // Modal de nova tarefa vinculada
    const [selectedProjectForTask, setSelectedProjectForTask] = useState(null); // Estado auxiliar para o modal de nova tarefa
    const [conflictModal, setConflictModal] = useState({ visible: false, taskData: null, affectedProjects: [] }); // Modal de resolução de conflitos
    const [taskDetailsModal, setTaskDetailsModal] = useState({ visible: false, task: null }); // Modal de detalhes da tarefa
    const [welcomeModalVisible, setWelcomeModalVisible] = useState(false); // Modal de boas vindas

    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome_v1');
        if (!hasSeenWelcome) {
            setWelcomeModalVisible(true);
        }
    }, []);

    const handleCloseWelcome = () => {
        localStorage.setItem('hasSeenWelcome_v1', 'true');
        setWelcomeModalVisible(false);
    };

    // --- Cálculos Dinâmicos de Data ---
    const { startDate, totalMonths } = useMemo(() => {
        const allDates = getAllDates(data);
        if (allDates.length === 0) {
            return { startDate: dayjs().startOf('month'), totalMonths: 24 };
        }
        const minDate = allDates.reduce((min, d) => d.isBefore(min) ? d : min, dayjs().add(10, 'year'));
        const maxDate = allDates.reduce((max, d) => d.isAfter(max) ? d : max, dayjs().subtract(10, 'year'));

        const start = minDate.subtract(1, 'month').startOf('month');
        const months = Math.max(24, maxDate.diff(start, 'month') + 6);

        return { startDate: start, totalMonths: months };
    }, [data]);

    const conflictedIds = useMemo(() => getConflictedIds(data, concurrencyLimit), [data, concurrencyLimit]);

    const allResponsibles = useMemo(() => {
        const devs = new Set();
        const extractDevs = (list) => {
            list.forEach(item => {
                if (item.developers) {
                    item.developers.forEach(d => devs.add(d.name));
                }
                if (item.responsible) {
                    devs.add(item.responsible);
                }
                if (item.children) extractDevs(item.children);
            });
        };
        extractDevs(data);
        return Array.from(devs).sort();
    }, [data]);

    const visibleData = useMemo(() => {
        // Função recursiva para "achatar" a árvore de ações e tarefas para renderização
        const flattenData = (items, depth = 0, parentStart = null) => {
            let flatList = [];
            items.forEach(item => {
                // Verifica se deve ser exibido (filtro de responsável)
                // Se o pai não tem o dev, mas o filho tem, o pai deve aparecer? 
                // Simplificação: Se "Todos", mostra tudo. Se filtro ativo, mostra se o item OU algum filho tiver o dev.

                const hasDev = selectedResponsible === "Todos" ||
                    item.developers.some(d => d.name === selectedResponsible) ||
                    (item.children && item.children.some(c => c.developers && c.developers.some(d => d.name === selectedResponsible)));

                if (hasDev) {
                    // Adiciona o item atual com metadado de profundidade
                    flatList.push({ ...item, depth, parentStart });

                    // Processa filhos que NÃO são loose-tasks (são sub-tarefas estruturais)
                    if (showSubtasks && item.children && item.children.length > 0) {
                        const subTasks = item.children.filter(c => c.status !== 'loose-task');
                        if (subTasks.length > 0) {
                            flatList = [...flatList, ...flattenData(subTasks, depth + 1, item.startDate)];
                        }
                    }
                }
            });
            return flatList;
        };

        return flattenData(data);
    }, [data, selectedResponsible, showSubtasks]);

    const modifiers = useMemo(() => {
        if (interactionMode === 'vertical') return [restrictToVerticalAxis];
        return [restrictToHorizontalAxis];
    }, [interactionMode]);

    const contentHeight = useMemo(() => {
        return HEADER_HEIGHT + (visibleData.length * ROW_HEIGHT) + 100;
    }, [visibleData.length]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const updateDataWithHistory = (newData) => {
        setHistory(curr => ({
            past: [...curr.past, curr.present],
            present: newData,
            future: []
        }));
        setData(newData);
    };

    const handleUndo = () => {
        if (history.past.length === 0) return;
        const previous = history.past[history.past.length - 1];
        const newPast = history.past.slice(0, -1);
        setHistory({
            past: newPast,
            present: previous,
            future: [history.present, ...history.future]
        });
        setData(previous);
    };

    const handleRedo = () => {
        if (history.future.length === 0) return;
        const next = history.future[0];
        const newFuture = history.future.slice(1);
        setHistory({
            past: [...history.past, history.present],
            present: next,
            future: newFuture
        });
        setData(next);
    };

    const handleAddNew = () => {
        const newItem = {
            id: Date.now(),
            actionName: 'Nova Ação',
            originalStartDate: dayjs(),
            originalFinalDate: dayjs().add(15, 'day'),
            startDate: dayjs(),
            finalDate: dayjs().add(15, 'day'),
            developers: [{ name: 'Dev', role: 'Fullstack' }],
            percent: 0,
            dependencies: [],
            status: 'pending',
            impacts: [],
            children: []
        };
        setModalEdit({ visible: true, item: newItem, isNew: true });
    };

    const handleEditSave = (values) => {
        let newData = [...data];
        const newItem = {
            ...modalEdit.item,
            actionName: values.actionName,
            percent: values.percent,
            developers: values.developers ? values.developers.split(',').map(n => ({ name: n.trim(), role: 'Dev' })) : [],
        };

        if (modalEdit.isNew) {
            newData.push(newItem);
            message.success("Criado!");
        } else {
            const index = newData.findIndex(i => i.id === newItem.id);
            newData[index] = newItem;
            message.success("Atualizado!");
        }
        updateDataWithHistory(newData);
        setModalEdit({ visible: false, item: null });
    };

    const handleDelete = (id) => {
        Modal.confirm({
            title: 'Excluir?',
            onOk: () => {
                const newData = data.filter(i => i.id !== id);
                updateDataWithHistory(newData);
                message.success("Removido.");
            }
        });
    };

    const executeCreateTask = (taskData, mode, affectedProjects = []) => {
        const { taskName, taskStart, taskEnd, responsible, parentProjectId } = taskData;
        const taskDurationDays = taskEnd.diff(taskStart, 'day');

        const newTask = {
            id: Date.now(),
            actionName: taskName,
            startDate: taskStart,
            finalDate: taskEnd,
            status: 'loose-task',
            mode: mode,
            responsible: responsible
        };

        let newData = [...data];
        let affectedNames = [];

        // 1. Adicionar visualmente à ação onde foi clicado
        // Função auxiliar para encontrar e atualizar a ação pai recursivamente
        const updateParent = (items) => {
            return items.map(p => {
                if (p.id === parentProjectId) {
                    return { ...p, children: [...p.children, newTask] };
                }
                if (p.children && p.children.length > 0) {
                    return { ...p, children: updateParent(p.children) };
                }
                return p;
            });
        };
        newData = updateParent(newData);

        // 2. Aplicar impacto em TODAS as ações afetadas (e seus dependentes)
        if (mode === 'impact') {
            // Função recursiva para aplicar impacto e propagar dependências em cascata
            const applyImpactRecursive = (currentData, targetIds, deltaDays) => {
                let d = [...currentData];

                // 1. Estender prazo dos targetIds (Impacto direto - colisão de agenda)
                const extendTargets = (items) => {
                    return items.map(item => {
                        if (targetIds.includes(item.id)) {
                            const newFinalDate = item.finalDate.add(deltaDays, 'day');
                            const newImpacts = [...(item.impacts || []), { reason: `Impacto: ${taskName} (${responsible})`, days: deltaDays }];
                            affectedNames.push(item.actionName);

                            // --- NOVA LÓGICA: Impactar subtarefas internas ---
                            let newChildren = item.children;
                            if (newChildren && newChildren.length > 0) {
                                // Identificar subtarefas do responsável que colidem com o período da nova tarefa urgente
                                const directHitIds = new Set();
                                newChildren.forEach(child => {
                                    if (child.id === newTask.id) return; // Ignorar a própria tarefa urgente

                                    const hasDev = (child.developers && child.developers.some(d => d.name === responsible)) ||
                                        (child.responsible === responsible);

                                    const isCompleted = child.status === 'concluded' || child.percent === 100;

                                    // Colisão de datas
                                    const overlaps = taskStart.isBefore(child.finalDate) && taskEnd.isAfter(child.startDate);

                                    if (hasDev && overlaps && !isCompleted) {
                                        directHitIds.add(child.id);
                                    }
                                });

                                if (directHitIds.size > 0) {
                                    // Propagar para dependentes internos (dentro da mesma ação)
                                    const allAffectedChildIds = new Set(directHitIds);
                                    let queue = [...directHitIds];

                                    while (queue.length > 0) {
                                        const currentId = queue.shift();
                                        newChildren.forEach(c => {
                                            if (c.dependencies && c.dependencies.includes(currentId)) {
                                                const isDepCompleted = c.status === 'concluded' || c.percent === 100;
                                                if (!allAffectedChildIds.has(c.id) && !isDepCompleted) {
                                                    allAffectedChildIds.add(c.id);
                                                    queue.push(c.id);
                                                }
                                            }
                                        });
                                    }

                                    // Aplicar o deslocamento (deltaDays) nas subtarefas afetadas
                                    newChildren = newChildren.map(child => {
                                        if (allAffectedChildIds.has(child.id)) {
                                            return {
                                                ...child,
                                                startDate: child.startDate.add(deltaDays, 'day'),
                                                finalDate: child.finalDate.add(deltaDays, 'day')
                                            };
                                        }
                                        return child;
                                    });
                                }
                            }
                            // -------------------------------------------------

                            return { ...item, finalDate: newFinalDate, impacts: newImpacts, children: newChildren };
                        }
                        if (item.children) {
                            return { ...item, children: extendTargets(item.children) };
                        }
                        return item;
                    });
                };

                d = extendTargets(d);

                // 2. Propagar para dependentes (Cascata)
                // Quem depende dos iniciais (ou dos subsequentes) deve ser MOVIDO (Start e End), não apenas estendido.

                let processedIds = new Set(targetIds);
                let waveIds = [...targetIds];

                while (waveIds.length > 0) {
                    // Encontrar quem depende da onda atual (independente do desenvolvedor)
                    const findNextWave = (items) => {
                        let found = [];
                        items.forEach(item => {
                            // Se o item depende de alguém da onda atual
                            if (item.dependencies && item.dependencies.some(depId => waveIds.includes(depId))) {
                                if (!processedIds.has(item.id)) {
                                    found.push(item.id);
                                }
                            }
                            if (item.children) {
                                found = [...found, ...findNextWave(item.children)];
                            }
                        });
                        return found;
                    };

                    const nextWave = findNextWave(d);

                    if (nextWave.length === 0) break;

                    // Mover (Shift) a próxima onda
                    const shiftWave = (items) => {
                        return items.map(item => {
                            if (nextWave.includes(item.id)) {
                                const newStart = item.startDate.add(deltaDays, 'day');
                                const newEnd = item.finalDate.add(deltaDays, 'day');
                                // Helper global applyDeltaToChildren para mover sub-tarefas
                                const newChildren = applyDeltaToChildren(item.children, deltaDays);
                                return { ...item, startDate: newStart, finalDate: newEnd, children: newChildren };
                            }
                            if (item.children) {
                                return { ...item, children: shiftWave(item.children) };
                            }
                            return item;
                        });
                    };

                    d = shiftWave(d);

                    nextWave.forEach(id => processedIds.add(id));
                    waveIds = nextWave;
                }

                return d;
            };

            const affectedIds = affectedProjects.map(ap => ap.id);
            newData = applyImpactRecursive(newData, affectedIds, taskDurationDays);

            affectedNames = [...new Set(affectedNames)];
            if (affectedNames.length > 0) {
                message.warning(`Ações adiadas e dependências ajustadas em cascata.`);
            }
        } else {
            message.success(`Tarefa "${taskName}" adicionada em paralelo.`);
        }

        updateDataWithHistory(newData);
        setConflictModal({ visible: false, taskData: null, affectedProjects: [] });
    };

    const handleSaveLooseTask = (values) => {
        const { taskName, range, projectId, responsible } = values;

        let parent = looseTaskModal.parentProject;
        if (!parent && projectId) {
            parent = data.find(p => p.id === projectId);
        }

        if (!parent) {
            message.error("Erro ao identificar a ação pai.");
            return;
        }

        const taskStart = range ? range[0] : dayjs();
        const taskEnd = range ? range[1].add(1, 'day').startOf('day') : dayjs().add(1, 'day').startOf('day');

        const identifyImpactedProjects = (targetDev, start, end) => {
            return data.filter(p => {
                const hasDev = p.developers.some(d => d.name === targetDev);
                // Colisão: (StartA < EndB) e (EndA > StartB) para intervalos exclusivos no final
                const collides = start.isBefore(p.finalDate) && end.isAfter(p.startDate);
                return hasDev && collides;
            });
        };

        const affectedProjects = identifyImpactedProjects(responsible, taskStart, taskEnd);

        const taskData = {
            taskName,
            taskStart,
            taskEnd,
            responsible,
            parentProjectId: parent.id
        };

        if (affectedProjects.length > 0) {
            setConflictModal({ visible: true, taskData, affectedProjects });
            setLooseTaskModal({ visible: false, parentProject: null });
        } else {
            executeCreateTask(taskData, 'concurrent');
            setLooseTaskModal({ visible: false, parentProject: null });
        }
    };

    const handleSaveNewTask = (values) => {
        const { projectId, taskName, range, developer, dependencyId } = values;
        const parentIndex = data.findIndex(p => p.id === projectId);
        if (parentIndex === -1) return;

        const newTask = {
            id: Date.now(),
            actionName: taskName,
            originalStartDate: range[0],
            originalFinalDate: range[1],
            startDate: range[0],
            finalDate: range[1],
            developers: [{ name: developer, role: 'Dev' }],
            percent: 0,
            dependencies: dependencyId ? [dependencyId] : [],
            status: 'pending',
            impacts: [],
            children: []
        };

        const newData = [...data];
        newData[parentIndex].children.push(newTask);
        updateDataWithHistory(newData);
        setNewTaskModal({ visible: false });
        setSelectedProjectForTask(null);
        message.success("Tarefa vinculada criada!");
    };

    const calculateChanges = () => {
        const changes = [];
        const currentIds = new Set(data.map(i => i.id));
        const savedIds = new Set(lastSavedData.map(i => i.id));

        data.filter(i => !savedIds.has(i.id)).forEach(i => changes.push({ type: 'added', icon: <PlusOutlined />, text: `Novo: ${i.actionName}`, color: 'text-green-600' }));
        lastSavedData.filter(i => !currentIds.has(i.id)).forEach(i => changes.push({ type: 'removed', icon: <DeleteOutlined />, text: `Removido: ${i.actionName}`, color: 'text-red-600' }));

        data.filter(i => savedIds.has(i.id)).forEach(curr => {
            const prev = lastSavedData.find(p => p.id === curr.id);
            const diffs = [];
            if (curr.actionName !== prev.actionName) diffs.push(`Nome`);
            if (!curr.startDate.isSame(prev.startDate, 'day')) diffs.push(`Início`);
            if (!curr.finalDate.isSame(prev.finalDate, 'day')) diffs.push(`Fim`);

            if (curr.children.length !== prev.children.length) {
                const newTasks = curr.children.length - prev.children.length;
                if (newTasks > 0) diffs.push(`Tarefas Avulsas (+${newTasks})`);
            }

            if (curr.impacts.length !== prev.impacts.length) {
                diffs.push(`Impactos (+${curr.impacts.length - prev.impacts.length})`);
            }

            const rankCurr = data.findIndex(x => x.id === curr.id);
            const rankPrev = lastSavedData.findIndex(x => x.id === prev.id);
            if (rankCurr !== rankPrev) diffs.push(`Prioridade (#${rankPrev + 1} -> #${rankCurr + 1})`);

            if (diffs.length > 0) changes.push({ type: 'modified', icon: <DiffOutlined />, text: `${curr.actionName}: ${diffs.join(', ')}`, color: 'text-blue-600' });
        });

        return changes;
    };

    const handleOpenSave = () => {
        const changes = calculateChanges();
        if (changes.length === 0) {
            message.info("Nenhuma alteração pendente.");
            return;
        }
        setChangesList(changes);
        setSaveModalOpen(true);
    };

    const handleConfirmSave = () => {
        // Atualizar as datas originais (baseline) para refletir o novo estado salvo
        const updateBaselines = (items) => {
            return items.map(item => ({
                ...item,
                originalStartDate: item.startDate,
                originalFinalDate: item.finalDate,
                children: item.children ? updateBaselines(item.children) : []
            }));
        };

        const newDataWithUpdatedBaselines = updateBaselines(data);
        setData(newDataWithUpdatedBaselines);
        setLastSavedData(newDataWithUpdatedBaselines);
        setSaveModalOpen(false);
        message.success("Alterações salvas e baseline atualizada!");
    };

    const handleDragEnd = (event) => {
        const { active, over, delta } = event;
        setActiveId(null);
        if (!active) return;

        if (interactionMode === 'vertical') {
            if (over && active.id !== over.id) {
                // Deep clone para manipular estrutura aninhada com segurança
                const newData = JSON.parse(JSON.stringify(data));

                // Restaurar objetos Dayjs que viraram string no JSON.stringify
                const restoreDates = (list) => {
                    list.forEach(item => {
                        item.startDate = dayjs(item.startDate);
                        item.finalDate = dayjs(item.finalDate);
                        item.originalStartDate = dayjs(item.originalStartDate);
                        item.originalFinalDate = dayjs(item.originalFinalDate);
                        if (item.children) restoreDates(item.children);
                    });
                };
                restoreDates(newData);

                const findParentAndIndex = (items, id, parent = null) => {
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].id === id) {
                            return { list: items, index: i, parent };
                        }
                        if (items[i].children) {
                            const res = findParentAndIndex(items[i].children, id, items[i]);
                            if (res) return res;
                        }
                    }
                    return null;
                };

                const activeInfo = findParentAndIndex(newData, active.id);
                const overInfo = findParentAndIndex(newData, over.id);

                if (activeInfo && overInfo) {
                    if (activeInfo.list === overInfo.list) {
                        // Reordenar na mesma lista (irmãos)
                        const reordered = arrayMove(activeInfo.list, activeInfo.index, overInfo.index);
                        if (activeInfo.parent) {
                            activeInfo.parent.children = reordered;
                        } else {
                            // Nível Raiz
                            updateDataWithHistory(reordered);
                            message.success("Prioridade reordenada.");
                            return;
                        }
                    } else {
                        // Mover para lista diferente (reparenting ou mover entre ações)
                        const [movedItem] = activeInfo.list.splice(activeInfo.index, 1);
                        overInfo.list.splice(overInfo.index, 0, movedItem);
                    }
                    updateDataWithHistory(newData);
                    message.success("Prioridade atualizada.");
                }
            }
            return;
        }

        if (interactionMode === 'horizontal') {
            // Função auxiliar para encontrar item em qualquer nível
            const findItemRecursive = (items, id) => {
                for (const i of items) {
                    if (i.id === id) return i;
                    if (i.children) {
                        const found = findItemRecursive(i.children, id);
                        if (found) return found;
                    }
                }
                return null;
            };

            const item = findItemRecursive(data, active.id);
            if (!item) return;

            const daysMoved = Math.round(delta.x / zoomLevel);
            if (daysMoved === 0) return;

            const newStartDate = item.startDate.add(daysMoved, 'day');
            const newFinalDate = item.finalDate.add(daysMoved, 'day');
            const hoje = dayjs().startOf('day');

            if (newStartDate.isBefore(hoje) && item.startDate.isAfter(hoje)) {
                messageApi.error("Bloqueado: Não pode mover para o passado.");
                return;
            }
            if (daysMoved > 0) {
                const anchor = findEarliestAnchor(item.children);
                if (anchor && newStartDate.isAfter(anchor.date)) {
                    messageApi.error(`Bloqueado por: ${anchor.name}`);
                    return;
                }
            }

            // Lógica para Tarefas Avulsas (Loose Tasks)
            // 1. Separar children normais (movem junto) de loose tasks (ficam paradas)
            const structuralChildren = [];
            const looseChildren = [];

            if (item.children) {
                item.children.forEach(child => {
                    if (child.status === 'loose-task') {
                        looseChildren.push(child);
                    } else {
                        structuralChildren.push(child);
                    }
                });
            }

            // 2. Mover children normais
            const movedStructuralChildren = applyDeltaToChildren(structuralChildren, daysMoved);

            // 3. Verificar loose tasks: Se saírem do novo intervalo, são removidas ("desatreladas")
            //    Se forem removidas e eram de impacto, devemos remover o impacto da ação.
            const keptLooseChildren = [];
            let removedImpactDays = 0;
            const removedImpactReasons = new Set();

            looseChildren.forEach(child => {
                // Verifica intersecção com o novo intervalo da ação
                const intersects = (child.startDate.isBefore(newFinalDate) || child.startDate.isSame(newFinalDate)) &&
                    (child.finalDate.isAfter(newStartDate) || child.finalDate.isSame(newStartDate));

                if (intersects) {
                    keptLooseChildren.push(child);
                } else {
                    // Saiu do intervalo -> Desatrelar impacto, mas manter a tarefa visualmente
                    let modifiedChild = { ...child };

                    if (child.mode === 'impact') {
                        // Se era impacto, calcular quanto tempo ela adicionava
                        const duration = child.finalDate.diff(child.startDate, 'day');
                        removedImpactDays += duration;
                        removedImpactReasons.add(`Impacto: ${child.actionName} (${child.responsible})`);

                        // Muda para concurrent para indicar que não impacta mais esta ação
                        modifiedChild.mode = 'concurrent';
                    }
                    keptLooseChildren.push(modifiedChild);
                }
            });

            // 4. Reconstruir children
            const finalChildren = [...movedStructuralChildren, ...keptLooseChildren];

            // 5. Ajustar finalDate se impactos foram removidos
            let adjustedFinalDate = newFinalDate;
            let adjustedImpacts = item.impacts || [];

            if (removedImpactDays > 0) {
                adjustedFinalDate = newFinalDate.subtract(removedImpactDays, 'day');
                adjustedImpacts = adjustedImpacts.filter(imp => !removedImpactReasons.has(imp.reason));
                message.info(`Tarefas desatreladas. Prazo reduzido em ${removedImpactDays} dias.`);
            } else if (looseChildren.length > keptLooseChildren.length) {
                message.info(`Tarefas avulsas desatreladas (sem impacto no prazo).`);
            }

            let newItem = {
                ...item,
                startDate: newStartDate,
                finalDate: adjustedFinalDate,
                children: finalChildren,
                impacts: adjustedImpacts
            };

            // Atualizar dados recursivamente
            const updateDataRecursive = (list) => {
                return list.map(i => {
                    if (i.id === item.id) return newItem;
                    if (i.children) return { ...i, children: updateDataRecursive(i.children) };
                    return i;
                });
            };

            let newData = updateDataRecursive(data);

            // --- Lógica de Cascata para Dependências ---
            const moveDependents = (currentData, parentId, deltaDays) => {
                // Encontrar dependentes em toda a árvore
                const findAllDependents = (list) => {
                    let deps = [];
                    list.forEach(i => {
                        if (i.dependencies && i.dependencies.includes(parentId)) {
                            deps.push(i);
                        }
                        if (i.children) {
                            deps = [...deps, ...findAllDependents(i.children)];
                        }
                    });
                    return deps;
                };

                const dependents = findAllDependents(currentData);

                if (dependents.length === 0) return currentData;

                let updatedData = [...currentData];

                // Função para atualizar um item específico na árvore
                const updateItemInTree = (list, targetId, updater) => {
                    return list.map(i => {
                        if (i.id === targetId) return updater(i);
                        if (i.children) return { ...i, children: updateItemInTree(i.children, targetId, updater) };
                        return i;
                    });
                };

                dependents.forEach(dep => {
                    updatedData = updateItemInTree(updatedData, dep.id, (depItem) => {
                        const newDepStart = depItem.startDate.add(deltaDays, 'day');
                        const newDepEnd = depItem.finalDate.add(deltaDays, 'day');
                        const newDepChildren = applyDeltaToChildren(depItem.children, deltaDays);
                        return {
                            ...depItem,
                            startDate: newDepStart,
                            finalDate: newDepEnd,
                            children: newDepChildren
                        };
                    });

                    // Recursão para dependentes deste dependente
                    updatedData = moveDependents(updatedData, dep.id, deltaDays);
                });

                return updatedData;
            };

            // Aplicar cascata
            newData = moveDependents(newData, item.id, daysMoved);

            setModalAuditoria({ visible: true, pendingData: newData, reason: '', details: `Ação "${item.actionName}" movida ${daysMoved} dias (com dependências).` });
        }
    };

    const activeRank = activeId ? visibleData.findIndex(d => d.id === activeId) + 1 : 0;
    const activeItem = activeId ? visibleData.find(i => i.id === activeId) : null;

    const parentDevs = useMemo(() => {
        const p = looseTaskModal.parentProject;
        if (!p) return [];
        return p.developers.map(d => d.name);
    }, [looseTaskModal.parentProject]);

    return (
        <ConfigProvider locale={ptBR} theme={{
            algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
            token: {
                colorPrimary: '#4f46e5',
                borderRadius: 8,
                colorBgContainer: darkMode ? '#0f172a' : '#ffffff',
            },
            components: {
                Segmented: {
                    itemSelectedBg: darkMode ? 'rgba(79, 70, 229, 0.2)' : '#eef2ff',
                    itemSelectedColor: darkMode ? '#a5b4fc' : '#4f46e5',
                    trackBg: darkMode ? '#1e293b' : '#f1f5f9',
                }
            }
        }}>
            <div className={darkMode ? "dark" : ""}>
                <Layout className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
                    {contextHolder}

                    <Header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 h-16 flex items-center justify-between shadow-sm z-20 transition-colors duration-300 sticky top-0">
                        {/* Left: Brand & Filter */}
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                                    <CalendarOutlined className="text-lg" />
                                </div>
                                <Title level={4} style={{ margin: 0, color: darkMode ? '#f1f5f9' : '#0f172a', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
                                    Gantt Master <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
                                </Title>
                            </div>

                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800"></div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Visão</span>
                                <Select
                                    value={selectedResponsible}
                                    onChange={setSelectedResponsible}
                                    style={{ width: 180 }}
                                    bordered={false}
                                    className="bg-slate-100/50 dark:bg-slate-800/50 rounded-lg font-medium text-slate-700 dark:text-slate-200"
                                    dropdownStyle={{ zIndex: 2000 }}
                                >
                                    <Option value="Todos">Todas as Ações</Option>
                                    {allResponsibles.map(dev => <Option key={dev} value={dev}>{dev}</Option>)}
                                </Select>
                            </div>
                        </div>

                        {/* Center: View Controls */}
                        <div className="flex items-center gap-4 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <Segmented
                                options={[
                                    { label: 'Cronograma', value: 'horizontal', icon: <ColumnWidthOutlined /> },
                                    { label: 'Prioridade', value: 'vertical', icon: <ColumnHeightOutlined /> },
                                ]}
                                value={interactionMode}
                                onChange={setInteractionMode}
                                className="shadow-sm border border-slate-200/50 dark:border-slate-700/50 font-medium"
                            />

                            <div className="w-[1px] bg-slate-200 dark:bg-slate-700 h-6"></div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tarefas</span>
                                <Switch size="small" checked={showSubtasks} onChange={setShowSubtasks} />
                            </div>

                            <div className="w-[1px] bg-slate-200 dark:bg-slate-700 h-6"></div>

                            <div className="flex items-center gap-3 w-40 px-2">
                                <ZoomOutOutlined className="text-xs text-slate-400" />
                                <Slider
                                    min={5}
                                    max={100}
                                    value={zoomLevel}
                                    onChange={setZoomLevel}
                                    className="flex-1 m-0"
                                    tooltip={{ formatter: null }}
                                />
                                <ZoomInOutlined className="text-xs text-slate-400" />
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3">
                            <Button type="primary" className="bg-indigo-600 shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 border-none h-9 px-4 rounded-lg font-medium" icon={<PlusOutlined />} onClick={handleAddNew}>
                                Nova Ação
                            </Button>

                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                                <Tooltip title="Nova Tarefa">
                                    <Button size="small" type="text" className="text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md" icon={<FileAddOutlined />} onClick={() => setNewTaskModal({ visible: true })} />
                                </Tooltip>
                                <Tooltip title="Tarefa Avulsa">
                                    <Button size="small" type="text" className="text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-md" icon={<ThunderboltOutlined />} onClick={() => setLooseTaskModal({ visible: true, parentProject: null })} />
                                </Tooltip>
                            </div>

                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

                            <div className="flex items-center gap-2">
                                <Tooltip title="Salvar">
                                    <Button
                                        shape="circle"
                                        type="text"
                                        className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border-none"
                                        icon={<SaveOutlined />}
                                        onClick={handleOpenSave}
                                    />
                                </Tooltip>

                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 gap-0.5">
                                    <Tooltip title="Desfazer">
                                        <Button shape="circle" size="small" type="text" icon={<UndoOutlined />} onClick={handleUndo} disabled={history.past.length === 0} className="dark:text-slate-400" />
                                    </Tooltip>
                                    <Tooltip title="Refazer">
                                        <Button shape="circle" size="small" type="text" icon={<RedoOutlined />} onClick={handleRedo} disabled={history.future.length === 0} className="dark:text-slate-400" />
                                    </Tooltip>
                                </div>
                            </div>

                            <div className="pl-2 border-l border-slate-200 dark:border-slate-800 ml-1">
                                <Button
                                    shape="circle"
                                    icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
                                    onClick={() => setDarkMode(!darkMode)}
                                    className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-yellow-400 hover:text-indigo-600 dark:hover:text-yellow-300 transition-colors"
                                />
                            </div>
                        </div>
                    </Header>

                    <div className="flex-1 relative overflow-hidden flex flex-col">
                        <Content className="absolute inset-0 overflow-auto bg-white dark:bg-slate-900 cursor-default select-none custom-scrollbar transition-colors duration-300" id="gantt-container">
                            <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={({ active }) => setActiveId(active.id)} modifiers={modifiers}>
                                <div className="relative min-h-full pb-20" style={{ width: Math.max(2000, calculateLeft(startDate.add(totalMonths, 'month'), zoomLevel, startDate)), height: contentHeight }}>

                                    <TimelineHeader zoomLevel={zoomLevel} startDate={startDate} totalMonths={totalMonths} />

                                    <GridBackground zoomLevel={zoomLevel} startDate={startDate} totalMonths={totalMonths} />

                                    {/* Linha de HOJE */}
                                    <TodayLine zoomLevel={zoomLevel} startDate={startDate} />

                                    {/* Camada de Fundo das Linhas (Alternância de Cores) */}
                                    <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                                        {visibleData.map((item, index) => (
                                            <div
                                                key={`bg-${item.id}`}
                                                style={{
                                                    position: 'absolute',
                                                    top: calculateTop(index),
                                                    left: 0,
                                                    width: '100%',
                                                    height: ROW_HEIGHT
                                                }}
                                                className={index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'}
                                            />
                                        ))}
                                    </div>

                                    <DependencyLines items={visibleData} pixelsPerDay={zoomLevel} startDate={startDate} />

                                    <div className="absolute top-0 left-0 w-full h-full z-10">
                                        {visibleData.map((item, index) => {
                                            const globalIndex = data.findIndex(d => d.id === item.id);
                                            return (
                                                <DraggableRow
                                                    key={item.id}
                                                    item={item}
                                                    index={index}
                                                    zoomLevel={zoomLevel}
                                                    showBaseline={showBaseline}
                                                    showCriticalPath={showCriticalPath}
                                                    isConflicted={conflictedIds.has(item.id)}
                                                    onEdit={(it) => setModalEdit({ visible: true, item: it })}
                                                    onDelete={handleDelete}
                                                    onAddLooseTask={(it) => setLooseTaskModal({ visible: true, parentProject: it })}
                                                    globalRank={globalIndex + 1}
                                                    interactionMode={interactionMode}
                                                    allData={data}
                                                    startDate={startDate}
                                                    onTaskClick={(t) => setTaskDetailsModal({ visible: true, task: t })}
                                                />
                                            );
                                        })}
                                    </div>

                                    <DragOverlay dropAnimation={null}>
                                        {activeItem ? (
                                            <TaskBar
                                                item={activeItem}
                                                width={calculateWidth(activeItem.startDate, activeItem.finalDate, zoomLevel)}
                                                isDragging={true}
                                                isCritical={false}
                                                isConflicted={false}
                                                showBaseline={false}
                                                rank={activeRank}
                                                zoomLevel={zoomLevel}
                                            />
                                        ) : null}
                                    </DragOverlay>
                                </div>
                            </DndContext>
                        </Content>
                        <ScrollControls containerId="gantt-container" dependencies={[zoomLevel, visibleData.length, startDate, totalMonths]} />
                    </div>

                    {/* MODAL NOVA TAREFA VINCULADA */}
                    <Modal
                        title="Nova Tarefa Vinculada"
                        open={newTaskModal.visible}
                        onCancel={() => { setNewTaskModal({ visible: false }); setSelectedProjectForTask(null); }}
                        footer={null}
                        destroyOnClose
                        centered
                    >
                        <Form layout="vertical" onFinish={handleSaveNewTask}>
                            <Form.Item name="projectId" label="Ação Pai" rules={[{ required: true, message: 'Selecione uma ação' }]}>
                                <Select
                                    placeholder="Selecione a ação..."
                                    onChange={(val) => setSelectedProjectForTask(val)}
                                >
                                    {data.map(p => <Option key={p.id} value={p.id}>{p.actionName}</Option>)}
                                </Select>
                            </Form.Item>

                            <Form.Item name="taskName" label="Nome da Tarefa" rules={[{ required: true, message: 'Obrigatório' }]}>
                                <Input placeholder="Ex: Desenvolvimento Backend..." />
                            </Form.Item>

                            <Form.Item name="developer" label="Desenvolvedor" rules={[{ required: true, message: 'Obrigatório' }]}>
                                <Select placeholder="Selecione...">
                                    {allResponsibles.map(dev => <Option key={dev} value={dev}>{dev}</Option>)}
                                </Select>
                            </Form.Item>

                            <Form.Item name="range" label="Período" rules={[{ required: true, message: 'Obrigatório' }]}>
                                <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                            </Form.Item>

                            <Form.Item name="dependencyId" label="Dependência (Opcional)">
                                <Select
                                    placeholder="Selecione uma tarefa da mesma ação..."
                                    allowClear
                                    disabled={!selectedProjectForTask}
                                >
                                    {selectedProjectForTask && data.find(p => p.id === selectedProjectForTask)?.children
                                        .filter(c => c.status !== 'loose-task')
                                        .map(t => (
                                            <Option key={t.id} value={t.id}>{t.actionName}</Option>
                                        ))
                                    }
                                </Select>
                            </Form.Item>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button onClick={() => { setNewTaskModal({ visible: false }); setSelectedProjectForTask(null); }}>Cancelar</Button>
                                <Button type="primary" htmlType="submit" className="bg-indigo-600">Criar Tarefa</Button>
                            </div>
                        </Form>
                    </Modal>

                    {/* MODAL TAREFA AVULSA */}
                    <Modal
                        title={`Adicionar Tarefa Avulsa`}
                        open={looseTaskModal.visible}
                        onCancel={() => setLooseTaskModal({ visible: false, parentProject: null })}
                        footer={null}
                        destroyOnClose
                        centered
                    >
                        <Form layout="vertical" onFinish={handleSaveLooseTask}>
                            {!looseTaskModal.parentProject && (
                                <Form.Item name="projectId" label="Vincular à Ação (Visual)" rules={[{ required: true, message: 'Selecione uma ação' }]}>
                                    <Select placeholder="Selecione...">
                                        {data.map(p => <Select.Option key={p.id} value={p.id}>{p.actionName}</Select.Option>)}
                                    </Select>
                                </Form.Item>
                            )}

                            {looseTaskModal.parentProject && (
                                <div className="mb-4 bg-slate-50 p-2 rounded text-sm text-slate-600">
                                    Adicionando à ação: <b>{looseTaskModal.parentProject?.actionName}</b>
                                </div>
                            )}

                            <Form.Item name="taskName" label="Nome da Tarefa" rules={[{ required: true, message: 'Obrigatório' }]}>
                                <Input placeholder="Ex: Correção urgente, Bug crítico..." />
                            </Form.Item>

                            <Form.Item name="responsible" label="Responsável (Desenvolvedor)" rules={[{ required: true, message: 'Selecione o responsável' }]}>
                                <Select placeholder="Selecione o desenvolvedor">
                                    {parentDevs.length > 0 ? (
                                        parentDevs.map(name => <Option key={name} value={name}>{name}</Option>)
                                    ) : (
                                        allResponsibles.map(name => <Option key={name} value={name}>{name}</Option>)
                                    )}
                                </Select>
                            </Form.Item>

                            <Form.Item name="range" label="Período de Execução" rules={[{ required: true, message: 'Selecione as datas' }]}>
                                <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                            </Form.Item>

                            {/* Informação de Propagação (Automática agora, sem checkbox) */}
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded border border-amber-100 text-xs text-amber-800 mb-2">
                                <GlobalOutlined className="mt-1" />
                                <div>
                                    Atenção: Se houver colisão e você escolher "Impactar Prazo", <b>todas as ações</b> onde o responsável selecionado estiver alocado durante este período serão adiadas automaticamente.
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button onClick={() => setLooseTaskModal({ visible: false, parentProject: null })}>Cancelar</Button>
                                <Button type="primary" htmlType="submit" className="bg-indigo-600">Verificar e Adicionar</Button>
                            </div>
                        </Form>
                    </Modal>

                    <Modal
                        title={<div className="flex items-center gap-2"><WarningOutlined className="text-orange-500" /> Conflito de Agenda Detectado</div>}
                        open={conflictModal.visible}
                        onCancel={() => setConflictModal({ visible: false, taskData: null, affectedProjects: [] })}
                        footer={[
                            <Button key="concurrent" icon={<ThunderboltOutlined />} onClick={() => executeCreateTask(conflictModal.taskData, 'concurrent')}>
                                Executar Concorrentemente
                            </Button>,
                            <Button key="impact" type="primary" danger icon={<BlockOutlined />} onClick={() => executeCreateTask(conflictModal.taskData, 'impact', conflictModal.affectedProjects)}>
                                Impactar Prazo ({conflictModal.affectedProjects.length})
                            </Button>
                        ]}
                        width={550}
                        centered
                    >
                        {conflictModal.taskData && (
                            <div className="pt-2">
                                <p className="mb-2">A tarefa <b>{conflictModal.taskData.taskName}</b> coincide com o período de execução de <b>{conflictModal.affectedProjects.length} ação(ões)</b> do desenvolvedor <b>{conflictModal.taskData.responsible}</b>.</p>
                                <p className="text-slate-500 text-xs mb-4">Período: {conflictModal.taskData.taskStart.format('DD/MM')} - {conflictModal.taskData.taskEnd.format('DD/MM')}</p>

                                {conflictModal.affectedProjects.length > 0 && (
                                    <div className="bg-red-50 border border-red-100 p-2 rounded text-xs text-red-700 mb-4 max-h-24 overflow-auto">
                                        <b>Ações afetadas:</b> {conflictModal.affectedProjects.map(p => p.actionName).join(', ')}
                                    </div>
                                )}

                                <p className="font-semibold mt-4">Como deseja prosseguir?</p>
                            </div>
                        )}
                    </Modal>

                    {/* Outros Modais */}
                    <Modal
                        title={<div className="flex items-center gap-2"><WarningOutlined className="text-yellow-500" /> Confirmar Alteração</div>}
                        open={modalAuditoria.visible}
                        onOk={() => {
                            if (!modalAuditoria.reason.trim()) return message.error("Motivo obrigatório.");
                            updateDataWithHistory(modalAuditoria.pendingData);
                            setModalAuditoria({ visible: false, pendingData: null, reason: '', details: '' });
                            message.success("Atualizado com sucesso.");
                        }}
                        onCancel={() => setModalAuditoria({ visible: false, pendingData: null, reason: '', details: '' })}
                        okText="Confirmar"
                        cancelText="Cancelar"
                        centered
                    >
                        <div className="flex flex-col gap-4 pt-2">
                            <div className="bg-slate-100 p-3 rounded text-slate-700 border border-slate-200 text-sm">{modalAuditoria.details}</div>
                            <div>
                                <label className="font-semibold text-sm mb-1 block">Motivo da Mudança:</label>
                                <TextArea rows={3} placeholder="Justificativa..." value={modalAuditoria.reason} onChange={e => setModalAuditoria(prev => ({ ...prev, reason: e.target.value }))} />
                            </div>
                        </div>
                    </Modal>
                    <Modal
                        title={<div className="flex items-center gap-2"><SaveOutlined className="text-blue-600" /> Resumo de Alterações</div>}
                        open={saveModalOpen}
                        onOk={handleConfirmSave}
                        onCancel={() => setSaveModalOpen(false)}
                        okText="Salvar"
                        cancelText="Voltar"
                        centered
                        width={600}
                    >
                        <List
                            itemLayout="horizontal"
                            dataSource={changesList}
                            renderItem={(item) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<div className={`text-lg ${item.color}`}>{item.icon}</div>}
                                        title={<span className={`${item.color} font-medium`}>{item.type.toUpperCase()}</span>}
                                        description={<span className="text-slate-700">{item.text}</span>}
                                    />
                                </List.Item>
                            )}
                        />
                    </Modal>
                    <Modal
                        title={modalEdit.isNew ? "Nova Ação" : "Editar Detalhes"}
                        open={modalEdit.visible}
                        onCancel={() => setModalEdit({ visible: false, item: null })}
                        footer={null}
                        destroyOnClose
                        centered
                    >
                        {modalEdit.visible && (
                            <Form layout="vertical" initialValues={{
                                actionName: modalEdit.item.actionName,
                                percent: modalEdit.item.percent,
                                developers: modalEdit.item.developers.map(d => d.name).join(', ')
                            }} onFinish={handleEditSave}>
                                <Form.Item name="actionName" label="Nome" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                                <Form.Item name="percent" label="Progresso">
                                    <Slider min={0} max={100} />
                                </Form.Item>
                                <Form.Item name="developers" label="Desenvolvedores">
                                    <Input placeholder="Ex: João, Maria" />
                                </Form.Item>
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button onClick={() => setModalEdit({ visible: false, item: null })}>Cancelar</Button>
                                    <Button type="primary" htmlType="submit" className="bg-indigo-600">Salvar</Button>
                                </div>
                            </Form>
                        )}
                    </Modal>

                    <TaskDetailsModal
                        visible={taskDetailsModal.visible}
                        task={taskDetailsModal.task}
                        onCancel={() => setTaskDetailsModal({ visible: false, task: null })}
                    />

                    {/* Modal de Boas Vindas */}
                    <Modal
                        title={<div className="flex items-center gap-2"><WarningOutlined className="text-blue-500" /> Dados de Exemplo</div>}
                        open={welcomeModalVisible}
                        onOk={handleCloseWelcome}
                        onCancel={handleCloseWelcome}
                        footer={[
                            <Button key="ok" type="primary" onClick={handleCloseWelcome} className="bg-indigo-600">
                                Entendi
                            </Button>
                        ]}
                        centered
                    >
                        <p>Bem-vindo ao <b>Gantt Master Pro</b>.</p>
                        <p className="mt-2">Os dados apresentados nesta tela são <b>fictícios</b> e gerados automaticamente apenas para fins de demonstração das funcionalidades do sistema.</p>
                        <p className="mt-2 text-slate-500 text-sm">Você pode editar, mover e excluir itens livremente para testar a aplicação.</p>
                    </Modal>
                </Layout>
            </div>
        </ConfigProvider>
    );
};

export default GanttGeral;