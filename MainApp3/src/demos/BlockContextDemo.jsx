
import React from 'react';

// BlockContext 功能演示组件
export const BlockContextDemo = () => {
  const [logs, setLogs] = React.useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, { 
      id: Date.now(), 
      message, 
      time: new Date().toLocaleTimeString() 
    }]);
  };

  // 工具栏API演示
  const demonstrateToolbarAPI = () => {
    if (!window.blockContext) {
      addLog('❌ BlockContext 不可用');
      return;
    }

    const { toolBar } = window.blockContext;
    
    // 添加工具栏项目
    const success = toolBar.addToolBarItem({
      label: '演示按钮',
      color: '#007bff',
      onClick: () => addLog('✅ 演示按钮被点击')
    });

    if (success) {
      addLog('✅ 工具栏项目添加成功');
    } else {
      addLog('❌ 工具栏项目添加失败');
    }

    // 添加菜单项
    toolBar.appendItems([
      {
        type: 'item',
        code: 'demo-item',
        label: '演示菜单',
        icon: () => '🔧',
        tooltip: '这是一个演示菜单项',
        onClick: () => addLog('✅ 演示菜单被点击')
      },
      {
        type: 'divider'
      },
      {
        type: 'item',
        code: 'another-item',
        label: '另一个菜单',
        icon: () => '⚙️',
        onClick: () => addLog('✅ 另一个菜单被点击')
      }
    ]);

    addLog('✅ 菜单项添加成功');
  };

  // 视图服务演示
  const demonstrateViewService = async () => {
    if (!window.blockContext) {
      addLog('❌ BlockContext 不可用');
      return;
    }

    const { viewService } = window.blockContext;

    try {
      // 显示Toast
      await viewService.showToast('这是一个演示Toast消息');
      addLog('✅ Toast显示成功');

      // 显示模态框
      const modalResult = await viewService.openModal({
        title: '演示模态框',
        content: '这是一个演示模态框，点击确定或取消',
        width: 400,
        height: 200
      });
      addLog(`✅ 模态框结果: ${JSON.stringify(modalResult)}`);

      // 显示配置面板
      const configResult = await viewService.openConfig({
        title: '演示配置面板',
        width: 500,
        height: 300
      });
      addLog(`✅ 配置面板结果: ${JSON.stringify(configResult)}`);

    } catch (error) {
      addLog(`❌ 视图服务演示失败: ${error.message}`);
    }
  };

  // 共享数据演示
  const demonstrateSharedData = () => {
    if (!window.blockContext) {
      addLog('❌ BlockContext 不可用');
      return;
    }

    const { sharedData } = window.blockContext;

    // 设置共享数据
    sharedData.set('demoKey', '演示数据');
    sharedData.set('timestamp', Date.now());
    addLog('✅ 共享数据设置成功');

    // 获取共享数据
    const demoValue = sharedData.get('demoKey');
    const timestamp = sharedData.get('timestamp');
    addLog(`✅ 获取共享数据: demoKey=${demoValue}, timestamp=${timestamp}`);

    // 订阅数据变化
    const unsubscribe = sharedData.subscribe('demoKey', (value) => {
      addLog(`📢 共享数据变化: demoKey=${value}`);
    });

    // 触发数据变化
    setTimeout(() => {
      sharedData.set('demoKey', '更新后的数据');
      setTimeout(() => {
        unsubscribe(); // 取消订阅
        addLog('✅ 共享数据演示完成');
      }, 1000);
    }, 1000);

    // 协同Map演示
    const sharedMap = sharedData.getMap('demoMap');
    sharedMap.set('user', 'demoUser');
    sharedMap.set('role', 'admin');
    addLog('✅ 协同Map数据设置成功');

    // 协同Array演示
    const sharedArray = sharedData.getArray('demoArray');
    sharedArray.push('item1', 'item2', 'item3');
    addLog('✅ 协同Array数据设置成功');
  };

  // 环境服务演示
  const demonstrateEnvService = () => {
    if (!window.blockContext) {
      addLog('❌ BlockContext 不可用');
      return;
    }

    const { envService } = window.blockContext;

    // 监听环境变化
    const unsubscribeDarkMode = envService.onDarkModeChange((mode) => {
      addLog(`🌙 深色模式变化: ${mode}`);
    });

    const unsubscribeLanguage = envService.onLanguageChange((lang) => {
      addLog(`🌍 语言变化: ${lang}`);
    });

    const unsubscribeDocMode = envService.onDocModeChange((mode) => {
      addLog(`📄 文档模式变化: ${mode}`);
    });

    // 触发环境变化
    setTimeout(() => {
      envService._triggerDarkModeChange('dark');
      setTimeout(() => {
        envService._triggerLanguageChange('en');
        setTimeout(() => {
          envService._triggerDocModeChange('readonly');
          setTimeout(() => {
            // 清理监听器
            unsubscribeDarkMode();
            unsubscribeLanguage();
            unsubscribeDocMode();
            addLog('✅ 环境服务演示完成');
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);

    addLog('✅ 环境服务监听器设置成功');
  };

  // 生命周期服务演示
  const demonstrateLifeCycleService = () => {
    if (!window.blockContext) {
      addLog('❌ BlockContext 不可用');
      return;
    }

    const { lifeCycleService } = window.blockContext;

    // 注册生命周期回调
    const unsubscribeMount = lifeCycleService.onMount(() => {
      addLog('🚀 生命周期: 挂载');
    });

    const unsubscribeUnmount = lifeCycleService.onUnmount(() => {
      addLog('🛑 生命周期: 卸载');
    });

    const unsubscribeUpdate = lifeCycleService.onUpdate((props) => {
      addLog(`🔄 生命周期: 更新 - ${JSON.stringify(props)}`);
    });

    // 触发生命周期事件
    setTimeout(() => {
      lifeCycleService.triggerMount();
      setTimeout(() => {
        lifeCycleService.triggerUpdate({ demo: 'update' });
        setTimeout(() => {
          lifeCycleService.notifyBlockReady();
          setTimeout(() => {
            lifeCycleService.triggerUnmount();
            setTimeout(() => {
              // 清理监听器
              unsubscribeMount();
              unsubscribeUnmount();
              unsubscribeUpdate();
              addLog('✅ 生命周期服务演示完成');
            }, 1000);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);

    addLog('✅ 生命周期服务监听器设置成功');
  };

  // 完整演示
  const runFullDemo = () => {
    addLog('🚀 开始完整BlockContext演示...');
    
    setTimeout(() => demonstrateToolbarAPI(), 500);
    setTimeout(() => demonstrateViewService(), 1500);
    setTimeout(() => demonstrateSharedData(), 3000);
    setTimeout(() => demonstrateEnvService(), 4500);
    setTimeout(() => demonstrateLifeCycleService(), 6000);
    setTimeout(() => addLog('🎉 完整演示完成！'), 8000);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      margin: '20px 0'
    }}>
      <h3 style={{ margin: '0 0 15px 0' }}>BlockContext 功能演示</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={runFullDemo}
          style={{ 
            marginRight: '10px', 
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          运行完整演示
        </button>
        
        <button 
          onClick={demonstrateToolbarAPI}
          style={{ 
            marginRight: '10px', 
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          工具栏API演示
        </button>
        
        <button 
          onClick={demonstrateViewService}
          style={{ 
            marginRight: '10px', 
            padding: '8px 16px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          视图服务演示
        </button>
        
        <button 
          onClick={demonstrateSharedData}
          style={{ 
            marginRight: '10px', 
            padding: '8px 16px',
            backgroundColor: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          共享数据演示
        </button>
        
        <button 
          onClick={clearLogs}
          style={{ 
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          清空日志
        </button>
      </div>

      <div style={{ 
        maxHeight: '300px', 
        overflowY: 'auto', 
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '10px'
      }}>
        <h5 style={{ margin: '0 0 10px 0' }}>演示日志:</h5>
        {logs.length > 0 ? (
          logs.map(entry => (
            <div key={entry.id} style={{ 
              marginBottom: '5px', 
              fontSize: '14px',
              padding: '2px 0',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <span style={{ color: '#666', marginRight: '8px' }}>[{entry.time}]</span>
              {entry.message}
            </div>
          ))
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic' }}>暂无日志，点击上方按钮开始演示</p>
        )}
      </div>
    </div>
  );
};

export default BlockContextDemo;


