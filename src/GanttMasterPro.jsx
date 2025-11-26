//@ts-nocheck
"use client"
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Layout, Typography, Button, Modal, Slider, Input, Form, Select, List, DatePicker, ConfigProvider, theme, message, Tooltip, Segmented, Switch, Drawer } from "antd";
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
    DeleteOutlined,
    ZoomInOutlined, ZoomOutOutlined, SaveOutlined, DiffOutlined,
    ColumnHeightOutlined, ColumnWidthOutlined,
    ThunderboltOutlined, BlockOutlined, GlobalOutlined,
    MoonOutlined, SunOutlined, FileAddOutlined, MenuOutlined
} from "@ant-design/icons";

import { initialMockData } from './data/mockData.js';
import { HEADER_HEIGHT, ROW_HEIGHT, MOBILE_ROW_HEIGHT } from './constants/config.js';
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
import {
    TaskDetailsModal,
    NewTaskModal,
    LooseTaskModal,
    ConflictModal,
    EditActionModal,
    AuditModal,
    SaveChangesModal,
    WelcomeModal
} from './components/Modals';
import { useKeyboardShortcuts } from './hooks';

dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.locale('pt-br');

const { Header, Content } = Layout;
const { Title } = Typography;
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
    const [selectedResponsible, setSelectedResponsible] = useState("Todos"); // Filtro por desenvolvedor
    const [interactionMode, setInteractionMode] = useState('horizontal'); // 'horizontal' (Cronograma) ou 'vertical' (Prioridade)
    const [darkMode, setDarkMode] = useState(true); // Tema escuro/claro
    const [showSubtasks, setShowSubtasks] = useState(true); // Mostrar subtarefas
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [isTablet, setIsTablet] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    const [welcomeModalVisible, setWelcomeModalVisible] = useState(() => {
        if (typeof window !== 'undefined') {
            return !localStorage.getItem('hasSeenWelcome_v1');
        }
        return false;
    }); // Modal de boas vindas

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
        const rowHeight = isMobile ? MOBILE_ROW_HEIGHT : ROW_HEIGHT;
        return HEADER_HEIGHT + (visibleData.length * rowHeight) + 100;
    }, [visibleData.length, isMobile]);

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

    const handleUndo = useCallback(() => {
        setHistory(curr => {
            if (curr.past.length === 0) return curr;
            const previous = curr.past[curr.past.length - 1];
            const newPast = curr.past.slice(0, -1);
            setData(previous);
            return {
                past: newPast,
                present: previous,
                future: [curr.present, ...curr.future]
            };
        });
    }, []);

    const handleRedo = useCallback(() => {
        setHistory(curr => {
            if (curr.future.length === 0) return curr;
            const next = curr.future[0];
            const newFuture = curr.future.slice(1);
            setData(next);
            return {
                past: [...curr.past, curr.present],
                present: next,
                future: newFuture
            };
        });
    }, []);

    const handleAddNew = useCallback(() => {
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
    }, []);

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

    const calculateChanges = useCallback(() => {
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
    }, [data, lastSavedData]);

    const handleOpenSave = useCallback(() => {
        const changes = calculateChanges();
        if (changes.length === 0) {
            message.info("Nenhuma alteração pendente.");
            return;
        }
        setChangesList(changes);
        setSaveModalOpen(true);
    }, [calculateChanges]);

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

    // Effect para detectar mudança de tamanho da tela (mobile/tablet)
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            setIsTablet(width >= 768 && width < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Verificar se algum modal está aberto (para desabilitar atalhos) ---
    const isAnyModalOpen = useMemo(() => {
        return modalAuditoria.visible || 
               modalEdit.visible || 
               saveModalOpen || 
               looseTaskModal.visible || 
               newTaskModal.visible || 
               conflictModal.visible || 
               taskDetailsModal.visible ||
               welcomeModalVisible ||
               mobileMenuOpen;
    }, [modalAuditoria.visible, modalEdit.visible, saveModalOpen, looseTaskModal.visible, newTaskModal.visible, conflictModal.visible, taskDetailsModal.visible, welcomeModalVisible, mobileMenuOpen]);

    // --- Atalhos de Teclado ---
    const keyboardHandlers = useMemo(() => ({
        onUndo: handleUndo,
        onRedo: handleRedo,
        onSave: handleOpenSave,
        onNew: handleAddNew,
        onEscape: () => {
            // Fechar modais ao pressionar Escape
            if (taskDetailsModal.visible) setTaskDetailsModal({ visible: false, task: null });
        }
    }), [handleUndo, handleRedo, handleOpenSave, handleAddNew, taskDetailsModal.visible]);

    useKeyboardShortcuts(keyboardHandlers, !isAnyModalOpen);

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

                    <Header className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-2 sm:px-3 md:px-4 lg:px-6 h-14 lg:h-16 flex items-center justify-between shadow-sm z-20 transition-all duration-300 sticky top-0 gap-2`}>
                        {/* Left: Brand */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-1.5 rounded-lg shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                                <CalendarOutlined className="text-sm md:text-base" />
                            </div>
                            <Title level={4} className="hidden sm:block" style={{ margin: 0, color: darkMode ? '#f1f5f9' : '#0f172a', fontSize: isTablet ? '0.875rem' : '1.125rem', fontWeight: 700, letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
                                {isTablet ? 'Gantt' : 'Gantt Master'} <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
                            </Title>
                        </div>

                        {/* Center: Filter + View Controls */}
                        <div className="flex items-center gap-2 md:gap-3 flex-1 justify-center min-w-0 max-w-xl">
                            {/* Filtro */}
                            <Select
                                value={selectedResponsible}
                                onChange={setSelectedResponsible}
                                style={{ width: isMobile ? 90 : isTablet ? 110 : 160, flexShrink: 0 }}
                                bordered={false}
                                className="bg-slate-100/50 dark:bg-slate-800/50 rounded-lg font-medium text-slate-700 dark:text-slate-200"
                                dropdownStyle={{ zIndex: 2000 }}
                                size="small"
                            >
                                <Option value="Todos">{isMobile ? 'Todos' : isTablet ? 'Todos' : 'Todas as Ações'}</Option>
                                {allResponsibles.map(dev => <Option key={dev} value={dev}>{dev}</Option>)}
                            </Select>

                            {/* View Controls - apenas em desktop grande */}
                            {!isMobile && !isTablet && (
                                <div className="hidden xl:flex items-center gap-3 bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <Segmented
                                        size="small"
                                        options={[
                                            { label: 'Cronograma', value: 'horizontal', icon: <ColumnWidthOutlined /> },
                                            { label: 'Prioridade', value: 'vertical', icon: <ColumnHeightOutlined /> },
                                        ]}
                                        value={interactionMode}
                                        onChange={setInteractionMode}
                                    />
                                    <div className="w-[1px] bg-slate-200 dark:bg-slate-700 h-5"></div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Tarefas</span>
                                        <Switch size="small" checked={showSubtasks} onChange={setShowSubtasks} />
                                    </div>
                                    <div className="w-[1px] bg-slate-200 dark:bg-slate-700 h-5"></div>
                                    <div className="flex items-center gap-2 w-28 px-1">
                                        <ZoomOutOutlined className="text-xs text-slate-400" />
                                        <Slider min={5} max={100} value={zoomLevel} onChange={setZoomLevel} className="flex-1 m-0" tooltip={{ formatter: null }} />
                                        <ZoomInOutlined className="text-xs text-slate-400" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                            {/* Desktop grande: Todas as ações expandidas */}
                            {!isMobile && !isTablet && (
                                <>
                                    <Button type="primary" size="small" className="hidden lg:flex bg-indigo-600 shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 border-none rounded-lg font-medium" icon={<PlusOutlined />} onClick={handleAddNew}>
                                        Nova Ação
                                    </Button>
                                    <Tooltip title="Nova Ação">
                                        <Button type="primary" size="small" className="lg:hidden bg-indigo-600" icon={<PlusOutlined />} onClick={handleAddNew} />
                                    </Tooltip>

                                    <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
                                        <Tooltip title="Nova Tarefa (Ctrl+N)">
                                            <Button size="small" type="text" icon={<FileAddOutlined />} onClick={() => setNewTaskModal({ visible: true })} />
                                        </Tooltip>
                                        <Tooltip title="Tarefa Avulsa">
                                            <Button size="small" type="text" icon={<ThunderboltOutlined />} onClick={() => setLooseTaskModal({ visible: true, parentProject: null })} />
                                        </Tooltip>
                                    </div>

                                    <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
                                        <Tooltip title="Salvar (Ctrl+S)">
                                            <Button size="small" type="text" icon={<SaveOutlined />} onClick={handleOpenSave} className="text-indigo-600 dark:text-indigo-400" />
                                        </Tooltip>
                                        <Tooltip title="Desfazer (Ctrl+Z)">
                                            <Button size="small" type="text" icon={<UndoOutlined />} onClick={handleUndo} disabled={history.past.length === 0} />
                                        </Tooltip>
                                        <Tooltip title="Refazer (Ctrl+Y)">
                                            <Button size="small" type="text" icon={<RedoOutlined />} onClick={handleRedo} disabled={history.future.length === 0} />
                                        </Tooltip>
                                    </div>

                                    <Tooltip title={darkMode ? 'Modo Claro' : 'Modo Escuro'}>
                                        <Button
                                            size="small"
                                            icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
                                            onClick={() => setDarkMode(!darkMode)}
                                            className="border-slate-200 dark:border-slate-700 text-slate-500 dark:text-yellow-400"
                                        />
                                    </Tooltip>

                                    {/* Menu para opções extras em telas médias */}
                                    <Button
                                        size="small"
                                        icon={<MenuOutlined />}
                                        onClick={() => setMobileMenuOpen(true)}
                                        className="xl:hidden border-slate-200 dark:border-slate-700"
                                    />
                                </>
                            )}

                            {/* Tablet: Layout compacto */}
                            {isTablet && (
                                <>
                                    <Tooltip title="Nova Ação">
                                        <Button type="primary" size="small" className="bg-indigo-600" icon={<PlusOutlined />} onClick={handleAddNew} />
                                    </Tooltip>
                                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
                                        <Tooltip title="Salvar">
                                            <Button size="small" type="text" icon={<SaveOutlined />} onClick={handleOpenSave} className="text-indigo-600 dark:text-indigo-400" />
                                        </Tooltip>
                                        <Tooltip title="Desfazer">
                                            <Button size="small" type="text" icon={<UndoOutlined />} onClick={handleUndo} disabled={history.past.length === 0} />
                                        </Tooltip>
                                    </div>
                                    <Tooltip title={darkMode ? 'Modo Claro' : 'Modo Escuro'}>
                                        <Button
                                            size="small"
                                            icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
                                            onClick={() => setDarkMode(!darkMode)}
                                            className="text-slate-500 dark:text-yellow-400"
                                        />
                                    </Tooltip>
                                    <Button
                                        size="small"
                                        icon={<MenuOutlined />}
                                        onClick={() => setMobileMenuOpen(true)}
                                        className="border-slate-200 dark:border-slate-700"
                                    />
                                </>
                            )}

                            {/* Mobile: Mínimo */}
                            {isMobile && (
                                <>
                                    <Tooltip title="Nova Ação">
                                        <Button type="primary" size="small" className="bg-indigo-600" icon={<PlusOutlined />} onClick={handleAddNew} />
                                    </Tooltip>
                                    <Button
                                        size="small"
                                        icon={<MenuOutlined />}
                                        onClick={() => setMobileMenuOpen(true)}
                                        className="border-slate-200 dark:border-slate-700"
                                    />
                                </>
                            )}
                        </div>
                    </Header>

                    {/* Mobile/Tablet Menu Drawer */}
                    <Drawer
                        title={
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">Menu</span>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={darkMode ? <SunOutlined className="text-yellow-500" /> : <MoonOutlined />}
                                    onClick={() => setDarkMode(!darkMode)}
                                />
                            </div>
                        }
                        placement="right"
                        onClose={() => setMobileMenuOpen(false)}
                        open={mobileMenuOpen}
                        width={isMobile ? '85%' : 320}
                        styles={{ 
                            body: { padding: 0, display: 'flex', flexDirection: 'column' },
                            header: { borderBottom: '1px solid var(--ant-color-border)' }
                        }}
                        className={darkMode ? 'dark' : ''}
                    >
                        <div className="flex flex-col flex-1 overflow-auto">
                            {/* Quick Actions - Sempre visíveis no topo */}
                            <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-900/30 dark:to-violet-900/30 border-b border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        type="primary" 
                                        block 
                                        className="bg-indigo-600 h-12 text-base" 
                                        icon={<PlusOutlined />} 
                                        onClick={() => { handleAddNew(); setMobileMenuOpen(false); }}
                                    >
                                        Nova Ação
                                    </Button>
                                    <Button 
                                        block 
                                        className="h-12" 
                                        icon={<FileAddOutlined />} 
                                        onClick={() => { setNewTaskModal({ visible: true }); setMobileMenuOpen(false); }}
                                    >
                                        Nova Tarefa
                                    </Button>
                                </div>
                                <Button 
                                    block 
                                    className="mt-2 h-10 border-dashed" 
                                    icon={<ThunderboltOutlined className="text-orange-500" />} 
                                    onClick={() => { setLooseTaskModal({ visible: true, parentProject: null }); setMobileMenuOpen(false); }}
                                >
                                    Adicionar Tarefa Avulsa
                                </Button>
                            </div>

                            {/* View Controls */}
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <ColumnWidthOutlined className="text-indigo-500" />
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Visualização</span>
                                </div>
                                
                                <Segmented
                                    block
                                    size="large"
                                    options={[
                                        { label: 'Cronograma', value: 'horizontal', icon: <ColumnWidthOutlined /> },
                                        { label: 'Prioridade', value: 'vertical', icon: <ColumnHeightOutlined /> },
                                    ]}
                                    value={interactionMode}
                                    onChange={setInteractionMode}
                                    className="mb-4"
                                />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <BlockOutlined className="text-slate-400" />
                                            <span className="text-sm font-medium">Mostrar Sub-tarefas</span>
                                        </div>
                                        <Switch checked={showSubtasks} onChange={setShowSubtasks} />
                                    </div>

                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ZoomInOutlined className="text-slate-400" />
                                            <span className="text-sm font-medium">Zoom: {zoomLevel}px/dia</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button 
                                                size="small" 
                                                icon={<ZoomOutOutlined />} 
                                                onClick={() => setZoomLevel(Math.max(5, zoomLevel - 5))}
                                                disabled={zoomLevel <= 5}
                                            />
                                            <Slider
                                                min={5}
                                                max={100}
                                                step={5}
                                                value={zoomLevel}
                                                onChange={setZoomLevel}
                                                className="flex-1 m-0"
                                                tooltip={{ formatter: (v) => `${v}px` }}
                                            />
                                            <Button 
                                                size="small" 
                                                icon={<ZoomInOutlined />} 
                                                onClick={() => setZoomLevel(Math.min(100, zoomLevel + 5))}
                                                disabled={zoomLevel >= 100}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* System Actions */}
                            <div className="p-4 flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <SaveOutlined className="text-indigo-500" />
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sistema</span>
                                </div>
                                
                                <div className="space-y-2">
                                    <Button 
                                        block 
                                        size="large"
                                        icon={<SaveOutlined />} 
                                        className="text-left flex items-center justify-start h-12"
                                        onClick={() => { handleOpenSave(); setMobileMenuOpen(false); }}
                                    >
                                        <span className="flex-1">Salvar Alterações</span>
                                        <span className="text-xs text-slate-400">Ctrl+S</span>
                                    </Button>

                                    <div className="flex gap-2">
                                        <Button 
                                            block 
                                            size="large"
                                            icon={<UndoOutlined />} 
                                            onClick={handleUndo} 
                                            disabled={history.past.length === 0}
                                            className="h-12"
                                        >
                                            Desfazer
                                        </Button>
                                        <Button 
                                            block 
                                            size="large"
                                            icon={<RedoOutlined />} 
                                            onClick={handleRedo} 
                                            disabled={history.future.length === 0}
                                            className="h-12"
                                        >
                                            Refazer
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Footer info */}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>Gantt Master Pro v1.0</span>
                                    <span>{visibleData.length} itens visíveis</span>
                                </div>
                            </div>
                        </div>
                    </Drawer>

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
                                                    isConflicted={conflictedIds.has(item.id)}
                                                    onEdit={(it) => setModalEdit({ visible: true, item: it })}
                                                    onDelete={handleDelete}
                                                    onAddLooseTask={(it) => setLooseTaskModal({ visible: true, parentProject: it })}
                                                    globalRank={globalIndex + 1}
                                                    interactionMode={interactionMode}
                                                    allData={data}
                                                    startDate={startDate}
                                                    onTaskClick={(t) => setTaskDetailsModal({ visible: true, task: t })}
                                                    isMobile={isMobile}
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
                                                isMobile={isMobile}
                                            />
                                        ) : null}
                                    </DragOverlay>
                                </div>
                            </DndContext>
                        </Content>
                        <ScrollControls containerId="gantt-container" dependencies={[zoomLevel, visibleData.length, startDate, totalMonths]} />
                    </div>

                    {/* MODAIS */}
                    <NewTaskModal
                        visible={newTaskModal.visible}
                        onCancel={() => { setNewTaskModal({ visible: false }); setSelectedProjectForTask(null); }}
                        onFinish={handleSaveNewTask}
                        data={data}
                        allResponsibles={allResponsibles}
                        selectedProjectForTask={selectedProjectForTask}
                        onProjectChange={setSelectedProjectForTask}
                    />

                    <LooseTaskModal
                        visible={looseTaskModal.visible}
                        parentProject={looseTaskModal.parentProject}
                        onCancel={() => setLooseTaskModal({ visible: false, parentProject: null })}
                        onFinish={handleSaveLooseTask}
                        data={data}
                        parentDevs={parentDevs}
                        allResponsibles={allResponsibles}
                    />

                    <ConflictModal
                        visible={conflictModal.visible}
                        taskData={conflictModal.taskData}
                        affectedProjects={conflictModal.affectedProjects}
                        onCancel={() => setConflictModal({ visible: false, taskData: null, affectedProjects: [] })}
                        onConcurrent={() => executeCreateTask(conflictModal.taskData, 'concurrent')}
                        onImpact={() => executeCreateTask(conflictModal.taskData, 'impact', conflictModal.affectedProjects)}
                    />

                    <AuditModal
                        visible={modalAuditoria.visible}
                        details={modalAuditoria.details}
                        reason={modalAuditoria.reason}
                        onReasonChange={(val) => setModalAuditoria(prev => ({ ...prev, reason: val }))}
                        onConfirm={() => {
                            updateDataWithHistory(modalAuditoria.pendingData);
                            setModalAuditoria({ visible: false, pendingData: null, reason: '', details: '' });
                            message.success("Atualizado com sucesso.");
                        }}
                        onCancel={() => setModalAuditoria({ visible: false, pendingData: null, reason: '', details: '' })}
                    />

                    <SaveChangesModal
                        visible={saveModalOpen}
                        changesList={changesList}
                        onConfirm={handleConfirmSave}
                        onCancel={() => setSaveModalOpen(false)}
                    />

                    <EditActionModal
                        visible={modalEdit.visible}
                        item={modalEdit.item}
                        isNew={modalEdit.isNew}
                        onCancel={() => setModalEdit({ visible: false, item: null })}
                        onFinish={handleEditSave}
                    />

                    <TaskDetailsModal
                        visible={taskDetailsModal.visible}
                        task={taskDetailsModal.task}
                        onCancel={() => setTaskDetailsModal({ visible: false, task: null })}
                    />

                    <WelcomeModal
                        visible={welcomeModalVisible}
                        onClose={handleCloseWelcome}
                    />
                </Layout>
            </div>
        </ConfigProvider>
    );
};

export default GanttGeral;