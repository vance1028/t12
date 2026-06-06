# 游戏众测平台

一个专为独立游戏工作室设计的众测平台，用于管理游戏版本分发和结构化反馈收集。

## 功能特性

### 版本分发
- 上传构建包，支持版本号、平台、更新日志、强制更新标记
- 按测试组分发，不同测试组看到不同的构建版本
- 下载量和活跃测试人数统计
- 支持 Windows、macOS、Linux、Android、iOS 多平台

### 结构化反馈
- 测试者提交反馈时可选类型（Bug、平衡性、体验建议）
- 严重程度分级（致命、严重、中等、轻微）
- 关联游戏版本和关卡场景
- 支持上传截图和存档文件作为附件
- 反馈状态机：新建 → 已确认 → 修复中 → 待验证 → 已关闭
- 修复完成后标记「待验证」，对应测试者会收到复测提醒
- 支持标签、筛选、排序

### 数据面板
- 本周新增反馈数统计
- 各严重等级分布
- 各版本反馈密度（帮助判断版本稳定性）
- 反馈类型和状态分布

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Ant Design
- **后端**: Node.js + Express + Prisma ORM
- **数据库**: PostgreSQL 15
- **部署**: Docker Compose
- **文件存储**: 本地 Docker 卷

## 快速启动

### 使用 Docker Compose（推荐）

```bash
# 克隆项目后，在项目根目录执行
docker-compose up -d --build
```

启动后访问：
- 前端: http://localhost:5261
- 后端 API: http://localhost:6371

### 测试账号

系统启动后会自动创建以下测试账号：

| 用户名 | 密码 | 角色 | 所属测试组 |
|--------|------|------|------------|
| admin | admin123 | 管理员 | - |
| tester1 | tester123 | 测试员 | 主线剧情组 |
| tester2 | tester123 | 测试员 | 性能压测组 |

## 项目结构

```
.
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── middleware/     # 中间件
│   │   ├── server.js       # 服务入口
│   │   └── seed.js         # 种子数据
│   ├── prisma/
│   │   └── schema.prisma   # 数据库 Schema
│   ├── Dockerfile
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── components/     # 公共组件
│   │   ├── contexts/       # React Context
│   │   ├── api/            # API 客户端
│   │   └── types/          # TypeScript 类型
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Docker 编排配置
└── README.md
```

## 核心设计

### 反馈状态机

```
NEW (新建) 
  → CONFIRMED (已确认) 
    → IN_PROGRESS (修复中) 
      → PENDING_VERIFICATION (待验证) 
        → CLOSED (已关闭)
```

各状态之间的转换严格限制，确保反馈流程规范可控。

### 版本-测试组关系

通过 `BuildTestGroup` 中间表实现多对多关系：
- 一个构建版本可以分配给多个测试组
- 一个测试组可以访问多个构建版本
- 测试者只能看到自己所属测试组的构建版本

## 本地开发

### 后端开发

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

注意：本地开发需要先启动 PostgreSQL 数据库。
