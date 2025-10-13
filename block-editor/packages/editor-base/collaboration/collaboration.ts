import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

// 协同配置接口
export interface CollaborationConfig {
  wsUrl: string;
  roomName: string;
  microName: string;
}

// 协同状态类型
export type CollaborationStatus = 'disconnected' | 'connecting' | 'connected';

// 用户信息接口
export interface UserInfo {
  id: string;
  name: string;
  color: string;
  cursor?: any;
}

// 协同数据接口
export interface CollaborationData {
  [key: string]: any;
}

// 协同列表项接口
export interface CollaborationListItem {
  id: string;
  [key: string]: any;
}

// 协同管理类
export class CollaborationManager {
  private ydoc: Y.Doc;
  private provider: HocuspocusProvider;
  private sharedData: Y.Map<any>;
  private listData: Y.Array<any>;
  private awareness: any;
  private config: CollaborationConfig;
  private status: CollaborationStatus = 'disconnected';
  private statusCallbacks: ((status: CollaborationStatus) => void)[] = [];
  private dataCallbacks: (() => void)[] = [];
  private listCallbacks: (() => void)[] = [];
  private userCallbacks: (() => void)[] = [];

  constructor(config: CollaborationConfig) {
    this.config = config;
    
    // 创建Yjs文档
    this.ydoc = new Y.Doc();
    
    // 创建Hocuspocus provider
    this.provider = new HocuspocusProvider({
      url: config.wsUrl,
    //   name: `${config.microName}-${config.roomName}`,
      name: 'pyramid-microapp',
      document: this.ydoc,
      onConnect: () => {
        this.setStatus('connected');
        console.log(`✅ ${this.config.microName} 协同已连接`);
      },
      onDisconnect: () => {
        this.setStatus('disconnected');
        console.log(`❌ ${this.config.microName} 协同已断开`);
      },
      onStatus: ({ status }: { status: any }) => {
        console.log(`${this.config.microName} 协同状态:`, status);
      }
    });

    // 获取共享数据
    this.sharedData = this.ydoc.getMap('sharedData');
    this.listData = this.ydoc.getArray('listData');
    this.awareness = this.provider.awareness;

    // 绑定事件
    this.bindEvents();
  }

  private bindEvents(): void {
    // HocuspocusProvider的事件处理已经在构造函数中配置
    // 这里只需要绑定数据变化监听器
    
    // 监听数据变化
    this.sharedData.observe(() => {
      this.notifyDataCallbacks();
    });

    // 监听列表变化
    this.listData.observe(() => {
      this.notifyListCallbacks();
    });

    // 监听用户变化
    this.awareness.on('change', () => {
      this.notifyUserCallbacks();
    });
  }

  private setStatus(status: CollaborationStatus): void {
    this.status = status;
    this.statusCallbacks.forEach(callback => callback(status));
  }

  private notifyDataCallbacks(): void {
    this.dataCallbacks.forEach(callback => callback());
  }

  private notifyListCallbacks(): void {
    this.listCallbacks.forEach(callback => callback());
  }

  private notifyUserCallbacks(): void {
    this.userCallbacks.forEach(callback => callback());
  }

  // 设置用户信息
  setUser(userInfo: UserInfo): void {
    this.awareness.setLocalStateField('user', {
      name: userInfo.name || `${this.config.microName}用户${Math.floor(Math.random() * 1000)}`,
      color: userInfo.color || `#${Math.floor(Math.random()*16777215).toString(16)}`,
      cursor: userInfo.cursor || null
    });
  }

  // 监听状态变化
  onStatusChange(callback: (status: CollaborationStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  // 监听数据变化
  onDataChange(callback: () => void): () => void {
    this.dataCallbacks.push(callback);
    return () => {
      const index = this.dataCallbacks.indexOf(callback);
      if (index > -1) {
        this.dataCallbacks.splice(index, 1);
      }
    };
  }

  // 监听列表变化
  onListChange(callback: () => void): () => void {
    this.listCallbacks.push(callback);
    return () => {
      const index = this.listCallbacks.indexOf(callback);
      if (index > -1) {
        this.listCallbacks.splice(index, 1);
      }
    };
  }

  // 监听用户变化
  onUsersChange(callback: () => void): () => void {
    this.userCallbacks.push(callback);
    return () => {
      const index = this.userCallbacks.indexOf(callback);
      if (index > -1) {
        this.userCallbacks.splice(index, 1);
      }
    };
  }

  // 更新数据
  updateData(key: string, value: any): void {
    this.sharedData.set(key, value);
  }

  // 获取数据
  getData(key: string): any {
    return this.sharedData.get(key);
  }

  // 获取所有数据
  getAllData(): CollaborationData {
    const data: CollaborationData = {};
    this.sharedData.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }

  // 添加列表项
  addListItem(item: CollaborationListItem): void {
    this.listData.push([item]);
  }

  // 更新列表项
  updateListItem(index: number, item: CollaborationListItem): void {
    this.listData.delete(index, 1);
    this.listData.insert(index, [item]);
  }

  // 删除列表项
  removeListItem(index: number): void {
    this.listData.delete(index, 1);
  }

  // 获取列表数据
  getListData(): CollaborationListItem[] {
    return this.listData.toArray();
  }

  // 获取在线用户
  getOnlineUsers(): UserInfo[] {
    const states = this.awareness.getStates();
    const users: UserInfo[] = [];
    states.forEach((state: any, key: any) => {
      users.push({
        id: key,
        name: state.user?.name || 'Anonymous',
        color: state.user?.color || '#000000',
        cursor: state.user?.cursor || null
      });
    });
    return users;
  }

  // 获取当前状态
  getStatus(): CollaborationStatus {
    return this.status;
  }

  // 销毁协同
  destroy(): void {
    this.provider.destroy();
    this.ydoc.destroy();
  }

  // 获取provider实例（用于传递给微应用）
  getProvider(): HocuspocusProvider {
    return this.provider;
  }

  // 获取ydoc实例（用于传递给微应用）
  getYDoc(): Y.Doc {
    return this.ydoc;
  }

  // 获取共享数据实例（用于传递给微应用）
  getSharedData(): Y.Map<any> {
    return this.sharedData;
  }

  // 获取列表数据实例（用于传递给微应用）
  getListDataInstance(): Y.Array<any> {
    return this.listData;
  }
}
