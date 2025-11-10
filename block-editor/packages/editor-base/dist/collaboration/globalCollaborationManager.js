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
        const connection = this.createConnection(config, connectionId);
        this.connections.set(connectionId, connection);
        return connection;
    }
    // 创建新连接
    createConnection(config, connectionId) {
        const ydoc = new Y.Doc();
        // 初始化主文档 MasterYdoc 的内部数据结构
        // index: YMap <string(block_id), string(Fractional Index)>
        const masterIndex = ydoc.getMap('index');
        // data: YMap<string(block_id), string(childYdoc GUID)> - 存储子文档的 GUID，而不是 Y.Doc 对象
        const masterData = ydoc.getMap('data');
        console.log(`📋 初始化主文档 MasterYdoc: ${connectionId}`);
        console.log(`  - index: YMap<string(block_id), string(Fractional Index)>`);
        console.log(`  - data: YMap<string(block_id), string(childYdoc GUID)>`);
        const isHocuspocus = config.useHocuspocus !== false;
        let provider;
        let awareness;
        if (isHocuspocus) {
            provider = new HocuspocusProvider({
                url: config.wsUrl,
                name: connectionId,
                document: ydoc,
                onConnect: () => {
                    this.updateConnectionStatus(connectionId, 'connected');
                    console.log(`✅ 全局协同连接已建立: ${connectionId}`);
                },
                onDisconnect: ({ event }) => {
                    this.updateConnectionStatus(connectionId, 'disconnected');
                    console.log(`❌ 全局协同连接已断开: ${connectionId}`, event);
                },
                onStatus: ({ status }) => {
                    if (status === 'connecting') {
                        this.updateConnectionStatus(connectionId, 'connecting');
                    }
                    console.log(`🔄 全局协同状态变化: ${connectionId} -> ${status}`);
                },
                onAuthenticationFailed: ({ reason }) => {
                    console.log(`❌ 全局协同认证失败: ${connectionId}`, reason);
                }
            });
            awareness = provider.awareness;
        }
        else {
            provider = new WebsocketProvider(config.wsUrl, connectionId, ydoc);
            awareness = provider.awareness;
            provider.on('status', ({ status }) => {
                if (status === 'connected') {
                    this.updateConnectionStatus(connectionId, 'connected');
                }
                else if (status === 'disconnected') {
                    this.updateConnectionStatus(connectionId, 'disconnected');
                }
                else if (status === 'connecting') {
                    this.updateConnectionStatus(connectionId, 'connecting');
                }
            });
        }
        const connection = {
            id: connectionId,
            config,
            ydoc,
            provider,
            awareness,
            status: 'disconnected',
            isInitialized: false,
            refCount: 1,
            lastUsed: Date.now()
        };
        return connection;
    }
    // 释放连接引用
    releaseConnection(config) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        if (!connection) {
            console.log(`⚠️ 尝试释放不存在的连接: ${connectionId}`);
            return;
        }
        connection.refCount--;
        connection.lastUsed = Date.now();
        console.log(`📉 释放协同连接引用: ${connectionId} (剩余引用: ${connection.refCount})`);
        // 如果引用计数为0，标记为可清理（但不立即清理）
        if (connection.refCount <= 0) {
            console.log(`⏰ 连接 ${connectionId} 标记为可清理，将在空闲时清理`);
        }
    }
    // 更新连接状态
    updateConnectionStatus(connectionId, status) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.status = status;
            if (status === 'connected') {
                connection.isInitialized = true;
            }
            // 通知状态变化回调
            const callbacks = this.statusCallbacks.get(connectionId) || [];
            callbacks.forEach(callback => callback(status));
        }
    }
    // 监听状态变化
    onStatusChange(config, callback) {
        const connectionId = this.getConnectionId(config);
        if (!this.statusCallbacks.has(connectionId)) {
            this.statusCallbacks.set(connectionId, []);
        }
        this.statusCallbacks.get(connectionId).push(callback);
        // 立即调用一次当前状态
        const connection = this.connections.get(connectionId);
        if (connection) {
            callback(connection.status);
        }
        return () => {
            const callbacks = this.statusCallbacks.get(connectionId);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    // 监听用户变化
    onUsersChange(config, callback) {
        const connectionId = this.getConnectionId(config);
        if (!this.userCallbacks.has(connectionId)) {
            this.userCallbacks.set(connectionId, []);
        }
        this.userCallbacks.get(connectionId).push(callback);
        // 绑定awareness变化事件
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.awareness.on('change', callback);
        }
        return () => {
            const callbacks = this.userCallbacks.get(connectionId);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
            if (connection) {
                connection.awareness.off('change', callback);
            }
        };
    }
    // 获取在线用户
    getOnlineUsers(config) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return [];
        }
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
    // 设置用户信息
    setUser(config, userInfo) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        if (!connection) {
            console.log(`⚠️ 尝试设置用户信息但连接不存在: ${connectionId}`);
            return;
        }
        const defaultUser = {
            name: `${config.microName}用户${Math.floor(Math.random() * 1000)}`,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            cursor: null
        };
        connection.awareness.setLocalStateField('user', {
            ...defaultUser,
            ...userInfo
        });
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
        const inactiveThreshold = 5 * 60 * 1000; // 5分钟无活动
        for (const [connectionId, connection] of this.connections.entries()) {
            if (connection.refCount <= 0 && (now - connection.lastUsed) > inactiveThreshold) {
                console.log(`🧹 清理非活跃连接: ${connectionId}`);
                this.destroyConnection(connectionId);
            }
        }
    }
    // 销毁连接
    destroyConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection)
            return;
        console.log(`🗑️ 销毁协同连接: ${connectionId}`);
        try {
            connection.provider.destroy();
        }
        catch (error) {
            console.error(`❌ 销毁Provider时出错:`, error);
        }
        try {
            connection.ydoc.destroy();
        }
        catch (error) {
            console.error(`❌ 销毁YDoc时出错:`, error);
        }
        this.connections.delete(connectionId);
        this.statusCallbacks.delete(connectionId);
        this.userCallbacks.delete(connectionId);
    }
    // 获取连接状态
    getConnectionStatus(config) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        return connection ? connection.status : 'disconnected';
    }
    // 检查连接是否存在
    hasConnection(config) {
        const connectionId = this.getConnectionId(config);
        return this.connections.has(connectionId);
    }
    // 获取主文档的 index YMap (MasterYdoc.index)
    // 返回: YMap <string(block_id), string(Fractional Index)>
    getMasterIndex(config) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        if (!connection) {
            console.log(`⚠️ 尝试获取 index 但连接不存在: ${connectionId}`);
            return null;
        }
        return connection.ydoc.getMap('index');
    }
    // 获取主文档的 data YMap (MasterYdoc.data)
    // 返回: YMap<string(block_id), string(childYdoc GUID)> - 存储子文档的 GUID
    getMasterData(config) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        if (!connection) {
            console.log(`⚠️ 尝试获取 data 但连接不存在: ${connectionId}`);
            return null;
        }
        return connection.ydoc.getMap('data');
    }
    // 获取主文档的 ydoc
    getMasterYdoc(config) {
        const connectionId = this.getConnectionId(config);
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return null;
        }
        return connection.ydoc;
    }
    // 获取所有连接信息
    getAllConnections() {
        return Array.from(this.connections.values());
    }
    // 销毁所有连接
    destroyAll() {
        console.log(`🗑️ 销毁所有协同连接 (共${this.connections.size}个)`);
        for (const connectionId of this.connections.keys()) {
            this.destroyConnection(connectionId);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
// 创建全局单例
const globalCollaborationManager = new GlobalCollaborationManager();
// 导出全局管理器
export { globalCollaborationManager, GlobalCollaborationManager };
// 在页面卸载时清理所有连接
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        globalCollaborationManager.destroyAll();
    });
}
