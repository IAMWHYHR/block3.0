// 临时定义接口，避免依赖shared-sdk
interface Toolbar {
  addItem(item: any): boolean | Promise<boolean>;
  removeItem(id: number | string): boolean | Promise<boolean>;
  getItems(): any[];
  getValidItems(): any[];
  insertBefore(items: any[], code: string | null): this;
  appendItems(items: any[]): this;
  deleteItems(codes: string[]): this;
  modifyItem(code: string, props: any): this;
}

interface ViewService {
  openView(viewId: string, options?: any): Promise<void>;
  closeView(viewId: string): Promise<void>;
  switchView(viewId: string): Promise<void>;
  getCurrentView(): string | null;
  getViewList(): string[];
  showToast(message: string): Promise<void>;
  openModal(options: any): Promise<any>;
  closeModal(data: any): Promise<void>;
  requestFullscreen(options: any): Promise<void>;
  exitFullscreen(): Promise<void>;
  openConfig(options: any): Promise<any>;
  closeConfig(data: any): Promise<void>;
}

interface LifeCycleService {
  onMount(callback: () => void): () => void;
  onUnmount(callback: () => void): () => void;
  onUpdate(callback: (props: any) => void): () => void;
  triggerMount(): void;
  triggerUnmount(): void;
  triggerUpdate(props: any): void;
  notifyBlockReady(): void;
}

interface SharedData {
  get<T = any>(key: string): T | undefined;
  set<T = any>(key: string, value: T): void;
  delete(key: string): boolean;
  clear(): void;
  keys(): string[];
  subscribe(key: string, callback: (value: any) => void): () => void;
  getMap(name: string): any;
  getArray(name: string): any;
}

interface EnvService {
  get darkMode(): string;
  onDarkModeChange(listener: (darkMode: string) => void): void;
  offDarkModeChange(listener: (darkMode: string) => void): void;
  get language(): string;
  onLanguageChange(listener: (language: string) => void): void;
  offLanguageChange(listener: (language: string) => void): void;
  get docMode(): string;
  onDocModeChange(listener: (docMode: string) => void): void;
  offDocModeChange(listener: (docMode: string) => void): void;
}

interface BlockContext {
  readonly toolBar: Toolbar;
  readonly viewService: ViewService;
  readonly lifeCycleService: LifeCycleService;
  readonly sharedData: SharedData;
  readonly envService: EnvService;
}

/**
 * 工具栏服务实现
 */
class ToolbarServiceImpl implements Toolbar {
  private items: any[] = [];

  addItem(item: any): boolean | Promise<boolean> {
    this.items.push(item);
    console.log('📝 添加工具栏项:', item);
    return true;
  }

  removeItem(id: number | string): boolean | Promise<boolean> {
    const index = this.items.findIndex(item => item.id === id);
    if (index > -1) {
      this.items.splice(index, 1);
      console.log('🗑️ 移除工具栏项:', id);
      return true;
    }
    return false;
  }

  getItems(): any[] {
    return [...this.items];
  }

  getValidItems(): any[] {
    return this.items.filter(item => !item.disabled);
  }

  insertBefore(items: any[], code: string | null): this {
    if (code === null) {
      this.items.unshift(...items);
    } else {
      const index = this.items.findIndex(item => item.code === code);
      if (index > -1) {
        this.items.splice(index, 0, ...items);
      }
    }
    return this;
  }

  appendItems(items: any[]): this {
    this.items.push(...items);
    return this;
  }

  deleteItems(codes: string[]): this {
    this.items = this.items.filter(item => !codes.includes(item.code));
    return this;
  }

