import React from 'react';
import { Modal, Input, message } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { TextArea } = Input;

/**
 * Modal para justificar alterações de cronograma (auditoria)
 */
const AuditModal = ({
    visible,
    details,
    reason,
    onReasonChange,
    onConfirm,
    onCancel
}) => {
    const handleOk = () => {
        if (!reason.trim()) {
            message.error("Motivo obrigatório.");
            return;
        }
        onConfirm();
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <WarningOutlined className="text-yellow-500" /> 
                    Confirmar Alteração
                </div>
            }
            open={visible}
            onOk={handleOk}
            onCancel={onCancel}
            okText="Confirmar"
            cancelText="Cancelar"
            centered
        >
            <div className="flex flex-col gap-4 pt-2">
                <div className="bg-slate-100 p-3 rounded text-slate-700 border border-slate-200 text-sm">
                    {details}
                </div>
                <div>
                    <label className="font-semibold text-sm mb-1 block">Motivo da Mudança:</label>
                    <TextArea 
                        rows={3} 
                        placeholder="Justificativa..." 
                        value={reason} 
                        onChange={e => onReasonChange(e.target.value)} 
                    />
                </div>
            </div>
        </Modal>
    );
};

export default AuditModal;
