import { Logger } from '@hocuspocus/extension-logger';

// 使用动态导入来加载@hocuspocus/server
const { Hocuspocus } = await import('@hocuspocus/server');

const server = new Hocuspocus({
  name: 'clouddocs-collaboration-server',
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
    // 开发环境：总是允许连接，即使没有 token
    console.log('🔐 用户认证请求:', {
      documentName: data.documentName,
      token: data.token ? `已提供: ${data.token.substring(0, 30)}...` : '未提供',
      hasToken: !!data.token,
      tokenType: typeof data.token,
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
    console.log(`📄 文档加载:`, {
      documentName: data.documentName,
      user: data.user || null
    });
    // 如果文档已存在，返回已存在的文档；否则返回 null 创建新文档
    // 这里简化处理，总是返回 null，让服务器管理文档
    return null;
  },
  async onStoreDocument(data) {
    console.log(`💾 文档保存:`, {
      documentName: data.documentName,
      user: data.user || null
    });
    // 这里可以添加持久化逻辑
  },
  async onDestroy() {
    console.log('协同服务器关闭');
  },
  async onConnect(data) {
    console.log('✅ 新连接建立:', {
      documentName: data.documentName,
      socketId: data.socketId,
      user: data.user || null
    });
    // 检查连接到同一文档的客户端数量
    // 注意：这里需要访问服务器实例来获取连接数，简化处理
  },
  async onDisconnect(data) {
    console.log('❌ 连接断开:', {
      documentName: data.documentName,
      socketId: data.socketId,
      user: data.user || null
    });
  },
  async onUpgrade(data) {
    console.log('🔄 WebSocket升级:', {
      documentName: data.documentName,
      socketId: data.socketId,
      user: data.user || null
    });
  }
});

server.listen(1234, () => {
  console.log('🚀 CloudDocs 协同编辑服务器启动成功!');
  console.log('📍 服务地址: ws://localhost:1234');
  console.log('📝 支持实时协同编辑');
  console.log('🎯 专为 CloudDocs 设计');
});

export default server;
