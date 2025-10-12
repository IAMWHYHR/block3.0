# 调试 isCollaborationEnabled 始终为 false 的问题

## 问题描述
`isCollaborationEnabled` 始终为 `false`，导致金字塔协同功能无法正常工作。

## 调试步骤

### 1. 检查协同数据初始化
打开浏览器控制台，查找以下日志：
```
🔧 金字塔协同数据初始化: {
  pyramidYdoc: true/false,
  pyramidProvider: true/false,
  pyramidSharedData: true/false,
  pyramidList: true/false,
  pyramidAwareness: true/false
}
```

**预期结果**: 所有值都应该为 `true`

### 2. 检查微应用 props 传递
在控制台中查找：
```
🔍 金字塔微应用 props 详细调试: {
  isCollaborationEnabled: true/false,
  pyramidProvider: true/false,
  pyramidSharedData: true/false,
  pyramidProviderType: "object/undefined",
  pyramidSharedDataType: "object/undefined",
  ...
}
```

**预期结果**: 
- `isCollaborationEnabled: true`
- `pyramidProvider: true`
- `pyramidSharedData: true`
- `pyramidProviderType: "object"`
- `pyramidSharedDataType: "object"`

### 3. 检查金字塔组件接收
在控制台中查找：
```
🔍 金字塔组件协同状态详细调试: {
  isCollaborationEnabled: true/false,
  pyramidProvider: true/false,
  pyramidSharedData: true/false,
  pyramidProviderType: "object/undefined",
  pyramidSharedDataType: "object/undefined",
  propsKeys: [...],
  hasUpdatePyramidData: "function/undefined",
  hasGetPyramidData: "function/undefined"
}
```

**预期结果**:
- `isCollaborationEnabled: true`
- `pyramidProvider: true`
- `pyramidSharedData: true`
- `pyramidProviderType: "object"`
- `pyramidSharedDataType: "object"`
- `hasUpdatePyramidData: "function"`
- `hasGetPyramidData: "function"`

## 常见问题排查

### 问题 1: 协同数据初始化失败
**症状**: `🔧 金字塔协同数据初始化` 日志中某些值为 `false`
**原因**: 协同服务器未启动或连接失败
**解决**: 
```bash
# 检查协同服务器
netstat -an | findstr ":1234"
# 如果没有运行，启动协同服务器
cd MainApp3
npm run collaboration-server
```

### 问题 2: props 传递失败
**症状**: `🔍 金字塔微应用 props 详细调试` 中 `pyramidProvider` 或 `pyramidSharedData` 为 `false`
**原因**: 协同数据在微应用加载时还没有准备好
**解决**: 检查 SkeletonNodeView 中的导入和传递逻辑

### 问题 3: 微应用接收失败
**症状**: 金字塔组件中的 props 为空或缺少协同数据
**原因**: Qiankun 微应用加载时 props 传递失败
**解决**: 检查微应用的 props 接收逻辑

## 手动测试方法

### 在浏览器控制台中测试
1. 访问 `http://localhost:7500`
2. 打开浏览器控制台 (F12)
3. 加载金字塔微应用
4. 在控制台中执行：

```javascript
// 检查协同数据是否可用
console.log('协同数据检查:', {
  pyramidProvider: window.pyramidProvider,
  pyramidSharedData: window.pyramidSharedData,
  pyramidYdoc: window.pyramidYdoc
});

// 如果协同功能启用，测试协同数据
if (window.pyramidDebug) {
  window.pyramidDebug.getCurrentData();
  window.pyramidDebug.testCollaboration();
} else {
  console.log('❌ 协同调试工具未加载');
}
```

## 预期结果

正常情况下，您应该看到：
1. 协同数据初始化日志显示所有值为 `true`
2. 微应用 props 传递日志显示 `isCollaborationEnabled: true`
3. 金字塔组件接收日志显示 `isCollaborationEnabled: true`
4. 可以使用 `window.pyramidDebug` 工具

如果仍然显示 `false`，请检查：
1. 协同服务器是否正常运行
2. 网络连接是否正常
3. 浏览器控制台是否有错误信息
4. 协同数据是否正确导入和传递
