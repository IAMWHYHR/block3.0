import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { loadMicroApp, start } from 'qiankun';

const SkeletonNodeView = ({ node, updateAttributes, deleteNode, getPos, editor }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [microAppInstance, setMicroAppInstance] = useState(null);
  const containerRef = useRef(null);
  
  // 添加调试信息
  console.log('SkeletonNodeView props:', { node, updateAttributes, deleteNode, getPos, editor });
  
  const { microAppName, width, height } = node.attrs;

  // 微应用配置映射
  const microAppConfigs = {
    'micro-app': {
      name: 'micro-app',
      entry: 'http://localhost:7200',
    },
    'micro-app-2': {
      name: 'micro-app-2', 
      entry: 'http://localhost:7300',
    },
    'pyramid-app': {
      name: 'pyramid-app',
      entry: 'http://localhost:7200',
    }
  };

  useEffect(() => {
    if (microAppName && containerRef.current) {
      loadMicroAppInstance();
    }
  }, [microAppName, loadMicroAppInstance]);

  // 单独的清理 effect
  useEffect(() => {
    return () => {
      if (microAppInstance) {
        try {
          microAppInstance.unmount();
        } catch (error) {
          console.warn('卸载微应用时出错:', error);
        }
      }
    };
  }, [microAppInstance]);

  const loadMicroAppInstance = useCallback(async () => {
    if (!microAppName) {
      setError('未指定微应用名称');
      return;
    }

    const config = microAppConfigs[microAppName];
    if (!config) {
      setError(`未找到微应用配置: ${microAppName}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 卸载之前的实例
      if (microAppInstance) {
        try {
          await microAppInstance.unmount();
        } catch (error) {
          console.warn('卸载之前的微应用时出错:', error);
        }
      }

      // 简化微应用加载 - 使用 iframe 方式作为备选
      if (containerRef.current) {
        // 清空容器
        containerRef.current.innerHTML = '';
        
        // 创建 iframe 来加载微应用
        const iframe = document.createElement('iframe');
        iframe.src = config.entry;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '4px';
        
        containerRef.current.appendChild(iframe);
        
        // 设置加载状态
        setMicroAppInstance({ 
          unmount: () => {
            if (containerRef.current) {
              containerRef.current.innerHTML = '';
            }
          }
        });
        
        console.log('微应用 iframe 加载成功');
      }
      
    } catch (err) {
      console.error('加载微应用失败:', err);
      setError(`加载微应用失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [microAppName, microAppInstance]);

  const handleConfigChange = (newConfig) => {
    if (updateAttributes) {
      updateAttributes(newConfig);
    }
  };

  const handleDelete = async () => {
    if (microAppInstance) {
      try {
        await microAppInstance.unmount();
        console.log('微应用卸载成功');
      } catch (error) {
        console.warn('卸载微应用时出错:', error);
      }
    }
    if (deleteNode) {
      deleteNode();
    }
  };

  return (
    <NodeViewWrapper
      className="skeleton-node"
      style={{ 
        width, 
        height,
        position: 'relative'
      }}
    >
      {/* 配置面板 */}
      <div style={{
        position: 'absolute',
        top: '5px',
        right: '5px',
        zIndex: 1000,
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        <select
          value={microAppName}
          onChange={(e) => handleConfigChange({ microAppName: e.target.value })}
          style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">选择微应用...</option>
          <option value="micro-app">微应用1 (金字塔)</option>
          <option value="micro-app-2">微应用2 (功能演示)</option>
          <option value="pyramid-app">金字塔应用</option>
        </select>
        
        <input
          type="text"
          placeholder="宽度"
          value={width}
          onChange={(e) => handleConfigChange({ width: e.target.value })}
          style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', width: '80px' }}
        />
        
        <input
          type="text"
          placeholder="高度"
          value={height}
          onChange={(e) => handleConfigChange({ height: e.target.value })}
          style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', width: '80px' }}
        />
        
        <button
          onClick={loadMicroAppInstance}
          disabled={loading}
          style={{
            padding: '4px 8px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? '加载中...' : '重新加载'}
        </button>
        
        <button
          onClick={handleDelete}
          style={{
            padding: '4px 8px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          删除
        </button>
      </div>

      {/* 微应用容器 */}
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '200px',
          border: '1px solid #e9ecef',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        {!microAppName && (
          <div className="skeleton-placeholder">
            请选择要加载的微应用
          </div>
        )}
        
        {loading && (
          <div className="skeleton-loading">
            <div>🔄 正在加载微应用...</div>
          </div>
        )}
        
        {error && (
          <div className="skeleton-error">
            <div>❌ {error}</div>
            <button 
              onClick={loadMicroAppInstance}
              style={{
                marginTop: '10px',
                padding: '6px 12px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              重试
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default SkeletonNodeView;
