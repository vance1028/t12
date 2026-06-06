import React, { useState, useEffect } from 'react';
import {
  List,
  Card,
  Button,
  Modal,
  Form,
  Input,
  message,
  Typography,
  Avatar,
  Tag,
  Space,
  Popconfirm,
  Select
} from 'antd';
import {
  TeamOutlined,
  PlusOutlined,
  UserAddOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import api from '../api/client';
import { TestGroup, User } from '../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const TestGroups: React.FC = () => {
  const [testGroups, setTestGroups] = useState<TestGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TestGroup | null>(null);
  const [groupDetail, setGroupDetail] = useState<any>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [form] = Form.useForm();
  const [userForm] = Form.useForm();

  const fetchTestGroups = async () => {
    setLoading(true);
    try {
      const response = await api.get('/test-groups');
      setTestGroups(response.data);
    } catch (error) {
      message.error('获取测试组列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetail = async (id: number) => {
    try {
      const response = await api.get(`/test-groups/${id}`);
      setGroupDetail(response.data);
    } catch (error) {
      message.error('获取测试组详情失败');
    }
  };

  const fetchAvailableUsers = async (groupId: number) => {
    try {
      const response = await api.get(`/test-groups/${groupId}/users/available`);
      setAvailableUsers(response.data);
    } catch (error) {
      console.error('获取可用用户失败');
    }
  };

  useEffect(() => {
    fetchTestGroups();
  }, []);

  const handleCreateGroup = async (values: any) => {
    try {
      await api.post('/test-groups', values);
      message.success('测试组创建成功');
      setModalVisible(false);
      form.resetFields();
      fetchTestGroups();
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建失败');
    }
  };

  const handleAddUsers = async (values: any) => {
    if (!selectedGroup) return;
    
    try {
      await api.post(`/test-groups/${selectedGroup.id}/users`, {
        userIds: values.userIds
      });
      message.success('用户添加成功');
      setUserModalVisible(false);
      userForm.resetFields();
      fetchGroupDetail(selectedGroup.id);
    } catch (error) {
      message.error('添加用户失败');
    }
  };

  const handleRemoveUser = async (groupId: number, userId: number) => {
    try {
      await api.delete(`/test-groups/${groupId}/users/${userId}`);
      message.success('用户已移除');
      fetchGroupDetail(groupId);
    } catch (error) {
      message.error('移除用户失败');
    }
  };

  const showUserModal = async (group: TestGroup) => {
    setSelectedGroup(group);
    await fetchAvailableUsers(group.id);
    await fetchGroupDetail(group.id);
    setUserModalVisible(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>测试组管理</Title>
          <Text type="secondary">管理测试组和分配测试人员</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          创建测试组
        </Button>
      </div>

      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
        dataSource={testGroups}
        loading={loading}
        renderItem={(group) => (
          <List.Item>
            <Card
              actions={[
                <Button 
                  type="link" 
                  icon={<UserAddOutlined />} 
                  onClick={() => showUserModal(group)}
                >
                  管理成员
                </Button>
              ]}
            >
              <Card.Meta
                avatar={<Avatar icon={<TeamOutlined />} />}
                title={group.name}
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                      {group.description || '暂无描述'}
                    </Paragraph>
                    <Space>
                      <Tag color="blue">
                        成员: {(group as any)._count?.users || 0}
                      </Tag>
                      <Tag color="green">
                        版本: {(group as any)._count?.builds || 0}
                      </Tag>
                    </Space>
                  </Space>
                }
              />
            </Card>
          </List.Item>
        )}
      />

      <Modal
        title="创建测试组"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateGroup}>
          <Form.Item
            name="name"
            label="测试组名称"
            rules={[{ required: true, message: '请输入测试组名称' }]}
          >
            <Input placeholder="例如：主线剧情组" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="描述测试组的职责..." />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`管理成员 - ${selectedGroup?.name}`}
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        footer={null}
        width={600}
      >
        {groupDetail && (
          <div>
            <Card 
              title="当前成员" 
              size="small" 
              style={{ marginBottom: 16 }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {groupDetail.users?.length > 0 ? (
                  groupDetail.users.map((utg: any) => (
                    <div 
                      key={utg.userId}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#fafafa',
                        borderRadius: 4
                      }}
                    >
                      <Space>
                        <Avatar size="small">{utg.user.username[0].toUpperCase()}</Avatar>
                        <span>{utg.user.username}</span>
                        {utg.user.email && <Text type="secondary">{utg.user.email}</Text>}
                      </Space>
                      <Popconfirm
                        title="确定移除该用户？"
                        onConfirm={() => handleRemoveUser(selectedGroup!.id, utg.userId)}
                      >
                        <Button 
                          type="text" 
                          danger 
                          size="small" 
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </div>
                  ))
                ) : (
                  <Text type="secondary">暂无成员</Text>
                )}
              </Space>
            </Card>

            <Form form={userForm} layout="vertical" onFinish={handleAddUsers}>
              <Form.Item
                name="userIds"
                label="添加用户"
                rules={[{ required: true, message: '请选择用户' }]}
              >
                <Select mode="multiple" placeholder="选择要添加的用户">
                  {availableUsers.map(user => (
                    <Option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  添加到测试组
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TestGroups;
