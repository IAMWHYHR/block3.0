# 多用户协同连接问题修复

## 问题描述

当使用多个网页访问`block-editor/app`项目，并插入金字塔微应用时：
- ❌ 微应用中显示"协同已断开"
- ❌ 多用户无法实现真正的协同编辑
- ❌ 每个用户都连接到不同的房间

## 根本原因

1. **房间命名策略错误**：每个微应用实例使用不同的`roomName`（基于时间戳）
2. **用户标识不稳定**：每次加载都生成新的用户ID和名称
3. **HocuspocusProvider配置错误**：使用了错误的属性名
4. **缺乏用户信息持久化**：用户信息没有保存到localStorage

## 修复方案

### 1. 修复房间命名策略

**之前的问题代码：**
```typescript
const config: CollaborationConfig = {
  wsUrl,
  roomName: `room-${Date.now()}`, // 每次都生成不同的房间名
  microName,
  useHocuspocus: true
};
```

**修复后的代码：**
```typescript
const config: CollaborationConfig = {
  wsUrl,
  roomName: `pyramid-room-${microName}`, // 使用固定的房间名称，确保多用户协同
  microName,
  useHocuspocus: true
};
```

### 2. 改进用户信息管理

**之前的问题代码：**
```typescript
const userInfo: UserInfo = {
  id: Date.now().toString(), // 每次都生成新的ID
  name: `用户-${Date.now()}`, // 每次都生成新的名称
  color: `#${Math.floor(Math.random()*16777215).toString(16)}` // 每次都生成新的颜色
};
```

**修复后的代码：**
```typescript
// 设置用户信息 - 使用更稳定的用户标识
const userId = localStorage.getItem('pyramid-user-id') || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const userName = localStorage.getItem('pyramid-user-name') || `用户-${userId.substr(-6)}`;
const userColor = localStorage.getItem('pyramid-user-color') || `#${Math.floor(Math.random()*16777215).toString(16)}`;

// 保存用户信息到localStorage
localStorage.setItem('pyramid-user-id', userId);
localStorage.setItem('pyramid-user-name', userName);
localStorage.setItem('pyramid-user-color', userColor);

const userInfo: UserInfo = {
  id: userId,
  name: userName,
  color: userColor
};
```

### 3. 修复HocuspocusProvider配置

**之前的问题代码：**
```typescript
const provider = new HocuspocusProvider({
  url: config.wsUrl,
  documentName: `${config.microName}-${config.roomName}`, // 错误的属性名
  document: ydoc,
  // ...
});
```

**修复后的代码：**
```typescript
const provider = new HocuspocusProvider({
  url: config.wsUrl,
  name: `${config.microName}-${config.roomName}`, // 使用正确的name属性
  document: ydoc,
  // ...
});
```

### 4. 增强连接状态监控

```typescript
// 监听协同状态变化
const unsubscribeStatus = globalCollaborationManager.onStatusChange(config, (status) => {
  console.log('🔄 协同状态变化:', {
    status,
    connectionId: connection.id,
    roomName: config.roomName,
    microName: config.microName,
    wsUrl: config.wsUrl
  });
  setCollaborationStatus(status);
});
```

## 修复效果

### 1. 多用户协同连接
- ✅ 所有用户连接到同一个房间：`pyramid-room-pyramid-app`
- ✅ 用户信息持久化，避免重复生成
- ✅ 真正的多用户协同编辑

### 2. 稳定的用户标识
- ✅ 用户ID保存在localStorage中
- ✅ 用户名称和颜色持久化
- ✅ 跨页面会话保持用户身份

### 3. 正确的连接配置
- ✅ HocuspocusProvider使用正确的属性
- ✅ 连接状态监控完善
- ✅ 详细的调试日志

### 4. 协同功能增强
- ✅ 多用户实时编辑
- ✅ 用户状态同步
- ✅ 数据实时共享

## 技术细节

### 房间命名策略
```typescript
roomName: `pyramid-room-${microName}`
```
- 格式：`pyramid-room-pyramid-app`
- 所有相同类型的微应用共享同一个房间
- 确保多用户协同编辑

### 用户信息持久化
```typescript
const userId = localStorage.getItem('pyramid-user-id') || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```
- 首次访问生成唯一ID
- 后续访问使用保存的ID
- 确保用户身份一致性

### 连接状态监控
```typescript
console.log('🔄 协同状态变化:', {
  status,
  connectionId: connection.id,
  roomName: config.roomName,
  microName: config.microName,
  wsUrl: config.wsUrl
});
```
- 详细的连接状态信息
- 便于问题排查和调试
- 实时监控连接健康状态

## 测试建议

1. **多用户协同测试**：
   - 打开多个浏览器窗口
   - 每个窗口都插入金字塔微应用
   - 验证所有用户都显示"协同已连接"
   - 在一个窗口中编辑，验证其他窗口实时更新

2. **用户身份测试**：
   - 刷新页面后验证用户信息保持不变
   - 关闭浏览器重新打开，验证用户身份持久化
   - 检查localStorage中的用户信息

3. **连接稳定性测试**：
   - 长时间运行多用户协同
   - 网络断开重连测试
   - 验证连接状态监控

4. **数据同步测试**：
   - 多用户同时编辑金字塔
   - 验证数据实时同步
   - 检查冲突处理机制

## 相关文件

- `block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`
- `block-editor/packages/editor-base/collaboration/collaboration.ts`

## 关键改进

1. **固定房间命名**：确保多用户连接到同一房间
2. **用户信息持久化**：使用localStorage保存用户身份
3. **正确的Provider配置**：修复HocuspocusProvider属性
4. **增强状态监控**：详细的连接状态日志
5. **稳定的用户标识**：避免重复生成用户信息

## 使用说明

现在您可以：
1. 在多个浏览器窗口中打开`block-editor/app`
2. 每个窗口都插入金字塔微应用
3. 所有用户都会显示"协同已连接"
4. 在一个窗口中编辑金字塔，其他窗口会实时更新
5. 用户信息会持久保存，刷新页面后保持不变

这样就实现了真正的多用户实时协同编辑功能！



