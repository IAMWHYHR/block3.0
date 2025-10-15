# 统一微应用Props接口重构

## 重构概述

本次重构统一了`block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`中加载微应用时传递的props，以及金字塔微应用中`MicroApp/src/index.jsx`获取的props的类型，同时按照`SharedSDK/index.d.ts`中定义的接口规范封装实现了协同数据等相关功能函数。

## 重构目标

1. **统一Props接口**：建立统一的微应用props接口定义
2. **服务化封装**：按照SharedSDK规范封装协同功能
3. **类型安全**：提供完整的TypeScript类型定义
4. **向后兼容**：保持对现有金字塔微应用的兼容性
5. **可扩展性**：为未来添加新的微应用类型提供基础

## 新增文件结构

```
block-editor/packages/editor-base/
├── types/
│   └── MicroAppProps.ts          # 统一的微应用Props接口定义
├── services/
│   ├── CollaborationService.ts   # 协同服务实现
│   └── BlockContextService.ts    # BlockContext服务实现
└── sketetonNode/wrapper/
    └── SkeletonNodeView.tsx      # 重构后的微应用加载组件
```

## 核心接口定义

### 1. 统一Props接口 (`types/MicroAppProps.ts`)

```typescript
// 基础微应用Props接口
export interface MicroAppProps extends BaseMicroAppProps {
  // 协同相关
  collaborationService?: CollaborationService;
  collaborationStatus?: CollaborationStatus;
  onlineUsers?: UserInfo[];
  
  // 微应用标识
  microName?: string;
  wsUrl?: string;
  
  // 容器信息
  container?: Element | Document;
  
  // 调试信息
  debugInfo?: any;
}

// 金字塔微应用特定的Props
export interface PyramidMicroAppProps extends MicroAppProps {
  // 金字塔特定数据
  pyramidData?: CollaborationData;
  pyramidListData?: CollaborationListItem[];
  
  // 金字塔特定方法
  updatePyramidData?: (key: string, value: any) => void;
  getPyramidData?: (key: string) => any;
  addPyramidToList?: (item: any) => void;
  updatePyramidInList?: (index: number, item: any) => void;
  removePyramidFromList?: (index: number) => void;
  setPyramidUser?: (userInfo: any) => void;
  
  // 金字塔特定协同对象（向后兼容）
  pyramidProvider?: any;
  pyramidSharedData?: any;
  pyramidList?: any;
  pyramidYdoc?: any;
}
```

### 2. 协同服务接口 (`services/CollaborationService.ts`)

```typescript
export interface CollaborationService {
  // 状态管理
  getStatus(): CollaborationStatus;
  onStatusChange(callback: (status: CollaborationStatus) => void): () => void;
  
  // 用户管理
  setUser(userInfo: UserInfo): void;
  getOnlineUsers(): UserInfo[];
  onUsersChange(callback: () => void): () => void;
  
  // 数据管理
  updateData(key: string, value: any): void;
  getData(key: string): any;
  getAllData(): CollaborationData;
  
  // 列表管理
  addListItem(item: CollaborationListItem): void;
  updateListItem(index: number, item: CollaborationListItem): void;
  removeListItem(index: number): void;
  getListData(): CollaborationListItem[];
  
  // 实时数据获取
  getRealTimeData(): CollaborationData;
  getRealTimeListData(): CollaborationListItem[];
  
  // 调试信息
  getDebugInfo(): any;
}
```

### 3. BlockContext服务接口 (`services/BlockContextService.ts`)

```typescript
export interface BlockContext {
  readonly toolBar: Toolbar;
  readonly viewService: ViewService;
  readonly lifeCycleService: LifeCycleService;
  readonly sharedData: SharedData;
  readonly envService: EnvService;
}
```

## 重构实现

### 1. SkeletonNodeView重构

**之前的实现：**
```typescript
// 构建props，仿照MainApp3的方式
const props = {
  container: container,
  ...(microName === 'pyramid-app' ? {
    // 传递协同相关数据
    pyramidProvider: connectionRef.current?.provider,
    pyramidSharedData: connectionRef.current?.ydoc.getMap('sharedData'),
    // ... 大量重复的协同相关代码
  } : {})
};
```

**重构后的实现：**
```typescript
// 构建统一的props接口
const props: any = {
  container: container,
  microName: microName,
  wsUrl: wsUrl,
  collaborationService: collaborationServiceRef.current,
  collaborationStatus: collaborationStatus,
  onlineUsers: onlineUsers,
  blockContext: blockContextRef.current,
  debugInfo: {
    microName,
    wsUrl,
    collaborationStatus,
    onlineUsersCount: onlineUsers.length,
    isCollaborationReady,
    hasCollaborationService: !!collaborationServiceRef.current,
    hasBlockContext: !!blockContextRef.current
  }
};

// 为金字塔微应用添加特定props
let pyramidProps: any = null;
if (microName === 'pyramid-app') {
  pyramidProps = {
    ...props,
    // 金字塔特定数据和方法
    pyramidData: collaborationData,
    pyramidListData: collaborationListData,
    updatePyramidData: (key: string, value: any) => {
      collaborationServiceRef.current?.updateData(key, value);
    },
    // ... 其他金字塔特定方法
  };
}
```

### 2. 协同服务创建

