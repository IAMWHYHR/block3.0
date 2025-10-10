import './public-path';
import React from 'react';
import { createRoot } from 'react-dom/client';
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
  
  const App2 = () => {
    const [currentView, setCurrentView] = React.useState('');
    
    React.useEffect(() => {
      const timer = setTimeout(() => {
        api.addToolBarItem({
          label: '微应用2',
          color: '#ff9800',
          onClick: () => alert('来自微应用2的按钮')
        });
      }, 100);
      return () => clearTimeout(timer);
    }, []);

    // 使用 BlockContext 功能
    React.useEffect(() => {
      const blockCtx = api.blockContext;
      if (blockCtx) {
        // 监听视图变化
        const unsubscribeView = blockCtx.viewService.getCurrentView();
        setCurrentView(unsubscribeView);
        
        // 生命周期管理
        blockCtx.lifeCycleService.onMount(() => {
          console.log('[MicroApp2] 生命周期: 挂载');
        });
        
        blockCtx.lifeCycleService.onUnmount(() => {
          console.log('[MicroApp2] 生命周期: 卸载');
        });

        // Block 加载完成通知
        setTimeout(() => {
          blockCtx.lifeCycleService.notifyBlockReady();
        }, 1500); // 模拟 1.5 秒后 Block 加载完成

        // 共享数据操作
        blockCtx.sharedData.set('microApp2Data', '来自微应用2的初始数据');

        // 协同Map和数组示例
        const sharedMap = blockCtx.sharedData.getMap('userSettings');
        const sharedArray = blockCtx.sharedData.getArray('taskList');

        // 监听Map变更
        const mapUnsubscribe = sharedMap.subscribe((action, key, value) => {
          console.log('[MicroApp2] Map变更:', action, key, value);
        });

        // 监听数组变更
        const arrayUnsubscribe = sharedArray.subscribe((action, index, value) => {
          console.log('[MicroApp2] Array变更:', action, index, value);
        });

        // 操作协同数据
        sharedMap.set('userId', 'user123');
        sharedMap.set('role', 'admin');
        sharedArray.push('微应用2任务1', '微应用2任务2');

        // 环境服务监听
        const darkModeListener = (mode) => {
          console.log('[MicroApp2] 深色模式变更:', mode);
        };
        const languageListener = (lang) => {
          console.log('[MicroApp2] 语言变更:', lang);
        };
        const docModeListener = (mode) => {
          console.log('[MicroApp2] 文档模式变更:', mode);
        };

        blockCtx.envService.onDarkModeChange(darkModeListener);
        blockCtx.envService.onLanguageChange(languageListener);
        blockCtx.envService.onDocModeChange(docModeListener);

        // 工具栏定制示例
        const createIcon2 = () => {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '16');
          svg.setAttribute('height', '16');
          svg.setAttribute('viewBox', '0 0 16 16');
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', '8');
          circle.setAttribute('cy', '8');
          circle.setAttribute('r', '6');
          circle.setAttribute('fill', 'currentColor');
          svg.appendChild(circle);
          return svg;
        };

        // 在指定位置插入工具栏菜单项
        blockCtx.toolBar.insertBefore([
          {
            type: 'item',
            code: 'microApp2-edit',
            tooltip: '编辑模式',
            icon: createIcon2,
            showBackground: (editor) => false,
            disabled: (editor) => false,
            onClick: (editor, event) => {
              alert('来自微应用2的编辑功能');
            }
          }
        ], null); // 在最前面插入

        // 修改现有菜单项
        setTimeout(() => {
          blockCtx.toolBar.modifyItem('microApp2-edit', {
            tooltip: '修改后的编辑模式',
            data: { mode: 'advanced' }
          });
        }, 2000);
        
        return () => {
          // 清理工作
          mapUnsubscribe();
          arrayUnsubscribe();
          blockCtx.envService.offDarkModeChange(darkModeListener);
          blockCtx.envService.offLanguageChange(languageListener);
          blockCtx.envService.offDocModeChange(docModeListener);
        };
      }
    }, []);

    const handleViewOperation = (operation) => {
      const blockCtx = api.blockContext;
      if (blockCtx) {
        switch (operation) {
          case 'open':
            blockCtx.viewService.openView('microApp2View', { title: '微应用2视图' });
            break;
          case 'switch':
            blockCtx.viewService.switchView('microApp2View');
            break;
          case 'close':
            blockCtx.viewService.closeView('microApp2View');
            break;
        }
        setCurrentView(blockCtx.viewService.getCurrentView());
      }
    };

    const handleShowToast = () => {
      const blockCtx = api.blockContext;
      if (blockCtx) {
        blockCtx.viewService.showToast('来自微应用2的提示消息');
      }
    };

    const handleShowModal = async () => {
      const blockCtx = api.blockContext;
      if (blockCtx) {
        const result = await blockCtx.viewService.openModal({
          title: '微应用2对话框',
          content: '这是微应用2的模态对话框，支持自定义配置',
          width: 350,
          height: 200,
          closable: true,
          maskClosable: true
        });
        console.log('MicroApp2 Modal result:', result);
      }
    };

    return (
      <div style={{ padding: 20 }}>
        <h2>Micro App 2 页面</h2>
        <p>这是第二个通过 qiankun 加载的微应用。</p>
        <p style={{ color: '#ff9800', fontWeight: 'bold' }}>
          ✓ 微应用2已通过 BlockContext 向主应用工具栏添加功能按钮
        </p>
        
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3e0', borderRadius: '4px' }}>
          <h4>BlockContext 功能演示:</h4>
          <p>当前视图: {currentView || '无'}</p>
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => handleViewOperation('open')} style={{ padding: '5px 10px' }}>
              打开视图
            </button>
            <button onClick={() => handleViewOperation('switch')} style={{ padding: '5px 10px' }}>
              切换视图
            </button>
            <button onClick={() => handleViewOperation('close')} style={{ padding: '5px 10px' }}>
              关闭视图
            </button>
            <button onClick={handleShowToast} style={{ padding: '5px 10px' }}>
              显示Toast
            </button>
            <button onClick={handleShowModal} style={{ padding: '5px 10px' }}>
              显示对话框
            </button>
          </div>
        </div>
      </div>
    );
  };

  rootInstance.render(<App2 />);
}

export async function bootstrap() { return Promise.resolve(); }
export async function mount(props) { render(props); }
export async function unmount() { if (rootInstance) { rootInstance.unmount(); rootInstance = null; } }

if (!window.__POWERED_BY_QIANKUN__) { render(); }


