# 协同连接准备就绪问题修复

## 问题描述

当加载微应用时，一直显示"协同连接未准备就绪，等待连接建立..."，导致微应用一直未能成功加载。

## 根本原因

1. **固定延迟设置ready状态**：使用固定的1秒延迟来设置`isCollaborationReady`，但实际连接可能需要更长时间
2. **缺乏实际连接状态检查**：没有基于实际的连接状态来设置ready状态
3. **无限等待问题**：如果协同连接失败，会无限等待
4. **过于严格的检查条件**：要求连接完全ready才加载微应用

## 修复方案

### 1. 基于实际连接状态设置ready状态

**之前的问题代码：**
```typescript
// 延迟设置ready状态，确保连接建立
setTimeout(() => {
  setIsCollaborationReady(true);
  console.log('✅ 全局协同连接已准备就绪');
}, 1000);
```

**修复后的代码：**
```typescript
// 基于实际连接状态设置ready状态
const checkConnectionReady = () => {
  if (connection.status === 'connected') {
    setIsCollaborationReady(true);
    console.log('✅ 全局协同连接已准备就绪');
  } else {
    console.log('⏳ 等待协同连接建立，当前状态:', connection.status);
    // 如果连接失败，设置一个最大等待时间
    setTimeout(() => {
      if (connection.status !== 'connected') {
        console.log('⚠️ 协同连接超时，强制设置为ready状态');
        setIsCollaborationReady(true);
      }
    }, 5000); // 5秒超时
  }
};

// 立即检查一次
checkConnectionReady();
```

### 2. 在状态变化时设置ready状态

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
  
  // 当连接成功时设置ready状态
  if (status === 'connected' && !isCollaborationReady) {
    setIsCollaborationReady(true);
    console.log('✅ 协同连接成功，设置为ready状态');
  }
});
```

### 3. 改进微应用加载检查逻辑

**之前的问题代码：**
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

**修复后的代码：**
```typescript
// 检查协同连接是否已准备就绪
if (microName === 'pyramid-app' && !connectionRef.current) {
  console.log('⏳ 协同连接未初始化，等待连接建立...');
  // 等待协同连接建立
  setTimeout(() => {
    if (!isUnmounting) {
      loadMicroApplication();
    }
  }, 1000);
  return;
}

// 对于金字塔应用，如果连接存在但未ready，也允许加载（避免无限等待）
if (microName === 'pyramid-app' && connectionRef.current && !isCollaborationReady) {
  console.log('⚠️ 协同连接存在但未ready，继续加载微应用（避免无限等待）');
}
```

### 4. 添加连接超时保护机制

```typescript
// 如果连接失败，设置一个最大等待时间
setTimeout(() => {
  if (connection.status !== 'connected') {
    console.log('⚠️ 协同连接超时，强制设置为ready状态');
    setIsCollaborationReady(true);
  }
}, 5000); // 5秒超时
```

### 5. 增强调试和错误处理

```typescript
// 如果协同连接有问题，记录警告但继续加载
if (microName === 'pyramid-app' && (!connectionRef.current || !connectionRef.current.provider)) {
  console.warn('⚠️ 协同连接有问题，但继续加载微应用');
}
```

## 修复效果

### 1. 智能的ready状态设置
- ✅ 基于实际连接状态设置ready状态
- ✅ 连接成功时立即设置为ready
- ✅ 连接超时时强制设置为ready

### 2. 防止无限等待
- ✅ 5秒超时保护机制
- ✅ 连接存在时允许加载微应用
- ✅ 避免因协同连接问题阻塞微应用加载

### 3. 改进的加载逻辑
- ✅ 只检查连接是否存在，不要求完全ready
- ✅ 连接存在但未ready时也允许加载
- ✅ 提供详细的调试信息

### 4. 增强的错误处理
- ✅ 连接问题时记录警告但继续加载
- ✅ 详细的连接状态日志
- ✅ 便于问题排查

## 技术细节

### 智能ready状态检查
```typescript
const checkConnectionReady = () => {
  if (connection.status === 'connected') {
    setIsCollaborationReady(true);
    console.log('✅ 全局协同连接已准备就绪');
  } else {
    console.log('⏳ 等待协同连接建立，当前状态:', connection.status);
    // 5秒超时保护
    setTimeout(() => {
      if (connection.status !== 'connected') {
        console.log('⚠️ 协同连接超时，强制设置为ready状态');
        setIsCollaborationReady(true);
      }
    }, 5000);
  }
};
```

### 状态变化监听
```typescript
// 当连接成功时设置ready状态
if (status === 'connected' && !isCollaborationReady) {
  setIsCollaborationReady(true);
  console.log('✅ 协同连接成功，设置为ready状态');
}
```

### 宽松的加载检查
```typescript
// 只检查连接是否存在，不要求完全ready
if (microName === 'pyramid-app' && !connectionRef.current) {
  // 等待连接初始化
} else if (microName === 'pyramid-app' && connectionRef.current && !isCollaborationReady) {
  // 连接存在但未ready，也允许加载
  console.log('⚠️ 协同连接存在但未ready，继续加载微应用（避免无限等待）');
}
```

## 测试建议

1. **正常连接测试**：
   - 启动协同服务器
   - 插入金字塔微应用
   - 验证微应用正常加载

2. **连接超时测试**：
   - 不启动协同服务器
   - 插入金字塔微应用
   - 验证5秒后微应用能正常加载

3. **连接延迟测试**：
   - 延迟启动协同服务器
   - 插入金字塔微应用
   - 验证连接建立后微应用正常加载

4. **多用户协同测试**：
   - 多个浏览器窗口同时插入微应用
   - 验证所有微应用都能正常加载
   - 测试协同功能是否正常

## 相关文件

- `block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`

## 关键改进

1. **智能ready状态设置**：基于实际连接状态而不是固定延迟
2. **连接超时保护**：5秒超时避免无限等待
3. **宽松的加载检查**：连接存在时允许加载，不要求完全ready
4. **状态变化监听**：连接成功时立即设置ready状态
5. **增强的错误处理**：连接问题时记录警告但继续加载

## 使用说明

现在当您插入金字塔微应用时：
1. 系统会检查协同连接状态
2. 如果连接成功，立即设置为ready状态
3. 如果连接超时（5秒），强制设置为ready状态
4. 微应用能够正常加载，不会无限等待
5. 控制台会显示详细的连接状态信息

这样就彻底解决了协同连接准备就绪的问题，确保微应用能够正常加载！
