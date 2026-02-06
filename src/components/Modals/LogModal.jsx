import React from 'react';
import { Modal, List, Typography, Tag } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const LogModal = ({ visible, onCancel, logs }) => {
    return (
        <Modal
            title="Logs de Alteração de Dados (Fluxo Backend)"
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={800}
            styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
        >
            <List
                itemLayout="horizontal"
                dataSource={logs}
                renderItem={(item) => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<ClockCircleOutlined className="text-lg text-slate-400 mt-1" />}
                            title={
                                <div className="flex justify-between items-center">
                                    <Text strong>{item.action}</Text>
                                    <Tag color="blue">{dayjs(item.timestamp).format('DD/MM/YYYY HH:mm:ss')}</Tag>
                                </div>
                            }
                            description={
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">{item.description}</div>
                                    <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs font-mono overflow-auto max-h-32 whitespace-pre-wrap">
                                        {JSON.stringify(item.data, null, 2)}
                                    </div>
                                </div>
                            }
                        />
                    </List.Item>
                )}
            />
        </Modal>
    );
};

export default LogModal;
