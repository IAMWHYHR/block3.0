import React, { useState, useEffect } from 'react';
import { setMainAppAPI } from 'shared-sdk';

const ToolBar = () => {
  const [toolbarItems, setToolbarItems] = useState([]);

  // 全局 API 对象
  const globalAPI = {
    addToolBarItem: (item) => {
      if (item && typeof item === 'object' && item.label && item.onClick) {
        setToolbarItems(prev => [...prev, { ...item, id: Date.now() }]);
        return true;
      }
      return false;
    },
    removeToolBarItem: (id) => {
      setToolbarItems(prev => prev.filter(item => item.id !== id));
    },
    getToolBarItems: () => toolbarItems
  };

  // 将 API 注册到共享 SDK
  useEffect(() => {
    setMainAppAPI(globalAPI);
    return () => setMainAppAPI(null);
  }, [toolbarItems]);

  return (
    <div style={{ 
      padding: '10px', 
      borderBottom: '1px solid #ccc', 
      backgroundColor: '#f5f5f5',
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    }}>
      <span style={{ fontWeight: 'bold', marginRight: '20px' }}>工具栏:</span>
      {toolbarItems.map(item => (
        <button
          key={item.id}
          onClick={item.onClick}
          style={{
            padding: '5px 10px',
            backgroundColor: item.color || '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ToolBar;



