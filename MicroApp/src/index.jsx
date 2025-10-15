import './public-path';
import React from 'react';
import { createRoot } from 'react-dom/client';
import AntdPyramid from './components/AntdPyramid';
import { createAPIProxy } from 'shared-sdk';

let rootInstance = null;

function render(props = {}) {
  const { container } = props;
  const containerEl = container
    ? container.querySelector('#root')
    : document.getElementById('root');
  rootInstance = createRoot(containerEl);
  
  // 创建 API 代理
  const api = createAPIProxy(props);
  
  // 调试信息：显示接收到的 props
  console.log('🔍 MicroApp 接收到的 props:', props);
  
  const MicroAppComponent = () => {
    const [sharedValue, setSharedValue] = React.useState('');
    
    // 自动添加工具栏按钮
    React.useEffect(() => {
      const timer = setTimeout(() => {
        api.addToolBarItem({
          label: '微应用功能',
          color: '#28a745',
          onClick: () => alert('这是来自微应用的功能按钮！')
        });
      }, 100);
      return () => clearTimeout(timer);
    }, []);

    // 使用 BlockContext 功能
    React.useEffect(() => {
      const blockCtx = api.blockContext;
      if (!blockCtx) {
        console.warn('[MicroApp] BlockContext 不可用');
        return;
      }

      let unsubscribeMount = () => {};
      let unsubscribeUnmount = () => {};
      let unsubscribeData = () => {};
      let mapUnsubscribe = () => {};
      let arrayUnsubscribe = () => {};

      // 生命周期管理
      if (blockCtx.lifeCycleService) {
        unsubscribeMount = blockCtx.lifeCycleService.onMount(() => {
          console.log('[MicroApp] 生命周期: 挂载');
        });
        
        unsubscribeUnmount = blockCtx.lifeCycleService.onUnmount(() => {
          console.log('[MicroApp] 生命周期: 卸载');
        });

        // Block 加载完成通知
        setTimeout(() => {
          blockCtx.lifeCycleService.notifyBlockReady();
        }, 2000); // 模拟 2 秒后 Block 加载完成
      }

      // 共享数据订阅
      if (blockCtx.sharedData) {
        unsubscribeData = blockCtx.sharedData.subscribe('microAppData', (value) => {
          setSharedValue(value);
        });

        // 协同Map和数组示例
        const sharedMap = blockCtx.sharedData.getMap('userSettings');
        const sharedArray = blockCtx.sharedData.getArray('taskList');

        // 监听Map变更
        mapUnsubscribe = sharedMap.subscribe((action, key, value) => {
          console.log('[MicroApp] Map变更:', action, key, value);
        });

        // 监听数组变更
        arrayUnsubscribe = sharedArray.subscribe((action, index, value) => {
          console.log('[MicroApp] Array变更:', action, index, value);
        });

        // 操作协同数据
        sharedMap.set('theme', 'dark');
        sharedMap.set('language', 'zh');
        sharedArray.push('任务1', '任务2', '任务3');
      }

      // 环境服务监听
      if (blockCtx.envService) {
        const darkModeListener = (mode) => {
          console.log('[MicroApp] 深色模式变更:', mode);
          // 可以在这里更新微应用的样式
        };
        const languageListener = (lang) => {
          console.log('[MicroApp] 语言变更:', lang);
          // 可以在这里更新微应用的文本
        };
        const docModeListener = (mode) => {
          console.log('[MicroApp] 文档模式变更:', mode);
          // 可以在这里更新微应用的编辑状态
        };

        blockCtx.envService.onDarkModeChange(darkModeListener);
        blockCtx.envService.onLanguageChange(languageListener);
        blockCtx.envService.onDocModeChange(docModeListener);
      }

      // 视图服务示例
      if (blockCtx.viewService) {
        blockCtx.viewService.openView('microAppView', { title: '微应用视图' });

        // 视图管理功能演示
        setTimeout(() => {
          blockCtx.viewService.showToast('微应用1加载完成！');
        }, 1000);
      }

      // 工具栏定制示例
      if (blockCtx.toolBar) {
        const createIcon = () => {
          // 返回简单的字符串图标，避免 SVG 渲染问题
          return '💾';
        };

        // 添加工具栏菜单项
        blockCtx.toolBar.appendItems([
          {
            type: 'item',
            code: 'microApp-save',
            tooltip: '保存文档',
            icon: createIcon,
            showBackground: (editor) => true,
            disabled: (editor) => false,
            onClick: (editor, event) => {
              alert('来自微应用的保存功能');
            }
          },
          {
            type: 'divider'
          },
          {
            type: 'item',
            code: 'microApp-export',
            tooltip: '导出文档',
            icon: createIcon,
            showBackground: (editor) => false,
            disabled: (editor) => false,
            onClick: (editor, event) => {
              alert('来自微应用的导出功能');
            }
          }
        ]);
      }

      return () => {
        unsubscribeMount();
        unsubscribeUnmount();
        unsubscribeData();
        mapUnsubscribe();
        arrayUnsubscribe();
        if (blockCtx.envService) {
          blockCtx.envService.offDarkModeChange(darkModeListener);
          blockCtx.envService.offLanguageChange(languageListener);
          blockCtx.envService.offDocModeChange(docModeListener);
        }
      };
    }, []);

    const handleSetSharedData = () => {
      const blockCtx = api.blockContext;
      if (blockCtx && blockCtx.sharedData) {
        blockCtx.sharedData.set('microAppData', `来自微应用的数据: ${Date.now()}`);
      }
    };

    const handleShowModal = async () => {
      const blockCtx = api.blockContext;
      if (blockCtx && blockCtx.viewService) {
        const result = await blockCtx.viewService.openModal({
          title: '微应用1对话框',
          content: '这是一个来自微应用1的模态对话框',
          width: 300,
          height: 150
        });
        console.log('Modal result:', result);
      }
    };

    const handleOpenConfig = async () => {
      const blockCtx = api.blockContext;
      if (blockCtx && blockCtx.viewService) {
        const result = await blockCtx.viewService.openConfig({
          title: '微应用1配置',
          width: 400,
          height: 300
        });
        console.log('Config result:', result);
      }
    };

    const handleToggleFullscreen = async () => {
      const blockCtx = api.blockContext;
      if (blockCtx && blockCtx.viewService) {
        try {
          await blockCtx.viewService.requestFullscreen({ element: 'body' });
          setTimeout(() => {
            blockCtx.viewService.exitFullscreen();
          }, 3000);
        } catch (error) {
          console.error('Fullscreen error:', error);
        }
      }
    };

    return (
      <div style={{ padding: 20 }}>
        <h2>Micro App 页面</h2>
        <p>这是通过 qiankun 加载的微应用。</p>
        <p style={{ color: '#28a745', fontWeight: 'bold' }}>
          ✓ 微应用已通过 BlockContext 向主应用工具栏添加功能按钮
        </p>
        
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4>BlockContext 功能演示:</h4>
          <p>共享数据: {sharedValue || '暂无数据'}</p>
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleSetSharedData} style={{ padding: '5px 10px' }}>
              设置共享数据
            </button>
            <button onClick={handleShowModal} style={{ padding: '5px 10px' }}>
              显示对话框
            </button>
            <button onClick={handleOpenConfig} style={{ padding: '5px 10px' }}>
              打开配置
            </button>
            <button onClick={handleToggleFullscreen} style={{ padding: '5px 10px' }}>
              全屏演示
            </button>
          </div>
        </div>
        
        <div style={{ marginTop: '30px' }}>
          <AntdPyramid {...props} />
        </div>
      </div>
    );
  };

  rootInstance.render(<MicroAppComponent />);
}

// qiankun 生命周期函数
export async function bootstrap() {
  console.log('[MicroApp] bootstrap');
  return Promise.resolve();
}

export async function mount(props) {
  console.log('[MicroApp] mount', props);
  try {
    render(props);
  } catch (error) {
    console.error('[MicroApp] mount error:', error);
  }
}

export async function unmount() {
  console.log('[MicroApp] unmount');
  try {
    if (rootInstance) {
      rootInstance.unmount();
      rootInstance = null;
    }
  } catch (error) {
    console.error('[MicroApp] unmount error:', error);
  }
}

// 独立运行时的渲染
if (!window.__POWERED_BY_QIANKUN__) {
  console.log('[MicroApp] 独立运行模式');
  render();
}


