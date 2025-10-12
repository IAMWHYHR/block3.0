# MainApp3 协同编辑功能

## 功能概述

MainApp3 现在支持基于 Hocuspocus、Yjs 和 y-prosemirror 的实时协同编辑功能。多个用户可以同时编辑同一个文档，实时看到其他用户的编辑内容和光标位置。

## 技术栈

- **Hocuspocus**: 协同编辑服务器
- **Yjs**: 协同数据结构
- **y-prosemirror**: ProseMirror 协同编辑集成
- **Tiptap**: 富文本编辑器
- **WebSocket**: 实时通信

## 启动方式

### 方式一：分别启动（推荐用于开发）

1. **启动协同服务器**:
   ```bash
   cd MainApp3
   npm run collaboration-server
   ```

2. **启动主应用**:
   ```bash
   cd MainApp3
   npm start
   ```

### 方式二：同时启动

```bash
cd MainApp3
npm run start:collaboration
```

## 功能特性

### 1. 实时协同编辑
- 多个用户可以同时编辑文档
- 所有编辑操作实时同步到所有连接的客户端
- 支持文本、格式、链接等所有 Tiptap 功能

### 2. 协同光标
- 显示其他用户的光标位置
- 每个用户有独特的颜色标识
- 实时显示用户名称

### 3. 状态指示
- 连接状态指示器（绿色=已连接，黄色=连接中，红色=已断开）
- 在线用户列表
- 用户颜色标识

### 4. 微应用集成
- 支持在协同编辑中插入微应用
- 微应用内容也会同步到所有用户

## 使用方法

1. **访问应用**: 打开 `http://localhost:7500`
2. **开始编辑**: 在编辑器中输入内容
3. **多窗口测试**: 打开多个浏览器窗口访问同一地址
4. **观察协同**: 在一个窗口中编辑，其他窗口会实时看到变化

## 服务器配置

### 协同服务器 (端口 1234)
- 处理 WebSocket 连接
- 管理文档状态
- 用户认证和权限控制
- 文档持久化（可选）

### 主应用服务器 (端口 7500)
- 提供前端应用
- 集成 Tiptap 编辑器
- 微应用加载

## 自定义配置

### 修改协同服务器端口
编辑 `collaboration-server.js`:
```javascript
const server = new Server({
  port: 1234, // 修改为其他端口
  // ...
});
```

### 修改文档名称
编辑 `src/collaboration.js`:
```javascript
export const provider = new HocuspocusProvider({
  name: 'mainapp3-editor', // 修改文档名称
  // ...
});
```

### 添加用户认证
编辑 `collaboration-server.js` 的 `onAuthenticate` 方法:
```javascript
async onAuthenticate(data) {
  // 添加您的认证逻辑
  const token = data.token;
  const user = await validateUser(token);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return { user };
}
```

## 故障排除

### 协同服务器无法启动
1. 检查端口 1234 是否被占用
2. 确保已安装所有依赖: `npm install`
3. 查看控制台错误信息

### 协同编辑不工作
1. 确保协同服务器正在运行
2. 检查浏览器控制台是否有 WebSocket 连接错误
3. 确保防火墙允许端口 1234 的 WebSocket 连接

### 微应用加载问题
1. 确保微应用服务器正在运行
2. 检查 CORS 配置
3. 查看浏览器网络面板的错误信息

## 开发说明

### 添加新的协同功能
1. 在 `src/collaboration.js` 中配置 Yjs 文档结构
2. 在 `src/components/Editor.jsx` 中添加 Tiptap 扩展
3. 在 `collaboration-server.js` 中处理服务器端逻辑

### 调试协同编辑
- 打开浏览器开发者工具
- 查看 WebSocket 连接状态
- 监控 Yjs 文档变化
- 检查 Hocuspocus 服务器日志

## 性能优化

1. **文档大小限制**: 对于大型文档，考虑分页或虚拟滚动
2. **用户数量限制**: 设置最大并发用户数
3. **网络优化**: 使用 CDN 和压缩
4. **内存管理**: 定期清理未使用的文档

## 安全考虑

1. **用户认证**: 实现适当的用户认证机制
2. **权限控制**: 限制用户对文档的访问权限
3. **数据验证**: 验证客户端发送的数据
4. **速率限制**: 防止恶意用户发送过多请求

## 部署建议

1. **生产环境**: 使用 PM2 或 Docker 管理进程
2. **负载均衡**: 使用 Redis 或 PostgreSQL 作为共享存储
3. **监控**: 添加日志和监控系统
4. **备份**: 定期备份文档数据
