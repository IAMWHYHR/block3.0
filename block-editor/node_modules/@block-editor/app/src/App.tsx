import React, { useEffect, useState } from 'react';
import { ReactEditor } from '@block-editor/editor-base';
import { registerMicroApps, start } from 'qiankun';
import './App.css';

// 微应用配置
const microApps = [
  {
    name: 'demo-micro-app',
    entry: '//localhost:7200',
    container: '#micro-app-container',
    activeRule: '/demo',
  },
  {
    name: 'pyramid-app',
    entry: '//localhost:7200',
    container: '#micro-app-container',
    activeRule: '/pyramid',
  },
  {
    name: 'chart-app',
    entry: '//localhost:7200',
    container: '#micro-app-container',
    activeRule: '/chart',
  }
];

const App: React.FC = () => {
  const [microName] = useState('pyramid-app');
  const [wsUrl] = useState('ws://localhost:1234');

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Block Editor 演示应用</h1>
      </header>
      
      <main className="app-main">
        <div className="editor-container">
          <ReactEditor
            microName={microName}
            wsUrl={wsUrl}
            roomName="block-editor-room"
            userInfo={{
              name: 'Block Editor 用户',
              color: '#007bff'
            }}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
