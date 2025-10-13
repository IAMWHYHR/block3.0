import React, { useEffect, useState } from 'react';
import { ReactEditor } from '@block-editor/editor-base';
import { registerMicroApps, start } from 'qiankun';
import './App.css';

// 微应用配置
const microApps = [
  {
    name: 'demo-micro-app',
    entry: '//localhost:3001',
    container: '#micro-app-container',
    activeRule: '/demo',
  },
  {
    name: 'pyramid-app',
    entry: '//localhost:3002',
    container: '#micro-app-container',
    activeRule: '/pyramid',
  },
  {
    name: 'chart-app',
    entry: '//localhost:3003',
    container: '#micro-app-container',
    activeRule: '/chart',
  }
];

const App: React.FC = () => {
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [microName, setMicroName] = useState('pyramid-app');
  const [wsUrl, setWsUrl] = useState('ws://localhost:1234');
  const [availableMicroApps] = useState(microApps.map(app => app.name));

  useEffect(() => {
    // 注册微应用
    registerMicroApps(microApps);
    
    // 启动qiankun
    start({
      sandbox: {
        strictStyleIsolation: true,
        experimentalStyleIsolation: true,
      }
    });
  }, []);

  const handleEditorReady = (editor: any) => {
    console.log('🎉 编辑器准备就绪:', editor);
    setEditorInstance(editor);
    
    // 自动插入一个SkeletonNode
    setTimeout(() => {
      editor.insertSkeletonNode();
    }, 1000);
  };

  const handleInsertSkeletonNode = () => {
    if (editorInstance) {
      editorInstance.insertSkeletonNode();
    }
  };

  const handleMicroNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMicroName(e.target.value);
  };

  const handleWsUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWsUrl(e.target.value);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Block Editor 演示应用</h1>
        <div className="controls">
          <div className="control-group">
            <label htmlFor="microName">微应用名称:</label>
            <select
              id="microName"
              value={microName}
              onChange={handleMicroNameChange}
            >
              {availableMicroApps.map(appName => (
                <option key={appName} value={appName}>
                  {appName}
                </option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="wsUrl">WebSocket地址:</label>
            <input
              id="wsUrl"
              type="text"
              value={wsUrl}
              onChange={handleWsUrlChange}
              placeholder="输入WebSocket地址"
            />
          </div>
          <button onClick={handleInsertSkeletonNode} className="insert-btn">
            插入微应用节点
          </button>
        </div>
      </header>
      
      <main className="app-main">
        <div className="editor-container">
          <ReactEditor
            microName={microName}
            wsUrl={wsUrl}
            onEditorReady={handleEditorReady}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
