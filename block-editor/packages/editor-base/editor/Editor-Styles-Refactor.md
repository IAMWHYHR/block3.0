# Block Editor - Editor组件样式重构说明

## 重构概述

将 `block-editor/packages/editor-base/editor/Editor.tsx` 中的所有内联样式抽取到独立的CSS文件中，提高代码的可维护性和可读性。

## 文件结构

```
block-editor/packages/editor-base/editor/
├── Editor.tsx                    # 主组件文件（已移除内联样式）
├── Editor.css                    # 样式文件（新增）
└── Editor-Styles-Refactor.md     # 重构说明文档
```

## 样式分类

### 1. 协同状态显示样式
- `.collaboration-status` - 状态栏容器（支持不同状态）
- `.collaboration-status.connected` - 已连接状态样式
- `.collaboration-status.disconnected` - 未连接状态样式
- `.collaboration-status-info` - 状态信息区域
- `.collaboration-status-indicator` - 状态指示器（支持不同状态）

### 2. 工具栏样式
- `.editor-toolbar` - 工具栏容器
- `.toolbar-btn` - 基本按钮样式
- `.toolbar-btn:hover` - 按钮悬停效果
- `.toolbar-btn.is-active` - 按钮激活状态
- `.micro-app-buttons` - 微应用按钮组
- `.micro-app-btn` - 微应用按钮基础样式
- `.micro-app-btn.micro-app-1` - 微应用1按钮样式
- `.micro-app-btn.micro-app-2` - 微应用2按钮样式
- `.micro-app-btn.pyramid-app` - 金字塔应用按钮样式

### 3. 编辑器内容样式
- `.editor-content` - 编辑器内容区域
- `.editor-container` - 编辑器容器
- `.ProseMirror` - TipTap编辑器核心样式
- 各种文本格式样式（标题、列表、引用、代码等）

### 4. 响应式设计
- 移动端适配样式（768px以下）
- 小屏幕适配样式（480px以下）

## 样式特性

### 1. 状态指示器
```css
.collaboration-status-indicator.connected { background-color: #28a745; }
.collaboration-status-indicator.disconnected { background-color: #dc3545; }
```

### 2. 按钮状态管理
```css
.toolbar-btn.is-active {
  background-color: #007bff;
  color: #fff;
  border-color: #007bff;
}
```

### 3. 微应用按钮样式
```css
.micro-app-btn.micro-app-1 {
  border: 1px solid #28a745;
  background-color: #28a745;
}

.micro-app-btn.micro-app-2 {
  border: 1px solid #17a2b8;
  background-color: #17a2b8;
}

.micro-app-btn.pyramid-app {
  border: 1px solid #ffc107;
  background-color: #ffc107;
  color: #000;
}
```

### 4. 响应式设计
```css
@media (max-width: 768px) {
  .editor-toolbar {
    padding: 8px;
    gap: 4px;
  }
  
  .toolbar-btn {
    padding: 4px 8px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .editor-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
```

## 使用方式

在 `Editor.tsx` 中引入CSS文件：

```tsx
import './Editor.css';
```

## 重构前后对比

### 重构前（内联样式）
```tsx
<div style={{
  padding: '8px 12px',
  backgroundColor: collaborationStatus === 'connected' ? '#d4edda' : '#f8d7da',
  border: `1px solid ${collaborationStatus === 'connected' ? '#c3e6cb' : '#f5c6cb'}`,
  borderRadius: '4px',
  marginBottom: '16px',
  fontSize: '14px',
  color: collaborationStatus === 'connected' ? '#155724' : '#721c24'
}}>
```

### 重构后（CSS类）
```tsx
<div className={`collaboration-status ${collaborationStatus}`}>
```

## 优势

1. **可维护性**：样式集中管理，易于修改和维护
2. **可读性**：TSX代码更简洁，专注于逻辑而非样式
3. **性能**：CSS文件可以被浏览器缓存
4. **复用性**：样式可以在其他组件中复用
5. **主题支持**：便于实现主题切换功能
6. **响应式设计**：统一的响应式断点和样式

## 注意事项

1. 确保构建工具支持CSS文件加载
2. 所有原有功能保持不变
3. 响应式设计已包含在CSS中
4. 状态相关的样式通过动态类名实现

## 测试建议

1. 构建包：`npm run build`
2. 检查编辑器样式是否正确应用
3. 测试响应式设计在不同屏幕尺寸下的表现
4. 验证协同状态指示器颜色变化
5. 确认工具栏按钮状态样式正常
6. 测试微应用按钮的悬停效果

## 技术细节

- 使用CSS类名替代内联样式
- 通过动态类名实现状态相关样式
- 保持原有的交互逻辑不变
- 添加了悬停效果和过渡动画
- 实现了完整的响应式设计
