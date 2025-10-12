# 金字塔微应用协同编辑功能

## 功能概述

MainApp3 现在支持金字塔微应用的协同编辑功能。当您在 MainApp3 中加载金字塔微应用时，多个用户可以同时编辑金字塔内容，并且所有修改都会实时同步到访问 MainApp3 的其他页面。

## 技术架构

### 协同服务器
- **Hocuspocus 服务器**: `ws://localhost:1234`
- **文档名称**: `pyramid-microapp`
- **数据存储**: Yjs 文档结构

### 数据同步
- **共享数据**: `pyramidData` (Map 结构)
- **金字塔列表**: `pyramidList` (Array 结构)
- **用户状态**: `pyramidAwareness` (用户光标、选择等)

## 功能特性

### 1. 实时数据同步
- 金字塔数据实时同步到所有连接的客户端
- 支持金字塔列表的增删改查操作
- 数据变更自动推送到所有用户

### 2. 用户状态管理
- 显示在线用户列表
- 每个用户有独特的颜色标识
- 实时显示用户活动状态

### 3. 协同状态指示
- 连接状态指示器
- 在线用户数量显示
- 协同状态实时更新

## 使用方法

### 1. 启动服务
```bash
# 启动协同服务器
cd MainApp3
npm run collaboration-server

# 启动主应用
cd MainApp3
npm start
```

### 2. 加载金字塔微应用
1. 访问 `http://localhost:7500`
2. 点击工具栏中的"金字塔"按钮
3. 金字塔微应用将自动加载并建立协同连接

### 3. 测试协同编辑
1. 打开多个浏览器窗口访问 `http://localhost:7500`
2. 在每个窗口中加载金字塔微应用
3. 在一个窗口中修改金字塔内容
4. 其他窗口会实时看到变化

## API 接口

### 数据操作
```javascript
// 更新金字塔数据
updatePyramidData(key, value)

// 获取金字塔数据
getPyramidData(key)

// 添加金字塔到列表
addPyramidToList(pyramid)

// 更新金字塔列表项
updatePyramidInList(index, pyramid)

// 从列表中删除金字塔
removePyramidFromList(index)
```

### 用户管理
```javascript
// 设置用户信息
setPyramidUser(userInfo)

// 获取在线用户
getPyramidOnlineUsers()
```

### 事件监听
```javascript
// 监听数据变化
onPyramidDataChange(callback)

// 监听列表变化
onPyramidListChange(callback)

// 监听用户变化
onPyramidUsersChange(callback)
```

## 微应用集成

### 在金字塔微应用中使用协同功能

金字塔微应用可以通过 props 接收协同相关的方法和数据：

```javascript
// 在金字塔微应用中
const {
  pyramidProvider,
  pyramidSharedData,
  pyramidList,
  pyramidData,
  pyramidListData,
  pyramidOnlineUsers,
  pyramidCollaborationStatus,
  updatePyramidData,
  getPyramidData,
  addPyramidToList,
  updatePyramidInList,
  removePyramidFromList,
  setPyramidUser
} = props;

// 使用协同功能
updatePyramidData('currentPyramid', newPyramidData);
```

## 配置选项

### 协同服务器配置
```javascript
// 在 pyramid-collaboration.js 中
export const pyramidProvider = new HocuspocusProvider({
  url: 'ws://localhost:1234',
  name: 'pyramid-microapp',
  document: pyramidYdoc,
  // 其他配置...
});
```

### 用户信息配置
```javascript
setPyramidUser({
  name: '用户名',
  color: '#FF0000',
  cursor: { x: 100, y: 200 }
});
```

## 故障排除

### 协同连接失败
1. 确保协同服务器正在运行 (`ws://localhost:1234`)
2. 检查网络连接
3. 查看浏览器控制台错误信息

### 数据不同步
1. 检查金字塔微应用是否正确接收 props
2. 确保调用了正确的协同方法
3. 查看协同状态指示器

### 用户状态异常
1. 检查用户信息是否正确设置
2. 确保 awareness 对象正常工作
3. 查看用户变化监听器

## 性能优化

### 数据同步优化
1. **批量更新**: 将多个数据变更合并为一次更新
2. **增量同步**: 只同步变更的数据部分
3. **压缩传输**: 使用数据压缩减少网络传输

### 内存管理
1. **及时清理**: 组件卸载时清理监听器
2. **数据限制**: 限制单个文档的数据大小
3. **用户限制**: 设置最大并发用户数

## 安全考虑

### 数据验证
1. **输入验证**: 验证所有用户输入数据
2. **权限控制**: 限制用户对数据的访问权限
3. **数据加密**: 敏感数据加密传输

### 用户管理
1. **身份认证**: 实现用户身份验证
2. **权限分级**: 不同用户有不同的操作权限
3. **操作审计**: 记录用户操作日志

## 扩展功能

### 未来可扩展的功能
1. **版本控制**: 文档版本历史管理
2. **冲突解决**: 自动解决编辑冲突
3. **离线支持**: 离线编辑和同步
4. **实时通信**: 用户间实时消息
5. **文档锁定**: 防止同时编辑同一部分

## 开发指南

### 添加新的协同功能
1. 在 `pyramid-collaboration.js` 中定义新的数据结构和方法
2. 在 `SkeletonNodeView.jsx` 中传递新的 props
3. 在金字塔微应用中实现新的协同逻辑

### 调试协同功能
1. 使用浏览器开发者工具查看网络请求
2. 监控 Yjs 文档变化
3. 查看 Hocuspocus 服务器日志
4. 使用协同状态指示器监控连接状态
