// 工具栏服务
export const createToolbarService = () => {
  let toolbarItems = [];
  let menuItems = [];

  return {
    // 兼容旧接口
    addToolBarItem: (item) => {
      if (item && typeof item === 'object' && item.label && item.onClick) {
        toolbarItems = [...toolbarItems, { ...item, id: Date.now() }];
        return true;
      }
      return false;
    },
    removeToolBarItem: (id) => {
      toolbarItems = toolbarItems.filter(item => item.id !== id);
    },
    getToolbarItems: () => [...toolbarItems],
    
    // 工具栏定制接口
    getValidItems: () => {
      return menuItems.filter(item => {
        if (item.type === 'divider') return true;
        if (item.type === 'item') {
          // 检查是否禁用
          if (item.disabled && typeof item.disabled === 'function') {
            return !item.disabled({}); // 传入编辑器实例
          }
          return true;
        }
        return false;
      });
    },
    
    insertBefore: (items, code) => {
      if (code === null) {
        menuItems = [...items, ...menuItems];
      } else {
        const index = menuItems.findIndex(item => item.type === 'item' && item.code === code);
        if (index >= 0) {
          const newItems = [...menuItems];
          newItems.splice(index, 0, ...items);
          menuItems = newItems;
        } else {
          menuItems = [...items, ...menuItems];
        }
      }
      return this;
    },
    
    appendItems: (items) => {
      menuItems = [...menuItems, ...items];
      return this;
    },
    
    deleteItems: (codes) => {
      menuItems = menuItems.filter(item => 
        item.type !== 'item' || !codes.includes(item.code)
      );
      return this;
    },
    
    modifyItem: (code, props) => {
      menuItems = menuItems.map(item => {
        if (item.type === 'item' && item.code === code) {
          return {
            ...item,
            tooltip: props.tooltip !== undefined ? props.tooltip : item.tooltip,
            icon: props.icon !== undefined ? props.icon : item.icon,
            data: props.data !== undefined ? props.data : item.data
          };
        }
        return item;
      });
      return this;
    }
  };
};

// 视图服务
export const createViewService = () => {
  let modals = [];
  let toasts = [];
  let configPanels = [];
  let isFullscreen = false;
  
  let currentView = null;
  let viewList = [];

  return {
    getCurrentView: () => currentView,
    getViewList: () => [...viewList],
    
    openView: async (viewId, options = {}) => {
      console.log(`[ViewService] 打开视图: ${viewId}`, options);
      currentView = viewId;
      if (!viewList.includes(viewId)) {
        viewList.push(viewId);
      }
    },
    
    closeView: async (viewId) => {
      console.log(`[ViewService] 关闭视图: ${viewId}`);
      viewList = viewList.filter(id => id !== viewId);
      if (currentView === viewId) {
        currentView = viewList[0] || null;
      }
    },
    
    switchView: async (viewId) => {
      console.log(`[ViewService] 切换视图: ${viewId}`);
      currentView = viewId;
    },
    
    showToast: async (message) => {
      const id = Date.now();
      const toast = { id, message, visible: true };
      toasts = [...toasts, toast];
      
      // 3秒后自动消失
      setTimeout(() => {
        toasts = toasts.filter(t => t.id !== id);
      }, 3000);
    },
    
    openModal: async (options = {}) => {
      return new Promise((resolve) => {
        const id = Date.now();
        const modal = {
          id,
          title: options.title || '提示',
          content: options.content || '',
          width: options.width || 400,
          height: options.height || 200,
          closable: options.closable !== false,
          maskClosable: options.maskClosable !== false,
          footer: options.footer,
          onOk: options.onOk,
          onCancel: options.onCancel,
          resolve
        };
        modals = [...modals, modal];
      });
    },
    
    closeModal: async (data) => {
      if (modals.length > 0) {
        const lastModal = modals[modals.length - 1];
        lastModal.resolve({ ok: true, data });
        modals = modals.slice(0, -1);
      }
    },
    
    requestFullscreen: async (options = {}) => {
      console.log('[ViewService] 进入全屏', options);
      isFullscreen = true;
      // 实际项目中可以调用浏览器的全屏API
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    },
    
    exitFullscreen: async () => {
      console.log('[ViewService] 退出全屏');
      isFullscreen = false;
      // 实际项目中可以调用浏览器的退出全屏API
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    },
    
    openConfig: async (options = {}) => {
      return new Promise((resolve) => {
        const id = Date.now();
        const configPanel = {
          id,
          title: options.title || '配置',
          width: options.width || 500,
          height: options.height || 400,
          closable: options.closable !== false,
          maskClosable: options.maskClosable !== false,
          onSave: options.onSave,
          onCancel: options.onCancel,
          resolve
        };
        configPanels = [...configPanels, configPanel];
      });
    },
    
    closeConfig: async (data) => {
      if (configPanels.length > 0) {
        const lastPanel = configPanels[configPanels.length - 1];
        lastPanel.resolve({ saved: true, data });
        configPanels = configPanels.slice(0, -1);
      }
    },
    
    // 状态获取
    getModals: () => [...modals],
    getToasts: () => [...toasts],
    getConfigPanels: () => [...configPanels],
    getIsFullscreen: () => isFullscreen
  };
};

