import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

// 创建金字塔专用的 Yjs 文档
export const pyramidYdoc = new Y.Doc();

// 创建金字塔协同提供者
export const pyramidProvider = new HocuspocusProvider({
  url: 'ws://localhost:1234',
  name: 'pyramid-microapp', // 金字塔微应用文档名称
  document: pyramidYdoc,
  onConnect: () => {
    console.log('✅ 金字塔协同编辑已连接');
    // 初始化默认数据
    if (pyramidSharedData.size === 0) {
      updatePyramidData('levels', 3);
      updatePyramidData('levelData', [
        { text: '顶层', color: '#ff6b6b' },
        { text: '中层', color: '#4ecdc4' },
        { text: '底层', color: '#45b7d1' }
      ]);
      updatePyramidData('selectedPyramidId', '');
      console.log('📝 金字塔默认数据已初始化');
    }
  },
  onDisconnect: () => {
    console.log('❌ 金字塔协同编辑已断开');
  },
  onStatus: ({ status }) => {
    console.log('金字塔协同状态:', status);
  },
  onAuthenticationFailed: () => {
    console.log('❌ 金字塔协同认证失败');
  },
  onLoad: () => {
    console.log('📄 金字塔文档已加载');
  },
  onStore: () => {
    console.log('💾 金字塔文档已保存');
  },
  onDestroy: () => {
    console.log('🗑️ 金字塔文档已销毁');
  }
});

// 获取金字塔文档的共享数据
export const pyramidSharedData = pyramidYdoc.getMap('pyramidData');

// 获取金字塔文档的数组数据（用于金字塔列表）
export const pyramidList = pyramidYdoc.getArray('pyramidList');

// 金字塔协同状态管理
export const pyramidAwareness = pyramidProvider.awareness;

// 添加调试信息
console.log('🔧 金字塔协同数据初始化:', {
  pyramidYdoc: !!pyramidYdoc,
  pyramidProvider: !!pyramidProvider,
  pyramidSharedData: !!pyramidSharedData,
  pyramidList: !!pyramidList,
  pyramidAwareness: !!pyramidAwareness
});

// 设置用户信息
export const setPyramidUser = (userInfo) => {
  pyramidAwareness.setLocalStateField('user', {
    name: userInfo.name || `金字塔用户${Math.floor(Math.random() * 1000)}`,
    color: userInfo.color || `#${Math.floor(Math.random()*16777215).toString(16)}`,
    cursor: userInfo.cursor || null
  });
};

// 监听金字塔数据变化
export const onPyramidDataChange = (callback) => {
  pyramidSharedData.observe(callback);
  return () => pyramidSharedData.unobserve(callback);
};

// 监听金字塔列表变化
export const onPyramidListChange = (callback) => {
  pyramidList.observe(callback);
  return () => pyramidList.unobserve(callback);
};

// 监听用户状态变化
export const onPyramidUsersChange = (callback) => {
  pyramidAwareness.on('change', callback);
  return () => pyramidAwareness.off('change', callback);
};

// 更新金字塔数据
export const updatePyramidData = (key, value) => {
  pyramidSharedData.set(key, value);
};

// 获取金字塔数据
export const getPyramidData = (key) => {
  return pyramidSharedData.get(key);
};

// 添加金字塔到列表
export const addPyramidToList = (pyramid) => {
  pyramidList.push([pyramid]);
};

// 更新金字塔列表项
export const updatePyramidInList = (index, pyramid) => {
  pyramidList.delete(index, 1);
  pyramidList.insert(index, [pyramid]);
};

// 从列表中删除金字塔
export const removePyramidFromList = (index) => {
  pyramidList.delete(index, 1);
};

// 获取当前在线用户
export const getPyramidOnlineUsers = () => {
  const states = pyramidAwareness.getStates();
  return Array.from(states.entries()).map(([key, state]) => ({
    id: key,
    name: state.user?.name || 'Anonymous',
    color: state.user?.color || '#000000',
    cursor: state.user?.cursor || null
  }));
};

// 清理函数
export const cleanupPyramidCollaboration = () => {
  pyramidProvider.destroy();
  pyramidYdoc.destroy();
};