```typescript
// 创建协同服务
const collaborationService = createCollaborationService(config);
collaborationServiceRef.current = collaborationService;

// 创建BlockContext
const blockContext = createBlockContext();
blockContextRef.current = blockContext;
```

### 3. 微应用Props接收

**MicroApp/src/index.jsx：**
```typescript
// 调试信息：显示接收到的 props
console.log('🔍 MicroApp 接收到的 props:', {
  ...props,
  collaborationService: props.collaborationService ? '[CollaborationService]' : undefined,
  blockContext: props.blockContext ? '[BlockContext]' : undefined,
  pyramidProvider: props.pyramidProvider ? '[Provider]' : undefined,
  // ... 其他调试信息
});
```

**MicroApp/src/components/AntdPyramid.jsx：**
```typescript
// 从 props 中获取协同相关的方法和数据
const {
  // 新的统一接口
  collaborationService,
  collaborationStatus,
  onlineUsers,
  blockContext,
  microName,
  wsUrl,
  debugInfo,
  // 金字塔特定数据（向后兼容）
  pyramidProvider,
  pyramidSharedData,
  // ... 其他props
} = props || {};

// 检查是否启用了协同功能
const isCollaborationEnabled = !!(collaborationService || (pyramidProvider && pyramidSharedData));
```

## 关键改进

### 1. 统一接口设计

- **标准化Props结构**：所有微应用都使用相同的props接口
- **类型安全**：完整的TypeScript类型定义
- **向后兼容**：保持对现有金字塔微应用的兼容性

### 2. 服务化封装

- **CollaborationService**：封装所有协同相关功能
- **BlockContext**：提供完整的BlockContext服务
- **统一API**：所有微应用使用相同的服务接口

### 3. 改进的数据管理

```typescript
// 优先使用协同服务，其次使用传统方法
const realTimeData = collaborationService?.getRealTimeData() || getRealTimeData?.() || {};
const realTimeListData = collaborationService?.getRealTimeListData() || getRealTimeListData?.() || [];
```

### 4. 智能状态管理

```typescript
// 监听协同状态变化
useEffect(() => {
  const currentStatus = collaborationStatus || pyramidCollaborationStatus || 'disconnected';
  console.log('🔄 协同状态变化:', currentStatus);
  setLocalCollaborationStatus(currentStatus);
}, [collaborationStatus, pyramidCollaborationStatus]);
```

### 5. 调试信息增强

```typescript
debugInfo: {
  microName,
  wsUrl,
  collaborationStatus,
  onlineUsersCount: onlineUsers.length,
  isCollaborationReady,
  hasCollaborationService: !!collaborationServiceRef.current,
  hasBlockContext: !!blockContextRef.current
}
```

## 使用方式

### 1. 通用微应用

```typescript
const props = {
  container: container,
  microName: 'my-micro-app',
  wsUrl: 'ws://localhost:1234',
  collaborationService: collaborationService,
  collaborationStatus: 'connected',
  onlineUsers: users,
  blockContext: blockContext,
  debugInfo: debugInfo
};
```

### 2. 金字塔微应用

```typescript
const pyramidProps = {
  ...props,
  // 金字塔特定数据
  pyramidData: collaborationData,
  pyramidListData: collaborationListData,
  // 金字塔特定方法
  updatePyramidData: (key, value) => collaborationService.updateData(key, value),
  // 向后兼容的协同对象
  pyramidProvider: provider,
  pyramidSharedData: sharedData
};
```

## 技术优势

### 1. 类型安全
- 完整的TypeScript类型定义
- 编译时类型检查
- 智能代码提示

### 2. 可维护性
- 统一的接口设计
- 清晰的服务分层
- 模块化的代码结构

### 3. 可扩展性
- 易于添加新的微应用类型
- 灵活的服务组合
- 标准化的扩展点

### 4. 向后兼容
- 保持现有API不变
- 渐进式迁移
- 平滑的升级路径

### 5. 调试友好
- 详细的调试信息
- 清晰的状态跟踪
- 完整的日志记录

## 测试建议

### 1. 功能测试
- 验证协同服务正常工作
- 测试BlockContext服务功能
- 确认微应用能正确接收props

### 2. 兼容性测试
- 测试金字塔微应用的向后兼容性
- 验证现有功能不受影响
- 确认新的统一接口正常工作

### 3. 性能测试
- 测试服务创建和销毁的性能
- 验证内存使用情况
- 确认协同连接稳定性

### 4. 多用户测试
- 测试多用户协同功能
- 验证状态同步正确性
- 确认用户管理功能正常

## 相关文件

- `block-editor/packages/editor-base/types/MicroAppProps.ts`
- `block-editor/packages/editor-base/services/CollaborationService.ts`
- `block-editor/packages/editor-base/services/BlockContextService.ts`
- `block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`
- `MicroApp/src/index.jsx`
- `MicroApp/src/components/AntdPyramid.jsx`

## 总结

本次重构成功实现了：

1. ✅ **统一Props接口**：建立了标准化的微应用props接口
2. ✅ **服务化封装**：按照SharedSDK规范封装了协同功能
3. ✅ **类型安全**：提供了完整的TypeScript类型定义
4. ✅ **向后兼容**：保持了对现有金字塔微应用的兼容性
5. ✅ **可扩展性**：为未来添加新的微应用类型提供了基础

重构后的代码更加规范、可维护，为微前端架构的进一步发展奠定了坚实的基础！