  modifyItem(code: string, props: any): this {
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
class ViewServiceImpl implements ViewService {
  private currentView: string | null = null;
  private views: string[] = [];

  async openView(viewId: string, options?: any): Promise<void> {
    this.currentView = viewId;
    if (!this.views.includes(viewId)) {
      this.views.push(viewId);
    }
    console.log('📖 打开视图:', viewId, options);
  }

  async closeView(viewId: string): Promise<void> {
    this.views = this.views.filter(id => id !== viewId);
    if (this.currentView === viewId) {
      this.currentView = this.views[0] || null;
    }
    console.log('❌ 关闭视图:', viewId);
  }

  async switchView(viewId: string): Promise<void> {
    if (this.views.includes(viewId)) {
      this.currentView = viewId;
      console.log('🔄 切换视图:', viewId);
    }
  }

  getCurrentView(): string | null {
    return this.currentView;
  }

  getViewList(): string[] {
    return [...this.views];
  }

  async showToast(message: string): Promise<void> {
    console.log('🍞 显示Toast:', message);
    // 这里可以实现实际的Toast显示逻辑
  }

  async openModal(options: any): Promise<any> {
    console.log('📋 打开模态对话框:', options);
    // 这里可以实现实际的模态对话框逻辑
    return { ok: false };
  }

  async closeModal(data: any): Promise<void> {
    console.log('❌ 关闭模态对话框:', data);
  }

  async requestFullscreen(options: any): Promise<void> {
    console.log('🖥️ 请求全屏:', options);
  }

  async exitFullscreen(): Promise<void> {
    console.log('🖥️ 退出全屏');
  }

  async openConfig(options: any): Promise<any> {
    console.log('⚙️ 打开配置面板:', options);
    // 这里可以实现实际的配置面板逻辑
    return { saved: false };
  }

  async closeConfig(data: any): Promise<void> {
    console.log('❌ 关闭配置面板:', data);
  }
}

/**
 * 生命周期服务实现
 */
class LifeCycleServiceImpl implements LifeCycleService {
  private mountCallbacks: (() => void)[] = [];
  private unmountCallbacks: (() => void)[] = [];
  private updateCallbacks: ((props: any) => void)[] = [];

  onMount(callback: () => void): () => void {
    this.mountCallbacks.push(callback);
    return () => {
      const index = this.mountCallbacks.indexOf(callback);
      if (index > -1) {
        this.mountCallbacks.splice(index, 1);
      }
    };
  }

  onUnmount(callback: () => void): () => void {
    this.unmountCallbacks.push(callback);
    return () => {
      const index = this.unmountCallbacks.indexOf(callback);
      if (index > -1) {
        this.unmountCallbacks.splice(index, 1);
      }
    };
  }

  onUpdate(callback: (props: any) => void): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  triggerMount(): void {
    this.mountCallbacks.forEach(callback => callback());
  }

  triggerUnmount(): void {
    this.unmountCallbacks.forEach(callback => callback());
  }

  triggerUpdate(props: any): void {
    this.updateCallbacks.forEach(callback => callback(props));
  }

  notifyBlockReady(): void {
    console.log('✅ Block加载完成通知');
  }
}

/**
 * 共享数据服务实现
 * 支持本地数据和协同数据的统一管理
 */
class SharedDataServiceImpl implements SharedData {
  private data: Map<string, any> = new Map();
  private subscribers: Map<string, ((value: any) => void)[]> = new Map();
  private collaborationConnection: any = null; // 协同连接引用

  constructor(collaborationConnection?: any) {
    this.collaborationConnection = collaborationConnection;
  }

  /**
   * 设置协同连接
   */
  setCollaborationConnection(connection: any): void {
    this.collaborationConnection = connection;
  }

  get<T = any>(key: string): T | undefined {
    // 优先从协同数据获取，其次从本地数据获取
    if (this.collaborationConnection?.ydoc) {
      return this.collaborationConnection.ydoc.getMap('sharedData').get(key);
    }
    return this.data.get(key);
  }

  set<T = any>(key: string, value: T): void {
    // 优先设置到协同数据，其次设置到本地数据
    if (this.collaborationConnection?.ydoc) {
      this.collaborationConnection.ydoc.getMap('sharedData').set(key, value);
    } else {
      this.data.set(key, value);
      this.notifySubscribers(key, value);
    }
  }

  delete(key: string): boolean {
    // 优先从协同数据删除，其次从本地数据删除
    if (this.collaborationConnection?.ydoc) {
      return this.collaborationConnection.ydoc.getMap('sharedData').delete(key);
    } else {
      const result = this.data.delete(key);
      this.notifySubscribers(key, undefined);
      return result;
    }
  }

  clear(): void {
    if (this.collaborationConnection?.ydoc) {
      this.collaborationConnection.ydoc.getMap('sharedData').clear();
    } else {
      this.data.clear();
      this.subscribers.clear();
    }
  }

  keys(): string[] {
    if (this.collaborationConnection?.ydoc) {
      return Array.from(this.collaborationConnection.ydoc.getMap('sharedData').keys());
    }
    return Array.from(this.data.keys());
  }

  subscribe(key: string, callback: (value: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key)!.push(callback);
    
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

  getMap(name: string): any {
    if (this.collaborationConnection?.ydoc) {
      // 返回真正的协同Map，并添加subscribe方法
      const yMap = this.collaborationConnection.ydoc.getMap(name);
      return {
        // 显式复制Yjs Map的所有方法
        get: (key: string) => yMap.get(key),
        set: (key: string, value: any) => yMap.set(key, value),
        delete: (key: string) => yMap.delete(key),
        has: (key: string) => yMap.has(key),
        clear: () => yMap.clear(),
        keys: () => yMap.keys(),
        values: () => yMap.values(),
        entries: () => yMap.entries(),
        forEach: (callback: (value: any, key: string) => void) => yMap.forEach(callback),
        size: yMap.size,
        subscribe: (callback: (action: 'set' | 'delete' | 'clear', key?: string, value?: any) => void) => {
          // 为Yjs Map实现subscribe功能
          try {
            const observer = (event: any) => {
              try {
                if (event.changes && event.changes.keys) {
                  event.changes.keys.forEach((change: any, key: string) => {
                    if (change.action === 'add' || change.action === 'update') {
                      callback('set', key, yMap.get(key));
                    } else if (change.action === 'delete') {
                      callback('delete', key, undefined);
                    }
                  });
                }
              } catch (error) {
                console.warn('Yjs Map observer callback error:', error);
              }
            };
            yMap.observe(observer);
            return () => {
              try {
                yMap.unobserve(observer);
              } catch (error) {
                console.warn('Yjs Map unobserve error:', error);
              }
            };
          } catch (error) {
            console.warn('Yjs Map observe setup error:', error);
            // 返回一个空的unsubscribe函数作为fallback
            return () => {};
          }
        }
      };
    } else {
      // 返回本地Map的模拟实现
      return {
        get: (key: string) => this.get(`${name}.${key}`),
        set: (key: string, value: any) => this.set(`${name}.${key}`, value),
        delete: (key: string) => this.delete(`${name}.${key}`),
        has: (key: string) => this.data.has(`${name}.${key}`),
        clear: () => {
          const keys = this.keys().filter(k => k.startsWith(`${name}.`));
          keys.forEach(k => this.delete(k));
        },
        keys: () => this.keys().filter(k => k.startsWith(`${name}.`)).map(k => k.substring(`${name}.`.length)),
        values: () => this.keys().filter(k => k.startsWith(`${name}.`)).map(k => this.get(k)),
        size: () => this.keys().filter(k => k.startsWith(`${name}.`)).length,
        subscribe: (callback: (action: 'set' | 'delete' | 'clear', key?: string, value?: any) => void) => {
          // 为本地Map实现订阅功能
          const unsubscribe = this.subscribe(`${name}`, (value) => {
            callback('set', '', value);
          });
          return unsubscribe;
        }
      };
    }
  }

  getArray(name: string): any {
    if (this.collaborationConnection?.ydoc) {
      // 返回真正的协同Array，并添加subscribe方法
      const yArray = this.collaborationConnection.ydoc.getArray(name);
      return {
        // 显式复制Yjs Array的所有方法
        get: (index: number) => yArray.get(index),
        set: (index: number, value: any) => yArray.set(index, value),
        push: (...items: any[]) => yArray.push(items),
        pop: () => yArray.pop(),
        unshift: (...items: any[]) => yArray.unshift(items),
        shift: () => yArray.shift(),
        insert: (index: number, items: any[]) => yArray.insert(index, items),
        delete: (index: number, length?: number) => yArray.delete(index, length),
        clear: () => yArray.clear(),
        forEach: (callback: (item: any, index: number) => void) => yArray.forEach(callback),
        map: (callback: (item: any, index: number) => any) => yArray.map(callback),
        filter: (callback: (item: any, index: number) => boolean) => yArray.filter(callback),
        find: (callback: (item: any, index: number) => boolean) => yArray.find(callback),
        length: yArray.length,
        toArray: () => yArray.toArray(),
        subscribe: (callback: (action: 'push' | 'pop' | 'unshift' | 'shift' | 'splice' | 'set' | 'clear', index?: number, value?: any) => void) => {
          // 为Yjs Array实现subscribe功能
          try {
            const observer = (event: any) => {
              try {
                if (event.changes) {
                  if (event.changes.added) {
                    event.changes.added.forEach((item: any, index: number) => {
                      callback('push', index, item);
                    });
                  }
                  if (event.changes.deleted) {
                    event.changes.deleted.forEach((item: any, index: number) => {
                      callback('pop', index, item);
                    });
                  }
                  if (event.changes.keys) {
                    event.changes.keys.forEach((change: any, index: number) => {
                      if (change.action === 'add' || change.action === 'update') {
                        callback('set', index, yArray.get(index));
                      } else if (change.action === 'delete') {
                        callback('splice', index, undefined);
                      }
                    });
                  }
                }
              } catch (error) {
                console.warn('Yjs Array observer callback error:', error);
              }
            };
            yArray.observe(observer);
            return () => {
              try {
                yArray.unobserve(observer);
              } catch (error) {
                console.warn('Yjs Array unobserve error:', error);
              }
            };
          } catch (error) {
            console.warn('Yjs Array observe setup error:', error);
            // 返回一个空的unsubscribe函数作为fallback
            return () => {};
          }
        }
      };
    } else {
      // 返回本地Array的模拟实现
      return {
        get: (index: number) => this.get(`${name}[${index}]`),
        set: (index: number, value: any) => this.set(`${name}[${index}]`, value),
        push: (...items: any[]) => {
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
        subscribe: (callback: (action: 'push' | 'pop' | 'unshift' | 'shift' | 'splice' | 'set' | 'clear', index?: number, value?: any) => void) => {
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
  updatePyramidData(key: string, value: any): void {
    this.set(key, value);
  }

  // 获取金字塔数据
  getPyramidData(key: string): any {
    return this.get(key);
  }

  // 添加金字塔到列表
  addPyramidToList(item: any): void {
    if (this.collaborationConnection?.ydoc) {
      this.collaborationConnection.ydoc.getArray('listData').push([item]);
    } else {
      const listData = this.getArray('listData');
      listData.push(item);
    }
  }

  // 更新金字塔列表项
  updatePyramidInList(index: number, item: any): void {
    if (this.collaborationConnection?.ydoc) {
      const listData = this.collaborationConnection.ydoc.getArray('listData');
      listData.delete(index, 1);
      listData.insert(index, [item]);
    } else {
      const listData = this.getArray('listData');
      listData.set(index, item);
    }
  }

  // 删除金字塔列表项
  removePyramidFromList(index: number): void {
    if (this.collaborationConnection?.ydoc) {
      this.collaborationConnection.ydoc.getArray('listData').delete(index, 1);
    } else {
      const listData = this.getArray('listData');
      listData.splice(index, 1);
    }
  }

  // 设置金字塔用户信息
  setPyramidUser(userInfo: any): void {
    if (this.collaborationConnection) {
      // 这里需要调用协同管理器的setUser方法
      // 由于SharedDataService不直接访问协同管理器，我们通过connection来设置
      console.log('设置金字塔用户信息:', userInfo);
    }
  }

  // 获取实时数据
  getRealTimeData(): any {
    if (this.collaborationConnection?.ydoc) {
      const data: any = {};
      this.collaborationConnection.ydoc.getMap('sharedData').forEach((value: any, key: any) => {
        data[key] = value;
      });
      return data;
    } else {
      const data: any = {};
      this.data.forEach((value, key) => {
        data[key] = value;
      });
      return data;
    }
  }

  // 获取实时列表数据
  getRealTimeListData(): any[] {
    if (this.collaborationConnection?.ydoc) {
      return this.collaborationConnection.ydoc.getArray('listData').toArray();
    } else {
      const listData = this.getArray('listData');
      const result: any[] = [];
      for (let i = 0; i < listData.length(); i++) {
        result.push(listData.get(i));
      }
      return result;
    }
  }

  private notifySubscribers(key: string, value: any): void {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(value));
    }
  }
}

/**
 * 环境服务实现
 */
class EnvServiceImpl implements EnvService {
  private _darkMode: string = 'light';
  private _language: string = 'zh';
  private _docMode: string = 'editable';
  
  private darkModeListeners: ((darkMode: string) => void)[] = [];
  private languageListeners: ((language: string) => void)[] = [];
  private docModeListeners: ((docMode: string) => void)[] = [];

  get darkMode(): string {
    return this._darkMode;
  }

  onDarkModeChange(listener: (darkMode: string) => void): void {
    this.darkModeListeners.push(listener);
  }

  offDarkModeChange(listener: (darkMode: string) => void): void {
    const index = this.darkModeListeners.indexOf(listener);
    if (index > -1) {
      this.darkModeListeners.splice(index, 1);
    }
  }

  get language(): string {
    return this._language;
  }

  onLanguageChange(listener: (language: string) => void): void {
    this.languageListeners.push(listener);
  }

  offLanguageChange(listener: (language: string) => void): void {
    const index = this.languageListeners.indexOf(listener);
    if (index > -1) {
      this.languageListeners.splice(index, 1);
    }
  }

  get docMode(): string {
    return this._docMode;
  }

  onDocModeChange(listener: (docMode: string) => void): void {
    this.docModeListeners.push(listener);
  }

  offDocModeChange(listener: (docMode: string) => void): void {
    const index = this.docModeListeners.indexOf(listener);
    if (index > -1) {
      this.docModeListeners.splice(index, 1);
    }
  }
}

/**
 * BlockContext实现类
 */
export class BlockContextServiceImpl implements BlockContext {
  readonly toolBar: Toolbar;
  readonly viewService: ViewService;
  readonly lifeCycleService: LifeCycleService;
  readonly sharedData: SharedData;
  readonly envService: EnvService;

  constructor(collaborationConnection?: any) {
    this.toolBar = new ToolbarServiceImpl();
    this.viewService = new ViewServiceImpl();
    this.lifeCycleService = new LifeCycleServiceImpl();
    this.sharedData = new SharedDataServiceImpl(collaborationConnection);
    this.envService = new EnvServiceImpl();
  }

  /**
   * 设置协同连接
   */
  setCollaborationConnection(connection: any): void {
    (this.sharedData as SharedDataServiceImpl).setCollaborationConnection(connection);
  }

  static create(collaborationConnection?: any): BlockContext {
    return new BlockContextServiceImpl(collaborationConnection);
  }
}

/**
 * 创建BlockContext实例
 */
export function createBlockContext(collaborationConnection?: any): BlockContext {
  return new BlockContextServiceImpl(collaborationConnection);
}
