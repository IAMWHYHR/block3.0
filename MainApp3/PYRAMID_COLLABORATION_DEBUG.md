# 金字塔协同功能调试指南

## 问题描述
在主应用中修改金字塔的层级或颜色时，其他用户页面没有实时同步变化。

## 调试步骤

### 1. 检查服务器状态
确保所有必要的服务都在运行：
```bash
# 检查协同服务器 (端口 1234)
netstat -an | findstr ":1234"

# 检查主应用 (端口 7500)
netstat -an | findstr ":7500"

# 检查微应用 (端口 7200)
netstat -an | findstr ":7200"
```

### 2. 检查浏览器控制台日志

#### 主应用控制台 (MainApp3)
打开 `http://localhost:7500` 的控制台，查找以下日志：
- `✅ 协同编辑已连接` - 协同服务器连接成功
- `金字塔协同数据已同步` - 金字塔数据同步成功
- `协同更新层数:` - 层数更新成功
- `协同更新层数据:` - 层数据更新成功

#### 微应用控制台 (MicroApp)
在金字塔微应用中查找以下日志：
- `金字塔组件协同状态:` - 协同状态信息
- `updateLevels 被调用:` - 层数更新方法被调用
- `✅ 协同更新层数:` - 协同更新成功
- `❌ 使用本地状态更新层数:` - 协同更新失败，使用本地状态

### 3. 测试协同功能

#### 步骤 1: 打开两个浏览器窗口
1. 窗口 A: `http://localhost:7500`
2. 窗口 B: `http://localhost:7500`

#### 步骤 2: 加载金字塔微应用
在每个窗口中：
1. 点击工具栏中的"金字塔"按钮
2. 等待金字塔微应用加载完成
3. 查看右上角的协同状态指示器

#### 步骤 3: 测试数据同步
在窗口 A 中：
1. 修改金字塔层数（点击 + 或 - 按钮）
2. 修改层级文本或颜色
3. 观察控制台日志

在窗口 B 中：
1. 观察金字塔是否实时更新
2. 查看控制台是否有数据变化日志

### 4. 常见问题排查

#### 问题 1: 协同状态显示"已断开"
**可能原因**:
- 协同服务器未启动
- 网络连接问题
- WebSocket 连接失败

**解决方案**:
```bash
# 重启协同服务器
cd MainApp3
npm run collaboration-server
```

#### 问题 2: 金字塔组件显示"协同更新失败"
**可能原因**:
- 协同数据未正确传递
- updatePyramidData 方法未定义
- pyramidSharedData 未初始化

**解决方案**:
1. 检查 SkeletonNodeView 中的 props 传递
2. 确认 pyramid-collaboration.js 正确导出方法
3. 查看调试信息中的 debugInfo

#### 问题 3: 数据更新但不同步
**可能原因**:
- 协同数据监听器未正确设置
- 数据更新方法调用错误
- Yjs 文档同步问题

**解决方案**:
1. 检查 pyramidSharedData.observe() 是否正确设置
2. 确认 updatePyramidData 方法正确调用
3. 查看协同数据变化日志

### 5. 调试代码

#### 在金字塔组件中添加调试代码
```javascript
// 在 updateLevels 方法中添加
console.log('updateLevels 调试:', {
  newLevels,
  isCollaborationEnabled,
  updatePyramidData: typeof updatePyramidData,
  pyramidSharedData: !!pyramidSharedData
});
```

#### 在 SkeletonNodeView 中添加调试代码
```javascript
// 在微应用加载时添加
console.log('金字塔协同 props:', {
  pyramidProvider: !!pyramidProvider,
  pyramidSharedData: !!pyramidSharedData,
  updatePyramidData: typeof updatePyramidData,
  pyramidData
});
```

### 6. 手动测试协同数据

#### 在浏览器控制台中测试
```javascript
// 在 MainApp3 控制台中
// 检查协同数据
console.log('协同数据:', pyramidData);
console.log('共享数据键:', Array.from(pyramidSharedData.keys()));

// 手动更新数据
updatePyramidData('test', 'hello world');
console.log('测试数据:', getPyramidData('test'));
```

### 7. 网络检查

#### 检查 WebSocket 连接
1. 打开浏览器开发者工具
2. 切换到 Network 标签
3. 过滤 WebSocket 连接
4. 查看 `ws://localhost:1234` 连接状态

#### 检查协同服务器日志
在协同服务器控制台中查看：
- 用户连接日志
- 文档加载日志
- 数据同步日志

### 8. 重置协同状态

如果协同功能完全失效，可以尝试重置：

```javascript
// 在浏览器控制台中
// 清理协同数据
pyramidSharedData.clear();
pyramidList.delete(0, pyramidList.length);

// 重新初始化数据
updatePyramidData('levels', 3);
updatePyramidData('levelData', [
  { text: '顶层', color: '#ff6b6b' },
  { text: '中层', color: '#4ecdc4' },
  { text: '底层', color: '#45b7d1' }
]);
```

## 预期行为

### 正常工作的协同功能应该显示：
1. **协同状态**: 显示"已连接"和在线用户数量
2. **数据同步**: 修改一个窗口的数据，另一个窗口立即更新
3. **控制台日志**: 显示协同更新成功的日志
4. **实时更新**: 层数、文本、颜色变化都能实时同步

### 如果仍然不工作：
1. 检查所有服务是否正常运行
2. 查看浏览器控制台的错误信息
3. 确认协同数据正确传递
4. 检查网络连接和防火墙设置
