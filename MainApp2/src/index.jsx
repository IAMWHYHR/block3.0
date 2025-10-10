import React from 'react';
import { createRoot } from 'react-dom/client';
import { loadMicroApp, start } from 'qiankun';
import { BlockContext } from 'shared-sdk';

const MountControls = () => {
  const app1Ref = React.useRef(null);
  const app2Ref = React.useRef(null);
  const [toolbarItems, setToolbarItems] = React.useState([]);

  // 实现工具栏 API
  const toolbarAPI = {
    addToolBarItem: (item) => {
      if (item && typeof item === 'object' && item.label && item.onClick) {
        setToolbarItems(prev => [...prev, { ...item, id: Date.now() }]);
        return true;
      }
      return false;
    },
    removeToolBarItem: (id) => {
      setToolbarItems(prev => prev.filter(item => item.id !== id));
    }
  };

  // 实现事件总线
  const eventBus = {
    listeners: new Map(),
    on: (event, handler) => {
      if (!eventBus.listeners.has(event)) {
        eventBus.listeners.set(event, new Set());
      }
      eventBus.listeners.get(event).add(handler);
      return () => eventBus.listeners.get(event)?.delete(handler);
    },
    off: (event, handler) => {
      eventBus.listeners.get(event)?.delete(handler);
    },
    emit: (event, payload) => {
      eventBus.listeners.get(event)?.forEach(fn => fn(payload));
    }
  };

  // 实现 BlockContext 相关服务
  const [menuItems, setMenuItems] = React.useState([]);
  
  const toolBar = {
    // 兼容旧接口
    addItem: (item) => {
      if (item && typeof item === 'object' && item.label && item.onClick) {
        setToolbarItems(prev => [...prev, { ...item, id: Date.now() }]);
        return true;
      }
      return false;
    },
    removeItem: (id) => {
      setToolbarItems(prev => prev.filter(item => item.id !== id));
    },
    getItems: () => toolbarItems,
    
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
        setMenuItems(prev => [...items, ...prev]);
      } else {
        setMenuItems(prev => {
          const index = prev.findIndex(item => item.type === 'item' && item.code === code);
          if (index >= 0) {
            const newItems = [...prev];
            newItems.splice(index, 0, ...items);
            return newItems;
          }
          return [...items, ...prev];
        });
      }
      return toolBar;
    },
    
    appendItems: (items) => {
      setMenuItems(prev => [...prev, ...items]);
      return toolBar;
    },
    
    deleteItems: (codes) => {
      setMenuItems(prev => prev.filter(item => 
        item.type !== 'item' || !codes.includes(item.code)
      ));
      return toolBar;
    },
    
    modifyItem: (code, props) => {
      setMenuItems(prev => prev.map(item => {
        if (item.type === 'item' && item.code === code) {
          return {
            ...item,
            tooltip: props.tooltip !== undefined ? props.tooltip : item.tooltip,
            icon: props.icon !== undefined ? props.icon : item.icon,
            data: props.data !== undefined ? props.data : item.data
          };
        }
        return item;
      }));
      return toolBar;
    }
  };

  const [modals, setModals] = React.useState([]);
  const [toasts, setToasts] = React.useState([]);
  const [configPanels, setConfigPanels] = React.useState([]);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  
  // 环境状态
  const [darkMode, setDarkMode] = React.useState('light');
  const [language, setLanguage] = React.useState('zh');
  const [docMode, setDocMode] = React.useState('editable');

  const viewService = {
    currentView: null,
    viewList: [],
    openView: async (viewId, options = {}) => {
      console.log(`[ViewService] 打开视图: ${viewId}`, options);
      viewService.currentView = viewId;
      if (!viewService.viewList.includes(viewId)) {
        viewService.viewList.push(viewId);
      }
    },
    closeView: async (viewId) => {
      console.log(`[ViewService] 关闭视图: ${viewId}`);
      viewService.viewList = viewService.viewList.filter(id => id !== viewId);
      if (viewService.currentView === viewId) {
        viewService.currentView = viewService.viewList[0] || null;
      }
    },
    switchView: async (viewId) => {
      console.log(`[ViewService] 切换视图: ${viewId}`);
      viewService.currentView = viewId;
    },
    getCurrentView: () => viewService.currentView,
    getViewList: () => [...viewService.viewList],
    
    // 新增视图管理接口
    showToast: async (message) => {
      const id = Date.now();
      const toast = { id, message, visible: true };
      setToasts(prev => [...prev, toast]);
      
      // 3秒后自动消失
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
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
        setModals(prev => [...prev, modal]);
      });
    },
    
    closeModal: async (data) => {
      setModals(prev => {
        if (prev.length > 0) {
          const lastModal = prev[prev.length - 1];
          lastModal.resolve({ ok: true, data });
          return prev.slice(0, -1);
        }
        return prev;
      });
    },
    
    requestFullscreen: async (options = {}) => {
      console.log('[ViewService] 进入全屏', options);
      setIsFullscreen(true);
      // 实际项目中可以调用浏览器的全屏API
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    },
    
    exitFullscreen: async () => {
      console.log('[ViewService] 退出全屏');
      setIsFullscreen(false);
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
        setConfigPanels(prev => [...prev, configPanel]);
      });
    },
    
    closeConfig: async (data) => {
      setConfigPanels(prev => {
        if (prev.length > 0) {
          const lastPanel = prev[prev.length - 1];
          lastPanel.resolve({ saved: true, data });
          return prev.slice(0, -1);
        }
        return prev;
      });
    }
  };

  // 环境服务
  const envService = {
    _darkModeListeners: new Set(),
    _languageListeners: new Set(),
    _docModeListeners: new Set(),
    
    get darkMode() {
      return darkMode;
    },
    
    onDarkModeChange(listener) {
      envService._darkModeListeners.add(listener);
    },
    
    offDarkModeChange(listener) {
      envService._darkModeListeners.delete(listener);
    },
    
    get language() {
      return language;
    },
    
    onLanguageChange(listener) {
      envService._languageListeners.add(listener);
    },
    
    offLanguageChange(listener) {
      envService._languageListeners.delete(listener);
    },
    
    get docMode() {
      return docMode;
    },
    
    onDocModeChange(listener) {
      envService._docModeListeners.add(listener);
    },
    
    offDocModeChange(listener) {
      envService._docModeListeners.delete(listener);
    },
    
    // 内部方法：触发深色模式变更
    _triggerDarkModeChange(newMode) {
      setDarkMode(newMode);
      envService._darkModeListeners.forEach(listener => listener(newMode));
    },
    
    // 内部方法：触发语言变更
    _triggerLanguageChange(newLang) {
      setLanguage(newLang);
      envService._languageListeners.forEach(listener => listener(newLang));
    },
    
    // 内部方法：触发文档模式变更
    _triggerDocModeChange(newMode) {
      setDocMode(newMode);
      envService._docModeListeners.forEach(listener => listener(newMode));
    }
  };

  const lifeCycleService = {
    mountCallbacks: new Set(),
    unmountCallbacks: new Set(),
    updateCallbacks: new Set(),
    blockReadyCallbacks: new Set(),
    onMount: (callback) => {
      lifeCycleService.mountCallbacks.add(callback);
      return () => lifeCycleService.mountCallbacks.delete(callback);
    },
    onUnmount: (callback) => {
      lifeCycleService.unmountCallbacks.add(callback);
      return () => lifeCycleService.unmountCallbacks.delete(callback);
    },
    onUpdate: (callback) => {
      lifeCycleService.updateCallbacks.add(callback);
      return () => lifeCycleService.updateCallbacks.delete(callback);
    },
    triggerMount: () => {
      lifeCycleService.mountCallbacks.forEach(callback => callback());
    },
    triggerUnmount: () => {
      lifeCycleService.unmountCallbacks.forEach(callback => callback());
    },
    triggerUpdate: (props) => {
      lifeCycleService.updateCallbacks.forEach(callback => callback(props));
    },
    notifyBlockReady: () => {
      console.log('[MainApp2] Block 加载完成通知');
      lifeCycleService.blockReadyCallbacks.forEach(callback => callback());
    }
  };

  // 协同Map实现
  const createSharedMap = (name) => {
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
  const createSharedArray = (name) => {
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

  const sharedData = {
    data: new Map(),
    subscribers: new Map(),
    maps: new Map(),
    arrays: new Map(),
    get: (key) => sharedData.data.get(key),
    set: (key, value) => {
      sharedData.data.set(key, value);
      // 通知订阅者
      const callbacks = sharedData.subscribers.get(key);
      if (callbacks) {
        callbacks.forEach(callback => callback(value));
      }
    },
    delete: (key) => {
      const result = sharedData.data.delete(key);
      sharedData.subscribers.delete(key);
      return result;
    },
    clear: () => {
      sharedData.data.clear();
      sharedData.subscribers.clear();
    },
    keys: () => Array.from(sharedData.data.keys()),
    subscribe: (key, callback) => {
      if (!sharedData.subscribers.has(key)) {
        sharedData.subscribers.set(key, new Set());
      }
      sharedData.subscribers.get(key).add(callback);
      return () => sharedData.subscribers.get(key)?.delete(callback);
    },
    getMap: (name) => {
      if (!sharedData.maps.has(name)) {
        sharedData.maps.set(name, createSharedMap(name));
      }
      return sharedData.maps.get(name);
    },
    getArray: (name) => {
      if (!sharedData.arrays.has(name)) {
        sharedData.arrays.set(name, createSharedArray(name));
      }
      return sharedData.arrays.get(name);
    }
  };

  // 创建 BlockContext 实例
  const blockContext = BlockContext.create(toolBar, viewService, lifeCycleService, sharedData, envService);

  const mountApp1 = () => {
    if (!app1Ref.current) {
      app1Ref.current = loadMicroApp({
        name: 'micro-app',
        entry: 'http://localhost:7200',
        container: '#container-app1',
        props: {
          toolbarAPI,
          eventBus,
          blockContext
        }
      });
    }
  };

  const unmountApp1 = async () => {
    if (app1Ref.current) {
      await app1Ref.current.unmount();
      app1Ref.current = null;
    }
  };

  const mountApp2 = () => {
    if (!app2Ref.current) {
      app2Ref.current = loadMicroApp({
        name: 'micro-app-2',
        entry: 'http://localhost:7300',
        container: '#container-app2',
        props: {
          toolbarAPI,
          eventBus,
          blockContext
        }
      });
    }
  };

  const unmountApp2 = async () => {
    if (app2Ref.current) {
      await app2Ref.current.unmount();
      app2Ref.current = null;
    }
  };

  React.useEffect(() => {
    // 启动 qiankun（非路由模式）
    start({ sandbox: { experimentalStyleIsolation: true }, singular: false });
    // 示例：自动加载两个微应用
    mountApp1();
    mountApp2();
    return () => {
      unmountApp1();
      unmountApp2();
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Main App 2 (loadMicroApp + Props)</h1>
      
      {/* 工具栏 */}
      <div style={{ 
        padding: '10px', 
        borderBottom: '1px solid #ccc', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <span style={{ fontWeight: 'bold', marginRight: '20px' }}>工具栏:</span>
        
        {/* 显示菜单项 */}
        {toolBar.getValidItems().map((item, index) => {
          if (item.type === 'divider') {
            return (
              <div key={`divider-${index}`} style={{
                width: '1px',
                height: '20px',
                backgroundColor: '#ccc',
                margin: '0 5px'
              }} />
            );
          }
          
          if (item.type === 'item') {
            const editor = {}; // 模拟编辑器实例
            const isDisabled = item.disabled && item.disabled(editor);
            const showBackground = item.showBackground && item.showBackground(editor);
            
            return (
              <button
                key={item.code}
                onClick={(e) => !isDisabled && item.onClick(editor, e)}
                disabled={isDisabled}
                title={item.tooltip}
                style={{
                  padding: '5px 10px',
                  backgroundColor: showBackground ? '#007bff' : 'transparent',
                  color: showBackground ? 'white' : '#333',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {typeof item.icon === 'function' ? item.icon() : item.icon}
                <span>{item.code}</span>
              </button>
            );
          }
          
          return null;
        })}
        
        {/* 显示旧版工具栏项 */}
        {toolbarItems.map(item => (
          <button
            key={item.id}
            onClick={item.onClick}
            style={{
              padding: '5px 10px',
              backgroundColor: item.color || '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Toast 组件 */}
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#333',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '4px',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {toast.message}
        </div>
      ))}

      {/* Modal 组件 */}
      {modals.map(modal => (
        <div
          key={modal.id}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={modal.maskClosable ? () => {
            modal.resolve({ ok: false });
            setModals(prev => prev.filter(m => m.id !== modal.id));
          } : undefined}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              width: modal.width,
              height: modal.height,
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>{modal.title}</h3>
              {modal.closable && (
                <button
                  onClick={() => {
                    modal.resolve({ ok: false });
                    setModals(prev => prev.filter(m => m.id !== modal.id));
                  }}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{ flex: 1, marginBottom: '15px' }}>
              {modal.content}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  modal.resolve({ ok: false });
                  setModals(prev => prev.filter(m => m.id !== modal.id));
                }}
                style={{ padding: '8px 16px', border: '1px solid #ccc', background: 'white', borderRadius: '4px' }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  modal.resolve({ ok: true });
                  setModals(prev => prev.filter(m => m.id !== modal.id));
                }}
                style={{ padding: '8px 16px', border: 'none', background: '#007bff', color: 'white', borderRadius: '4px' }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Config Panel 组件 */}
      {configPanels.map(panel => (
        <div
          key={panel.id}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={panel.maskClosable ? () => {
            panel.resolve({ saved: false });
            setConfigPanels(prev => prev.filter(p => p.id !== panel.id));
          } : undefined}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              width: panel.width,
              height: panel.height,
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>{panel.title}</h3>
              {panel.closable && (
                <button
                  onClick={() => {
                    panel.resolve({ saved: false });
                    setConfigPanels(prev => prev.filter(p => p.id !== panel.id));
                  }}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{ flex: 1, marginBottom: '15px' }}>
              <p>配置面板内容区域</p>
              <input type="text" placeholder="配置项1" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
              <input type="text" placeholder="配置项2" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  panel.resolve({ saved: false });
                  setConfigPanels(prev => prev.filter(p => p.id !== panel.id));
                }}
                style={{ padding: '8px 16px', border: '1px solid #ccc', background: 'white', borderRadius: '4px' }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  panel.resolve({ saved: true, data: { config1: 'value1', config2: 'value2' } });
                  setConfigPanels(prev => prev.filter(p => p.id !== panel.id));
                }}
                style={{ padding: '8px 16px', border: 'none', background: '#28a745', color: 'white', borderRadius: '4px' }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* 环境控制面板 */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ margin: '0 0 15px 0' }}>环境控制</h4>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ marginRight: '8px' }}>深色模式:</label>
            <select 
              value={darkMode} 
              onChange={(e) => envService._triggerDarkModeChange(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>
          <div>
            <label style={{ marginRight: '8px' }}>语言:</label>
            <select 
              value={language} 
              onChange={(e) => envService._triggerLanguageChange(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label style={{ marginRight: '8px' }}>文档模式:</label>
            <select 
              value={docMode} 
              onChange={(e) => envService._triggerDocModeChange(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="editable">可编辑</option>
              <option value="readonly">只读</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button onClick={mountApp1}>挂载微应用1</button>
        <button onClick={unmountApp1}>卸载微应用1</button>
        <button onClick={mountApp2}>挂载微应用2</button>
        <button onClick={unmountApp2}>卸载微应用2</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div id="container-app1" style={{ minHeight: 200, border: '1px dashed #ccc', padding: 8 }}></div>
        <div id="container-app2" style={{ minHeight: 200, border: '1px dashed #ccc', padding: 8 }}></div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<MountControls />);


