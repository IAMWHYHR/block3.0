/**
 * 工具栏服务实现
 */
class ToolbarServiceImpl {
    constructor() {
        this.items = [];
    }
    addItem(item) {
        this.items.push(item);
        console.log('📝 添加工具栏项:', item);
        return true;
    }
    removeItem(id) {
        const index = this.items.findIndex(item => item.id === id);
        if (index > -1) {
            this.items.splice(index, 1);
            console.log('🗑️ 移除工具栏项:', id);
            return true;
        }
        return false;
    }
    getItems() {
        return [...this.items];
    }
    getValidItems() {
        return this.items.filter(item => !item.disabled);
    }
    insertBefore(items, code) {
        if (code === null) {
            this.items.unshift(...items);
        }
        else {
            const index = this.items.findIndex(item => item.code === code);
            if (index > -1) {
                this.items.splice(index, 0, ...items);
            }
        }
        return this;
    }
    appendItems(items) {
        this.items.push(...items);
        return this;
    }
    deleteItems(codes) {
        this.items = this.items.filter(item => !codes.includes(item.code));
        return this;
    }
    modifyItem(code, props) {
        const item = this.items.find(item => item.code === code);
        if (item) {
            Object.assign(item, props);
        }
        return this;
    }
}
/**
 * 视图服务实现
 */
class ViewServiceImpl {
    constructor() {
        this.currentView = null;
        this.views = [];
    }
    async openView(viewId, options) {
        this.currentView = viewId;
        if (!this.views.includes(viewId)) {
            this.views.push(viewId);
        }
        console.log('📖 打开视图:', viewId, options);
    }
    async closeView(viewId) {
        this.views = this.views.filter(id => id !== viewId);
        if (this.currentView === viewId) {
            this.currentView = this.views[0] || null;
        }
        console.log('❌ 关闭视图:', viewId);
    }
    async switchView(viewId) {
        if (this.views.includes(viewId)) {
            this.currentView = viewId;
            console.log('🔄 切换视图:', viewId);
        }
    }
    getCurrentView() {
        return this.currentView;
    }
    getViewList() {
        return [...this.views];
    }
    async showToast(message) {
        console.log('🍞 显示Toast:', message);
        // 这里可以实现实际的Toast显示逻辑
    }
    async openModal(options) {
        console.log('📋 打开模态对话框:', options);
        // 这里可以实现实际的模态对话框逻辑
        return { ok: false };
    }
    async closeModal(data) {
        console.log('❌ 关闭模态对话框:', data);
    }
    async requestFullscreen(options) {
        console.log('🖥️ 请求全屏:', options);
    }
    async exitFullscreen() {
        console.log('🖥️ 退出全屏');
    }
    async openConfig(options) {
        console.log('⚙️ 打开配置面板:', options);
        // 这里可以实现实际的配置面板逻辑
        return { saved: false };
    }
    async closeConfig(data) {
        console.log('❌ 关闭配置面板:', data);
    }
}
/**
 * 生命周期服务实现
 */
class LifeCycleServiceImpl {
    constructor() {
        this.mountCallbacks = [];
        this.unmountCallbacks = [];
        this.updateCallbacks = [];
    }
    onMount(callback) {
        this.mountCallbacks.push(callback);
        return () => {
            const index = this.mountCallbacks.indexOf(callback);
            if (index > -1) {
                this.mountCallbacks.splice(index, 1);
            }
        };
    }
    onUnmount(callback) {
        this.unmountCallbacks.push(callback);
        return () => {
            const index = this.unmountCallbacks.indexOf(callback);
            if (index > -1) {
                this.unmountCallbacks.splice(index, 1);
            }
        };
    }
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
        return () => {
            const index = this.updateCallbacks.indexOf(callback);
            if (index > -1) {
                this.updateCallbacks.splice(index, 1);
            }
        };
    }
    triggerMount() {
        this.mountCallbacks.forEach(callback => callback());
    }
    triggerUnmount() {
        this.unmountCallbacks.forEach(callback => callback());
    }
    triggerUpdate(props) {
        this.updateCallbacks.forEach(callback => callback(props));
    }
    notifyBlockReady() {
        console.log('✅ Block加载完成通知');
    }
}
/**
 * 共享数据服务实现
 * 支持本地数据和协同数据的统一管理
 */
