# Block 后端服务

Block 后端服务为微前端应用提供金字塔数据管理 API。

## 功能特性

- 🏗️ 金字塔数据 CRUD 操作
- 📊 SQLite 数据库存储
- 🔄 RESTful API 接口
- 🌐 CORS 跨域支持
- 📝 完整的错误处理

## 技术栈

- **Node.js** - 运行时环境
- **Express.js** - Web 框架
- **SQLite3** - 数据库
- **UUID** - 唯一标识符生成

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run init-db
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3000` 启动

## API 接口

### 基础信息

- **基础URL**: `http://localhost:3000`
- **内容类型**: `application/json`

### 金字塔管理

#### 创建金字塔
```http
POST /api/pyramids
Content-Type: application/json

{
  "name": "金字塔名称",
  "levels": 3,
  "levelData": [
    { "text": "顶层", "color": "#ff6b6b" },
    { "text": "中层", "color": "#4ecdc4" },
    { "text": "底层", "color": "#45b7d1" }
  ]
}
```

#### 获取所有金字塔
```http
GET /api/pyramids
```

#### 获取指定金字塔
```http
GET /api/pyramids/{id}
```

#### 更新金字塔
```http
PUT /api/pyramids/{id}
Content-Type: application/json

{
  "name": "更新后的名称",
  "levels": 4,
  "levelData": [...]
}
```

#### 删除金字塔
```http
DELETE /api/pyramids/{id}
```

### 健康检查

```http
GET /health
```

## 数据结构

### 金字塔对象

```typescript
interface Pyramid {
  id: string;           // 唯一标识符
  name: string;         // 金字塔名称
  levels: number;       // 层级数量
  levelData: Level[];   // 层级数据
  createdAt: string;    // 创建时间
  updatedAt: string;    // 更新时间
}

interface Level {
  text: string;         // 层级文本
  color: string;        // 层级颜色
}
```

## 开发说明

### 项目结构

```
block-end/
├── src/
│   ├── controllers/    # 控制器
│   ├── models/         # 数据模型
│   ├── routes/         # 路由定义
│   ├── scripts/        # 脚本工具
│   └── app.js          # 应用入口
├── database/           # 数据库文件
├── package.json
└── README.md
```

### 环境变量

- `PORT`: 服务端口 (默认: 3000)
- `NODE_ENV`: 运行环境 (development/production)

## 许可证

MIT License

















