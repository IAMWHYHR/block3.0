import { globalCollaborationManager } from '../collaboration/collaboration';
/**
 * 协同服务实现类
 * 按照SharedSDK接口规范封装协同功能
 */
export class CollaborationService {
    constructor(config) {
        this.statusCallbacks = [];
        this.userCallbacks = [];
        this.config = config;
        this.initializeConnection();
    }
    /**
     * 初始化协同连接
     */
    initializeConnection() {
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
        }
        catch (error) {
            console.error('❌ 协同服务初始化失败:', error);
        }
    }
    /**
     * 获取协同状态
     */
    getStatus() {
        return this.connectionRef?.status || 'disconnected';
    }
    /**
     * 监听状态变化
     */
    onStatusChange(callback) {
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
    setUser(userInfo) {
        if (this.connectionRef) {
            globalCollaborationManager.setUser(this.config, userInfo);
        }
    }
    /**
     * 获取在线用户
     */
    getOnlineUsers() {
        if (this.connectionRef) {
            return globalCollaborationManager.getOnlineUsers(this.config);
        }
        return [];
    }
    /**
     * 监听用户变化
     */
    onUsersChange(callback) {
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
    updateData(key, value) {
        if (this.connectionRef?.ydoc) {
            this.connectionRef.ydoc.getMap('sharedData').set(key, value);
        }
    }
    /**
     * 获取数据
     */
    getData(key) {
        if (this.connectionRef?.ydoc) {
            return this.connectionRef.ydoc.getMap('sharedData').get(key);
        }
        return undefined;
    }
    /**
     * 获取所有数据
     */
    getAllData() {
        if (this.connectionRef?.ydoc) {
            const data = {};
            this.connectionRef.ydoc.getMap('sharedData').forEach((value, key) => {
                data[key] = value;
            });
            return data;
        }
        return {};
    }
    /**
     * 添加列表项
     */
    addListItem(item) {
        if (this.connectionRef?.ydoc) {
            this.connectionRef.ydoc.getArray('listData').push([item]);
        }
    }
    /**
     * 更新列表项
     */
    updateListItem(index, item) {
        if (this.connectionRef?.ydoc) {
            const listData = this.connectionRef.ydoc.getArray('listData');
            listData.delete(index, 1);
            listData.insert(index, [item]);
        }
    }
    /**
     * 删除列表项
     */
    removeListItem(index) {
        if (this.connectionRef?.ydoc) {
            this.connectionRef.ydoc.getArray('listData').delete(index, 1);
        }
    }
    /**
     * 获取列表数据
     */
    getListData() {
        if (this.connectionRef?.ydoc) {
            return this.connectionRef.ydoc.getArray('listData').toArray();
        }
        return [];
    }
    /**
     * 获取实时数据
     */
    getRealTimeData() {
        if (this.connectionRef?.ydoc) {
            const data = {};
            this.connectionRef.ydoc.getMap('sharedData').forEach((value, key) => {
                data[key] = value;
            });
            return data;
        }
        return {};
    }
    /**
     * 获取实时列表数据
     */
    getRealTimeListData() {
        if (this.connectionRef?.ydoc) {
            return this.connectionRef.ydoc.getArray('listData').toArray();
        }
        return [];
    }
    /**
     * 获取调试信息
     */
    getDebugInfo() {
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
    releaseConnection() {
        if (this.connectionRef) {
            globalCollaborationManager.releaseConnection(this.config);
        }
    }
}
/**
 * 创建协同服务实例
 */
export function createCollaborationService(config) {
    return new CollaborationService(config);
}
