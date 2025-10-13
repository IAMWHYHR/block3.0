import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
// 协同管理类
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
