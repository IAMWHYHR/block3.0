import React from 'react';
import Editor from './components/Editor';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>CloudDocs - 协同文档编辑器</h1>
      </header>
      <main className="app-main">
        <Editor />
      </main>
    </div>
  );
}

export default App;



