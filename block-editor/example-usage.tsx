import React, { useState, useCallback } from 'react';
import { 
  ReactEditor, 
  EditorProps,
  EditorCollaborationManager,
  EditorUserInfo,
  EditorCollaborationStatus 
} from '@block-editor/editor-base';

// 使用协同编辑器的示例组件
const CollaborationEditorExample: React.FC = () => {
  const [collaborationStatus, setCollaborationStatus] = useState<EditorCollaborationStatus>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState<EditorUserInfo[]>([]);
  const [editorReady, setEditorReady] = useState(false);

  // 协同状态变化回调
  const handleCollaborationStatusChange = useCallback((status: EditorCollaborationStatus) => {
    setCollaborationStatus(status);
    console.log('协同状态变化:', status);
  }, []);

  // 用户变化回调
  const handleUsersChange = useCallback((users: EditorUserInfo[]) => {
    setConnectedUsers(users);
    console.log('在线用户变化:', users);
  }, []);

  // 编辑器准备就绪回调
  const handleEditorReady = useCallback((editorInfo: any) => {
    setEditorReady(true);
    console.log('编辑器已准备就绪:', editorInfo);
  }, []);

  // 用户信息
  const userInfo: Partial<EditorUserInfo> = {
    name: '测试用户',
    color: '#007bff'
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>协同编辑器示例</h2>
      
      {/* 状态信息 */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '4px', 
        marginBottom: '20px' 
      }}>
        <h4>协同状态</h4>
        <p>状态: {collaborationStatus}</p>
        <p>在线用户: {connectedUsers.length}</p>
        <p>编辑器状态: {editorReady ? '已准备' : '未准备'}</p>
      </div>

      {/* 协同编辑器 - 使用 Hocuspocus */}
      <div style={{ marginBottom: '30px' }}>
        <h3>协同编辑器 (Hocuspocus)</h3>
        <ReactEditor
          microName="test-app"
          wsUrl="ws://localhost:1234"
          roomName="test-room"
          enableCollaboration={true}
          useHocuspocus={true}
          userInfo={userInfo}
          onEditorReady={handleEditorReady}
          onCollaborationStatusChange={handleCollaborationStatusChange}
          onUsersChange={handleUsersChange}
        />
      </div>

      {/* 协同编辑器 - 使用 WebSocket */}
      <div style={{ marginBottom: '30px' }}>
        <h3>协同编辑器 (WebSocket)</h3>
        <ReactEditor
          microName="test-app"
          wsUrl="ws://localhost:1234"
          roomName="test-room-2"
          enableCollaboration={true}
          useHocuspocus={false}
          userInfo={userInfo}
          onEditorReady={handleEditorReady}
          onCollaborationStatusChange={handleCollaborationStatusChange}
          onUsersChange={handleUsersChange}
        />
      </div>

      {/* 非协同编辑器 */}
      <div style={{ marginBottom: '30px' }}>
        <h3>非协同编辑器</h3>
        <ReactEditor
          microName="test-app"
          wsUrl="ws://localhost:1234"
          enableCollaboration={false}
          onEditorReady={handleEditorReady}
        />
      </div>
    </div>
  );
};

// 直接使用协同管理器的示例
const DirectCollaborationExample: React.FC = () => {
  const [collaborationManager, setCollaborationManager] = useState<EditorCollaborationManager | null>(null);
  const [status, setStatus] = useState<EditorCollaborationStatus>('disconnected');
  const [users, setUsers] = useState<EditorUserInfo[]>([]);

  // 初始化协同管理器
  const initCollaboration = useCallback(() => {
    const manager = new EditorCollaborationManager({
      wsUrl: 'ws://localhost:1234',
      roomName: 'direct-test',
      microName: 'direct-app',
      useHocuspocus: true
    });

    // 设置用户信息
    manager.setUser({
      name: '直接用户',
      color: '#28a745'
    });

    // 监听状态变化
    manager.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // 监听用户变化
    manager.onUsersChange(() => {
      setUsers(manager.getOnlineUsers());
    });

    setCollaborationManager(manager);
  }, []);

  // 清理协同管理器
  const cleanupCollaboration = useCallback(() => {
    if (collaborationManager) {
      collaborationManager.destroy();
      setCollaborationManager(null);
    }
  }, [collaborationManager]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>直接协同管理器示例</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={initCollaboration} disabled={!!collaborationManager}>
          初始化协同
        </button>
        <button onClick={cleanupCollaboration} disabled={!collaborationManager}>
          清理协同
        </button>
      </div>

      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '4px' 
      }}>
        <h4>协同状态</h4>
        <p>状态: {status}</p>
        <p>在线用户: {users.length}</p>
        <p>协同管理器: {collaborationManager ? '已创建' : '未创建'}</p>
        
        {users.length > 0 && (
          <div>
            <h5>在线用户列表:</h5>
            <ul>
              {users.map(user => (
                <li key={user.id} style={{ color: user.color }}>
                  {user.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export { CollaborationEditorExample, DirectCollaborationExample };
