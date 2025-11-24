import React from 'react';
import { Modal, Typography, Tag, List, Empty, Divider, Card } from 'antd';
import { 
    CheckCircleOutlined, 
    SyncOutlined, 
    ClockCircleOutlined, 
    FileTextOutlined, 
    FileImageOutlined, 
    FilePdfOutlined,
    FileUnknownOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const TaskDetailsModal = ({ visible, onCancel, task }) => {
    if (!task) return null;

    const getStatusTag = (status) => {
        switch (status) {
            case 'done': return <Tag icon={<CheckCircleOutlined />} color="success">Concluído</Tag>;
            case 'in_progress': return <Tag icon={<SyncOutlined spin />} color="processing">Em Progresso</Tag>;
            case 'pending': return <Tag icon={<ClockCircleOutlined />} color="default">Pendente</Tag>;
            default: return <Tag color="default">{status}</Tag>;
        }
    };

    const getFileIcon = (type) => {
        if (type.includes('image')) return <FileImageOutlined className="text-purple-500" />;
        if (type.includes('pdf')) return <FilePdfOutlined className="text-red-500" />;
        if (type.includes('sql') || type.includes('json') || type.includes('code')) return <FileTextOutlined className="text-blue-500" />;
        return <FileUnknownOutlined className="text-slate-400" />;
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{task.actionName}</span>
                    <Tag color="blue">#{task.id}</Tag>
                </div>
            }
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={700}
            centered
            className="dark:text-slate-200"
        >
            <div className="flex flex-col gap-4">
                {/* Cabeçalho da Tarefa */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                            <Text type="secondary" className="text-xs uppercase font-bold">Período</Text>
                            <div className="font-medium dark:text-slate-300">
                                {task.startDate.format('DD/MM/YYYY')} - {task.finalDate.format('DD/MM/YYYY')}
                            </div>
                        </div>
                        <div>
                            <Text type="secondary" className="text-xs uppercase font-bold">Responsáveis</Text>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {task.developers.map((dev, idx) => (
                                    <Tag key={idx} color="geekblue">{dev.name}</Tag>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <Text type="secondary" className="text-xs uppercase font-bold">Progresso Geral</Text>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-1 overflow-hidden">
                            <div 
                                className="bg-indigo-500 h-full transition-all duration-500" 
                                style={{ width: `${task.percent}%` }} 
                            />
                        </div>
                        <div className="text-right text-xs text-slate-500 mt-1">{task.percent}% Concluído</div>
                    </div>
                </div>

                <Divider orientation="left" className="m-0 dark:border-slate-700 dark:text-slate-300">Atividades & Evidências</Divider>

                {/* Lista de Atividades */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {task.activities && task.activities.length > 0 ? (
                        <List
                            dataSource={task.activities}
                            renderItem={(activity) => (
                                <Card 
                                    size="small" 
                                    className="mb-3 border-slate-200 dark:border-slate-700 dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow"
                                    title={
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium dark:text-slate-200">{activity.title}</span>
                                            {getStatusTag(activity.status)}
                                        </div>
                                    }
                                >
                                    {activity.evidence && activity.evidence.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            <Text type="secondary" className="text-xs">Evidências Anexadas:</Text>
                                            <div className="grid grid-cols-2 gap-2">
                                                {activity.evidence.map((file, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700 text-sm">
                                                        {getFileIcon(file.type)}
                                                        <span className="truncate flex-1 dark:text-slate-300" title={file.name}>{file.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <Text type="secondary" className="text-xs italic">Nenhuma evidência anexada.</Text>
                                    )}
                                </Card>
                            )}
                        />
                    ) : (
                        <Empty description="Nenhuma atividade registrada para esta tarefa." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default TaskDetailsModal;
