// 轻量 SDK：仅提供接口定义和类型约束
// 实际实现由主应用通过 props 传递给微应用

// 接口定义
export const INTERFACES = {
  // 工具栏 API 接口
  TOOLBAR_API: {
    addToolBarItem: 'function',
    removeToolBarItem: 'function'
  },
  
  // 事件总线接口
  EVENT_BUS: {
    on: 'function',
    off: 'function', 
    emit: 'function'
  },
  
  // BlockContext 相关接口
  TOOLBAR: {
    addItem: 'function',
    removeItem: 'function',
    getItems: 'function',
    getValidItems: 'function',
    insertBefore: 'function',
    appendItems: 'function',
    deleteItems: 'function',
    modifyItem: 'function'
  },
  
  VIEW_SERVICE: {
    openView: 'function',
    closeView: 'function',
    switchView: 'function',
    getCurrentView: 'function',
    getViewList: 'function',
    showToast: 'function',
    openModal: 'function',
    closeModal: 'function',
    requestFullscreen: 'function',
    exitFullscreen: 'function',
    openConfig: 'function',
    closeConfig: 'function'
  },
  
  LIFE_CYCLE_SERVICE: {
    onMount: 'function',
    onUnmount: 'function',
    onUpdate: 'function',
    triggerMount: 'function',
    triggerUnmount: 'function',
    triggerUpdate: 'function',
    notifyBlockReady: 'function'
  },
  
  SHARED_DATA: {
    get: 'function',
    set: 'function',
    delete: 'function',
    clear: 'function',
    keys: 'function',
    subscribe: 'function',
    getMap: 'function',
    getArray: 'function'
  },
  
  ENV_SERVICE: {
    onDarkModeChange: 'function',
    offDarkModeChange: 'function',
    onLanguageChange: 'function',
    offLanguageChange: 'function',
    onDocModeChange: 'function',
    offDocModeChange: 'function'
  }
};

// 工具栏项接口定义
export const ToolBarItemShape = {
  label: 'string',
  color: 'string',
  onClick: 'function'
};

// 验证接口是否可用
export function validateAPI(api, interfaceName) {
  const interfaceDef = INTERFACES[interfaceName];
  if (!interfaceDef) return false;
  
  return Object.keys(interfaceDef).every(method => 
    typeof api[method] === interfaceDef[method]
  );
}

// 创建 API 代理（用于微应用）
export function createAPIProxy(props) {
  const toolbarAPI = props.toolbarAPI || {};
  const eventBus = props.eventBus || {};
  const blockContext = props.blockContext || {};
  
  return {
    // 工具栏 API（兼容旧接口）
    addToolBarItem: (item) => {
      if (typeof toolbarAPI.addToolBarItem === 'function') {
        return toolbarAPI.addToolBarItem(item);
      }
      if (blockContext.toolBar && typeof blockContext.toolBar.addItem === 'function') {
        return blockContext.toolBar.addItem(item);
      }
      console.warn('[SharedSDK] toolbarAPI.addToolBarItem 或 blockContext.toolBar.addItem 不可用');
      return false;
    },
    
    removeToolBarItem: (id) => {
      if (typeof toolbarAPI.removeToolBarItem === 'function') {
        return toolbarAPI.removeToolBarItem(id);
      }
      if (blockContext.toolBar && typeof blockContext.toolBar.removeItem === 'function') {
        return blockContext.toolBar.removeItem(id);
      }
      console.warn('[SharedSDK] toolbarAPI.removeToolBarItem 或 blockContext.toolBar.removeItem 不可用');
      return false;
    },
    
    // 事件总线
    on: (event, handler) => {
      if (typeof eventBus.on === 'function') {
        return eventBus.on(event, handler);
      }
      console.warn('[SharedSDK] eventBus.on 不可用');
      return () => {};
    },
    
    off: (event, handler) => {
      if (typeof eventBus.off === 'function') {
        return eventBus.off(event, handler);
      }
    },
    
    emit: (event, payload) => {
      if (typeof eventBus.emit === 'function') {
        return eventBus.emit(event, payload);
      }
    },
    
    // BlockContext 接口
    get blockContext() {
      return blockContext;
    }
  };
}

// BlockContext 类实现
export class BlockContext {
  constructor(toolBar, viewService, lifeCycleService, sharedData, envService) {
    this._toolBar = toolBar;
    this._viewService = viewService;
    this._lifeCycleService = lifeCycleService;
    this._sharedData = sharedData;
    this._envService = envService;
  }
  
  static create(toolBar, viewService, lifeCycleService, sharedData, envService) {
    return new BlockContext(toolBar, viewService, lifeCycleService, sharedData, envService);
  }
  
  get toolBar() {
    return this._toolBar;
  }
  
  get viewService() {
    return this._viewService;
  }
  
  get lifeCycleService() {
    return this._lifeCycleService;
  }
  
  get sharedData() {
    return this._sharedData;
  }
  
  get envService() {
    return this._envService;
  }
}

export default {
  INTERFACES,
  ToolBarItemShape,
  validateAPI,
  createAPIProxy,
  BlockContext
};


