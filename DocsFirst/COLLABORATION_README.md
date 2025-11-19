# DocsFirst 协同编辑服务器

## 概述

DocsFirst 协同服务器基于 Hocuspocus 构建，为 DocsFirst 提供实时协同编辑功能。

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
npm run server
```

或者

```bash
npm run start:collaboration
```

### 方式2: 同时启动协同服务器和开发服务器

```bash
npm run dev:full
```

这将同时启动：
- 协同服务器 (端口 1234)
- Vite 开发服务器 (端口 5173)

### 方式3: 分别启动（推荐用于开发）

1. **启动协同服务器**:
   ```bash
   npm run server
   ```

2. **启动开发服务器**（新终端窗口）:
   ```bash
   npm run dev
   ```

## 服务配置

- **端口**: 1234
- **服务地址**: ws://localhost:1234
- **服务名称**: docsfirst-collaboration-server

## 使用说明

1. 启动协同服务器
2. 启动开发服务器
3. 在浏览器中打开应用（通常是 http://localhost:5173）
4. 打开多个浏览器窗口测试协同编辑功能

## 服务器事件

### 用户认证
```javascript
async onAuthenticate(data) {
  // 处理用户认证
  return {
    user: {
      name: userName,
      color: `#${随机颜色}`
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
- 🔐 用户认证请求
- ✅ 新连接建立
- ❌ 连接断开
- 📄 文档加载
- 💾 文档保存
- 🔄 WebSocket升级

## 故障排除

### 端口被占用
如果端口 1234 被占用，可以修改 `collaboration-server.js` 中的端口号：

```javascript
const server = new Hocuspocus({
  port: 1234, // 修改为其他端口，如 1235
  // ...
});
```

同时需要更新 `App.tsx` 中的连接地址：

```typescript
host="ws://localhost:1235" // 对应新的端口
```

### WebSocket 连接失败
1. 确保协同服务器正在运行
2. 检查防火墙设置
3. 确认端口没有被其他程序占用
4. 检查浏览器控制台的错误信息

## 技术栈

- **@hocuspocus/server**: 协同编辑服务器
- **@hocuspocus/extension-logger**: 日志扩展
- **Yjs**: 协同数据结构
- **WebSocket**: 实时通信










