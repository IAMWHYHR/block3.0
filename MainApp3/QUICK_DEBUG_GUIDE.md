# 金字塔协同功能快速调试指南

## 问题：`isCollaborationEnabled` 始终为 false

### 快速测试方法

1. **访问主应用**: `http://localhost:7500`
2. **打开浏览器控制台** (F12)
3. **加载金字塔微应用**: 点击工具栏中的"金字塔"按钮
4. **查看控制台日志**: 查找以下关键信息

### 关键日志检查

#### 1. 协同数据传递日志
查找类似以下的日志：
```
金字塔微应用 props: {
  isCollaborationEnabled: true/false,
  pyramidProvider: true/false,
  pyramidSharedData: true/false,
  pyramidData: {...},
  debugInfo: {...}
}
```

#### 2. 金字塔组件协同状态
查找类似以下的日志：
```
金字塔组件协同状态: {
  isCollaborationEnabled: true/false,
  pyramidProvider: true/false,
  pyramidSharedData: true/false,
  pyramidCollaborationStatus: "connected/disconnected"
}
```

### 调试工具

如果协同功能启用，您会在控制台看到：
```
🔧 调试工具已加载，使用 window.pyramidDebug 进行测试
```

然后可以在控制台中使用以下命令：

```javascript
// 检查当前协同数据
window.pyramidDebug.getCurrentData()

// 测试协同功能
window.pyramidDebug.testCollaboration()

// 手动更新层数
window.pyramidDebug.updateLevels(5)

// 手动更新层数据
window.pyramidDebug.updateLevelData([
  { text: '测试层1', color: '#ff0000' },
  { text: '测试层2', color: '#00ff00' }
])
```

### 常见问题排查

#### 问题 1: `pyramidProvider: false`
**原因**: 协同提供者未正确初始化
**解决**: 检查协同服务器是否运行 (`ws://localhost:1234`)

#### 问题 2: `pyramidSharedData: false`
**原因**: 协同数据未正确传递
**解决**: 检查 SkeletonNodeView 中的 props 传递

#### 问题 3: `pyramidCollaborationStatus: "disconnected"`
**原因**: 协同服务器连接失败
**解决**: 重启协同服务器

### 服务器状态检查

```bash
# 检查协同服务器
netstat -an | findstr ":1234"

# 检查主应用
netstat -an | findstr ":7500"

# 检查微应用
netstat -an | findstr ":7200"
```

### 测试页面

访问测试页面: `http://localhost:7500/test-collaboration.html`

### 预期结果

正常情况下应该看到：
- `isCollaborationEnabled: true`
- `pyramidProvider: true`
- `pyramidSharedData: true`
- `pyramidCollaborationStatus: "connected"`
- 调试工具可用 (`window.pyramidDebug`)

如果仍然显示 `false`，请检查：
1. 协同服务器是否运行
2. 网络连接是否正常
3. 浏览器控制台是否有错误信息
4. 协同数据是否正确传递
