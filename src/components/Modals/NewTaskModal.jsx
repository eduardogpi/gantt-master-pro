import React from 'react';
import { Modal, Form, Input, Select, DatePicker, Button } from 'antd';

const { Option } = Select;

/**
 * Modal para criar uma nova tarefa vinculada a uma ação existente
 */
const NewTaskModal = ({
    visible,
    onCancel,
    onFinish,
    data,
    allResponsibles,
    selectedProjectForTask,
    onProjectChange
}) => {
    return (
        <Modal
            title="Nova Tarefa Vinculada"
            open={visible}
            onCancel={onCancel}
            footer={null}
            destroyOnClose
            centered
        >
            <Form layout="vertical" onFinish={onFinish}>
                <Form.Item name="projectId" label="Ação Pai" rules={[{ required: true, message: 'Selecione uma ação' }]}>
                    <Select
                        placeholder="Selecione a ação..."
                        onChange={onProjectChange}
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
                    <Button onClick={onCancel}>Cancelar</Button>
                    <Button type="primary" htmlType="submit" className="bg-indigo-600">Criar Tarefa</Button>
                </div>
            </Form>
        </Modal>
    );
};

export default NewTaskModal;
