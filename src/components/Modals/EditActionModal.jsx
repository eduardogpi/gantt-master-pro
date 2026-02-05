import React from 'react';
import { Modal, Form, Input, Slider, Button, DatePicker, Select, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

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
 * Modal para editar ou criar uma ação
 */
const EditActionModal = ({
    visible,
    item,
    isNew,
    onCancel,
    onFinish
}) => {
    const isMobile = useIsMobile();
    
    if (!visible || !item) return null;

    return (
        <Modal
            title={isNew ? "Nova Ação" : "Editar Detalhes"}
            open={visible}
            onCancel={onCancel}
            footer={null}
            destroyOnClose
            centered={!isMobile}
            width={isMobile ? '100%' : 520}
            style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw' } : undefined}
            styles={isMobile ? { content: { borderRadius: 0 } } : undefined}
        >
            <Form 
                layout="vertical" 
                initialValues={{
                    actionName: item.actionName,
                    percent: item.percent,
                    developers: item.developers.map(d => d.name).join(', '),
                    externalDependencies: item.externalDependencies ? item.externalDependencies.map(d => ({
                        ...d,
                        date: dayjs(d.date)
                    })) : []
                }} 
                onFinish={onFinish}
            >
                <Form.Item name="actionName" label="Nome" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="percent" label="Progresso">
                    <Slider min={0} max={100} />
                </Form.Item>
                <Form.Item name="developers" label="Desenvolvedores">
                    <Input placeholder="Ex: João, Maria" />
                </Form.Item>

                {/* Seção de Dependências Externas */}
                <div className="mb-4">
                    <div className="text-sm font-bold mb-2 text-slate-600 dark:text-slate-400">Dependências Externas</div>
                    <Form.List name="externalDependencies">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'id']}
                                            hidden
                                        >
                                            <Input />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'name']}
                                            rules={[{ required: true, message: 'Nome obrigatório' }]}
                                        >
                                            <Input placeholder="Nome da Dependência" />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'date']}
                                            rules={[{ required: true, message: 'Data obrigatória' }]}
                                        >
                                            <DatePicker format="DD/MM/YYYY" placeholder="Data Prevista" />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'status']}
                                            initialValue="pending"
                                        >
                                            <Select style={{ width: 110 }}>
                                                <Select.Option value="pending">Pendente</Select.Option>
                                                <Select.Option value="delivered">Entregue</Select.Option>
                                            </Select>
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} className="text-red-500" />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add({ id: Date.now() })} block icon={<PlusOutlined />}>
                                        Adicionar Dependência Externa
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button onClick={onCancel}>Cancelar</Button>
                    <Button type="primary" htmlType="submit" className="bg-indigo-600">Salvar</Button>
                </div>
            </Form>
        </Modal>
    );
};

export default EditActionModal;
