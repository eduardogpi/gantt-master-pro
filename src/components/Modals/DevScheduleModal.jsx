import React from 'react';
import { Modal, Table, Select, DatePicker, Tag, Typography, Empty } from 'antd';
import dayjs from 'dayjs';
import { useIsMobile } from '../../hooks';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const DevScheduleModal = ({ visible, onCancel, data = [], allResponsibles = [] }) => {
    const isMobile = useIsMobile();
    const [selectedDev, setSelectedDev] = React.useState('Todos');
    const [selectedProject, setSelectedProject] = React.useState('Todos');
    const [period, setPeriod] = React.useState([
        dayjs().startOf('month'),
        dayjs().endOf('month')
    ]);

    const projectOptions = React.useMemo(() => (
        data.map(project => ({ label: project.actionName, value: project.id }))
    ), [data]);

    const devOptions = React.useMemo(() => (
        ['Todos', ...allResponsibles]
    ), [allResponsibles]);

    const assignments = React.useMemo(() => {
        const list = [];

        const normalizeDevs = (item) => {
            const devNames = new Set();
            if (item.developers) {
                item.developers.forEach(dev => {
                    if (dev?.name) devNames.add(dev.name);
                });
            }
            if (item.responsible) devNames.add(item.responsible);
            return Array.from(devNames);
        };

        const collectAssignments = (items, projectInfo = null) => {
            items.forEach(item => {
                const currentProject = projectInfo || { id: item.id, name: item.actionName };
                const hasChildren = item.children && item.children.length > 0;

                if (hasChildren) {
                    item.children.forEach(child => collectAssignments([child], currentProject));
                    return;
                }

                const devs = normalizeDevs(item);
                if (devs.length === 0) return;

                const type = item.status === 'loose-task'
                    ? 'Tarefa Avulsa'
                    : currentProject.id === item.id ? 'Ação' : 'Tarefa';

                devs.forEach(dev => {
                    list.push({
                        id: item.id,
                        dev,
                        projectId: currentProject.id,
                        projectName: currentProject.name,
                        taskName: item.actionName,
                        startDate: item.startDate,
                        endDate: item.finalDate,
                        status: item.status,
                        type,
                        mode: item.mode
                    });
                });
            });
        };

        collectAssignments(data);
        return list;
    }, [data]);

    const rows = React.useMemo(() => {
        if (!period || period.length < 2) return [];
        const [periodStartRaw, periodEndRaw] = period;
        if (!periodStartRaw || !periodEndRaw) return [];

        const periodStart = periodStartRaw.startOf('day');
        const periodEnd = periodEndRaw.startOf('day');
        const baseDevs = allResponsibles.length > 0
            ? allResponsibles
            : Array.from(new Set(assignments.map(item => item.dev)));
        const devList = selectedDev === 'Todos' ? baseDevs : [selectedDev];
        const outputRows = [];

        const addIdleRow = (dev, start, end, index) => {
            if (start.isAfter(end, 'day')) return;
            const idleDays = end.diff(start, 'day') + 1;
            if (idleDays <= 0) return;
            outputRows.push({
                key: `idle-${dev}-${index}-${start.valueOf()}`,
                dev,
                projectName: '—',
                taskName: 'Aguardando prazo',
                type: 'Ocioso',
                status: 'idle',
                startDate: start,
                endDate: end,
                durationDays: idleDays,
                isIdle: true
            });
        };

        devList.forEach(dev => {
            const devAssignments = assignments
                .filter(item => item.dev === dev)
                .filter(item => selectedProject === 'Todos' || item.projectId === selectedProject)
                .map(item => {
                    const start = dayjs(item.startDate).startOf('day');
                    const end = dayjs(item.endDate).startOf('day');
                    if (end.isBefore(periodStart, 'day') || start.isAfter(periodEnd, 'day')) return null;
                    const displayStart = start.isBefore(periodStart) ? periodStart : start;
                    const displayEnd = end.isAfter(periodEnd) ? periodEnd : end;
                    if (displayEnd.isBefore(displayStart)) return null;
                    return {
                        ...item,
                        displayStart,
                        displayEnd
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.displayStart.valueOf() - b.displayStart.valueOf());

            let cursor = periodStart.subtract(1, 'day');
            let idleIndex = 0;

            if (devAssignments.length === 0) {
                addIdleRow(dev, periodStart, periodEnd, idleIndex++);
                return;
            }

            devAssignments.forEach(item => {
                const gapStart = cursor.add(1, 'day');
                const gapEnd = item.displayStart.subtract(1, 'day');
                if (!gapStart.isAfter(gapEnd, 'day')) {
                    addIdleRow(dev, gapStart, gapEnd, idleIndex++);
                }

                outputRows.push({
                    key: `task-${dev}-${item.id}-${item.displayStart.valueOf()}`,
                    dev,
                    projectId: item.projectId,
                    projectName: item.projectName,
                    taskName: item.taskName,
                    type: item.type,
                    status: item.status,
                    startDate: item.displayStart,
                    endDate: item.displayEnd,
                    durationDays: item.displayEnd.diff(item.displayStart, 'day') + 1,
                    isIdle: false
                });

                if (item.displayEnd.isAfter(cursor, 'day')) {
                    cursor = item.displayEnd;
                }
            });

            const finalGapStart = cursor.add(1, 'day');
            if (!finalGapStart.isAfter(periodEnd, 'day')) {
                addIdleRow(dev, finalGapStart, periodEnd, idleIndex++);
            }
        });

        return outputRows;
    }, [assignments, period, selectedDev, selectedProject, allResponsibles]);

    const columns = React.useMemo(() => {
        const baseColumns = [
            selectedDev === 'Todos'
                ? {
                    title: 'Dev',
                    dataIndex: 'dev',
                    width: 140,
                    render: (value) => <Tag color="geekblue">{value}</Tag>
                }
                : null,
            {
                title: 'Projeto',
                dataIndex: 'projectName',
                render: (value, record) => record.isIdle ? <Text type="secondary">—</Text> : value
            },
            {
                title: 'Tarefa',
                dataIndex: 'taskName',
                render: (value, record) => record.isIdle
                    ? <span className="text-amber-700 dark:text-amber-300 font-semibold">{value}</span>
                    : value
            },
            {
                title: 'Tipo',
                dataIndex: 'type',
                width: 130,
                render: (value, record) => {
                    if (record.isIdle) return <Tag color="gold">Ocioso</Tag>;
                    if (value === 'Tarefa Avulsa') return <Tag color="orange">Avulsa</Tag>;
                    if (value === 'Ação') return <Tag color="blue">Ação</Tag>;
                    return <Tag color="purple">Tarefa</Tag>;
                }
            },
            {
                title: 'Início',
                dataIndex: 'startDate',
                width: 120,
                render: value => dayjs(value).format('DD/MM/YYYY')
            },
            {
                title: 'Fim',
                dataIndex: 'endDate',
                width: 120,
                render: value => dayjs(value).format('DD/MM/YYYY')
            },
            {
                title: 'Dias',
                dataIndex: 'durationDays',
                width: 80,
                align: 'center'
            },
            {
                title: 'Status',
                dataIndex: 'status',
                width: 140,
                render: (value, record) => {
                    if (record.isIdle) return <Tag color="gold">Aguardando prazo</Tag>;
                    if (value === 'concluded' || value === 'done') return <Tag color="green">Concluído</Tag>;
                    if (value === 'in_progress') return <Tag color="blue">Em progresso</Tag>;
                    if (value === 'loose-task') {
                        return record.mode === 'impact'
                            ? <Tag color="volcano">Avulsa (impacto)</Tag>
                            : <Tag color="orange">Avulsa</Tag>;
                    }
                    return <Tag color="default">Pendente</Tag>;
                }
            }
        ].filter(Boolean);

        return baseColumns;
    }, [selectedDev]);

    if (!visible) return null;

    return (
        <Modal
            title="Agenda de Desenvolvedores"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={isMobile ? '100%' : 1100}
            centered={!isMobile}
            style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw' } : undefined}
            styles={isMobile ? { content: { borderRadius: 0 } } : undefined}
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col">
                        <Text type="secondary" className="text-xs uppercase">Dev</Text>
                        <Select
                            value={selectedDev}
                            onChange={setSelectedDev}
                            options={devOptions.map(dev => ({ label: dev, value: dev }))}
                            style={{ minWidth: 160 }}
                        />
                    </div>
                    <div className="flex flex-col">
                        <Text type="secondary" className="text-xs uppercase">Projeto</Text>
                        <Select
                            value={selectedProject}
                            onChange={setSelectedProject}
                            options={[{ label: 'Todos', value: 'Todos' }, ...projectOptions]}
                            style={{ minWidth: 200 }}
                        />
                    </div>
                    <div className="flex flex-col">
                        <Text type="secondary" className="text-xs uppercase">Período</Text>
                        <RangePicker
                            value={period}
                            onChange={setPeriod}
                            format="DD/MM/YYYY"
                            style={{ minWidth: 240 }}
                        />
                    </div>
                </div>

                <Text type="secondary" className="text-xs">
                    Linhas em destaque representam tempo ocioso (aguardando prazo) dentro do período selecionado.
                </Text>

                <Table
                    dataSource={rows}
                    columns={columns}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    rowClassName={(record) => record.isIdle ? 'bg-amber-50 dark:bg-amber-900/20' : ''}
                    scroll={{ x: 980, y: isMobile ? 360 : 520 }}
                    locale={{
                        emptyText: (
                            <Empty
                                description="Nenhuma atividade para o período selecionado."
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )
                    }}
                />
            </div>
        </Modal>
    );
};

export default DevScheduleModal;
