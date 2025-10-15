import { 
  CollaborationStatus, 
  UserInfo, 
  CollaborationData, 
  CollaborationListItem,
  CollaborationConfig 
} from '../types/MicroAppProps';
import { globalCollaborationManager } from '../collaboration/collaboration';

/**
 * 协同服务实现类
 * 按照SharedSDK接口规范封装协同功能
 */
export class CollaborationService implements CollaborationService {
  private config: CollaborationConfig;
  private connectionRef: any;
  private statusCallbacks: ((status: CollaborationStatus) => void)[] = [];
  private userCallbacks: (() => void)[] = [];

  constructor(config: CollaborationConfig) {
    this.config = config;
    this.initializeConnection();
  }

  /**
   * 初始化协同连接
   */
  private initializeConnection(): void {
    try {
      // 获取或创建全局连接
      this.connectionRef = globalCollaborationManager.getConnection(this.config);
      
      // 监听状态变化
      globalCollaborationManager.onStatusChange(this.config, (status) => {
        this.statusCallbacks.forEach(callback => callback(status));
      });
      
      // 监听用户变化
      globalCollaborationManager.onUsersChange(this.config, () => {
        this.userCallbacks.forEach(callback => callback());
      });
      
      console.log('✅ 协同服务初始化完成:', this.config);
    } catch (error) {
      console.error('❌ 协同服务初始化失败:', error);
    }
  }

  /**
   * 获取协同状态
   */
  getStatus(): CollaborationStatus {
    return this.connectionRef?.status || 'disconnected';
  }

  /**
   * 监听状态变化
   */
  onStatusChange(callback: (status: CollaborationStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 设置用户信息
   */
  setUser(userInfo: UserInfo): void {
    if (this.connectionRef) {
      globalCollaborationManager.setUser(this.config, userInfo);
    }
  }

  /**
   * 获取在线用户
   */
  getOnlineUsers(): UserInfo[] {
    if (this.connectionRef) {
      return globalCollaborationManager.getOnlineUsers(this.config);
    }
    return [];
  }

  /**
   * 监听用户变化
   */
  onUsersChange(callback: () => void): () => void {
    this.userCallbacks.push(callback);
    return () => {
      const index = this.userCallbacks.indexOf(callback);
      if (index > -1) {
        this.userCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 更新数据
   */
  updateData(key: string, value: any): void {
    if (this.connectionRef?.ydoc) {
      this.connectionRef.ydoc.getMap('sharedData').set(key, value);
    }
  }

  /**
   * 获取数据
   */
  getData(key: string): any {
    if (this.connectionRef?.ydoc) {
      return this.connectionRef.ydoc.getMap('sharedData').get(key);
    }
    return undefined;
  }

  /**
   * 获取所有数据
   */
  getAllData(): CollaborationData {
    if (this.connectionRef?.ydoc) {
      const data: CollaborationData = {};
      this.connectionRef.ydoc.getMap('sharedData').forEach((value: any, key: any) => {
        data[key] = value;
      });
      return data;
    }
    return {};
  }

  /**
   * 添加列表项
   */
  addListItem(item: CollaborationListItem): void {
    if (this.connectionRef?.ydoc) {
      this.connectionRef.ydoc.getArray('listData').push([item]);
    }
  }

  /**
   * 更新列表项
   */
  updateListItem(index: number, item: CollaborationListItem): void {
    if (this.connectionRef?.ydoc) {
      const listData = this.connectionRef.ydoc.getArray('listData');
      listData.delete(index, 1);
      listData.insert(index, [item]);
    }
  }

  /**
   * 删除列表项
   */
  removeListItem(index: number): void {
    if (this.connectionRef?.ydoc) {
      this.connectionRef.ydoc.getArray('listData').delete(index, 1);
    }
  }

  /**
   * 获取列表数据
   */
  getListData(): CollaborationListItem[] {
    if (this.connectionRef?.ydoc) {
      return this.connectionRef.ydoc.getArray('listData').toArray();
    }
    return [];
  }

  /**
   * 获取实时数据
   */
  getRealTimeData(): CollaborationData {
    if (this.connectionRef?.ydoc) {
      const data: CollaborationData = {};
      this.connectionRef.ydoc.getMap('sharedData').forEach((value: any, key: any) => {
        data[key] = value;
      });
      return data;
    }
    return {};
  }

  /**
   * 获取实时列表数据
   */
  getRealTimeListData(): CollaborationListItem[] {
    if (this.connectionRef?.ydoc) {
      return this.connectionRef.ydoc.getArray('listData').toArray();
    }
    return [];
  }

  /**
   * 获取调试信息
   */
  getDebugInfo(): any {
    return {
      config: this.config,
      connectionExists: !!this.connectionRef,
      status: this.getStatus(),
      providerExists: !!this.connectionRef?.provider,
      ydocExists: !!this.connectionRef?.ydoc,
      sharedDataKeys: this.connectionRef?.ydoc ? 
        Array.from(this.connectionRef.ydoc.getMap('sharedData').keys()) : [],
      listDataLength: this.getListData().length,
      onlineUsersCount: this.getOnlineUsers().length
    };
  }

  /**
   * 释放连接引用
   */
  releaseConnection(): void {
    if (this.connectionRef) {
      globalCollaborationManager.releaseConnection(this.config);
    }
  }
}

/**
 * 创建协同服务实例
 */
export function createCollaborationService(config: CollaborationConfig): CollaborationService {
  return new CollaborationService(config);
}
