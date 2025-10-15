import React from 'react';

// 工具栏组件
export const ToolbarUI = ({ toolbarService }) => {
  const [toolbarItems, setToolbarItems] = React.useState([]);
  const [menuItems, setMenuItems] = React.useState([]);
  
  // 定期更新状态以反映服务变化
  React.useEffect(() => {
    const updateItems = () => {
      setToolbarItems(toolbarService.getToolbarItems());
      setMenuItems(toolbarService.getValidItems());
    };
    
    updateItems();
    const interval = setInterval(updateItems, 1000); // 每秒更新一次
    
    return () => clearInterval(interval);
  }, [toolbarService]);

  return (
    <div style={{ 
      padding: '10px', 
      border: '1px solid #ddd', 
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>工具栏管理</h4>
      
      {/* 工具栏按钮 */}
      <div style={{ marginBottom: '10px' }}>
        <h5>工具栏按钮:</h5>
        {toolbarItems.length > 0 ? (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {toolbarItems.map((item, index) => (
              <button
                key={item.id || index}
                onClick={item.onClick}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  backgroundColor: item.color || '#fff',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666', fontSize: '12px' }}>暂无工具栏按钮</p>
        )}
      </div>

      {/* 菜单项 */}
      <div>
        <h5>菜单项:</h5>
        {menuItems.length > 0 ? (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={index} style={{ width: '1px', height: '20px', backgroundColor: '#ccc' }} />;
              }
              return (
                <button
                  key={item.code || index}
                  onClick={item.onClick}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {typeof item.icon === 'function' ? item.icon() : item.icon || item.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#666', fontSize: '12px' }}>暂无菜单项</p>
        )}
      </div>
    </div>
  );
};

// 视图服务UI组件
export const ViewServiceUI = ({ viewService }) => {
  const [modals, setModals] = React.useState([]);
  const [toasts, setToasts] = React.useState([]);
  const [configPanels, setConfigPanels] = React.useState([]);
  
  // 定期更新状态以反映服务变化
  React.useEffect(() => {
    const updateStates = () => {
      setModals(viewService.getModals?.() || []);
      setToasts(viewService.getToasts?.() || []);
      setConfigPanels(viewService.getConfigPanels?.() || []);
    };
    
    updateStates();
    const interval = setInterval(updateStates, 1000); // 每秒更新一次
    
    return () => clearInterval(interval);
  }, [viewService]);

  const showTestModal = () => {
    viewService.openModal({
      title: '测试模态框',
      content: '这是一个测试模态框',
      width: 300,
      height: 150
    }).then(result => {
      console.log('模态框结果:', result);
    });
  };

  const showTestToast = () => {
    viewService.showToast('这是一个测试Toast消息');
  };

  const showTestConfig = () => {
    viewService.openConfig({
      title: '测试配置面板',
      width: 400,
      height: 300
    }).then(result => {
      console.log('配置面板结果:', result);
    });
  };

  return (
    <div style={{ 
      padding: '10px', 
      border: '1px solid #ddd', 
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>视图服务</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <button onClick={showTestModal} style={{ marginRight: '5px', padding: '4px 8px' }}>
          显示模态框
        </button>
        <button onClick={showTestToast} style={{ marginRight: '5px', padding: '4px 8px' }}>
          显示Toast
        </button>
        <button onClick={showTestConfig} style={{ padding: '4px 8px' }}>
          显示配置面板
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>当前视图: {viewService.getCurrentView() || '无'}</p>
        <p>视图列表: {viewService.getViewList().join(', ') || '无'}</p>
        <p>活跃模态框: {modals.length}</p>
        <p>活跃Toast: {toasts.length}</p>
        <p>活跃配置面板: {configPanels.length}</p>
      </div>

      {/* 显示Toast */}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
          {toasts.map(toast => (
            <div
              key={toast.id}
              style={{
                padding: '10px 15px',
                backgroundColor: '#333',
                color: '#fff',
                borderRadius: '4px',
                marginBottom: '5px',
                fontSize: '14px'
              }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* 显示模态框 */}
      {modals.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          {modals.map(modal => (
            <div
              key={modal.id}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: modal.width + 'px',
                height: modal.height + 'px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <h3 style={{ margin: '0 0 15px 0' }}>{modal.title}</h3>
              <div style={{ flex: 1, marginBottom: '15px' }}>{modal.content}</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => viewService.closeModal({ cancelled: true })}
                  style={{ padding: '6px 12px' }}
                >
                  取消
                </button>
                <button
                  onClick={() => viewService.closeModal({ ok: true })}
                  style={{ padding: '6px 12px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '3px' }}
                >
                  确定
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 显示配置面板 */}
      {configPanels.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          {configPanels.map(panel => (
            <div
              key={panel.id}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: panel.width + 'px',
                height: panel.height + 'px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <h3 style={{ margin: '0 0 15px 0' }}>{panel.title}</h3>
              <div style={{ flex: 1, marginBottom: '15px' }}>
                <p>配置面板内容</p>
                <input type="text" placeholder="输入配置..." style={{ width: '100%', padding: '5px', marginBottom: '10px' }} />
                <textarea placeholder="详细配置..." style={{ width: '100%', height: '100px', padding: '5px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => viewService.closeConfig({ cancelled: true })}
                  style={{ padding: '6px 12px' }}
                >
                  取消
                </button>
                <button
                  onClick={() => viewService.closeConfig({ saved: true, data: { config: 'test' } })}
                  style={{ padding: '6px 12px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '3px' }}
                >
                  保存
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 环境服务UI组件
export const EnvServiceUI = ({ envService }) => {
  const [darkMode, setDarkMode] = React.useState(envService.darkMode);
  const [language, setLanguage] = React.useState(envService.language);
  const [docMode, setDocMode] = React.useState(envService.docMode);
  
  // 监听环境变化
  React.useEffect(() => {
    const unsubscribeDarkMode = envService.onDarkModeChange(setDarkMode);
    const unsubscribeLanguage = envService.onLanguageChange(setLanguage);
    const unsubscribeDocMode = envService.onDocModeChange(setDocMode);
    
    return () => {
      unsubscribeDarkMode();
      unsubscribeLanguage();
      unsubscribeDocMode();
    };
  }, [envService]);

  const toggleDarkMode = () => {
    const newMode = darkMode === 'light' ? 'dark' : 'light';
    envService._triggerDarkModeChange(newMode);
  };

  const toggleLanguage = () => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    envService._triggerLanguageChange(newLang);
  };

  const toggleDocMode = () => {
    const newMode = docMode === 'editable' ? 'readonly' : 'editable';
    envService._triggerDocModeChange(newMode);
  };

  return (
    <div style={{ 
      padding: '10px', 
      border: '1px solid #ddd', 
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>环境服务</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <button onClick={toggleDarkMode} style={{ marginRight: '5px', padding: '4px 8px' }}>
          切换深色模式 ({darkMode})
        </button>
        <button onClick={toggleLanguage} style={{ marginRight: '5px', padding: '4px 8px' }}>
          切换语言 ({language})
        </button>
        <button onClick={toggleDocMode} style={{ padding: '4px 8px' }}>
          切换文档模式 ({docMode})
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>当前深色模式: {darkMode}</p>
        <p>当前语言: {language}</p>
        <p>当前文档模式: {docMode}</p>
      </div>
    </div>
  );
};

// 共享数据UI组件
export const SharedDataUI = ({ sharedData }) => {
  const [inputKey, setInputKey] = React.useState('');
  const [inputValue, setInputValue] = React.useState('');
  const [sharedValue, setSharedValue] = React.useState('');
  const [allKeys, setAllKeys] = React.useState([]);

  React.useEffect(() => {
    const unsubscribe = sharedData.subscribe('testKey', (value) => {
      setSharedValue(value);
    });
    
    // 定期更新所有键
    const updateKeys = () => {
      setAllKeys(sharedData.keys());
    };
    
    updateKeys();
    const interval = setInterval(updateKeys, 1000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [sharedData]);

  const setSharedData = () => {
    if (inputKey && inputValue) {
      sharedData.set(inputKey, inputValue);
      setInputKey('');
      setInputValue('');
    }
  };

  const getSharedData = () => {
    const value = sharedData.get('testKey');
    setSharedValue(value || '');
  };

  return (
    <div style={{ 
      padding: '10px', 
      border: '1px solid #ddd', 
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>共享数据</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="键"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          style={{ marginRight: '5px', padding: '4px', width: '80px' }}
        />
        <input
          type="text"
          placeholder="值"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{ marginRight: '5px', padding: '4px', width: '120px' }}
        />
        <button onClick={setSharedData} style={{ padding: '4px 8px' }}>
          设置
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <button onClick={getSharedData} style={{ marginRight: '5px', padding: '4px 8px' }}>
          获取 testKey
        </button>
        <span style={{ fontSize: '12px' }}>当前值: {sharedValue || '无'}</span>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>所有键: {allKeys.join(', ') || '无'}</p>
      </div>
    </div>
  );
};

// 生命周期服务UI组件
export const LifeCycleUI = ({ lifeCycleService }) => {
  const [log, setLog] = React.useState([]);

  React.useEffect(() => {
    const addLog = (message) => {
      setLog(prev => [...prev, { id: Date.now(), message, time: new Date().toLocaleTimeString() }]);
    };

    const unsubscribeMount = lifeCycleService.onMount(() => {
      addLog('生命周期: 挂载');
    });

    const unsubscribeUnmount = lifeCycleService.onUnmount(() => {
      addLog('生命周期: 卸载');
    });

    const unsubscribeUpdate = lifeCycleService.onUpdate((props) => {
      addLog(`生命周期: 更新 - ${JSON.stringify(props)}`);
    });

    return () => {
      unsubscribeMount();
      unsubscribeUnmount();
      unsubscribeUpdate();
    };
  }, [lifeCycleService]);

  const triggerMount = () => {
    lifeCycleService.triggerMount();
  };

  const triggerUnmount = () => {
    lifeCycleService.triggerUnmount();
  };

  const triggerUpdate = () => {
    lifeCycleService.triggerUpdate({ test: 'update' });
  };

  const notifyBlockReady = () => {
    lifeCycleService.notifyBlockReady();
  };

  return (
    <div style={{ 
      padding: '10px', 
      border: '1px solid #ddd', 
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>生命周期服务</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <button onClick={triggerMount} style={{ marginRight: '5px', padding: '4px 8px' }}>
          触发挂载
        </button>
        <button onClick={triggerUnmount} style={{ marginRight: '5px', padding: '4px 8px' }}>
          触发卸载
        </button>
        <button onClick={triggerUpdate} style={{ marginRight: '5px', padding: '4px 8px' }}>
          触发更新
        </button>
        <button onClick={notifyBlockReady} style={{ padding: '4px 8px' }}>
          通知Block就绪
        </button>
      </div>

      <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '12px' }}>
        <h5 style={{ margin: '0 0 5px 0' }}>生命周期日志:</h5>
        {log.length > 0 ? (
          log.slice(-10).map(entry => (
            <div key={entry.id} style={{ marginBottom: '2px', color: '#666' }}>
              [{entry.time}] {entry.message}
            </div>
          ))
        ) : (
          <p style={{ color: '#999' }}>暂无日志</p>
        )}
      </div>
    </div>
  );
};
