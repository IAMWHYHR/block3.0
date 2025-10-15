# Block Editor

一个基于 TipTap 的富文本编辑器，支持微应用集成和实时协同编辑。

## 项目结构

```
block-editor/
├── packages/
│   ├── editor-base/          # 编辑器核心包
│   │   ├── editor/           # Editor 类
│   │   ├── sketetonNode/     # SkeletonNode 实现
│   │   └── index.ts          # 导出 createEditor 方法
│   └── editor-sdk/           # 编辑器 SDK（待实现）
├── app/                      # Vite 应用入口
│   ├── src/
│   │   ├── App.tsx           # 主应用组件
│   │   └── main.tsx          # 应用入口
│   └── index.html            # HTML 模板
└── package.json              # Workspace 配置
```

## 功能特性

- 🎨 基于 TipTap 的富文本编辑器
- 🔌 支持微应用集成（SkeletonNode）
- 🌐 实时协同编辑（基于 Yjs + WebSocket）
- ⚡ Vite 构建工具
- 📦 Monorepo 工作空间管理

## 快速开始

### 1. 安装依赖

```bash
cd block-editor
npm install
```

### 2. 构建编辑器包

```bash
npm run build:packages
```

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

## 使用方法

### 创建编辑器

```typescript
import { createEditor } from '@block-editor/editor-base';

const editor = createEditor({
  root: document.getElementById('editor'),
  microName: 'my-micro-app',
  wsUrl: 'ws://localhost:1234'
});

// 插入微应用节点
editor.insertSkeletonNode();
```

### API 参考

#### createEditor(options)

创建编辑器实例

**参数:**
- `root: HTMLElement` - 编辑器挂载的 DOM 元素
- `microName: string` - 微应用名称
- `wsUrl: string` - WebSocket 协同服务地址

**返回值:**
- `Editor` 实例

#### Editor 类方法

- `getEditor(): TiptapEditor` - 获取 TipTap 编辑器实例
- `insertSkeletonNode(): void` - 插入微应用节点
- `destroy(): void` - 销毁编辑器
- `getYDoc(): Y.Doc` - 获取协同文档
- `getProvider(): WebsocketProvider` - 获取协同 provider

## 微应用集成

SkeletonNode 支持动态加载微应用，每个微应用都有独立的协同文档和 WebSocket 连接。

### 微应用配置

微应用通过以下属性进行配置：
- `microName`: 微应用唯一标识
- `wsUrl`: WebSocket 协同服务地址

### 协同编辑

每个微应用都有独立的 Yjs 文档和 WebSocket provider，支持：
- 实时数据同步
- 冲突解决
- 离线支持

## 开发指南

### 添加新的节点类型

1. 在 `packages/editor-base/` 下创建新的节点目录
2. 实现节点类和视图组件
3. 在 Editor 类中注册新节点

### 自定义微应用加载

修改 `SkeletonNodeView.tsx` 中的 `loadMicroApplication` 方法来实现自定义的微应用加载逻辑。

## 技术栈

- **编辑器**: TipTap + ProseMirror
- **协同编辑**: Yjs + y-websocket
- **构建工具**: Vite
- **包管理**: npm workspaces
- **类型支持**: TypeScript
- **UI 框架**: React

## 许可证

MIT








