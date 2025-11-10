# 简化微应用Props传递

## 需求描述

用户希望简化微应用的props传递，让微应用直接通过`blockContext`来访问协同方法，而不是在props中重复传递这些方法。这样可以减少props的复杂性，让代码更清晰。

## 问题分析

### 之前的实现问题
1. **Props冗余**：在`SkeletonNodeView.tsx`中重复传递了多个金字塔协同方法
2. **代码重复**：同样的方法在props和blockContext中都存在
3. **维护困难**：需要同时维护两套方法传递机制
4. **接口复杂**：微应用需要处理多种方法来源

### 技术细节
- `blockContext`已经通过props传递给微应用
- `blockContext.sharedData`包含了所有需要的协同方法
- 不需要在props中重复传递这些方法

## 解决方案

### 1. 简化SkeletonNodeView中的Props传递

**之前的实现：**
```typescript
// 为金字塔微应用添加特定props
let pyramidProps: any = null;
if (microName === 'pyramid-app') {
  pyramidProps = {
    ...props,
    // 金字塔特定数据
    pyramidData: collaborationData,
    pyramidListData: collaborationListData,
    // 金字塔特定方法 - 使用SharedDataService中的协同方法
    updatePyramidData: (key: string, value: any) => {
      blockContextRef.current?.sharedData.updatePyramidData(key, value);
    },
    getPyramidData: (key: string) => {
      return blockContextRef.current?.sharedData.getPyramidData(key);
    },
    addPyramidToList: (item: any) => {
      blockContextRef.current?.sharedData.addPyramidToList(item);
    },
    updatePyramidInList: (index: number, item: any) => {
      blockContextRef.current?.sharedData.updatePyramidInList(index, item);
    },
    removePyramidFromList: (index: number) => {
      blockContextRef.current?.sharedData.removePyramidFromList(index);
    },
    setPyramidUser: (userInfo: any) => {
      blockContextRef.current?.sharedData.setPyramidUser(userInfo);
    },
    // 传递实时数据获取方法
    getRealTimeData: () => {
      return blockContextRef.current?.sharedData.getRealTimeData() || {};
    },
    getRealTimeListData: () => {
      return blockContextRef.current?.sharedData.getRealTimeListData() || [];
    },
    // 金字塔特定协同对象（向后兼容）
    pyramidProvider: connectionRef.current?.provider,
    pyramidSharedData: connectionRef.current?.ydoc.getMap('sharedData'),
    pyramidList: connectionRef.current?.ydoc.getArray('listData'),
    pyramidYdoc: connectionRef.current?.ydoc
  };
}
```

**简化后的实现：**
```typescript
// 为金字塔微应用添加特定props
let pyramidProps: any = null;
if (microName === 'pyramid-app') {
  pyramidProps = {
    ...props,
    // 金字塔特定数据
    pyramidData: collaborationData,
    pyramidListData: collaborationListData,
    // 金字塔特定协同对象（向后兼容）
    pyramidProvider: connectionRef.current?.provider,
    pyramidSharedData: connectionRef.current?.ydoc.getMap('sharedData'),
    pyramidList: connectionRef.current?.ydoc.getArray('listData'),
    pyramidYdoc: connectionRef.current?.ydoc
  };
}
```

### 2. 简化AntdPyramid中的方法调用

**之前的实现：**
```typescript
// 更新层数据的协同方法
const updateLevelData = (newLevelData) => {
  if (isCollaborationEnabled) {
    if (blockContext?.sharedData) {
      blockContext.sharedData.updatePyramidData('levelData', newLevelData);
    } else if (collaborationService) {
      collaborationService.updateData('levelData', newLevelData);
    } else if (updatePyramidData) {  // 移除这个fallback
      updatePyramidData('levelData', newLevelData);
    }
  } else {
    setLocalLevelData(newLevelData);
  }
};
```

**简化后的实现：**
```typescript
// 更新层数据的协同方法
const updateLevelData = (newLevelData) => {
  if (isCollaborationEnabled) {
    if (blockContext?.sharedData) {
      blockContext.sharedData.updatePyramidData('levelData', newLevelData);
    } else if (collaborationService) {
      collaborationService.updateData('levelData', newLevelData);
    }
  } else {
    setLocalLevelData(newLevelData);
  }
};
```

### 3. 简化实时数据同步

**之前的实现：**
```typescript
const syncData = () => {
  // 优先使用SharedDataService，其次使用协同服务，最后使用传统方法
  const realTimeData = blockContext?.sharedData?.getRealTimeData() || 
                     collaborationService?.getRealTimeData() || 
                     getRealTimeData?.() || {};  // 移除这个fallback
  const realTimeListData = blockContext?.sharedData?.getRealTimeListData() || 
                         collaborationService?.getRealTimeListData() || 
                         getRealTimeListData?.() || [];  // 移除这个fallback
};
```