class SharedDataServiceImpl {
    constructor(collaborationConnection) {
        this.data = new Map();
        this.subscribers = new Map();
        this.collaborationConnection = null; // 协同连接引用
        this.collaborationConnection = collaborationConnection;
    }
    /**
     * 设置协同连接
     */
    setCollaborationConnection(connection) {
        this.collaborationConnection = connection;
    }
    get(key) {
        // 优先从协同数据获取，其次从本地数据获取
        if (this.collaborationConnection?.ydoc) {
            return this.collaborationConnection.ydoc.getMap('sharedData').get(key);
        }
        return this.data.get(key);
    }
    set(key, value) {
        // 优先设置到协同数据，其次设置到本地数据
        if (this.collaborationConnection?.ydoc) {
            this.collaborationConnection.ydoc.getMap('sharedData').set(key, value);
        }
        else {
            this.data.set(key, value);
            this.notifySubscribers(key, value);
        }
    }
    delete(key) {
        // 优先从协同数据删除，其次从本地数据删除
        if (this.collaborationConnection?.ydoc) {
            return this.collaborationConnection.ydoc.getMap('sharedData').delete(key);
        }
        else {
            const result = this.data.delete(key);
            this.notifySubscribers(key, undefined);
            return result;
        }
    }
    clear() {
        if (this.collaborationConnection?.ydoc) {
            this.collaborationConnection.ydoc.getMap('sharedData').clear();
        }
        else {
            this.data.clear();
            this.subscribers.clear();
        }
    }
    keys() {
        if (this.collaborationConnection?.ydoc) {
            return Array.from(this.collaborationConnection.ydoc.getMap('sharedData').keys());
        }
        return Array.from(this.data.keys());
    }
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, []);
        }
        this.subscribers.get(key).push(callback);
        return () => {
            const callbacks = this.subscribers.get(key);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    getMap(name) {
        if (this.collaborationConnection?.ydoc) {
            // 返回真正的协同Map，并添加subscribe方法
            const yMap = this.collaborationConnection.ydoc.getMap(name);
            return {
                // 显式复制Yjs Map的所有方法
                get: (key) => yMap.get(key),
                set: (key, value) => yMap.set(key, value),
                delete: (key) => yMap.delete(key),
                has: (key) => yMap.has(key),
                clear: () => yMap.clear(),
                keys: () => yMap.keys(),
                values: () => yMap.values(),
                entries: () => yMap.entries(),
                forEach: (callback) => yMap.forEach(callback),
                size: yMap.size,
                subscribe: (callback) => {
                    // 为Yjs Map实现subscribe功能
                    try {
                        const observer = (event) => {
                            try {
                                if (event.changes && event.changes.keys) {
                                    event.changes.keys.forEach((change, key) => {
                                        if (change.action === 'add' || change.action === 'update') {
                                            callback('set', key, yMap.get(key));
                                        }
                                        else if (change.action === 'delete') {
                                            callback('delete', key, undefined);
                                        }
                                    });
                                }
                            }
                            catch (error) {
                                console.warn('Yjs Map observer callback error:', error);
                            }
                        };
                        yMap.observe(observer);
                        return () => {
                            try {
                                yMap.unobserve(observer);
                            }
                            catch (error) {
                                console.warn('Yjs Map unobserve error:', error);
                            }
                        };
                    }
                    catch (error) {
                        console.warn('Yjs Map observe setup error:', error);
                        // 返回一个空的unsubscribe函数作为fallback
                        return () => { };
                    }
                }
            };
        }
        else {
            // 返回本地Map的模拟实现
            return {
                get: (key) => this.get(`${name}.${key}`),
                set: (key, value) => this.set(`${name}.${key}`, value),
                delete: (key) => this.delete(`${name}.${key}`),
                has: (key) => this.data.has(`${name}.${key}`),
                clear: () => {
                    const keys = this.keys().filter(k => k.startsWith(`${name}.`));
                    keys.forEach(k => this.delete(k));
                },
                keys: () => this.keys().filter(k => k.startsWith(`${name}.`)).map(k => k.substring(`${name}.`.length)),
                values: () => this.keys().filter(k => k.startsWith(`${name}.`)).map(k => this.get(k)),
                size: () => this.keys().filter(k => k.startsWith(`${name}.`)).length,
                subscribe: (callback) => {
                    // 为本地Map实现订阅功能
                    const unsubscribe = this.subscribe(`${name}`, (value) => {
                        callback('set', '', value);
                    });
                    return unsubscribe;
                }
            };
        }
    }
    getArray(name) {
        if (this.collaborationConnection?.ydoc) {
            // 返回真正的协同Array，并添加subscribe方法
            const yArray = this.collaborationConnection.ydoc.getArray(name);
            return {
                // 显式复制Yjs Array的所有方法
                get: (index) => yArray.get(index),
                set: (index, value) => yArray.set(index, value),
                push: (...items) => yArray.push(items),
                pop: () => yArray.pop(),
                unshift: (...items) => yArray.unshift(items),
                shift: () => yArray.shift(),
                insert: (index, items) => yArray.insert(index, items),
                delete: (index, length) => yArray.delete(index, length),
                clear: () => yArray.clear(),
                forEach: (callback) => yArray.forEach(callback),
                map: (callback) => yArray.map(callback),
                filter: (callback) => yArray.filter(callback),
                find: (callback) => yArray.find(callback),
                length: yArray.length,
                toArray: () => yArray.toArray(),
                subscribe: (callback) => {
                    // 为Yjs Array实现subscribe功能
                    try {
                        const observer = (event) => {
                            try {
                                if (event.changes) {
                                    if (event.changes.added) {
                                        event.changes.added.forEach((item, index) => {
                                            callback('push', index, item);
                                        });
                                    }
                                    if (event.changes.deleted) {
                                        event.changes.deleted.forEach((item, index) => {
                                            callback('pop', index, item);
                                        });
                                    }
                                    if (event.changes.keys) {
                                        event.changes.keys.forEach((change, index) => {
                                            if (change.action === 'add' || change.action === 'update') {
                                                callback('set', index, yArray.get(index));
                                            }
                                            else if (change.action === 'delete') {
                                                callback('splice', index, undefined);
                                            }
                                        });
                                    }
                                }
                            }
                            catch (error) {
                                console.warn('Yjs Array observer callback error:', error);
                            }
                        };
                        yArray.observe(observer);
                        return () => {
                            try {
                                yArray.unobserve(observer);
                            }
                            catch (error) {
                                console.warn('Yjs Array unobserve error:', error);
                            }
                        };
                    }
                    catch (error) {
                        console.warn('Yjs Array observe setup error:', error);
                        // 返回一个空的unsubscribe函数作为fallback
                        return () => { };
                    }
                }
            };
        }
        else {
            // 返回本地Array的模拟实现
            return {
                get: (index) => this.get(`${name}[${index}]`),
                set: (index, value) => this.set(`${name}[${index}]`, value),
                push: (...items) => {
                    const currentLength = this.get(`${name}.length`) || 0;
                    items.forEach((item, i) => {
                        this.set(`${name}[${currentLength + i}]`, item);
                    });
                    this.set(`${name}.length`, currentLength + items.length);
                    return currentLength + items.length;
                },
                pop: () => {
                    const length = this.get(`${name}.length`) || 0;
                    if (length > 0) {
                        const item = this.get(`${name}[${length - 1}]`);
                        this.delete(`${name}[${length - 1}]`);
                        this.set(`${name}.length`, length - 1);
                        return item;
                    }
                    return undefined;
                },
                length: () => this.get(`${name}.length`) || 0,
                clear: () => {
                    const length = this.get(`${name}.length`) || 0;
                    for (let i = 0; i < length; i++) {
                        this.delete(`${name}[${i}]`);
                    }
                    this.delete(`${name}.length`);
                },
                subscribe: (callback) => {
                    // 为本地Array实现订阅功能
                    const unsubscribe = this.subscribe(`${name}`, (value) => {
                        callback('set', 0, value);
                    });
                    return unsubscribe;
                }
            };
        }
    }
    /**
     * 金字塔特定的协同方法
     */
    // 更新金字塔数据
    updatePyramidData(key, value) {
        this.set(key, value);
    }
    // 获取金字塔数据
    getPyramidData(key) {
        return this.get(key);
    }
    // 添加金字塔到列表
    addPyramidToList(item) {
        if (this.collaborationConnection?.ydoc) {
            this.collaborationConnection.ydoc.getArray('listData').push([item]);
        }
        else {
            const listData = this.getArray('listData');
            listData.push(item);
        }
    }
    // 更新金字塔列表项
    updatePyramidInList(index, item) {
        if (this.collaborationConnection?.ydoc) {
            const listData = this.collaborationConnection.ydoc.getArray('listData');
            listData.delete(index, 1);
            listData.insert(index, [item]);
        }
        else {
            const listData = this.getArray('listData');
            listData.set(index, item);
        }
    }
    // 删除金字塔列表项
    removePyramidFromList(index) {
        if (this.collaborationConnection?.ydoc) {
            this.collaborationConnection.ydoc.getArray('listData').delete(index, 1);
        }
        else {
            const listData = this.getArray('listData');
            listData.splice(index, 1);
        }
    }
    // 设置金字塔用户信息
    setPyramidUser(userInfo) {
        if (this.collaborationConnection) {
            // 这里需要调用协同管理器的setUser方法
            // 由于SharedDataService不直接访问协同管理器，我们通过connection来设置
            console.log('设置金字塔用户信息:', userInfo);
        }
    }
    // 获取实时数据
    getRealTimeData() {
        if (this.collaborationConnection?.ydoc) {
            const data = {};
            this.collaborationConnection.ydoc.getMap('sharedData').forEach((value, key) => {
                data[key] = value;
            });
            return data;
        }
        else {
            const data = {};
            this.data.forEach((value, key) => {
                data[key] = value;
            });
            return data;
        }
    }
    // 获取实时列表数据
    getRealTimeListData() {
        if (this.collaborationConnection?.ydoc) {
            return this.collaborationConnection.ydoc.getArray('listData').toArray();
        }
        else {
            const listData = this.getArray('listData');
            const result = [];
            for (let i = 0; i < listData.length(); i++) {
                result.push(listData.get(i));
            }
            return result;
        }
    }
    notifySubscribers(key, value) {
        const callbacks = this.subscribers.get(key);
        if (callbacks) {
            callbacks.forEach(callback => callback(value));
        }
    }
}
/**
 * 环境服务实现
 */
