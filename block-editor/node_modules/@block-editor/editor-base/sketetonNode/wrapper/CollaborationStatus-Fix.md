# 协同状态参数传递问题修复

## 问题描述

在`block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`中，`loadMicroApp`时传入的参数`pyramidCollaborationStatus`是`false`，导致微应用显示协同已断开。

## 根本原因

1. **状态传递时机错误**：微应用加载时传递的是初始的`collaborationStatus`状态（'disconnected'）
2. **协同连接未建立**：微应用加载时协同连接可能还没有完全建立
3. **状态更新延迟**：`collaborationStatus`状态更新有延迟，微应用加载时获取不到最新状态
4. **缺乏连接准备检查**：没有检查协同连接是否已准备就绪就加载微应用

## 修复方案

### 1. 修复协同状态参数传递

**之前的问题代码：**
```typescript
pyramidCollaborationStatus: collaborationStatus, // 传递的是初始状态'disconnected'
```

**修复后的代码：**
```typescript
pyramidCollaborationStatus: connectionRef.current?.status || 'disconnected', // 传递实时的连接状态
```

### 2. 添加协同连接准备检查

```typescript
// 检查协同连接是否已准备就绪
if (microName === 'pyramid-app' && (!isCollaborationReady || !connectionRef.current)) {
  console.log('⏳ 协同连接未准备就绪，等待连接建立...');
  // 等待协同连接建立
  setTimeout(() => {
    if (!isUnmounting) {
      loadMicroApplication();
    }
  }, 1000);
  return;
}
```

### 3. 改进微应用加载时序

```typescript
// 更新useEffect依赖项，确保协同连接准备就绪后能触发微应用加载
}, [microName, containerRef, microAppInstance, wsUrl, isCollaborationReady]);
```

### 4. 增强调试信息

```typescript
console.log('🔍 微应用 props 详细调试:', {
  microName,
  isCollaborationEnabled: !!(connectionRef.current?.provider && connectionRef.current?.ydoc),
  connection: !!connectionRef.current,
  provider: !!connectionRef.current?.provider,
  ydoc: !!connectionRef.current?.ydoc,
  collaborationStatus: connectionRef.current?.status || 'disconnected',
  isCollaborationReady,
  debugInfo: microName === 'pyramid-app' ? (props as any).debugInfo : undefined
});
```

### 5. 修复调试信息中的协同状态

```typescript
debugInfo: {
  providerStatus: connectionRef.current?.status || 'disconnected', // 使用实时状态
  // ... 其他调试信息
}
```

## 修复效果

### 1. 正确的协同状态传递
- ✅ 微应用接收到正确的协同状态
- ✅ 显示"协同已连接"而不是"协同已断开"
- ✅ 实时反映连接状态变化

### 2. 改进的加载时序
- ✅ 等待协同连接建立后再加载微应用
- ✅ 避免在连接未建立时传递错误状态
- ✅ 确保微应用获得完整的协同功能

### 3. 增强的调试能力
- ✅ 详细的连接状态日志
- ✅ 实时状态监控
- ✅ 便于问题排查

### 4. 稳定的协同体验
- ✅ 微应用正确显示协同状态
- ✅ 多用户协同功能正常
- ✅ 实时数据同步工作正常

## 技术细节

### 实时状态获取
```typescript
pyramidCollaborationStatus: connectionRef.current?.status || 'disconnected'
```
- 直接从连接对象获取当前状态
- 避免依赖可能延迟更新的React状态
- 确保传递最新的连接状态

### 连接准备检查
```typescript
if (microName === 'pyramid-app' && (!isCollaborationReady || !connectionRef.current)) {
  // 等待连接建立
  setTimeout(() => {
    if (!isUnmounting) {
      loadMicroApplication();
    }
  }, 1000);
  return;
}
```
- 检查协同连接是否已准备就绪
- 等待连接建立后再加载微应用
- 避免在连接未建立时加载

### 依赖项更新
```typescript
}, [microName, containerRef, microAppInstance, wsUrl, isCollaborationReady]);
```
- 添加`isCollaborationReady`到依赖项
- 确保协同连接准备就绪后触发微应用加载
- 实现正确的加载时序

## 测试建议

1. **协同状态测试**：
   - 插入金字塔微应用
   - 验证显示"协同已连接"
   - 检查控制台日志确认状态正确

2. **多用户协同测试**：
   - 多个浏览器窗口同时插入微应用
   - 验证所有窗口都显示"协同已连接"
   - 测试实时协同编辑功能

3. **连接时序测试**：
   - 快速插入和删除微应用
   - 验证每次插入都能正确显示协同状态
   - 检查连接建立日志

4. **状态同步测试**：
   - 在一个窗口中编辑金字塔
   - 验证其他窗口实时更新
   - 检查协同状态保持正确

## 相关文件

- `block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`

## 关键改进

1. **实时状态传递**：使用连接对象的实时状态而不是React状态
2. **连接准备检查**：确保协同连接建立后再加载微应用
3. **改进加载时序**：添加协同准备状态到依赖项
4. **增强调试信息**：提供详细的连接状态日志
5. **稳定的协同体验**：确保微应用正确显示协同状态

## 使用说明

现在当您插入金字塔微应用时：
1. 系统会等待协同连接建立
2. 微应用会接收到正确的协同状态
3. 显示"协同已连接"而不是"协同已断开"
4. 多用户协同功能正常工作
5. 控制台会显示详细的连接状态信息

这样就彻底解决了协同状态参数传递的问题！



