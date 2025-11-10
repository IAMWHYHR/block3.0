# CloudDocs - 协同文档编辑器

基于 Vite + React + TipTap + Yjs + Hocuspocus 构建的协同文档编辑器。

## 功能特性

- ✨ 使用 TipTap 构建的富文本编辑器
- 🤝 实时协同编辑（基于 Yjs）
- 📡 Hocuspocus 协同服务器
- 🎨 现代化的用户界面
- ⚡ Vite 快速开发体验

## 技术栈

- **前端框架**: React 18
- **构建工具**: Vite 4
- **编辑器**: TipTap 2
- **协同框架**: Yjs
- **协同集成**: y-prosemirror
- **协同服务器**: Hocuspocus

## 项目结构

```
CloudDocs/
├── src/
│   ├── components/
│   │   ├── Editor.tsx       # 主编辑器组件
│   │   └── Editor.css       # 编辑器样式
│   ├── App.tsx              # 应用入口组件
│   ├── App.css              # 应用样式
│   ├── main.tsx             # React 入口
│   └── index.css            # 全局样式
├── server/                  # Hocuspocus 协同服务器
│   └── index.js             # 服务器入口
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 安装依赖

```bash
npm install
```

## 开发

### 启动前端开发服务器

```bash
npm run dev
```

前端应用将在 http://localhost:3000 运行

### 启动协同服务器

```bash
npm run server
```

协同服务器将在 ws://localhost:1234 运行

### 同时启动前端和服务端

```bash
npm run dev:full
```

## 使用说明

1. 确保协同服务器已启动（`npm run server`）
2. 启动前端开发服务器（`npm run dev`）
3. 在浏览器中打开应用
4. 打开多个浏览器窗口/标签页测试协同编辑功能

## 构建

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

## 预览构建结果

```bash
npm run preview
```

## 配置

### 编辑器配置

编辑器配置位于 `src/components/Editor.tsx`，可以自定义：
- 文档 ID（`documentId`）
- 用户名（`userName`）
- 用户颜色（`userColor`）

### 服务器配置

服务器配置位于 `server/index.js`，可以自定义：
- 端口号（默认 1234）
- 文档加载/保存逻辑
- 权限验证等

## 注意事项

- 确保协同服务器在客户端连接之前已启动
- 多个用户编辑同一文档时，需要确保他们使用相同的 `documentId`
- 生产环境部署时，建议配置 CORS 和权限验证



