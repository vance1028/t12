import React, { useState, useEffect } from 'react';
import { 
  List, 
  Card, 
  Tag, 
  Button, 
  Space, 
  Typography, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Switch, 
  Upload, 
  message,
  Badge
} from 'antd';
import { 
  DownloadOutlined, 
  WindowsOutlined, 
  AppleOutlined, 
  UploadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import api from '../api/client';
import { Build, TestGroup } from '../types';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const platformIcons: Record<string, React.ReactNode> = {
  WINDOWS: <WindowsOutlined />,
  MACOS: <AppleOutlined />,
  LINUX: <span>🐧</span>,
  ANDROID: <span>🤖</span>,
  IOS: <AppleOutlined />,
};

const platformLabels: Record<string, string> = {
  WINDOWS: 'Windows',
  MACOS: 'macOS',
  LINUX: 'Linux',
  ANDROID: 'Android',
  IOS: 'iOS',
};

const Builds: React.FC = () => {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [testGroups, setTestGroups] = useState<TestGroup[]>([]);
  const [form] = Form.useForm();
  const { user } = useAuth();

  const fetchBuilds = async () => {
    setLoading(true);
    try {
      const response = await api.get('/builds');
      setBuilds(response.data);
    } catch (error) {
      message.error('获取版本列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTestGroups = async () => {
    try {
      const response = await api.get('/test-groups');
      setTestGroups(response.data);
    } catch (error) {
      console.error('获取测试组失败');
    }
  };

  useEffect(() => {
    fetchBuilds();
    if (user?.role === 'ADMIN') {
      fetchTestGroups();
    }
  }, [user?.role]);

  const handleDownload = async (buildId: number) => {
    try {
      const response = await api.get(`/builds/${buildId}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', builds.find(b => b.id === buildId)?.fileName || 'build');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('开始下载');
      fetchBuilds();
    } catch (error) {
      message.error('下载失败');
    }
  };

  const handleSubmit = async (values: any) => {
    const formData = new FormData();
    formData.append('version', values.version);
    formData.append('platform', values.platform);
    formData.append('changelog', values.changelog);
    formData.append('isForceUpdate', values.isForceUpdate ? 'true' : 'false');
    formData.append('testGroupIds', JSON.stringify(values.testGroupIds));
    if (values.build && values.build[0]) {
      formData.append('build', values.build[0].originFileObj);
    }

    try {
      await api.post('/builds', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('版本发布成功');
      setModalVisible(false);
      form.resetFields();
      fetchBuilds();
    } catch (error: any) {
      message.error(error.response?.data?.error || '发布失败');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>版本分发</Title>
          <Text type="secondary">查看和下载分配给您的测试版本</Text>
        </div>
        {user?.role === 'ADMIN' && (
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setModalVisible(true)}>
            发布新版本
          </Button>
        )}
      </div>

      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
        dataSource={builds}
        loading={loading}
        renderItem={(build) => (
          <List.Item>
            <Card
              actions={[
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />} 
                  onClick={() => handleDownload(build.id)}
                  block
                >
                  下载
                </Button>
              ]}
            >
              <Card.Meta
                title={
                  <Space>
                    <span style={{ fontSize: 18, fontWeight: 'bold' }}>v{build.version}</span>
                    {build.isForceUpdate && (
                      <Badge count="强制" style={{ backgroundColor: '#ff4d4f' }} />
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space>
                      {platformIcons[build.platform]}
                      <Text>{platformLabels[build.platform]}</Text>
                    </Space>
                    <Text type="secondary">
                      {dayjs(build.uploadedAt).format('YYYY-MM-DD HH:mm')}
                    </Text>
                    <Text type="secondary">
                      大小: {formatFileSize(build.fileSize)}
                    </Text>
                    <Text type="secondary">
                      下载量: {build._count?.downloads || 0}
                    </Text>
                    <div>
                      {build.testGroups?.map((btg: any) => (
                        <Tag key={btg.testGroup.id} color="blue">
                          {btg.testGroup.name}
                        </Tag>
                      ))}
                    </div>
                    <Paragraph 
                      ellipsis={{ rows: 3 }} 
                      style={{ marginTop: 8, marginBottom: 0 }}
                    >
                      {build.changelog}
                    </Paragraph>
                  </Space>
                }
              />
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="发布新版本"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="version"
            label="版本号"
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input placeholder="例如: 1.0.0" />
          </Form.Item>

          <Form.Item
            name="platform"
            label="平台"
            rules={[{ required: true, message: '请选择平台' }]}
          >
            <Select placeholder="选择平台">
              <Option value="WINDOWS">Windows</Option>
              <Option value="MACOS">macOS</Option>
              <Option value="LINUX">Linux</Option>
              <Option value="ANDROID">Android</Option>
              <Option value="IOS">iOS</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="changelog"
            label="更新日志"
            rules={[{ required: true, message: '请输入更新日志' }]}
          >
            <TextArea rows={4} placeholder="描述此版本的更新内容..." />
          </Form.Item>

          <Form.Item
            name="testGroupIds"
            label="分配测试组"
            rules={[{ required: true, message: '请选择测试组' }]}
          >
            <Select mode="multiple" placeholder="选择可以访问此版本的测试组">
              {testGroups.map(group => (
                <Option key={group.id} value={group.id}>{group.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="isForceUpdate"
            label="强制更新"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="build"
            label="构建包"
            rules={[{ required: true, message: '请上传构建包' }]}
          >
            <Upload beforeUpload={() => false} maxCount={1}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              发布版本
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Builds;