class EnvServiceImpl {
    constructor() {
        this._darkMode = 'light';
        this._language = 'zh';
        this._docMode = 'editable';
        this.darkModeListeners = [];
        this.languageListeners = [];
        this.docModeListeners = [];
    }
    get darkMode() {
        return this._darkMode;
    }
    onDarkModeChange(listener) {
        this.darkModeListeners.push(listener);
    }
    offDarkModeChange(listener) {
        const index = this.darkModeListeners.indexOf(listener);
        if (index > -1) {
            this.darkModeListeners.splice(index, 1);
        }
    }
    get language() {
        return this._language;
    }
    onLanguageChange(listener) {
        this.languageListeners.push(listener);
    }
    offLanguageChange(listener) {
        const index = this.languageListeners.indexOf(listener);
        if (index > -1) {
            this.languageListeners.splice(index, 1);
        }
    }
    get docMode() {
        return this._docMode;
    }
    onDocModeChange(listener) {
        this.docModeListeners.push(listener);
    }
    offDocModeChange(listener) {
        const index = this.docModeListeners.indexOf(listener);
        if (index > -1) {
            this.docModeListeners.splice(index, 1);
        }
    }
}
/**
 * BlockContext实现类
 */
export class BlockContextServiceImpl {
    constructor(collaborationConnection) {
        this.toolBar = new ToolbarServiceImpl();
        this.viewService = new ViewServiceImpl();
        this.lifeCycleService = new LifeCycleServiceImpl();
        this.sharedData = new SharedDataServiceImpl(collaborationConnection);
        this.envService = new EnvServiceImpl();
    }
    /**
     * 设置协同连接
     */
    setCollaborationConnection(connection) {
        this.sharedData.setCollaborationConnection(connection);
    }
    static create(collaborationConnection) {
        return new BlockContextServiceImpl(collaborationConnection);
    }
}
/**
 * 创建BlockContext实例
 */
export function createBlockContext(collaborationConnection) {
    return new BlockContextServiceImpl(collaborationConnection);
}
