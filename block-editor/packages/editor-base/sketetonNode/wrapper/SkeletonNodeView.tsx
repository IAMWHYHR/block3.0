import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { loadMicroApp } from 'qiankun';
import { CollaborationManager, CollaborationConfig, UserInfo, CollaborationStatus } from '../../collaboration/collaboration';

// 微应用配置映射
const microAppConfigs: Record<string, { entry: string; container: string }> = {
  'demo-micro-app': {
    entry: '//localhost:7200',
    container: '#micro-app-container'
  },
  'pyramid-app': {
    entry: '//localhost:7200',
    container: '#micro-app-container'
  },
  'chart-app': {
    entry: '//localhost:7200',
    container: '#micro-app-container'
  }
};

const SkeletonNodeView: React.FC<any> = ({ node, editor, updateAttributes, deleteNode }) => {
  console.log('🎯 SkeletonNodeView 被渲染了!', { node, editor, updateAttributes, deleteNode });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [microAppInstance, setMicroAppInstance] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const isInitializedRef = useRef(false);
  
  // 协同状态
  const [collaborationManager, setCollaborationManager] = useState<CollaborationManager | null>(null);
  const [collaborationStatus, setCollaborationStatus] = useState<CollaborationStatus>('disconnected');
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([]);
  const [collaborationData, setCollaborationData] = useState<any>({});
  const [collaborationListData, setCollaborationListData] = useState<any[]>([]);

  const { microName, wsUrl, width = '100%', height = '200px' } = node.attrs;
  
  console.log('📝 SkeletonNodeView 属性:', { microName, wsUrl, width, height });

  // 初始化协同
  useEffect(() => {
    if (microName && wsUrl) {
      const config: CollaborationConfig = {
        wsUrl,
        roomName: `room-${Date.now()}`,
        microName
      };
      
      const manager = new CollaborationManager(config);
      setCollaborationManager(manager);
      
      // 设置用户信息
      const userInfo: UserInfo = {
        id: Date.now().toString(),
        name: `用户-${Date.now()}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      };
      
      manager.setUser(userInfo);
      
      // 监听协同状态变化
      manager.onStatusChange((status) => {
        console.log('🔄 协同状态变化:', status);
        setCollaborationStatus(status);
      });
      
      // 监听在线用户变化
      manager.onUsersChange(() => {
        const users = manager.getOnlineUsers();
        console.log('👥 在线用户变化:', users);
        setOnlineUsers(users);
      });
      
      // 监听共享数据变化
      manager.onDataChange(() => {
        const data = manager.getAllData();
        console.log('📊 共享数据变化:', data);
        setCollaborationData(data);
      });
      
      // 监听列表数据变化
      manager.onListChange(() => {
        const listData = manager.getListData();
        console.log('📋 列表数据变化:', listData);
        setCollaborationListData(listData);
      });
      
      // 协同会自动启动，不需要手动调用start
      console.log('✅ 协同管理器初始化完成');
    }
  }, [microName, wsUrl]);

  // 加载微应用
  const loadMicroApplication = useCallback(async () => {
    if (!microName || !containerRef.current) {
      console.warn('⚠️ 缺少必要参数:', { microName, containerRef: containerRef.current });
      return;
    }

    const config = microAppConfigs[microName];
    if (!config) {
      console.error('❌ 未找到微应用配置:', microName);
      setError(`未找到微应用配置: ${microName}`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 开始加载微应用:', { microName, config });
      
      // 如果已有实例，先卸载
      if (microAppInstance) {
        console.log('🗑️ 卸载现有微应用实例');
        microAppInstance.unmount();
        setMicroAppInstance(null);
      }

      // 创建容器
      const container = document.createElement('div');
      container.id = 'micro-app-container';
      container.style.cssText = `
        width: 100%;
        height: 100%;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
      `;
      
      // 清空并添加容器
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(container);
      }

      // 构建props，仿照MainApp3的方式
      const props = {
        container: container,
        ...(microName === 'pyramid-app' ? {
          // 传递协同相关数据
          pyramidProvider: collaborationManager?.getProvider(),
          pyramidSharedData: collaborationManager?.getSharedData(),
          pyramidList: collaborationManager?.getSharedData().get('listData'),
          pyramidYdoc: collaborationManager?.getYDoc(),
          pyramidData: collaborationData,
          pyramidListData: collaborationListData,
          pyramidOnlineUsers: onlineUsers,
          pyramidCollaborationStatus: collaborationStatus,
          // 传递协同方法
          updatePyramidData: (key: string, value: any) => {
            collaborationManager?.updateData(key, value);
          },
          getPyramidData: (key: string) => {
            return collaborationManager?.getData(key);
          },
          addPyramidToList: (item: any) => {
            collaborationManager?.addListItem(item);
          },
          updatePyramidInList: (index: number, item: any) => {
            collaborationManager?.updateListItem(index, item);
          },
          removePyramidFromList: (index: number) => {
            collaborationManager?.removeListItem(index);
          },
          setPyramidUser: (userInfo: any) => {
            collaborationManager?.setUser(userInfo);
          },
          // 添加调试信息
          isCollaborationEnabled: !!(collaborationManager?.getProvider() && collaborationManager?.getSharedData()),
          debugInfo: {
            providerStatus: collaborationManager?.getStatus() || 'disconnected',
            sharedDataKeys: collaborationManager?.getSharedData() ? Array.from(collaborationManager.getSharedData().keys()) : [],
            currentData: collaborationData,
            pyramidProviderExists: !!collaborationManager?.getProvider(),
            pyramidSharedDataExists: !!collaborationManager?.getSharedData(),
            pyramidYdocExists: !!collaborationManager?.getYDoc(),
            pyramidListExists: !!collaborationManager?.getSharedData()?.get('listData')
          }
        } : {
          // 其他微应用的props
          collaborationManager,
          microName,
          wsUrl
        })
      };

      console.log('🔍 微应用 props 详细调试:', {
        microName,
        isCollaborationEnabled: !!(collaborationManager?.getProvider() && collaborationManager?.getSharedData()),
        collaborationManager: !!collaborationManager,
        provider: !!collaborationManager?.getProvider(),
        sharedData: !!collaborationManager?.getSharedData(),
        debugInfo: microName === 'pyramid-app' ? (props as any).debugInfo : undefined
      });

      // 加载微应用
      const instance = await loadMicroApp({
        name: microName,
        entry: config.entry,
        container: container,
        props
      });

      console.log('✅ 微应用加载成功:', instance);
      setMicroAppInstance(instance);
      setIsMounted(true);
      
    } catch (err) {
      console.error('❌ 微应用加载失败:', err);
      setError(`微应用加载失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [microName, containerRef, microAppInstance, collaborationManager, wsUrl]);

  // 卸载微应用
  const unloadMicroApplication = useCallback(() => {
    if (microAppInstance) {
      console.log('🗑️ 卸载微应用:', microName);
      try {
        microAppInstance.unmount();
        setMicroAppInstance(null);
        setIsMounted(false);
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      } catch (err) {
        console.error('❌ 微应用卸载失败:', err);
      }
    }
  }, [microAppInstance, microName]);

  // 删除节点
  const handleDeleteNode = useCallback(() => {
    console.log('🗑️ 删除 SkeletonNode');
    if (deleteNode) {
      deleteNode();
    }
  }, [deleteNode]);

  // 更新节点属性
  const handleUpdateAttributes = useCallback((newAttrs: any) => {
    console.log('🔄 更新节点属性:', newAttrs);
    if (updateAttributes) {
      updateAttributes(newAttrs);
    }
  }, [updateAttributes]);

  // 组件挂载时自动加载微应用
  useEffect(() => {
    if (!isInitializedRef.current && microName && wsUrl) {
      isInitializedRef.current = true;
      console.log('🚀 自动加载微应用');
      loadMicroApplication();
    }
  }, [microName, wsUrl, loadMicroApplication]);

  // 清理
  useEffect(() => {
    return () => {
      console.log('🧹 SkeletonNodeView 清理');
      if (microAppInstance) {
        try {
          microAppInstance.unmount();
        } catch (err) {
          console.error('❌ 清理时卸载微应用失败:', err);
        }
      }
      if (collaborationManager) {
        try {
          collaborationManager.destroy();
        } catch (err) {
          console.error('❌ 清理时销毁协同管理器失败:', err);
        }
      }
    };
  }, [microAppInstance, collaborationManager]);

  // 监听属性变化
  useEffect(() => {
    console.log('🔄 SkeletonNodeView 属性变化:', { microName, wsUrl, width, height });
  }, [microName, wsUrl, width, height]);

  return (
    <NodeViewWrapper
      as="div"
      className="skeleton-node-wrapper"
      style={{
        border: '2px solid #007bff',
        borderRadius: '8px',
        padding: '20px',
        margin: '16px 0',
        background: '#f8f9fa',
        minHeight: '200px',
        width: width,
        height: height
      }}
    >
      {/* 头部信息 */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#007bff' }}>
          🎉 SkeletonNode React 组件渲染成功!
        </h3>
        <p style={{ margin: '4px 0', fontSize: '14px' }}>
          <strong>微应用名称:</strong> {microName || '未设置'}
        </p>
        <p style={{ margin: '4px 0', fontSize: '14px' }}>
          <strong>WebSocket地址:</strong> {wsUrl || '未设置'}
        </p>
        <p style={{ margin: '4px 0', fontSize: '14px' }}>
          <strong>尺寸:</strong> {width} × {height}
        </p>
      </div>

      {/* 协同状态显示 */}
      {collaborationManager && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          background: '#e9ecef', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>协同状态:</strong> 
            <span style={{ 
              color: collaborationStatus === 'connected' ? '#28a745' : '#dc3545',
              marginLeft: '8px'
            }}>
              {collaborationStatus === 'connected' ? '🟢 已连接' : '🔴 未连接'}
            </span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>在线用户:</strong> {onlineUsers.length} 人
          </div>
          <div>
            <strong>共享数据:</strong> {Object.keys(collaborationData).length} 项
          </div>
        </div>
      )}

      {/* 控制按钮 */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={loadMicroApplication}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            background: isLoading ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {isLoading ? '加载中...' : '加载微应用'}
        </button>
        
        {isMounted && (
          <button
            onClick={unloadMicroApplication}
            style={{
              padding: '8px 16px',
              background: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            卸载微应用
          </button>
        )}
        
        <button
          onClick={handleDeleteNode}
          style={{
            padding: '8px 16px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          删除节点
        </button>
      </div>

      {/* 错误显示 */}
      {error && (
        <div style={{
          padding: '12px',
          background: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          <strong>错误:</strong> {error}
        </div>
      )}

      {/* 微应用容器 */}
      <div
        ref={containerRef}
        className="skeleton-node-content"
        style={{
          width: '100%',
          height: '200px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          position: 'relative'
        }}
      >
        {isLoading ? (
          <div>🔄 正在加载微应用...</div>
        ) : isMounted ? (
          <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '12px', color: '#28a745' }}>
            ✅ 微应用已加载
          </div>
        ) : (
          <div>📱 微应用容器 (微应用: {microName || '未设置'})</div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default SkeletonNodeView;