// 环境服务
export const createEnvService = () => {
  let darkMode = 'light';
  let language = 'zh';
  let docMode = 'editable';
  
  const darkModeListeners = new Set();
  const languageListeners = new Set();
  const docModeListeners = new Set();

  return {
    get darkMode() {
      return darkMode;
    },
    
    onDarkModeChange: (listener) => {
      darkModeListeners.add(listener);
      return () => darkModeListeners.delete(listener);
    },
    
    offDarkModeChange: (listener) => {
      darkModeListeners.delete(listener);
    },
    
    get language() {
      return language;
    },
    
    onLanguageChange: (listener) => {
      languageListeners.add(listener);
      return () => languageListeners.delete(listener);
    },
    
    offLanguageChange: (listener) => {
      languageListeners.delete(listener);
    },
    
    get docMode() {
      return docMode;
    },
    
    onDocModeChange: (listener) => {
      docModeListeners.add(listener);
      return () => docModeListeners.delete(listener);
    },
    
    offDocModeChange: (listener) => {
      docModeListeners.delete(listener);
    },
    
    // 内部方法：触发深色模式变更
    _triggerDarkModeChange: (newMode) => {
      darkMode = newMode;
      darkModeListeners.forEach(listener => listener(newMode));
    },
    
    // 内部方法：触发语言变更
    _triggerLanguageChange: (newLang) => {
      language = newLang;
      languageListeners.forEach(listener => listener(newLang));
    },
    
    // 内部方法：触发文档模式变更
    _triggerDocModeChange: (newMode) => {
      docMode = newMode;
      docModeListeners.forEach(listener => listener(newMode));
    }
  };
};

// 生命周期服务
export const createLifeCycleService = () => {
  const mountCallbacks = new Set();
  const unmountCallbacks = new Set();
  const updateCallbacks = new Set();
  const blockReadyCallbacks = new Set();

  return {
    onMount: (callback) => {
      mountCallbacks.add(callback);
      return () => mountCallbacks.delete(callback);
    },
    
    onUnmount: (callback) => {
      unmountCallbacks.add(callback);
      return () => unmountCallbacks.delete(callback);
    },
    
    onUpdate: (callback) => {
      updateCallbacks.add(callback);
      return () => updateCallbacks.delete(callback);
    },
    
    triggerMount: () => {
      mountCallbacks.forEach(callback => callback());
    },
    
    triggerUnmount: () => {
      unmountCallbacks.forEach(callback => callback());
    },
    
    triggerUpdate: (props) => {
      updateCallbacks.forEach(callback => callback(props));
    },
    
    notifyBlockReady: () => {
      console.log('[MainApp3] Block 加载完成通知');
      blockReadyCallbacks.forEach(callback => callback());
    }
  };
};

// 协同Map实现
export const createSharedMap = (name) => {
  const data = new Map();
  const subscribers = new Set();
  
  return {
    get: (key) => data.get(key),
    set: (key, value) => {
      data.set(key, value);
      subscribers.forEach(callback => callback('set', key, value));
    },
    delete: (key) => {
      const result = data.delete(key);
      if (result) {
        subscribers.forEach(callback => callback('delete', key));
      }
      return result;
    },
    has: (key) => data.has(key),
    clear: () => {
      data.clear();
      subscribers.forEach(callback => callback('clear'));
    },
    keys: () => Array.from(data.keys()),
    values: () => Array.from(data.values()),
    size: () => data.size,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    }
  };
};

// 协同数组实现
export const createSharedArray = (name) => {
  const data = [];
  const subscribers = new Set();
  
  return {
    get: (index) => data[index],
    set: (index, value) => {
      data[index] = value;
      subscribers.forEach(callback => callback('set', index, value));
    },
    push: (...items) => {
      const result = data.push(...items);
      subscribers.forEach(callback => callback('push', data.length - 1, items));
      return result;
    },
    pop: () => {
      const result = data.pop();
      subscribers.forEach(callback => callback('pop', data.length, result));
      return result;
    },
    unshift: (...items) => {
      const result = data.unshift(...items);
      subscribers.forEach(callback => callback('unshift', 0, items));
      return result;
    },
    shift: () => {
      const result = data.shift();
      subscribers.forEach(callback => callback('shift', 0, result));
      return result;
    },
    splice: (start, deleteCount, ...items) => {
      const result = data.splice(start, deleteCount, ...items);
      subscribers.forEach(callback => callback('splice', start, result));
      return result;
    },
    length: () => data.length,
    clear: () => {
      data.length = 0;
      subscribers.forEach(callback => callback('clear'));
    },
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    }
  };
};

// 共享数据服务
export const createSharedDataService = () => {
  const data = new Map();
  const subscribers = new Map();
  const maps = new Map();
  const arrays = new Map();

  return {
    get: (key) => data.get(key),
    set: (key, value) => {
      data.set(key, value);
      // 通知订阅者
      const callbacks = subscribers.get(key);
      if (callbacks) {
        callbacks.forEach(callback => callback(value));
      }
    },
    delete: (key) => {
      const result = data.delete(key);
      subscribers.delete(key);
      return result;
    },
    clear: () => {
      data.clear();
      subscribers.clear();
    },
    keys: () => Array.from(data.keys()),
    subscribe: (key, callback) => {
      if (!subscribers.has(key)) {
        subscribers.set(key, new Set());
      }
      subscribers.get(key).add(callback);
      return () => subscribers.get(key)?.delete(callback);
    },
    getMap: (name) => {
      if (!maps.has(name)) {
        maps.set(name, createSharedMap(name));
      }
      return maps.get(name);
    },
    getArray: (name) => {
      if (!arrays.has(name)) {
        arrays.set(name, createSharedArray(name));
      }
      return arrays.get(name);
    }
  };
};

// 事件总线
export const createEventBus = () => {
  const listeners = new Map();

  return {
    on: (event, handler) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(handler);
      return () => listeners.get(event)?.delete(handler);
    },
    off: (event, handler) => {
      listeners.get(event)?.delete(handler);
    },
    emit: (event, payload) => {
      listeners.get(event)?.forEach(fn => fn(payload));
    }
  };
};
