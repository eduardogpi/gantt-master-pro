import React from 'react';
import { Modal, Form, Input, Slider, Button } from 'antd';

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
                    developers: item.developers.map(d => d.name).join(', ')
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
                <div className="flex justify-end gap-2 mt-4">
                    <Button onClick={onCancel}>Cancelar</Button>
                    <Button type="primary" htmlType="submit" className="bg-indigo-600">Salvar</Button>
                </div>
            </Form>
        </Modal>
    );
};

export default EditActionModal;
