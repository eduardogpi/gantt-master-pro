import React from 'react';
import { Modal, Button } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

/**
 * Modal de boas-vindas exibido na primeira visita
 */
const WelcomeModal = ({
    visible,
    onClose
}) => {
    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <WarningOutlined className="text-blue-500" /> 
                    Dados de Exemplo
                </div>
            }
            open={visible}
            onOk={onClose}
            onCancel={onClose}
            footer={[
                <Button key="ok" type="primary" onClick={onClose} className="bg-indigo-600">
                    Entendi
                </Button>
            ]}
            centered
        >
            <p>Bem-vindo ao <b>Gantt Master Pro</b>.</p>
            <p className="mt-2">
                Os dados apresentados nesta tela são <b>fictícios</b> e gerados automaticamente 
                apenas para fins de demonstração das funcionalidades do sistema.
            </p>
            <p className="mt-2 text-slate-500 text-sm">
                Você pode editar, mover e excluir itens livremente para testar a aplicação.
            </p>
        </Modal>
    );
};

export default WelcomeModal;
