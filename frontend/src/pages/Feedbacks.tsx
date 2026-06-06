import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Typography,
  Badge,
  Drawer,
  Descriptions,
  Timeline,
  Card
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  BugOutlined,
  ThunderboltOutlined,
  BulbOutlined
} from '@ant-design/icons';
import api from '../api/client';
import { Feedback, Build, FeedbackAttachment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const statusColors: Record<string, string> = {
  NEW: 'blue',
  CONFIRMED: 'orange',
  IN_PROGRESS: 'cyan',
  PENDING_VERIFICATION: 'purple',
  CLOSED: 'green',
};

const statusLabels: Record<string, string> = {
  NEW: '新建',
  CONFIRMED: '已确认',
  IN_PROGRESS: '修复中',
  PENDING_VERIFICATION: '待验证',
  CLOSED: '已关闭',
};

const severityColors: Record<string, string> = {
  CRITICAL: 'red',
  HIGH: 'orange',
  MEDIUM: 'gold',
  LOW: 'blue',
};

const severityLabels: Record<string, string> = {
  CRITICAL: '致命',
  HIGH: '严重',
  MEDIUM: '中等',
  LOW: '轻微',
};

const typeIcons: Record<string, React.ReactNode> = {
  BUG: <BugOutlined />,
  BALANCE: <ThunderboltOutlined />,
  SUGGESTION: <BulbOutlined />,
};

const typeLabels: Record<string, string> = {
  BUG: 'Bug',
  BALANCE: '平衡性',
  SUGGESTION: '体验建议',
};

const Feedbacks: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const { user } = useAuth();

  const fetchFeedbacks = async (params: any = {}) => {
    setLoading(true);
    try {
      const response = await api.get('/feedbacks', { params: { ...filters, ...params } });
      setFeedbacks(response.data);
    } catch (error) {
      message.error('获取反馈列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuilds = async () => {
    try {
      const response = await api.get('/builds');
      setBuilds(response.data);
    } catch (error) {
      console.error('获取版本列表失败');
    }
  };

  useEffect(() => {
    fetchFeedbacks();
    fetchBuilds();
  }, []);

  const handleSubmit = async (values: any) => {
    const formData = new FormData();
    formData.append('type', values.type);
    formData.append('severity', values.severity);
    formData.append('title', values.title);
    formData.append('description', values.description);
    formData.append('levelScene', values.levelScene || '');
    if (values.buildId) formData.append('buildId', values.buildId);
    formData.append('tags', JSON.stringify(values.tags || []));
    
    const attachments = values.attachments?.fileList || values.attachments;
    if (Array.isArray(attachments) && attachments.length > 0) {
      attachments.forEach((file: any) => {
        if (file.originFileObj) {
          formData.append('attachments', file.originFileObj);
        }
      });
    }

    try {
      await api.post('/feedbacks', formData);
      message.success('反馈提交成功');
      setModalVisible(false);
      form.resetFields();
      fetchFeedbacks();
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    }
  };

  const handleStatusChange = async (values: any) => {
    if (!selectedFeedback) return;
    
    try {
      await api.patch(`/feedbacks/${selectedFeedback.id}/status`, {
        newStatus: values.newStatus,
        comment: values.comment,
        verifiedBuildId: values.verifiedBuildId,
      });
      message.success('状态更新成功');
      setStatusModalVisible(false);
      statusForm.resetFields();
      fetchFeedbacks();
      if (detailVisible) {
        fetchDetail(selectedFeedback.id);
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '更新失败');
    }
  };

  const fetchDetail = async (id: number) => {
    try {
      const response = await api.get(`/feedbacks/${id}`);
      setSelectedFeedback(response.data);
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  const showDetail = async (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    await fetchDetail(feedback.id);
    setDetailVisible(true);
  };

  const showStatusModal = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    statusForm.setFieldsValue({
      newStatus: feedback.status,
      comment: '',
    });
    setStatusModalVisible(true);
  };

  const handleDownloadAttachment = async (feedbackId: number, attachmentId: number, fileName: string) => {
    try {
      const response = await api.get(
        `/feedbacks/${feedbackId}/attachments/${attachmentId}/download`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('下载失败');
    }
  };

  const getNextStatusOptions = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      NEW: ['CONFIRMED', 'CLOSED'],
      CONFIRMED: ['IN_PROGRESS', 'CLOSED'],
      IN_PROGRESS: ['PENDING_VERIFICATION', 'CLOSED'],
      PENDING_VERIFICATION: ['CLOSED', 'CONFIRMED'],
      CLOSED: ['CONFIRMED'],
    };
    
    const options = transitions[currentStatus] || [];
    return options.map(s => ({ label: statusLabels[s], value: s }));
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Space>
          {typeIcons[type]}
          <span>{typeLabels[type]}</span>
        </Space>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Feedback) => (
        <a onClick={() => showDetail(record)}>{title}</a>
      ),
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Tag color={severityColors[severity]}>
          {severityLabels[severity]}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      ),
    },
    {
      title: '版本',
      dataIndex: ['build', 'version'],
      key: 'build',
      width: 100,
      render: (version: string) => version ? `v${version}` : '-',
    },
    {
      title: '提交者',
      dataIndex: ['author', 'username'],
      key: 'author',
      width: 100,
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Feedback) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)}>
            详情
          </Button>
          {(user?.role === 'ADMIN' || record.authorId === user?.id) && (
            <Button 
              type="link" 
              size="small" 
              icon={<SyncOutlined />} 
              onClick={() => showStatusModal(record)}
            >
              状态
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>反馈看板</Title>
          <Text type="secondary">提交和跟踪游戏测试反馈</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          提交反馈
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="状态筛选"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => {
              setFilters({ ...filters, status: value });
              fetchFeedbacks({ ...filters, status: value });
            }}
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
          <Select
            placeholder="类型筛选"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => {
              setFilters({ ...filters, type: value });
              fetchFeedbacks({ ...filters, type: value });
            }}
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
          <Select
            placeholder="严重程度"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => {
              setFilters({ ...filters, severity: value });
              fetchFeedbacks({ ...filters, severity: value });
            }}
          >
            {Object.entries(severityLabels).map(([value, label]) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
          <Button onClick={() => {
            setFilters({});
            fetchFeedbacks({});
          }}>
            重置筛选
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={feedbacks}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="提交反馈"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="type"
            label="反馈类型"
            rules={[{ required: true, message: '请选择反馈类型' }]}
          >
            <Select placeholder="选择类型">
              <Option value="BUG">Bug</Option>
              <Option value="BALANCE">平衡性问题</Option>
              <Option value="SUGGESTION">体验建议</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="severity"
            label="严重程度"
            rules={[{ required: true, message: '请选择严重程度' }]}
          >
            <Select placeholder="选择严重程度">
              <Option value="CRITICAL">致命 - 游戏崩溃、无法继续</Option>
              <Option value="HIGH">严重 - 核心功能异常</Option>
              <Option value="MEDIUM">中等 - 一般功能问题</Option>
              <Option value="LOW">轻微 - UI/文字等小问题</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="简要描述问题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="详细描述"
            rules={[{ required: true, message: '请输入详细描述' }]}
          >
            <TextArea rows={4} placeholder="详细描述问题的复现步骤、期望结果等..." />
          </Form.Item>

          <Form.Item name="levelScene" label="关卡/场景">
            <Input placeholder="例如：第一章-森林场景" />
          </Form.Item>

          <Form.Item name="buildId" label="游戏版本">
            <Select placeholder="选择出现问题的版本">
              {builds.map(build => (
                <Option key={build.id} value={build.id}>
                  v{build.version} ({build.platform})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后按回车" />
          </Form.Item>

          <Form.Item name="attachments" label="附件（截图、存档等）">
            <Upload beforeUpload={() => false} multiple maxCount={10}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              提交反馈
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="反馈详情"
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {selectedFeedback && (
          <div>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="标题">
                {selectedFeedback.title}
              </Descriptions.Item>
              <Descriptions.Item label="类型">
                <Space>
                  {typeIcons[selectedFeedback.type]}
                  {typeLabels[selectedFeedback.type]}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="严重程度">
                <Tag color={severityColors[selectedFeedback.severity]}>
                  {severityLabels[selectedFeedback.severity]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[selectedFeedback.status]}>
                  {statusLabels[selectedFeedback.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="提交者">
                {selectedFeedback.author?.username}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {dayjs(selectedFeedback.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="版本">
                {selectedFeedback.build ? `v${selectedFeedback.build.version}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="关卡/场景">
                {selectedFeedback.levelScene || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="标签">
                {selectedFeedback.tags?.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Descriptions.Item>
            </Descriptions>

            <Card title="详细描述" size="small" style={{ marginBottom: 16 }}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{selectedFeedback.description}</p>
            </Card>

            {selectedFeedback.verifiedBuild && (
              <Card 
                title="修复版本" 
                size="small" 
                style={{ marginBottom: 16, borderColor: '#52c41a', background: '#f6ffed' }}
              >
                <p style={{ margin: 0 }}>
                  此问题已在 <strong>v{selectedFeedback.verifiedBuild.version}</strong> 版本中标记为修复，请复测确认。
                </p>
              </Card>
            )}

            {selectedFeedback.attachments && selectedFeedback.attachments.length > 0 && (
              <Card title="附件" size="small" style={{ marginBottom: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedFeedback.attachments.map((att: FeedbackAttachment) => (
                    <Button 
                      key={att.id}
                      type="link" 
                      onClick={() => handleDownloadAttachment(
                        selectedFeedback.id, 
                        att.id, 
                        att.fileName
                      )}
                    >
                      📎 {att.fileName}
                    </Button>
                  ))}
                </Space>
              </Card>
            )}

            <Card title="状态历史" size="small">
              <Timeline
                items={selectedFeedback.statusHistory?.map((h: any) => ({
                  color: h.newStatus === 'CLOSED' ? 'green' : 'blue',
                  children: (
                    <div>
                      <p style={{ margin: 0 }}>
                        <Tag color={statusColors[h.newStatus]}>{statusLabels[h.newStatus]}</Tag>
                        {h.comment && <span> - {h.comment}</span>}
                      </p>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(h.changedAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                    </div>
                  ),
                }))}
              />
            </Card>

            {(user?.role === 'ADMIN' || selectedFeedback.authorId === user?.id) && (
              <Button 
                type="primary" 
                block 
                style={{ marginTop: 16 }}
                onClick={() => showStatusModal(selectedFeedback)}
              >
                更新状态
              </Button>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        title="更新状态"
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        footer={null}
      >
        <Form form={statusForm} layout="vertical" onFinish={handleStatusChange}>
          <Form.Item
            name="newStatus"
            label="新状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              {selectedFeedback && getNextStatusOptions(selectedFeedback.status).map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue('newStatus') === 'PENDING_VERIFICATION' && (
                <Form.Item
                  name="verifiedBuildId"
                  label="修复版本"
                  rules={[{ required: true, message: '请选择修复版本' }]}
                >
                  <Select placeholder="选择修复此问题的版本">
                    {builds.map(build => (
                      <Option key={build.id} value={build.id}>
                        v{build.version} ({build.platform})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item name="comment" label="备注">
            <TextArea rows={3} placeholder="可选的状态变更说明" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              确认更新
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Feedbacks;
