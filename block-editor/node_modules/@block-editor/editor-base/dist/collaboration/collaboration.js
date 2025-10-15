import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { WebsocketProvider } from 'y-websocket';
// 全局协同连接管理器
class GlobalCollaborationManager {
    constructor() {
        this.connections = new Map();
        this.statusCallbacks = new Map();
        this.userCallbacks = new Map();
        this.cleanupInterval = null;
        // 启动定期清理任务
        this.startCleanupTask();
    }
    // 获取连接ID
    getConnectionId(config) {
        return `${config.microName}-${config.roomName}`;
    }
    // 创建或获取连接
    getConnection(config) {
        const connectionId = this.getConnectionId(config);
        // 如果连接已存在，增加引用计数
        if (this.connections.has(connectionId)) {
            const connection = this.connections.get(connectionId);
            connection.refCount++;
            connection.lastUsed = Date.now();
            console.log(`🔄 复用协同连接: ${connectionId} (引用计数: ${connection.refCount})`);
            return connection;
        }
        // 创建新连接
        console.log(`🆕 创建新协同连接: ${connectionId}`);
        const connection = this.createConnection(config);
        this.connections.set(connectionId, connection);
        return connection;
    }
    // 创建连接
    createConnection(config) {
        const connectionId = this.getConnectionId(config);
        // 创建Yjs文档
        const ydoc = new Y.Doc();
        // 创建provider
        const provider = config.useHocuspocus !== false
            ? new HocuspocusProvider({
                url: config.wsUrl,
                name: `${config.microName}-${config.roomName}`, // 使用name属性
                document: ydoc,
                onConnect: () => {
                    console.log(`✅ ${connectionId} 协同已连接`);
                    this.updateConnectionStatus(connectionId, 'connected');
                },
                onDisconnect: () => {
                    console.log(`❌ ${connectionId} 协同已断开`);
                    this.updateConnectionStatus(connectionId, 'disconnected');
                },
                onStatus: ({ status }) => {
                    console.log(`${connectionId} 协同状态:`, status);
                }
            })
            : new WebsocketProvider(config.wsUrl, `${config.microName}-${config.roomName}`, ydoc);
        const connection = {
            id: connectionId,
            config,
            ydoc,
            provider,
            awareness: provider.awareness,
            status: 'connecting',
            isInitialized: false,
            isDestroyed: false,
            refCount: 1,
            lastUsed: Date.now()
        };
        // 监听连接状态
        if (config.useHocuspocus !== false) {
            // HocuspocusProvider 的状态监听已在构造函数中配置
            setTimeout(() => {
                connection.isInitialized = true;
            }, 1000);
        }
        else {
            // WebsocketProvider 的状态监听
            provider.on('status', ({ status }) => {
                if (status.connected) {
                    this.updateConnectionStatus(connectionId, 'connected');
                    connection.isInitialized = true;
                }
                else {
                    this.updateConnectionStatus(connectionId, 'disconnected');
                }
            });
        }
        return connection;
    }
    // 更新连接状态
    updateConnectionStatus(connectionId, status) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.status = status;
            const callbacks = this.statusCallbacks.get(connectionId) || [];
            callbacks.forEach(callback => callback(status));
        }
    }
    // 释放连接引用
    releaseConnection(config) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.refCount--;
            connection.lastUsed = Date.now();
            console.log(`🔽 释放协同连接引用: ${connectionId} (引用计数: ${connection.refCount})`);
            if (connection.refCount <= 0) {
                console.log(`⏰ 连接 ${connectionId} 引用计数为0，将在清理时销毁`);
            }
        }
    }
    // 设置用户信息
    setUser(config, userInfo) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.awareness.setLocalStateField('user', {
                name: userInfo.name || `${config.microName}用户${Math.floor(Math.random() * 1000)}`,
                color: userInfo.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                cursor: userInfo.cursor || null
            });
        }
    }
    // 监听状态变化
    onStatusChange(config, callback) {
        const connectionId = this.getConnectionId(config);
        const callbacks = this.statusCallbacks.get(connectionId) || [];
        callbacks.push(callback);
        this.statusCallbacks.set(connectionId, callbacks);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }
    // 监听用户变化
    onUsersChange(config, callback) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        if (connection) {
            const userCallback = () => {
                const userCallbacks = this.userCallbacks.get(connectionId) || [];
                userCallbacks.forEach(cb => cb());
            };
            connection.awareness.on('change', userCallback);
            const callbacks = this.userCallbacks.get(connectionId) || [];
            callbacks.push(callback);
            this.userCallbacks.set(connectionId, callbacks);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            };
        }
        return () => { };
    }
    // 获取在线用户
    getOnlineUsers(config) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        if (!connection)
            return [];
        const states = connection.awareness.getStates();
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
    // 启动清理任务
    startCleanupTask() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupInactiveConnections();
        }, 30000); // 每30秒清理一次
    }
    // 清理非活跃连接
    cleanupInactiveConnections() {
        const now = Date.now();
        const inactiveThreshold = 5 * 60 * 1000; // 5分钟
        for (const [connectionId, connection] of this.connections.entries()) {
            if (connection.refCount === 0 && (now - connection.lastUsed) > inactiveThreshold) {
                console.log(`🗑️ 清理非活跃连接: ${connectionId}`);
                this.destroyConnection(connectionId);
            }
        }
    }
    // 销毁连接
    destroyConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection && !connection.isDestroyed) {
            console.log(`💥 销毁协同连接: ${connectionId}`);
            connection.isDestroyed = true;
            try {
                connection.provider.destroy();
                connection.ydoc.destroy();
            }
            catch (error) {
                console.error(`❌ 销毁连接失败: ${connectionId}`, error);
            }
            this.connections.delete(connectionId);
            this.statusCallbacks.delete(connectionId);
            this.userCallbacks.delete(connectionId);
        }
    }
    // 销毁所有连接
    destroyAll() {
        console.log('💥 销毁所有协同连接');
        for (const connectionId of this.connections.keys()) {
            this.destroyConnection(connectionId);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
// 创建全局实例
export const globalCollaborationManager = new GlobalCollaborationManager();
// 页面卸载时清理所有连接
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        globalCollaborationManager.destroyAll();
    });
}
// 协同管理类（保持向后兼容）
export class CollaborationManager {
    constructor(config) {
        this.status = 'disconnected';
        this.statusCallbacks = [];
        this.dataCallbacks = [];
        this.listCallbacks = [];
        this.userCallbacks = [];
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
            onStatus: ({ status }) => {
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
    bindEvents() {
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
    setStatus(status) {
        this.status = status;
        this.statusCallbacks.forEach(callback => callback(status));
    }
    notifyDataCallbacks() {
        this.dataCallbacks.forEach(callback => callback());
    }
    notifyListCallbacks() {
        this.listCallbacks.forEach(callback => callback());
    }
    notifyUserCallbacks() {
        this.userCallbacks.forEach(callback => callback());
    }
    // 设置用户信息
    setUser(userInfo) {
        this.awareness.setLocalStateField('user', {
            name: userInfo.name || `${this.config.microName}用户${Math.floor(Math.random() * 1000)}`,
            color: userInfo.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            cursor: userInfo.cursor || null
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
    // 监听数据变化
    onDataChange(callback) {
        this.dataCallbacks.push(callback);
        return () => {
            const index = this.dataCallbacks.indexOf(callback);
            if (index > -1) {
                this.dataCallbacks.splice(index, 1);
            }
        };
    }
    // 监听列表变化
    onListChange(callback) {
        this.listCallbacks.push(callback);
        return () => {
            const index = this.listCallbacks.indexOf(callback);
            if (index > -1) {
                this.listCallbacks.splice(index, 1);
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
    // 更新数据
    updateData(key, value) {
        this.sharedData.set(key, value);
    }
    // 获取数据
    getData(key) {
        return this.sharedData.get(key);
    }
    // 获取所有数据
    getAllData() {
        const data = {};
        this.sharedData.forEach((value, key) => {
            data[key] = value;
        });
        return data;
    }
    // 添加列表项
    addListItem(item) {
        this.listData.push([item]);
    }
    // 更新列表项
    updateListItem(index, item) {
        this.listData.delete(index, 1);
        this.listData.insert(index, [item]);
    }
    // 删除列表项
    removeListItem(index) {
        this.listData.delete(index, 1);
    }
    // 获取列表数据
    getListData() {
        return this.listData.toArray();
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
    // 获取provider实例（用于传递给微应用）
    getProvider() {
        return this.provider;
    }
    // 获取ydoc实例（用于传递给微应用）
    getYDoc() {
        return this.ydoc;
    }
    // 获取共享数据实例（用于传递给微应用）
    getSharedData() {
        return this.sharedData;
    }
    // 获取列表数据实例（用于传递给微应用）
    getListDataInstance() {
        return this.listData;
    }
}
