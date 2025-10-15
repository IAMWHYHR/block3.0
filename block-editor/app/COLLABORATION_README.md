# Block Editor 协同服务器

## 概述

Block Editor 协同服务器基于 Hocuspocus 构建，为 Block Editor 提供实时协同编辑功能。

## 功能特性

- ✅ 实时协同编辑
- ✅ 用户认证
- ✅ 文档管理
- ✅ 日志记录
- ✅ 自动重连

## 安装依赖

```bash
npm install
```

## 启动方式

### 方式1: 只启动协同服务器

```bash
npm run collaboration
```

或者

```bash
npm run start:collaboration
```

### 方式2: 同时启动协同服务器和开发服务器

```bash
npm run dev:full
```

### 方式3: 使用批处理文件 (Windows)

```bash
start-collaboration.bat
```

## 服务配置

- **端口**: 1234
- **服务地址**: ws://localhost:1234
- **服务名称**: block-editor-collaboration-server

## 使用说明

1. 启动协同服务器
2. 在 Block Editor 中配置协同参数：
   ```typescript
   <Editor
     microName="my-editor"
     wsUrl="ws://localhost:1234"
     roomName="my-room"
     enableCollaboration={true}
     useHocuspocus={true}
   />
   ```

## 服务器事件

### 用户认证
```javascript
async onAuthenticate(data) {
  // 处理用户认证
  return {
    user: {
      name: data.token || 'Anonymous',
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    }
  };
}
```

### 文档加载
```javascript
async onLoadDocument(data) {
  console.log(`文档加载: ${data.documentName}`);
  return null; // 返回 null 表示创建新文档
}
```

### 文档保存
```javascript
async onStoreDocument(data) {
  console.log(`文档保存: ${data.documentName}`);
  // 这里可以添加持久化逻辑
}
```

## 日志

服务器会输出详细的日志信息，包括：
- 用户连接/断开
- 文档操作
- 错误信息

## 故障排除

### 端口被占用
如果端口 1234 被占用，可以修改 `collaboration-server.js` 中的端口号：

```javascript
const server = new Server({
  port: 1235, // 修改端口号
  // ...
});
```

### 连接失败
确保：
1. 协同服务器正在运行
2. 防火墙允许端口 1234
3. 客户端配置正确的 WebSocket 地址

## 开发

### 自定义扩展
可以在 `collaboration-server.js` 中添加更多 Hocuspocus 扩展：

```javascript
const { Database } = require('@hocuspocus/extension-database');

const server = new Server({
  extensions: [
    new Logger(),
    new Database(), // 添加数据库扩展
  ],
  // ...
});
```

### 持久化存储
在 `onStoreDocument` 和 `onLoadDocument` 中实现文档的持久化存储。