**简化后的实现：**
```typescript
const syncData = () => {
  // 优先使用SharedDataService，其次使用协同服务
  const realTimeData = blockContext?.sharedData?.getRealTimeData() || 
                     collaborationService?.getRealTimeData() || {};
  const realTimeListData = blockContext?.sharedData?.getRealTimeListData() || 
                         collaborationService?.getRealTimeListData() || [];
};
```

### 4. 清理useEffect依赖

**之前的实现：**
```typescript
useEffect(() => {
  if (isCollaborationEnabled && (getRealTimeData || collaborationService)) {
    // ...
  }
}, [isCollaborationEnabled, getRealTimeData, getRealTimeListData, collaborationService, blockContext]);
```

**简化后的实现：**
```typescript
useEffect(() => {
  if (isCollaborationEnabled && (blockContext?.sharedData || collaborationService)) {
    // ...
  }
}, [isCollaborationEnabled, collaborationService, blockContext]);
```

## 技术优势

### 1. 代码简化
- **减少冗余**：移除了重复的方法传递
- **统一接口**：微应用只需要通过`blockContext`访问方法
- **清晰架构**：props只传递必要的数据，方法通过blockContext访问

### 2. 维护性提升
- **单一数据源**：所有协同方法都通过blockContext提供
- **减少重复**：不需要维护两套方法传递机制
- **易于扩展**：新增方法只需要在blockContext中添加

### 3. 性能优化
- **减少props大小**：props对象更小，传递更快
- **减少内存占用**：不需要创建重复的方法引用
- **减少渲染开销**：props变化更少

### 4. 开发体验
- **接口统一**：微应用只需要了解blockContext接口
- **调试简单**：方法调用路径更清晰
- **类型安全**：TypeScript类型检查更准确

## 使用方式

### 微应用中的方法调用

**通过blockContext访问协同方法：**
```typescript
// 更新金字塔数据
blockContext.sharedData.updatePyramidData('levelData', newLevelData);

// 获取金字塔数据
const levelData = blockContext.sharedData.getPyramidData('levelData');

// 添加金字塔到列表
blockContext.sharedData.addPyramidToList(newPyramid);

// 获取实时数据
const realTimeData = blockContext.sharedData.getRealTimeData();
const realTimeListData = blockContext.sharedData.getRealTimeListData();
```

**通过blockContext访问SharedMap和SharedArray：**
```typescript
// 获取SharedMap
const sharedMap = blockContext.sharedData.getMap('userSettings');
sharedMap.set('theme', 'dark');
sharedMap.subscribe((action, key, value) => {
  console.log('Map变化:', action, key, value);
});

// 获取SharedArray
const sharedArray = blockContext.sharedData.getArray('taskList');
sharedArray.push('任务1', '任务2');
sharedArray.subscribe((action, index, value) => {
  console.log('Array变化:', action, index, value);
});
```

## 向后兼容性

### 保留的Props
- `blockContext` - 主要的服务接口
- `collaborationService` - 协同服务接口
- `pyramidData` - 金字塔数据
- `pyramidListData` - 金字塔列表数据
- `pyramidProvider` - 向后兼容的协同对象
- `pyramidSharedData` - 向后兼容的共享数据
- `pyramidList` - 向后兼容的列表数据
- `pyramidYdoc` - 向后兼容的Yjs文档

### 移除的Props
- `updatePyramidData` - 通过blockContext.sharedData.updatePyramidData访问
- `getPyramidData` - 通过blockContext.sharedData.getPyramidData访问
- `addPyramidToList` - 通过blockContext.sharedData.addPyramidToList访问
- `updatePyramidInList` - 通过blockContext.sharedData.updatePyramidInList访问
- `removePyramidFromList` - 通过blockContext.sharedData.removePyramidFromList访问
- `setPyramidUser` - 通过blockContext.sharedData.setPyramidUser访问
- `getRealTimeData` - 通过blockContext.sharedData.getRealTimeData访问
- `getRealTimeListData` - 通过blockContext.sharedData.getRealTimeListData访问

## 测试建议

### 1. 功能测试
- 验证所有协同方法通过blockContext正常工作
- 测试SharedMap和SharedArray的功能
- 确认实时数据同步正确

### 2. 兼容性测试
- 测试向后兼容的props仍然可用
- 验证微应用能正确访问blockContext
- 确认协同功能正常工作

### 3. 性能测试
- 测试props传递的性能提升
- 验证内存使用情况
- 确认渲染性能改善

## 相关文件

- `block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`
- `MicroApp/src/components/AntdPyramid.jsx`

## 总结

本次简化成功实现了：

1. ✅ **Props简化**：移除了重复的方法传递，只保留必要的数据
2. ✅ **接口统一**：微应用统一通过blockContext访问协同方法
3. ✅ **代码清理**：移除了冗余的fallback逻辑
4. ✅ **性能优化**：减少了props大小和内存占用
5. ✅ **维护性提升**：单一数据源，易于维护和扩展

简化后的架构更加清晰，微应用只需要通过`blockContext.sharedData`就能访问所有协同功能，大大简化了接口复杂度！



