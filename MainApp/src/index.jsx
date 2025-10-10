import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerMicroApps, start } from 'qiankun';
import ToolBar from './components/ToolBar';

const Root = () => {
  return (
    <div>
      <ToolBar />
      <div style={{ padding: 20 }}>
        <h1>Main App (Qiankun)</h1>
        <nav style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <a href="#/micro1">加载 MicroApp1</a>
          <a href="#/micro2">加载 MicroApp2</a>
          <a href="#/both">同时加载两个</a>
        </nav>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div id="subapp-viewport-1" style={{ minHeight: 200, border: '1px dashed #ccc', padding: 8 }}></div>
          <div id="subapp-viewport-2" style={{ minHeight: 200, border: '1px dashed #ccc', padding: 8 }}></div>
        </div>
      </div>
    </div>
  );
};

// 注册微应用
registerMicroApps([
  {
    name: 'micro-app',
    entry: 'http://localhost:7200',
    container: '#subapp-viewport-1',
    activeRule: (location) => location.hash.startsWith('#/micro1') || location.hash.startsWith('#/both')
  },
  {
    name: 'micro-app-2',
    entry: 'http://localhost:7300',
    container: '#subapp-viewport-2',
    activeRule: (location) => location.hash.startsWith('#/micro2') || location.hash.startsWith('#/both')
  }
]);

start({ sandbox: { experimentalStyleIsolation: true }, singular: false });

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Root />);









