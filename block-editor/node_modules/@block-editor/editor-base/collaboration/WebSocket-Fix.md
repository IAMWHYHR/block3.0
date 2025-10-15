# WebSocket连接问题修复

## 问题描述

在加载微应用时出现以下错误：
```
WebSocket connection to 'ws://localhost:1234/' failed: WebSocket is closed before the connection is established.
```

## 根本原因

1. **连接生命周期管理不当**：每个React组件都创建独立的协同连接，导致连接频繁创建和销毁
2. **时序问题**：组件卸载时立即销毁连接，但连接可能还在建立过程中
3. **缺乏连接复用**：相同配置的连接没有复用机制，造成资源浪费

## 修复方案

### 1. 创建全局协同管理器

仿照 `globalCollaborationManager.ts` 的模式，在 `collaboration.ts` 中添加全局连接管理：

```typescript
// 全局协同连接管理器
class GlobalCollaborationManager {
  private connections: Map<string, ConnectionInfo> = new Map();
  private statusCallbacks: Map<string, ((status: CollaborationStatus) => void)[]> = new Map();
  private userCallbacks: Map<string, (() => void)[]> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // 获取或创建连接
  getConnection(config: CollaborationConfig): ConnectionInfo {
    const connectionId = this.getConnectionId(config);
    
    // 如果连接已存在，增加引用计数
    if (this.connections.has(connectionId)) {
      const connection = this.connections.get(connectionId)!;
      connection.refCount++;
      connection.lastUsed = Date.now();
      return connection;
    }

    // 创建新连接
    const connection = this.createConnection(config);
    this.connections.set(connectionId, connection);
    return connection;
  }

  // 释放连接引用
  releaseConnection(config: CollaborationConfig): void {
    const connectionId = this.getConnectionId(config);
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      connection.refCount--;
      connection.lastUsed = Date.now();
      
      if (connection.refCount <= 0) {
        // 连接将在清理时销毁
      }
    }
  }
}
```

### 2. 连接信息管理

```typescript
interface ConnectionInfo {
  id: string;
  config: CollaborationConfig;
  ydoc: Y.Doc;
  provider: HocuspocusProvider | WebsocketProvider;
  awareness: any;
  status: CollaborationStatus;
  isInitialized: boolean;
  isDestroyed: boolean;
  refCount: number; // 引用计数
  lastUsed: number; // 最后使用时间
}
```

### 3. 自动清理机制

```typescript
// 启动清理任务
private startCleanupTask(): void {
  this.cleanupInterval = setInterval(() => {
    this.cleanupInactiveConnections();
  }, 30000); // 每30秒清理一次
}

// 清理非活跃连接
private cleanupInactiveConnections(): void {
  const now = Date.now();
  const inactiveThreshold = 5 * 60 * 1000; // 5分钟
  
  for (const [connectionId, connection] of this.connections.entries()) {
    if (connection.refCount === 0 && (now - connection.lastUsed) > inactiveThreshold) {
      this.destroyConnection(connectionId);
    }
  }
}
```

### 4. 修改SkeletonNodeView使用全局管理器

```typescript
// 初始化协同
useEffect(() => {
  if (microName && wsUrl) {
    const config: CollaborationConfig = {
      wsUrl,
      roomName: `room-${Date.now()}`,
      microName,
      useHocuspocus: true
    };
    
    try {
      // 获取或创建全局连接
      const connection = globalCollaborationManager.getConnection(config);
      connectionRef.current = connection;
      
      // 设置用户信息
      globalCollaborationManager.setUser(config, userInfo);
      
      // 监听状态变化
      const unsubscribeStatus = globalCollaborationManager.onStatusChange(config, (status) => {
        setCollaborationStatus(status);
      });
      
      return () => {
        // 释放连接引用，但不销毁连接
        globalCollaborationManager.releaseConnection(config);
      };
    } catch (error) {
      console.error('❌ 全局协同连接初始化失败:', error);
    }
  }
}, [microName, wsUrl]);
```

### 5. 微应用Props传递

```typescript
// 传递协同相关数据
pyramidProvider: connectionRef.current?.provider,
pyramidSharedData: connectionRef.current?.ydoc.getMap('sharedData'),
pyramidList: connectionRef.current?.ydoc.getArray('listData'),
pyramidYdoc: connectionRef.current?.ydoc,

// 传递协同方法
updatePyramidData: (key: string, value: any) => {
  connectionRef.current?.ydoc.getMap('sharedData').set(key, value);
},
getPyramidData: (key: string) => {
  return connectionRef.current?.ydoc.getMap('sharedData').get(key);
},
```

## 修复效果

### 1. 连接复用
- 相同配置的连接会被复用，避免重复创建
- 使用引用计数管理连接生命周期
- 减少WebSocket连接数量

### 2. 生命周期管理
- 连接不再依赖React组件生命周期
- 组件卸载时只释放引用，不销毁连接
- 连接在真正不需要时才被销毁

### 3. 自动清理
- 定期清理非活跃连接
- 防止连接泄漏
- 优化内存使用

### 4. 错误处理
- 完善的错误处理和日志记录
- 连接状态监控
- 用户友好的错误反馈

## 技术细节

### 连接ID生成
```typescript
private getConnectionId(config: CollaborationConfig): string {
  return `${config.microName}-${config.roomName}`;
}
```

### 状态监听
```typescript
onStatusChange(config: CollaborationConfig, callback: (status: CollaborationStatus) => void): () => void {
  const connectionId = this.getConnectionId(config);
  const callbacks = this.statusCallbacks.get(connectionId) || [];
  callbacks.push(callback);
  this.statusCallbacks.set(connectionId, callbacks);
  
  return () => {
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  };
}
```

### 用户管理
```typescript
setUser(config: CollaborationConfig, userInfo: UserInfo): void {
  const connectionId = this.getConnectionId(config);
  const connection = this.connections.get(connectionId);
  
  if (connection) {
    connection.awareness.setLocalStateField('user', {
      name: userInfo.name || `${config.microName}用户${Math.floor(Math.random() * 1000)}`,
      color: userInfo.color || `#${Math.floor(Math.random()*16777215).toString(16)}`,
      cursor: userInfo.cursor || null
    });
  }
}
```

## 测试建议

1. **连接复用测试**：创建多个相同配置的微应用，验证连接复用
2. **生命周期测试**：快速创建和销毁微应用，验证连接管理
3. **清理机制测试**：长时间运行，验证自动清理功能
4. **错误恢复测试**：网络断开重连，验证错误处理

## 相关文件

- `block-editor/packages/editor-base/collaboration/collaboration.ts`
- `block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`
- `block-editor/packages/editor-base/collaboration/index.ts`

## 关键改进

1. 全局连接管理器，支持连接复用
2. 引用计数机制，精确管理连接生命周期
3. 自动清理机制，防止连接泄漏
4. 完善的错误处理和状态监控
5. 向后兼容的API设计
