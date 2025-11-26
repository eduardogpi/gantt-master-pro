import React from 'react';
import { Modal, Form, Input, Select, DatePicker, Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

const { Option } = Select;

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
 * Modal para criar uma tarefa avulsa (urgente/não planejada)
 */
const LooseTaskModal = ({
    visible,
    parentProject,
    onCancel,
    onFinish,
    data,
    parentDevs,
    allResponsibles
}) => {
    const isMobile = useIsMobile();
    
    return (
        <Modal
            title="Adicionar Tarefa Avulsa"
            open={visible}
            onCancel={onCancel}
            footer={null}
            destroyOnClose
            centered={!isMobile}
            width={isMobile ? '100%' : 520}
            style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw', paddingBottom: 0 } : undefined}
            styles={isMobile ? { 
                body: { maxHeight: 'calc(100vh - 55px)', overflowY: 'auto' },
                content: { borderRadius: 0 }
            } : undefined}
        >
            <Form layout="vertical" onFinish={onFinish}>
                {!parentProject && (
                    <Form.Item name="projectId" label="Vincular à Ação (Visual)" rules={[{ required: true, message: 'Selecione uma ação' }]}>
                        <Select placeholder="Selecione...">
                            {data.map(p => <Option key={p.id} value={p.id}>{p.actionName}</Option>)}
                        </Select>
                    </Form.Item>
                )}

                {parentProject && (
                    <div className="mb-4 bg-slate-50 p-2 rounded text-sm text-slate-600">
                        Adicionando à ação: <b>{parentProject?.actionName}</b>
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

                {/* Informação de Propagação */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded border border-amber-100 text-xs text-amber-800 mb-2">
                    <GlobalOutlined className="mt-1" />
                    <div>
                        Atenção: Se houver colisão e você escolher "Impactar Prazo", <b>todas as ações</b> onde o responsável selecionado estiver alocado durante este período serão adiadas automaticamente.
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button onClick={onCancel}>Cancelar</Button>
                    <Button type="primary" htmlType="submit" className="bg-indigo-600">Verificar e Adicionar</Button>
                </div>
            </Form>
        </Modal>
    );
};

export default LooseTaskModal;
