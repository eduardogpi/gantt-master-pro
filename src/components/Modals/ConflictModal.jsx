import React from 'react';
import { Modal, Button } from 'antd';
import { WarningOutlined, ThunderboltOutlined, BlockOutlined } from '@ant-design/icons';

// Hook simples para detectar mobile
const useIsMobile = () => {
    const [isMobile, setIsMobile] = React.useState(
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    return isMobile;
};

/**
 * Modal para resolver conflitos de agenda ao criar tarefa avulsa
 */
const ConflictModal = ({
    visible,
    taskData,
    affectedProjects,
    onCancel,
    onConcurrent,
    onImpact
}) => {
    const isMobile = useIsMobile();
    
    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <WarningOutlined className="text-orange-500" /> 
                    Conflito de Agenda
                </div>
            }
            open={visible}
            onCancel={onCancel}
            footer={
                <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-row justify-end gap-2'}`}>
                    <Button 
                        icon={<ThunderboltOutlined />} 
                        onClick={onConcurrent}
                        block={isMobile}
                    >
                        Executar em Paralelo
                    </Button>
                    <Button 
                        type="primary" 
                        danger 
                        icon={<BlockOutlined />} 
                        onClick={onImpact}
                        block={isMobile}
                    >
                        Impactar Prazo ({affectedProjects.length})
                    </Button>
                </div>
            }
            width={isMobile ? '100%' : 550}
            centered={!isMobile}
            style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw' } : undefined}
            styles={isMobile ? { content: { borderRadius: 0 } } : undefined}
        >
            {taskData && (
                <div className="pt-2">
                    <p className="mb-2">
                        A tarefa <b>{taskData.taskName}</b> coincide com o período de execução de{' '}
                        <b>{affectedProjects.length} ação(ões)</b> do desenvolvedor{' '}
                        <b>{taskData.responsible}</b>.
                    </p>
                    <p className="text-slate-500 text-xs mb-4">
                        Período: {taskData.taskStart.format('DD/MM')} - {taskData.taskEnd.format('DD/MM')}
                    </p>

                    {affectedProjects.length > 0 && (
                        <div className="bg-red-50 border border-red-100 p-2 rounded text-xs text-red-700 mb-4 max-h-24 overflow-auto">
                            <b>Ações afetadas:</b> {affectedProjects.map(p => p.actionName).join(', ')}
                        </div>
                    )}

                    <p className="font-semibold mt-4">Como deseja prosseguir?</p>
                </div>
            )}
        </Modal>
    );
};

export default ConflictModal;
