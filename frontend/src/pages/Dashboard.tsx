import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Progress,
  Typography,
  Tag,
  Space
} from 'antd';
import {
  BugOutlined,
  UserOutlined,
  DownloadOutlined,
  RiseOutlined
} from '@ant-design/icons';
import api from '../api/client';
import { StatsOverview, BuildStats, WeeklyTrend } from '../types';

const { Title, Text } = Typography;

const severityColors: Record<string, string> = {
  CRITICAL: '#ff4d4f',
  HIGH: '#fa8c16',
  MEDIUM: '#faad14',
  LOW: '#1890ff',
};

const severityLabels: Record<string, string> = {
  CRITICAL: '致命',
  HIGH: '严重',
  MEDIUM: '中等',
  LOW: '轻微',
};

const typeColors: Record<string, string> = {
  BUG: '#ff4d4f',
  BALANCE: '#faad14',
  SUGGESTION: '#52c41a',
};

const typeLabels: Record<string, string> = {
  BUG: 'Bug',
  BALANCE: '平衡性',
  SUGGESTION: '体验建议',
};

const statusLabels: Record<string, string> = {
  NEW: '新建',
  CONFIRMED: '已确认',
  IN_PROGRESS: '修复中',
  PENDING_VERIFICATION: '待验证',
  CLOSED: '已关闭',
};

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [buildStats, setBuildStats] = useState<BuildStats[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, buildRes, trendRes] = await Promise.all([
        api.get('/stats/overview'),
        api.get('/stats/feedbacks-by-version'),
        api.get('/stats/weekly-trend'),
      ]);
      setOverview(overviewRes.data);
      setBuildStats(buildRes.data);
      setWeeklyTrend(trendRes.data);
    } catch (error) {
      console.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (version: string) => <strong>v{version}</strong>,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
    },
    {
      title: '下载量',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
    },
    {
      title: '反馈数',
      dataIndex: 'feedbackCount',
      key: 'feedbackCount',
    },
    {
      title: '反馈密度',
      key: 'density',
      render: (_: any, record: BuildStats) => {
        const density = parseFloat(record.feedbackDensity as any);
        let color = '#52c41a';
        if (density > 20) color = '#ff4d4f';
        else if (density > 10) color = '#faad14';
        
        return (
          <Space>
            <Progress 
              percent={Math.min(density, 100)} 
              size="small" 
              strokeColor={color}
              style={{ width: 120 }}
            />
            <Text style={{ color }}>{density}%</Text>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>数据面板</Title>
        <Text type="secondary">查看平台整体数据和趋势</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="总反馈数"
              value={overview?.totalFeedbacks || 0}
              prefix={<BugOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="本周新增"
              value={overview?.weeklyNewFeedbacks || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="版本数"
              value={overview?.totalBuilds || 0}
              prefix={<DownloadOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="测试人数"
              value={overview?.totalTesters || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card title="严重等级分布" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {overview?.severityDistribution.map((item: any) => (
                <div key={item.severity}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text>{severityLabels[item.severity]}</Text>
                    <Text strong>{item._count}</Text>
                  </div>
                  <Progress 
                    percent={overview.totalFeedbacks ? (item._count / overview.totalFeedbacks * 100).toFixed(1) as any : 0}
                    strokeColor={severityColors[item.severity]}
                    showInfo={false}
                  />
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="反馈类型分布" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {overview?.typeDistribution.map((item: any) => (
                <div key={item.type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text>{typeLabels[item.type]}</Text>
                    <Text strong>{item._count}</Text>
                  </div>
                  <Progress 
                    percent={overview.totalFeedbacks ? (item._count / overview.totalFeedbacks * 100).toFixed(1) as any : 0}
                    strokeColor={typeColors[item.type]}
                    showInfo={false}
                  />
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="状态分布" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {overview?.statusDistribution.map((item: any) => (
                <div key={item.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag>{statusLabels[item.status]}</Tag>
                  <Text strong>{item._count}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="各版本反馈密度" loading={loading}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          反馈密度 = 反馈数 / 下载量 × 100%。密度越低说明版本越稳定。
        </Text>
        <Table
          columns={columns}
          dataSource={buildStats}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
