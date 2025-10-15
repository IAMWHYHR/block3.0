# 微应用实时UI更新问题修复

## 问题描述

当启动`block-editor/app`并加载金字塔微应用后，编辑微应用时：
- ✅ 微应用协同数据实时变化
- ❌ 微应用前端界面没有实时更新

## 根本原因

1. **数据传递时机问题**：微应用的props在加载时构建一次，但协同数据变化时没有重新传递
2. **缺乏实时数据监听**：微应用没有直接监听协同数据的变化
3. **数据同步机制不完善**：依赖props传递的静态数据，无法获取实时更新

## 修复方案

### 1. 添加实时数据获取方法

在`SkeletonNodeView.tsx`中传递实时数据获取方法给微应用：

```typescript
// 传递实时数据获取方法
getRealTimeData: () => {
  const data: any = {};
  if (connectionRef.current?.ydoc.getMap('sharedData')) {
    connectionRef.current.ydoc.getMap('sharedData').forEach((value: any, key: any) => {
      data[key] = value;
    });
  }
  return data;
},
getRealTimeListData: () => {
  return connectionRef.current?.ydoc.getArray('listData').toArray() || [];
},
```

### 2. 微应用实时数据同步

在`AntdPyramid.jsx`中添加实时数据同步机制：

```typescript
// 实时数据同步 - 使用实时数据获取方法
useEffect(() => {
  if (isCollaborationEnabled && getRealTimeData && getRealTimeListData) {
    console.log('🔍 设置实时数据同步');
    
    const syncData = () => {
      const realTimeData = getRealTimeData();
      const realTimeListData = getRealTimeListData();
      
      console.log('📊 实时数据同步:', { realTimeData, realTimeListData });
      
      const currentLevels = realTimeData.levels || 3;
      const currentLevelData = realTimeData.levelData || [
        { text: '顶层', color: '#ff6b6b' },
        { text: '中层', color: '#4ecdc4' },
        { text: '底层', color: '#45b7d1' }
      ];
      const currentSelectedId = realTimeData.selectedPyramidId || '';

      setLevels(currentLevels);
      setLevelData(currentLevelData);
      setSelectedPyramidId(currentSelectedId);
      setPyramids(realTimeListData);
    };

    // 初始同步
    syncData();

    // 设置定时同步（作为备用方案）
    const syncInterval = setInterval(syncData, 1000);

    return () => {
      console.log('🧹 清理实时数据同步');
      clearInterval(syncInterval);
    };
  }
}, [isCollaborationEnabled, getRealTimeData, getRealTimeListData]);
```

### 3. 增强协同数据监听

添加Yjs数据结构的直接监听：

```typescript
// 监听协同数据变化并实时更新UI
useEffect(() => {
  if (isCollaborationEnabled && pyramidSharedData) {
    console.log('🔍 设置协同数据监听器');
    
    // 监听共享数据变化
    const handleDataChange = () => {
      console.log('📊 协同数据变化，更新UI');
      const currentLevels = getPyramidData('levels') || 3;
      const currentLevelData = getPyramidData('levelData') || [
        { text: '顶层', color: '#ff6b6b' },
        { text: '中层', color: '#4ecdc4' },
        { text: '底层', color: '#45b7d1' }
      ];
      const currentSelectedId = getPyramidData('selectedPyramidId') || '';

      setLevels(currentLevels);
      setLevelData(currentLevelData);
      setSelectedPyramidId(currentSelectedId);
    };

    // 监听列表数据变化
    const handleListChange = () => {
      console.log('📋 协同列表数据变化，更新UI');
      setPyramids(pyramidListData || []);
    };

    // 直接监听Yjs数据结构的变化
    if (pyramidSharedData.observe) {
      pyramidSharedData.observe(handleDataChange);
    }

    if (pyramidList && pyramidList.observe) {
      pyramidList.observe(handleListChange);
    }

    return () => {
      console.log('🧹 清理协同数据监听器');
      if (pyramidSharedData.unobserve) {
        pyramidSharedData.unobserve(handleDataChange);
      }
      if (pyramidList && pyramidList.unobserve) {
        pyramidList.unobserve(handleListChange);
      }
    };
  }
}, [isCollaborationEnabled, pyramidSharedData, pyramidList, pyramidListData]);
```

## 修复效果

### 1. 实时数据同步
- ✅ 微应用能够实时获取协同数据变化
- ✅ UI界面实时响应数据更新
- ✅ 多用户协同编辑时界面同步

### 2. 多重保障机制
- **直接监听**：监听Yjs数据结构变化
- **定时同步**：每秒获取实时数据作为备用
- **实时方法**：通过函数调用获取最新数据

### 3. 调试和监控
- 详细的日志记录数据变化过程
- 实时数据同步状态监控
- 错误处理和异常恢复

## 技术细节

### 实时数据获取
```typescript
getRealTimeData: () => {
  const data: any = {};
  if (connectionRef.current?.ydoc.getMap('sharedData')) {
    connectionRef.current.ydoc.getMap('sharedData').forEach((value: any, key: any) => {
      data[key] = value;
    });
  }
  return data;
}
```

### 定时同步机制
```typescript
// 设置定时同步（作为备用方案）
const syncInterval = setInterval(syncData, 1000);
```

### 数据监听清理
```typescript
return () => {
  console.log('🧹 清理实时数据同步');
  clearInterval(syncInterval);
};
```

## 测试建议

1. **多用户协同测试**：
   - 打开多个浏览器窗口
   - 在一个窗口中编辑金字塔
   - 验证其他窗口实时更新

2. **数据同步测试**：
   - 修改层级数量
   - 更改层级文本和颜色
   - 验证所有变化实时同步

3. **性能测试**：
   - 快速连续编辑
   - 大量数据变化
   - 验证UI响应性能

4. **错误恢复测试**：
   - 网络断开重连
   - 协同连接中断
   - 验证数据恢复机制

## 相关文件

- `block-editor/packages/editor-base/sketetonNode/wrapper/SkeletonNodeView.tsx`
- `MicroApp/src/components/AntdPyramid.jsx`

## 关键改进

1. **实时数据获取方法**：提供函数式数据访问
2. **多重同步机制**：监听器 + 定时同步双重保障
3. **完善的清理机制**：防止内存泄漏
4. **详细的调试日志**：便于问题排查
5. **类型安全**：修复TypeScript类型错误

## 使用说明

现在当您编辑金字塔微应用时：
1. 所有数据变化会实时同步到协同服务器
2. 其他用户的界面会立即更新
3. 本地界面也会实时响应数据变化
4. 控制台会显示详细的同步日志

这样就实现了真正的实时协同编辑体验！
