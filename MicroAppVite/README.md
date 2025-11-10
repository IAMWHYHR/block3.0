# MicroAppVite

这是从 MicroApp 项目复制并使用 Vite 构建的微前端应用。

## 项目特点

- 使用 Vite 作为构建工具，提供更快的开发体验
- 支持 React 18
- 支持 qiankun 微前端框架
- 包含 Ant Design 组件库
- 支持 TipTap 编辑器扩展

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 或者
npm start

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
MicroAppVite/
├── src/
│   ├── components/          # React 组件
│   │   ├── AntdPyramid.jsx
│   │   ├── Pyramid.jsx
│   │   └── SimplePyramid.jsx
│   ├── index.jsx           # 应用入口
│   └── public-path.js      # 微前端 publicPath 配置
├── public/
│   └── index.html          # HTML 模板
├── vite.config.js          # Vite 配置
└── package.json            # 项目依赖
```

## 配置说明

### Vite 配置

- 端口：7200
- 支持 CORS
- 支持热更新
- 构建为 UMD 格式以支持微前端
- 支持 qiankun 的 publicPath 设置

### 微前端支持

项目已配置支持 qiankun 微前端框架，包括：

- 生命周期函数：bootstrap、mount、unmount
- 动态 publicPath 设置
- 独立运行模式支持

## 与原 MicroApp 项目的区别

1. **构建工具**：从 Webpack 迁移到 Vite
2. **开发体验**：更快的启动和热更新
3. **配置简化**：Vite 配置更简洁
4. **依赖优化**：移除了 Webpack 相关依赖，添加了 Vite 相关依赖

## 注意事项

- 确保 SharedSDK 依赖正确链接
- 在微前端环境中使用时，确保主应用正确配置了 publicPath
- 开发时使用 `npm run dev`，生产构建使用 `npm run build`

