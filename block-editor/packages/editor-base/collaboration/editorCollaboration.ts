import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { WebsocketProvider } from 'y-websocket';

// 协同配置接口
export interface EditorCollaborationConfig {
  wsUrl: string;
  roomName: string;
  microName: string;
  useHocuspocus?: boolean; // 是否使用Hocuspocus，默认为true
}

// 协同状态类型
export type EditorCollaborationStatus = 'disconnected' | 'connecting' | 'connected';

// 用户信息接口
export interface EditorUserInfo {
  id: string;
  name: string;
  color: string;
  cursor?: any;
}

// 协同提供者类型
export type CollaborationProvider = HocuspocusProvider | WebsocketProvider;

// 编辑器协同管理类
export class EditorCollaborationManager {
  private ydoc: Y.Doc;
  private provider: CollaborationProvider;
  private awareness: any;
  private config: EditorCollaborationConfig;
  private status: EditorCollaborationStatus = 'disconnected';
  private statusCallbacks: ((status: EditorCollaborationStatus) => void)[] = [];
  private userCallbacks: (() => void)[] = [];
  private isHocuspocus: boolean;
  private _isInitialized: boolean = false;
  private _isDestroyed: boolean = false;

  constructor(config: EditorCollaborationConfig) {
    this.config = config;
    this.isHocuspocus = config.useHocuspocus !== false; // 默认为true
    
    // 创建Yjs文档
    this.ydoc = new Y.Doc();
    
    // 根据配置选择provider
    if (this.isHocuspocus) {
      this.provider = new HocuspocusProvider({
        url: config.wsUrl,
        name: `${config.microName}-${config.roomName}`,
        document: this.ydoc,
        onConnect: () => {
          this._isInitialized = true;
          this.setStatus('connected');
          console.log(`✅ ${this.config.microName} 编辑器协同已连接`);
          console.log(`🔗 连接信息:`, {
            url: this.config.wsUrl,
            room: `${this.config.microName}-${this.config.roomName}`,
            provider: 'HocuspocusProvider'
          });
        },
        onDisconnect: ({ event }: { event: any }) => {
          this.setStatus('disconnected');
          console.log(`❌ ${this.config.microName} 编辑器协同已断开`, event);
        },
        onStatus: ({ status }: { status: any }) => {
          console.log(`${this.config.microName} 编辑器协同状态:`, status);
          if (status === 'connecting') {
            this.setStatus('connecting');
          }
        },
        onAuthenticationFailed: ({ reason }: { reason: any }) => {
          console.log(`❌ ${this.config.microName} 编辑器协同认证失败:`, reason);
        }
      });
    } else {
      this.provider = new WebsocketProvider(config.wsUrl, `${config.microName}-${config.roomName}`, this.ydoc);
      
      // 绑定WebsocketProvider事件
      this.provider.on('status', ({ status }: { status: any }) => {
        if (status === 'connected') {
          this._isInitialized = true;
          this.setStatus('connected');
          console.log(`✅ ${this.config.microName} 编辑器协同已连接`);
        } else if (status === 'disconnected') {
          this.setStatus('disconnected');
          console.log(`❌ ${this.config.microName} 编辑器协同已断开`);
        } else if (status === 'connecting') {
          this.setStatus('connecting');
          console.log(`🔄 ${this.config.microName} 编辑器协同连接中...`);
        } else {
          console.log(`${this.config.microName} 编辑器协同状态:`, status);
        }
      });
    }

    // 获取awareness
    this.awareness = this.provider.awareness;

    // 绑定事件
    this.bindEvents();
  }

  private bindEvents(): void {
    // 监听用户变化
    this.awareness.on('change', () => {
      this.notifyUserCallbacks();
    });
  }

  private setStatus(status: EditorCollaborationStatus): void {
    this.status = status;
    this.statusCallbacks.forEach(callback => callback(status));
  }

  private notifyUserCallbacks(): void {
    this.userCallbacks.forEach(callback => callback());
  }

  // 设置用户信息
  setUser(userInfo: Partial<EditorUserInfo>): void {
    const defaultUser = {
      name: `${this.config.microName}用户${Math.floor(Math.random() * 1000)}`,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      cursor: null
    };
    
    this.awareness.setLocalStateField('user', {
      ...defaultUser,
      ...userInfo
    });
  }

  // 监听状态变化
  onStatusChange(callback: (status: EditorCollaborationStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
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

  // 获取在线用户
  getOnlineUsers(): EditorUserInfo[] {
    const states = this.awareness.getStates();
    const users: EditorUserInfo[] = [];
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
  getStatus(): EditorCollaborationStatus {
    return this.status;
  }

  // 销毁协同
  destroy(): void {
    if (this._isDestroyed) {
      console.log(`⚠️ ${this.config.microName} 协同管理器已经被销毁，跳过重复销毁`);
      return;
    }

    console.log(`🗑️ 开始销毁 ${this.config.microName} 协同管理器...`);
    
    // 检查是否已经初始化
    if (!this._isInitialized) {
      console.log(`⚠️ ${this.config.microName} 协同连接尚未完全建立，延迟销毁`);
      // 延迟销毁，等待连接建立
      setTimeout(() => {
        if (!this._isDestroyed && this._isInitialized) {
          this.performDestroy();
        } else if (!this._isDestroyed) {
          console.log(`⚠️ ${this.config.microName} 连接超时，强制销毁`);
          this.performDestroy();
        }
      }, 5000); // 等待5秒
      return;
    }

    this.performDestroy();
  }

  private performDestroy(): void {
    if (this._isDestroyed) return;
    
    this._isDestroyed = true;
    
    try {
      if (this.provider) {
        this.provider.destroy();
        console.log(`✅ ${this.config.microName} Provider 已销毁`);
      }
    } catch (error) {
      console.error(`❌ 销毁 Provider 时出错:`, error);
    }

    try {
      if (this.ydoc) {
        this.ydoc.destroy();
        console.log(`✅ ${this.config.microName} YDoc 已销毁`);
      }
    } catch (error) {
      console.error(`❌ 销毁 YDoc 时出错:`, error);
    }

    console.log(`✅ ${this.config.microName} 协同管理器销毁完成`);
  }

  // 获取provider实例（用于传递给TipTap）
  getProvider(): CollaborationProvider {
    return this.provider;
  }

  // 获取ydoc实例（用于传递给TipTap）
  getYDoc(): Y.Doc {
    return this.ydoc;
  }

  // 获取awareness实例
  getAwareness(): any {
    return this.awareness;
  }

  // 检查是否使用Hocuspocus
  isUsingHocuspocus(): boolean {
    return this.isHocuspocus;
  }

  // 检查是否已初始化
  isInitialized(): boolean {
    return this._isInitialized;
  }

  // 检查是否已销毁
  isDestroyed(): boolean {
    return this._isDestroyed;
  }
}

// 创建默认的协同管理器实例（可选）
let defaultCollaborationManager: EditorCollaborationManager | null = null;

export const createEditorCollaboration = (config: EditorCollaborationConfig): EditorCollaborationManager => {
  return new EditorCollaborationManager(config);
};

export const getDefaultEditorCollaboration = (): EditorCollaborationManager | null => {
  return defaultCollaborationManager;
};

export const setDefaultEditorCollaboration = (manager: EditorCollaborationManager): void => {
  defaultCollaborationManager = manager;
};

export const destroyDefaultEditorCollaboration = (): void => {
  if (defaultCollaborationManager) {
    defaultCollaborationManager.destroy();
    defaultCollaborationManager = null;
  }
};
