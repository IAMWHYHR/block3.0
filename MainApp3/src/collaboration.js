import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

// 创建 Yjs 文档
export const ydoc = new Y.Doc();

// 创建协同提供者
export const provider = new HocuspocusProvider({
  url: 'ws://localhost:1234',
  name: 'mainapp3-editor', // 文档名称
  document: ydoc,
  connect: true, // 自动连接
  onConnect: () => {
    console.log('✅ 协同编辑已连接');
  },
  onDisconnect: ({ event }) => {
    console.log('❌ 协同编辑已断开', event);
  },
  onStatus: ({ status }) => {
    console.log('协同状态:', status);
  },
  onAuthenticationFailed: ({ reason }) => {
    console.log('❌ 协同认证失败:', reason);
  },
  onLoad: () => {
    console.log('📄 文档已加载');
  },
  onStore: () => {
    console.log('💾 文档已保存');
  },
  onDestroy: () => {
    console.log('🗑️ 文档已销毁');
  }
});

// ydoc 已经在上面通过 export const 导出了

// 清理函数
export const cleanup = () => {
  provider.destroy();
  ydoc.destroy();
};