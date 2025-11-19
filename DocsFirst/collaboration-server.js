import { Logger } from '@hocuspocus/extension-logger';

// 使用本地移植的 server
const { Server } = await import('./src/server/index.ts');

const server = new Server({
  name: 'docsfirst-collaboration-server',
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
    console.log('🔐 用户认证请求:', {
      documentName: data.documentName,
      token: data.token ? `已提供: ${data.token.substring(0, 30)}...` : '未提供',
      hasToken: !!data.token,
    });
    
    // 总是允许连接，但记录认证信息
    // 从 token 中提取用户名（如果提供了 token）
    let userName = 'Anonymous';
    if (data.token && typeof data.token === 'string') {
      if (data.token.startsWith('token-')) {
        // token 格式: token-{userName}-{documentId}
        const parts = data.token.split('-');
        if (parts.length >= 2) {
          userName = parts[1] || 'Anonymous';
        }
      } else if (data.token !== 'default-token' && data.token !== 'anonymous-token') {
        userName = data.token;
      }
    }
    
    console.log(`✅ 认证通过，用户名: ${userName}`);
    
    // 必须返回 user 对象，否则认证会失败
    return {
      user: {
        name: userName,
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
      }
    };
  },
  async onLoadDocument(data) {
    console.log(`📄 文档加载: ${data.documentName}`);
    return null; // 返回 null 表示创建新文档
  },
  async onStoreDocument(data) {
    console.log(`💾 文档保存: ${data.documentName}`);
    // 这里可以添加持久化逻辑
  },
  async onDestroy() {
    console.log('🛑 协同服务器关闭');
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
      socketId: data.socketId,
      request: data.request?.url,
      headers: data.request?.headers
    });
  },
  async onRequest(data) {
    console.log('📥 HTTP 请求:', {
      url: data.request?.url,
      method: data.request?.method,
      headers: data.request?.headers
    });
  }
});

server.listen(1234, async () => {
  console.log('🚀 DocsFirst 协同编辑服务器启动成功!');
  console.log('📍 服务地址: ws://localhost:1234');
  console.log('📝 支持实时协同编辑');
  console.log('🎯 专为 DocsFirst 设计');
}).catch((error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('❌ 错误: 端口 1234 已被占用');
    console.error('💡 解决方案:');
    console.error('   1. 运行: npm run stop:server');
    console.error('   2. 或者手动停止: taskkill /PID <进程ID> /F');
    console.error('   3. 或者修改 collaboration-server.js 中的端口号');
    process.exit(1);
  } else {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
});
      
// 优雅关闭（Server 类已经处理了信号，但我们可以添加额外的日志）
process.on('SIGINT', async () => {
  console.log('\n🛑 正在关闭服务器...');
  try {
    await server.destroy();
  } catch (error) {
    console.error('关闭服务器时出错:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 正在关闭服务器...');
  try {
    await server.destroy();
  } catch (error) {
    console.error('关闭服务器时出错:', error);
  }
  process.exit(0);
});

export default server;





