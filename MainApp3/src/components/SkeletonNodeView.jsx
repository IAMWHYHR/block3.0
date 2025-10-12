import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { loadMicroApp } from 'qiankun';
import { 
  pyramidProvider, 
  pyramidSharedData, 
  pyramidList,
  pyramidYdoc,
  setPyramidUser,
  onPyramidDataChange,
  onPyramidListChange,
  onPyramidUsersChange,
  updatePyramidData,
  getPyramidData,
  addPyramidToList,
  updatePyramidInList,
  removePyramidFromList,
  getPyramidOnlineUsers,
  cleanupPyramidCollaboration
} from '../pyramid-collaboration';

const SkeletonNodeView = ({ node, updateAttributes, deleteNode, getPos, editor }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [microAppInstance, setMicroAppInstance] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef(null);
  const isInitializedRef = useRef(false);
  
  // 金字塔协同状态
  const [pyramidCollaborationStatus, setPyramidCollaborationStatus] = useState('disconnected');
  const [pyramidOnlineUsers, setPyramidOnlineUsers] = useState([]);
  const [pyramidData, setPyramidData] = useState({});
  const [pyramidListData, setPyramidListData] = useState([]);
  
  // 添加调试信息
  console.log('SkeletonNodeView props:', { node, updateAttributes, deleteNode, getPos, editor });
  
  const { microAppName, width, height } = node.attrs;

  // 初始化金字塔协同
  useEffect(() => {
    if (microAppName === 'pyramid-app') {
      // 设置用户信息
      setPyramidUser({
        name: `金字塔用户${Math.floor(Math.random() * 1000)}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      });

      // 监听协同状态
      const handleConnect = () => {
        setPyramidCollaborationStatus('connected');
        console.log('✅ 金字塔协同已连接');
      };

      const handleDisconnect = () => {
        setPyramidCollaborationStatus('disconnected');
        console.log('❌ 金字塔协同已断开');
      };

      const handleStatus = ({ status }) => {
        setPyramidCollaborationStatus(status);
        console.log('金字塔协同状态:', status);
      };

      // 监听数据变化
      const handleDataChange = () => {
        const data = {};
        pyramidSharedData.forEach((value, key) => {
          data[key] = value;
        });
        setPyramidData(data);
        console.log('金字塔数据已更新:', data);
      };

      // 监听列表变化
      const handleListChange = () => {
        const list = pyramidList.toArray();
        setPyramidListData(list);
        console.log('金字塔列表已更新:', list);
      };

      // 监听用户变化
      const handleUsersChange = () => {
        const users = getPyramidOnlineUsers();
        setPyramidOnlineUsers(users);
        console.log('金字塔在线用户:', users);
      };

      // 绑定事件监听器
      pyramidProvider.on('connect', handleConnect);
      pyramidProvider.on('disconnect', handleDisconnect);
      pyramidProvider.on('status', handleStatus);
      
      const unsubscribeData = onPyramidDataChange(handleDataChange);
      const unsubscribeList = onPyramidListChange(handleListChange);
      const unsubscribeUsers = onPyramidUsersChange(handleUsersChange);

      // 初始化数据
      handleDataChange();
      handleListChange();
      handleUsersChange();

      return () => {
        pyramidProvider.off('connect', handleConnect);
        pyramidProvider.off('disconnect', handleDisconnect);
        pyramidProvider.off('status', handleStatus);
        unsubscribeData();
        unsubscribeList();
        unsubscribeUsers();
      };
    }
  }, [microAppName]);

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

  // 生成唯一的微应用名称
  const getUniqueAppName = (baseName) => {
    return `${baseName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const loadMicroAppInstance = useCallback(async () => {
    if (!microAppName) {
      setError('未指定微应用名称');
      return;
    }

    // 如果正在加载中，避免重复加载
    if (loading) {
      console.log('微应用正在加载中，跳过重复加载');
      return;
    }

    const config = microAppConfigs[microAppName];
    if (!config) {
      setError(`未找到微应用配置: ${microAppName}`);
      return;
    }

    // 确保容器元素存在
    if (!containerRef.current) {
      setError('容器元素未准备好');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 先清理之前的实例，但不等待卸载完成
      if (microAppInstance) {
        setMicroAppInstance(null);
        setIsMounted(false);
      }

      // 使用 qiankun 加载微应用，使用唯一名称避免冲突
      const uniqueName = getUniqueAppName(config.name);
      
      // 为金字塔微应用传递协同数据
      const props = { 
        container: containerRef.current,
        ...(microAppName === 'pyramid-app' ? {
          // 传递金字塔协同相关数据
          pyramidProvider,
          pyramidSharedData,
          pyramidList,
          pyramidData,
          pyramidListData,
          pyramidOnlineUsers,
          pyramidCollaborationStatus,
          // 传递协同方法
          updatePyramidData,
          getPyramidData,
          addPyramidToList,
          updatePyramidInList,
          removePyramidFromList,
          setPyramidUser,
          // 添加调试信息
          isCollaborationEnabled: !!(pyramidProvider && pyramidSharedData),
          debugInfo: {
            providerStatus: pyramidProvider ? 'connected' : 'disconnected',
            sharedDataKeys: pyramidSharedData ? Array.from(pyramidSharedData.keys()) : [],
            currentData: pyramidData,
            pyramidProviderExists: !!pyramidProvider,
            pyramidSharedDataExists: !!pyramidSharedData,
            pyramidYdocExists: !!pyramidYdoc,
            pyramidListExists: !!pyramidList
          }
        } : {})
      };

      console.log('🔍 金字塔微应用 props 详细调试:', {
        isCollaborationEnabled: !!(pyramidProvider && pyramidSharedData),
        pyramidProvider: !!pyramidProvider,
        pyramidSharedData: !!pyramidSharedData,
        pyramidProviderType: typeof pyramidProvider,
        pyramidSharedDataType: typeof pyramidSharedData,
        pyramidData,
        pyramidDataKeys: pyramidData ? Object.keys(pyramidData) : [],
        debugInfo: props.debugInfo,
        microAppName
      });

      const instance = await loadMicroApp({
        name: uniqueName,
        entry: config.entry,
        container: containerRef.current,
        props
      });

      setMicroAppInstance(instance);
      setIsMounted(true);
      console.log('微应用加载成功:', config.name);
      
    } catch (err) {
      console.error('加载微应用失败:', err);
      setError(`加载微应用失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [microAppName, loading, microAppInstance]);

  // 当微应用名称变化时，重置初始化状态
  useEffect(() => {
    isInitializedRef.current = false;
  }, [microAppName]);

  useEffect(() => {
    if (microAppName && containerRef.current && !loading && !microAppInstance && !isInitializedRef.current) {
      isInitializedRef.current = true;
      // 使用 setTimeout 确保 DOM 完全渲染
      const timer = setTimeout(() => {
        loadMicroAppInstance();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [microAppName, loadMicroAppInstance, loading, microAppInstance]);

  // 安全的卸载函数
  const safeUnmount = useCallback(async (instance) => {
    if (instance && typeof instance.unmount === 'function') {
      try {
        await instance.unmount();
        return true;
      } catch (error) {
        // 忽略 NOT_MOUNTED 错误，这是正常的
        if (error.message && error.message.includes('NOT_MOUNTED')) {
          console.log('微应用未挂载，跳过卸载');
          return true;
        }
        console.warn('卸载微应用时出错:', error);
        return false;
      }
    }
    return true;
  }, []);

  // 单独的清理 effect
  useEffect(() => {
    return () => {
      if (microAppInstance && isMounted) {
        safeUnmount(microAppInstance).then(() => {
          setIsMounted(false);
        });
      }
    };
  }, [microAppInstance, isMounted, safeUnmount]);

  const handleConfigChange = (newConfig) => {
    if (updateAttributes) {
      updateAttributes(newConfig);
    }
  };

  const handleDelete = async () => {
    if (microAppInstance && isMounted) {
      await safeUnmount(microAppInstance);
      setIsMounted(false);
      console.log('微应用卸载成功');
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
        {/* 金字塔协同状态显示 */}
        {microAppName === 'pyramid-app' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
            background: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: pyramidCollaborationStatus === 'connected' ? '#28a745' : 
                              pyramidCollaborationStatus === 'connecting' ? '#ffc107' : '#dc3545'
            }} />
            <span>金字塔协同: {pyramidCollaborationStatus === 'connected' ? '已连接' : 
                              pyramidCollaborationStatus === 'connecting' ? '连接中' : '已断开'}</span>
            {pyramidOnlineUsers.length > 0 && (
              <span>({pyramidOnlineUsers.length} 用户在线)</span>
            )}
          </div>
        )}
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
        
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '4px',
            minHeight: '200px'
          }}
        />
      </div>
    </NodeViewWrapper>
  );
};

export default SkeletonNodeView;
