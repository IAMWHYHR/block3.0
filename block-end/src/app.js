const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pyramidRoutes = require('./routes/pyramidRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: [
    'http://localhost:3001',  // block-editor主应用
    'http://localhost:7100', 
    'http://localhost:7200', 
    'http://localhost:7300', 
    'http://localhost:7500',
    'http://localhost:3000'   // 本地开发
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 处理OPTIONS预检请求
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// 路由
app.use('/api/pyramids', pyramidRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Block 后端服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Block 后端 API 服务',
    version: '1.0.0',
    endpoints: {
      pyramids: '/api/pyramids',
      health: '/health'
    }
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : '未知错误'
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Block 后端服务启动成功!`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🔗 API 文档: http://localhost:${PORT}`);
  console.log(`💊 健康检查: http://localhost:${PORT}/health`);
});

module.exports = app;


