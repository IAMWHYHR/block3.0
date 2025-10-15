import React from 'react';
import { createRoot } from 'react-dom/client';
import { start } from 'qiankun';
import Editor from './components/Editor';
import ErrorBoundary from './components/ErrorBoundary';
import { createDefaultBlockContext } from './services/BlockContext.js';
import { 
  ToolbarUI, 
  ViewServiceUI, 
  EnvServiceUI, 
  SharedDataUI, 
  LifeCycleUI 
} from './components/BlockContextUI.jsx';
import BlockContextDemo from './demos/BlockContextDemo.jsx';
import BlockContextIntegrationTest from './components/BlockContextIntegrationTest.jsx';

// 启动 qiankun
start({
  sandbox: {
    experimentalStyleIsolation: true
  },
  singular: false
});

// 主应用组件
const MainApp3 = () => {
  const [blockContext] = React.useState(() => {
    try {
      return createDefaultBlockContext();
    } catch (error) {
      console.error('创建BlockContext失败:', error);
      return null;
    }
  });
  const [showBlockContextUI, setShowBlockContextUI] = React.useState(false);
  const [showDemo, setShowDemo] = React.useState(false);
  const [showIntegrationTest, setShowIntegrationTest] = React.useState(false);

  const handleContentUpdate = (content) => {
    console.log('编辑器内容更新:', content);
  };

  // 将BlockContext暴露到全局，供微应用使用
  React.useEffect(() => {
    if (blockContext) {
      window.blockContext = blockContext;
      console.log('BlockContext已暴露到全局:', blockContext);
    }
  }, [blockContext]);

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        MainApp3 - Tiptap 编辑器集成微应用 (含BlockContext)
      </h1>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '8px',
        border: '1px solid #bbdefb'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>使用说明</h3>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#424242' }}>
          <li>使用工具栏按钮格式化文本</li>
          <li>点击微应用按钮插入可交互的微应用组件</li>
          <li>每个微应用组件都可以独立配置和重新加载</li>
          <li>支持拖拽调整微应用组件大小</li>
          <li>集成了完整的BlockContext功能，包括工具栏、视图服务、环境服务等</li>
        </ul>
        
        <div style={{ marginTop: '15px' }}>
          <button 
            onClick={() => setShowBlockContextUI(!showBlockContextUI)}
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              backgroundColor: showBlockContextUI ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showBlockContextUI ? '隐藏' : '显示'} BlockContext 调试面板
          </button>
          
          <button 
            onClick={() => setShowDemo(!showDemo)}
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              backgroundColor: showDemo ? '#dc3545' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showDemo ? '隐藏' : '显示'} BlockContext 功能演示
          </button>
          
          <button 
            onClick={() => setShowIntegrationTest(!showIntegrationTest)}
            style={{
              padding: '8px 16px',
              backgroundColor: showIntegrationTest ? '#dc3545' : '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showIntegrationTest ? '隐藏' : '显示'} BlockContext 集成测试
          </button>
        </div>
      </div>

      {/* BlockContext 调试面板 */}
      {showBlockContextUI && blockContext && (
        <div style={{ 
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>BlockContext 调试面板</h3>
          
          <ToolbarUI toolbarService={blockContext.toolBar} />
          <ViewServiceUI viewService={blockContext.viewService} />
          <EnvServiceUI envService={blockContext.envService} />
          <SharedDataUI sharedData={blockContext.sharedData} />
          <LifeCycleUI lifeCycleService={blockContext.lifeCycleService} />
        </div>
      )}

      {/* BlockContext 功能演示 */}
      {showDemo && blockContext && (
        <BlockContextDemo />
      )}

      {/* BlockContext 集成测试 */}
      {showIntegrationTest && blockContext && (
        <BlockContextIntegrationTest />
      )}
      
      {/* 错误提示 */}
      {!blockContext && (
        <div style={{ 
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f8d7da',
          borderRadius: '8px',
          border: '1px solid #f5c6cb',
          color: '#721c24'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>⚠️ BlockContext 初始化失败</h3>
          <p style={{ margin: 0 }}>无法创建BlockContext实例，请检查控制台错误信息。</p>
        </div>
      )}

      <ErrorBoundary>
        <Editor onUpdate={handleContentUpdate} />
      </ErrorBoundary>
    </div>
  );
};

// 渲染主应用
const container = document.getElementById('root');
if (!container) {
  console.error('找不到 #root 元素');
} else {
  console.log('开始渲染 MainApp3...');
  const root = createRoot(container);
  root.render(<MainApp3 />);
  console.log('MainApp3 渲染完成');
}

// 暴露 createEditor 方法供外部调用
window.createEditor = (dom, microAppName) => {
  if (!dom) {
    console.error('createEditor: dom 参数不能为空');
    return null;
  }

  // 创建编辑器实例
  const editorContainer = document.createElement('div');
  editorContainer.style.width = '100%';
  editorContainer.style.height = '100%';
  dom.appendChild(editorContainer);

  // 创建 React 根节点
  const editorRoot = createRoot(editorContainer);
  
  // 渲染编辑器
  editorRoot.render(
    <Editor 
      onUpdate={(content) => {
        console.log('编辑器内容更新:', content);
      }}
      placeholder="开始编写..."
    />
  );

  // 如果指定了微应用名称，自动插入对应的骨架节点
  if (microAppName) {
    // 这里需要访问编辑器实例来插入骨架节点
    // 由于 Tiptap 的架构，我们需要通过事件或其他方式来触发
    setTimeout(() => {
      const event = new CustomEvent('insertSkeleton', { 
        detail: { microAppName } 
      });
      window.dispatchEvent(event);
    }, 100);
  }

  return {
    destroy: () => {
      editorRoot.unmount();
      dom.removeChild(editorContainer);
    },
    getContent: () => {
      // 这里需要访问编辑器实例来获取内容
      // 实际实现中需要维护编辑器实例的引用
      return '';
    },
    setContent: (content) => {
      // 设置编辑器内容
      const event = new CustomEvent('setContent', { 
        detail: { content } 
      });
      window.dispatchEvent(event);
    }
  };
};

console.log('MainApp3 已加载，可通过 window.createEditor(dom, microAppName) 创建编辑器');
