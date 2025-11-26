import React from 'react';
import { Modal, List } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

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
 * Modal para resumo de alterações antes de salvar
 */
const SaveChangesModal = ({
    visible,
    changesList,
    onConfirm,
    onCancel
}) => {
    const isMobile = useIsMobile();
    
    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <SaveOutlined className="text-blue-600" /> 
                    Resumo de Alterações
                </div>
            }
            open={visible}
            onOk={onConfirm}
            onCancel={onCancel}
            okText="Salvar"
            cancelText="Voltar"
            centered={!isMobile}
            width={isMobile ? '100%' : 600}
            style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw' } : undefined}
            styles={isMobile ? { 
                body: { maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' },
                content: { borderRadius: 0 }
            } : undefined}
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
    );
};

export default SaveChangesModal;
