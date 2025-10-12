const { Server } = require('@hocuspocus/server');
const { Logger } = require('@hocuspocus/extension-logger');

const server = new Server({
  name: 'mainapp3-collaboration-server',
  port: 1234,
  extensions: [
    new Logger(),
  ],
  async onAuthenticate(data) {
    // 简单的认证逻辑，实际项目中应该更严格
    console.log('用户认证:', data);
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
  }
});

server.listen(1234, () => {
  console.log('🚀 协同编辑服务器启动成功!');
  console.log('📍 服务地址: ws://localhost:1234');
  console.log('📝 支持实时协同编辑');
});

module.exports = server;
