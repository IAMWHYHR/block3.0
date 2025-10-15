import { Logger } from '@hocuspocus/extension-logger';

// 使用动态导入来加载@hocuspocus/server
const { Hocuspocus } = await import('@hocuspocus/server');

const server = new Hocuspocus({
  name: 'block-editor-collaboration-server',
  port: 1234,
  address: '0.0.0.0', // 监听所有网络接口
  timeout: 30000, // 30秒超时
  debounce: 2000, // 2秒防抖
  maxDebounce: 10000, // 最大防抖时间
  quiet: false, // 不静默模式，显示日志
  extensions: [
    new Logger(),
  ],
  async onAuthenticate(data) {
    // 简单的认证逻辑，实际项目中应该更严格
    console.log('用户认证:', data);
    
    // 总是允许连接，但记录认证信息
    return {
      user: {
        name: data.token || 'Anonymous',
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }
    };
  },
  async onLoadDocument(data) {
    console.log(`文档加载: ${data.documentName}`);
    return null; // 返回 null 表示创建新文档
  },
  async onStoreDocument(data) {
    console.log(`文档保存: ${data.documentName}`);
    // 这里可以添加持久化逻辑
  },
  async onDestroy() {
    console.log('协同服务器关闭');
  },
  async onConnect(data) {
    console.log('✅ 新连接建立:', {
      documentName: data.documentName,
      socketId: data.socketId,
      user: data.user
    });
  },
  async onDisconnect(data) {
    console.log('❌ 连接断开:', {
      documentName: data.documentName,
      socketId: data.socketId
    });
  },
  async onUpgrade(data) {
    console.log('🔄 WebSocket升级:', {
      documentName: data.documentName,
      socketId: data.socketId
    });
  }
});

server.listen(1234, () => {
  console.log('🚀 Block Editor 协同编辑服务器启动成功!');
  console.log('📍 服务地址: ws://localhost:1234');
  console.log('📝 支持实时协同编辑');
  console.log('🎯 专为 Block Editor 设计');
});

export default server;
