import React, { useState, useEffect } from 'react';

// BlockContext集成测试组件
export const BlockContextIntegrationTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (test, status, message, details = null) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status, // 'success', 'error', 'warning'
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runIntegrationTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    addTestResult('开始测试', 'info', '开始BlockContext集成测试...');

    // 测试1: 检查全局BlockContext是否存在
    try {
      if (window.blockContext) {
        addTestResult('全局BlockContext', 'success', '全局BlockContext已存在', {
          toolBar: !!window.blockContext.toolBar,
          viewService: !!window.blockContext.viewService,
          lifeCycleService: !!window.blockContext.lifeCycleService,
          sharedData: !!window.blockContext.sharedData,
          envService: !!window.blockContext.envService,
          eventBus: !!window.blockContext.eventBus
        });
      } else {
        addTestResult('全局BlockContext', 'error', '全局BlockContext不存在');
        return;
      }
    } catch (error) {
      addTestResult('全局BlockContext', 'error', `检查全局BlockContext失败: ${error.message}`);
      return;
    }

    // 测试2: 测试工具栏服务
    try {
      const { toolBar } = window.blockContext;
      if (toolBar) {
        const testItem = {
          label: '测试按钮',
          color: '#007bff',
          onClick: () => console.log('测试按钮被点击')
        };
        
        const addResult = toolBar.addToolBarItem(testItem);
        if (addResult) {
          addTestResult('工具栏服务', 'success', '工具栏项目添加成功');
          
          // 测试获取工具栏项目
          const items = toolBar.getToolbarItems();
          addTestResult('工具栏服务', 'success', `获取工具栏项目成功，共${items.length}个`, items);
        } else {
          addTestResult('工具栏服务', 'error', '工具栏项目添加失败');
        }
      } else {
        addTestResult('工具栏服务', 'error', '工具栏服务不可用');
      }
    } catch (error) {
      addTestResult('工具栏服务', 'error', `工具栏服务测试失败: ${error.message}`);
    }

    // 测试3: 测试视图服务
    try {
      const { viewService } = window.blockContext;
      if (viewService) {
        // 测试Toast
        await viewService.showToast('BlockContext集成测试Toast');
        addTestResult('视图服务', 'success', 'Toast显示成功');
        
        // 测试模态框
        const modalResult = await viewService.openModal({
          title: 'BlockContext测试',
          content: '这是一个测试模态框',
          width: 300,
          height: 150
        });
        addTestResult('视图服务', 'success', '模态框测试成功', modalResult);
        
        // 测试配置面板
        const configResult = await viewService.openConfig({
          title: 'BlockContext配置测试',
          width: 400,
          height: 300
        });
        addTestResult('视图服务', 'success', '配置面板测试成功', configResult);
      } else {
        addTestResult('视图服务', 'error', '视图服务不可用');
      }
    } catch (error) {
      addTestResult('视图服务', 'error', `视图服务测试失败: ${error.message}`);
    }

    // 测试4: 测试共享数据服务
    try {
      const { sharedData } = window.blockContext;
      if (sharedData) {
        // 设置测试数据
        sharedData.set('testKey', 'testValue');
        const getValue = sharedData.get('testKey');
        
        if (getValue === 'testValue') {
          addTestResult('共享数据服务', 'success', '共享数据设置和获取成功');
        } else {
          addTestResult('共享数据服务', 'error', `共享数据获取失败，期望: testValue，实际: ${getValue}`);
        }
        
        // 测试订阅
        let subscriptionTriggered = false;
        const unsubscribe = sharedData.subscribe('testKey', (value) => {
          subscriptionTriggered = true;
          addTestResult('共享数据服务', 'success', '数据订阅触发成功', { value });
        });
        
        // 触发数据变化
        sharedData.set('testKey', 'updatedValue');
        
        setTimeout(() => {
          if (subscriptionTriggered) {
            addTestResult('共享数据服务', 'success', '数据订阅机制正常');
          } else {
            addTestResult('共享数据服务', 'warning', '数据订阅可能未触发');
          }
          unsubscribe();
        }, 100);
        
        // 测试协同Map
        const sharedMap = sharedData.getMap('testMap');
        sharedMap.set('key1', 'value1');
        const mapValue = sharedMap.get('key1');
        
        if (mapValue === 'value1') {
          addTestResult('共享数据服务', 'success', '协同Map功能正常');
        } else {
          addTestResult('共享数据服务', 'error', '协同Map功能异常');
        }
        
        // 测试协同Array
        const sharedArray = sharedData.getArray('testArray');
        sharedArray.push('item1', 'item2');
        const arrayLength = sharedArray.length();
        
        if (arrayLength === 2) {
          addTestResult('共享数据服务', 'success', '协同Array功能正常');
        } else {
          addTestResult('共享数据服务', 'error', '协同Array功能异常');
        }
      } else {
        addTestResult('共享数据服务', 'error', '共享数据服务不可用');
      }
    } catch (error) {
      addTestResult('共享数据服务', 'error', `共享数据服务测试失败: ${error.message}`);
    }

    // 测试5: 测试环境服务
    try {
      const { envService } = window.blockContext;
      if (envService) {
        const currentDarkMode = envService.darkMode;
        const currentLanguage = envService.language;
        const currentDocMode = envService.docMode;
        
        addTestResult('环境服务', 'success', '环境服务状态获取成功', {
          darkMode: currentDarkMode,
          language: currentLanguage,
          docMode: currentDocMode
        });
        
        // 测试环境变化监听
        let darkModeChanged = false;
        const unsubscribeDarkMode = envService.onDarkModeChange((mode) => {
          darkModeChanged = true;
          addTestResult('环境服务', 'success', `深色模式变化监听成功: ${mode}`);
        });
        
        // 触发环境变化
        envService._triggerDarkModeChange('dark');
        
        setTimeout(() => {
          if (darkModeChanged) {
            addTestResult('环境服务', 'success', '环境变化监听机制正常');
          } else {
            addTestResult('环境服务', 'warning', '环境变化监听可能未触发');
          }
          unsubscribeDarkMode();
        }, 100);
      } else {
        addTestResult('环境服务', 'error', '环境服务不可用');
      }
    } catch (error) {
      addTestResult('环境服务', 'error', `环境服务测试失败: ${error.message}`);
    }

    // 测试6: 测试生命周期服务
    try {
      const { lifeCycleService } = window.blockContext;
      if (lifeCycleService) {
        let mountTriggered = false;
        let unmountTriggered = false;
        
        const unsubscribeMount = lifeCycleService.onMount(() => {
          mountTriggered = true;
          addTestResult('生命周期服务', 'success', '挂载事件监听成功');
        });
        
        const unsubscribeUnmount = lifeCycleService.onUnmount(() => {
          unmountTriggered = true;
          addTestResult('生命周期服务', 'success', '卸载事件监听成功');
        });
        
        // 触发生命周期事件
        lifeCycleService.triggerMount();
        lifeCycleService.triggerUnmount();
        
        setTimeout(() => {
          if (mountTriggered && unmountTriggered) {
            addTestResult('生命周期服务', 'success', '生命周期服务功能正常');
          } else {
            addTestResult('生命周期服务', 'warning', '生命周期事件可能未完全触发');
          }
          unsubscribeMount();
          unsubscribeUnmount();
        }, 100);
      } else {
        addTestResult('生命周期服务', 'error', '生命周期服务不可用');
      }
    } catch (error) {
      addTestResult('生命周期服务', 'error', `生命周期服务测试失败: ${error.message}`);
    }

    // 测试7: 测试事件总线
    try {
      const { eventBus } = window.blockContext;
      if (eventBus) {
        let eventTriggered = false;
        
        const unsubscribe = eventBus.on('testEvent', (payload) => {
          eventTriggered = true;
          addTestResult('事件总线', 'success', '事件监听成功', payload);
        });
        
        // 触发事件
        eventBus.emit('testEvent', { message: '测试事件' });
        
        setTimeout(() => {
          if (eventTriggered) {
            addTestResult('事件总线', 'success', '事件总线功能正常');
          } else {
            addTestResult('事件总线', 'warning', '事件可能未触发');
          }
          unsubscribe();
        }, 100);
      } else {
        addTestResult('事件总线', 'error', '事件总线不可用');
      }
    } catch (error) {
      addTestResult('事件总线', 'error', `事件总线测试失败: ${error.message}`);
    }

    addTestResult('测试完成', 'info', 'BlockContext集成测试完成');
    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      margin: '20px 0'
    }}>
      <h3 style={{ margin: '0 0 15px 0' }}>BlockContext 集成测试</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={runIntegrationTests}
          disabled={isRunning}
          style={{
            padding: '8px 16px',
            backgroundColor: isRunning ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isRunning ? '测试中...' : '开始测试'}
        </button>
        
        <button 
          onClick={clearResults}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          清空结果
        </button>
      </div>

      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto', 
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '10px'
      }}>
        {testResults.length > 0 ? (
          testResults.map(result => (
            <div key={result.id} style={{ 
              marginBottom: '8px', 
              padding: '8px',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ marginRight: '8px', fontSize: '16px' }}>
                  {getStatusIcon(result.status)}
                </span>
                <strong style={{ color: getStatusColor(result.status) }}>
                  {result.test}
                </strong>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6c757d' }}>
                  {result.timestamp}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#495057' }}>
                {result.message}
              </div>
              {result.details && (
                <div style={{ 
                  marginTop: '4px', 
                  fontSize: '12px', 
                  color: '#6c757d',
                  backgroundColor: '#e9ecef',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(result.details, null, 2)}
                </div>
              )}
            </div>
          ))
        ) : (
          <p style={{ color: '#6c757d', fontStyle: 'italic', textAlign: 'center' }}>
            点击"开始测试"按钮运行BlockContext集成测试
          </p>
        )}
      </div>
    </div>
  );
};

export default BlockContextIntegrationTest;


