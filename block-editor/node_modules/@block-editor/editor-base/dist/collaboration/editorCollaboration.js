import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { WebsocketProvider } from 'y-websocket';
// 编辑器协同管理类
export class EditorCollaborationManager {
    constructor(config) {
        this.status = 'disconnected';
        this.statusCallbacks = [];
        this.userCallbacks = [];
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
                    this.setStatus('connected');
                    console.log(`✅ ${this.config.microName} 编辑器协同已连接`);
                    console.log(`🔗 连接信息:`, {
                        url: this.config.wsUrl,
                        room: `${this.config.microName}-${this.config.roomName}`,
                        provider: 'HocuspocusProvider'
                    });
                },
                onDisconnect: () => {
                    this.setStatus('disconnected');
                    console.log(`❌ ${this.config.microName} 编辑器协同已断开`);
                },
                onStatus: ({ status }) => {
                    console.log(`${this.config.microName} 编辑器协同状态:`, status);
                },
                onAuthenticationFailed: () => {
                    console.log(`❌ ${this.config.microName} 编辑器协同认证失败`);
                }
            });
        }
        else {
            this.provider = new WebsocketProvider(config.wsUrl, `${config.microName}-${config.roomName}`, this.ydoc);
            // 绑定WebsocketProvider事件
            this.provider.on('status', ({ status }) => {
                if (status === 'connected') {
                    this.setStatus('connected');
                    console.log(`✅ ${this.config.microName} 编辑器协同已连接`);
                }
                else if (status === 'disconnected') {
                    this.setStatus('disconnected');
                    console.log(`❌ ${this.config.microName} 编辑器协同已断开`);
                }
                else {
                    console.log(`${this.config.microName} 编辑器协同状态:`, status);
                }
            });
        }
        // 获取awareness
        this.awareness = this.provider.awareness;
        // 绑定事件
        this.bindEvents();
    }
    bindEvents() {
        // 监听用户变化
        this.awareness.on('change', () => {
            this.notifyUserCallbacks();
        });
    }
    setStatus(status) {
        this.status = status;
        this.statusCallbacks.forEach(callback => callback(status));
    }
    notifyUserCallbacks() {
        this.userCallbacks.forEach(callback => callback());
    }
    // 设置用户信息
    setUser(userInfo) {
        const defaultUser = {
            name: `${this.config.microName}用户${Math.floor(Math.random() * 1000)}`,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            cursor: null
        };
        this.awareness.setLocalStateField('user', {
            ...defaultUser,
            ...userInfo
        });
    }
    // 监听状态变化
    onStatusChange(callback) {
        this.statusCallbacks.push(callback);
        return () => {
            const index = this.statusCallbacks.indexOf(callback);
            if (index > -1) {
                this.statusCallbacks.splice(index, 1);
            }
        };
    }
    // 监听用户变化
    onUsersChange(callback) {
        this.userCallbacks.push(callback);
        return () => {
            const index = this.userCallbacks.indexOf(callback);
            if (index > -1) {
                this.userCallbacks.splice(index, 1);
            }
        };
    }
    // 获取在线用户
    getOnlineUsers() {
        const states = this.awareness.getStates();
        const users = [];
        states.forEach((state, key) => {
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
    getStatus() {
        return this.status;
    }
    // 销毁协同
    destroy() {
        this.provider.destroy();
        this.ydoc.destroy();
    }
    // 获取provider实例（用于传递给TipTap）
    getProvider() {
        return this.provider;
    }
    // 获取ydoc实例（用于传递给TipTap）
    getYDoc() {
        return this.ydoc;
    }
    // 获取awareness实例
    getAwareness() {
        return this.awareness;
    }
    // 检查是否使用Hocuspocus
    isUsingHocuspocus() {
        return this.isHocuspocus;
    }
}
// 创建默认的协同管理器实例（可选）
let defaultCollaborationManager = null;
export const createEditorCollaboration = (config) => {
    return new EditorCollaborationManager(config);
};
export const getDefaultEditorCollaboration = () => {
    return defaultCollaborationManager;
};
export const setDefaultEditorCollaboration = (manager) => {
    defaultCollaborationManager = manager;
};
export const destroyDefaultEditorCollaboration = () => {
    if (defaultCollaborationManager) {
        defaultCollaborationManager.destroy();
        defaultCollaborationManager = null;
    }
};
