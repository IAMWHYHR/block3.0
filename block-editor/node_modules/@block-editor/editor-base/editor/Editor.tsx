import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { SkeletonNode } from '../sketetonNode/skeletonNode';
import { 
  EditorCollaborationManager, 
  EditorCollaborationConfig, 
  EditorUserInfo,
  EditorCollaborationStatus 
} from '../collaboration/editorCollaboration';

export interface EditorProps {
  microName: string;
  wsUrl: string;
  roomName?: string;
  enableCollaboration?: boolean;
  useHocuspocus?: boolean;
  userInfo?: Partial<EditorUserInfo>;
  onEditorReady?: (editor: any) => void;
  onCollaborationStatusChange?: (status: EditorCollaborationStatus) => void;
  onUsersChange?: (users: EditorUserInfo[]) => void;
}

export const Editor: React.FC<EditorProps> = ({ 
  microName, 
  wsUrl, 
  roomName = 'default-room',
  enableCollaboration = true,
  useHocuspocus = true,
  userInfo,
  onEditorReady,
  onCollaborationStatusChange,
  onUsersChange
}) => {
  const collaborationManagerRef = useRef<EditorCollaborationManager | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [collaborationStatus, setCollaborationStatus] = useState<EditorCollaborationStatus>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState<EditorUserInfo[]>([]);
  const [isCollaborationReady, setIsCollaborationReady] = useState(false);

  // 初始化协同管理器
  useEffect(() => {
    if (enableCollaboration && !collaborationManagerRef.current) {
      console.log('🔧 初始化协同管理器...');
      console.log('协同配置:', { wsUrl, roomName, microName, useHocuspocus, userInfo });
      
      const config: EditorCollaborationConfig = {
        wsUrl,
        roomName,
        microName,
        useHocuspocus
      };
      
      try {
        collaborationManagerRef.current = new EditorCollaborationManager(config);
        console.log('✅ 协同管理器实例创建成功');
        
        // 设置用户信息
        if (userInfo) {
          collaborationManagerRef.current.setUser(userInfo);
          console.log('✅ 用户信息已设置:', userInfo);
        }
        
        // 标记协同管理器已准备好
        setIsCollaborationReady(true);
        console.log('✅ 协同管理器已初始化完成，准备创建编辑器');
      } catch (error) {
        console.error('❌ 协同管理器初始化失败:', error);
      }
      
      // 监听协同状态变化
      if (collaborationManagerRef.current) {
        const unsubscribeStatus = collaborationManagerRef.current.onStatusChange((status) => {
          console.log('🔄 协同状态变化:', status);
          setCollaborationStatus(status);
          if (onCollaborationStatusChange) {
            onCollaborationStatusChange(status);
          }
        });
        
        // 监听用户变化
        const unsubscribeUsers = collaborationManagerRef.current.onUsersChange(() => {
          const users = collaborationManagerRef.current?.getOnlineUsers() || [];
          console.log('👥 在线用户变化:', users);
          setConnectedUsers(users);
          if (onUsersChange) {
            onUsersChange(users);
          }
        });
        
        return () => {
          console.log('🧹 清理协同管理器监听器');
          unsubscribeStatus();
          unsubscribeUsers();
        };
      }
    }
  }, [enableCollaboration, wsUrl, roomName, microName, useHocuspocus, userInfo, onCollaborationStatusChange, onUsersChange]);

  // 当协同状态变化时，重新创建编辑器
  useEffect(() => {
    if (enableCollaboration && isCollaborationReady) {
      console.log('🔄 协同管理器已准备好，编辑器将重新初始化');
    }
  }, [isCollaborationReady, enableCollaboration]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用历史记录，因为协同编辑有自己的历史管理
        history: enableCollaboration ? false : undefined,
      }),
      ...(enableCollaboration && isCollaborationReady && collaborationManagerRef.current ? [
        Collaboration.configure({
          document: collaborationManagerRef.current.getYDoc(),
        }),
        CollaborationCursor.configure({
          provider: collaborationManagerRef.current.getProvider(),
          user: {
            name: userInfo?.name || `${microName}用户${Math.floor(Math.random() * 1000)}`,
            color: userInfo?.color || `#${Math.floor(Math.random()*16777215).toString(16)}`,
          },
        })
      ] : []),
      SkeletonNode
    ],
    content: '<p>欢迎使用编辑器！</p>',
    onUpdate: ({ editor }) => {
      console.log('编辑器内容已更新');
    },
    onCreate: ({ editor }) => {
      console.log('🎉 TipTap 编辑器创建完成!');
      console.log('🔍 编辑器扩展:', editor.extensionManager.extensions);
      
      if (enableCollaboration) {
        console.log('🔧 协同编辑已启用');
        console.log('📊 协同状态:', collaborationStatus);
        console.log('👥 在线用户:', connectedUsers.length);
      }
      
      // 通知父组件编辑器已准备就绪
      if (onEditorReady) {
        onEditorReady({
          editor,
          ydoc: collaborationManagerRef.current?.getYDoc(),
          provider: collaborationManagerRef.current?.getProvider(),
          collaborationManager: collaborationManagerRef.current,
          insertSkeletonNode: () => {
            console.log('🎯 正在插入 SkeletonNode...', {
              microName,
              wsUrl,
              roomName
            });
            
            editor.chain().focus().insertContent({
              type: 'skeletonNode',
              attrs: {
                microName,
                wsUrl,
                width: '100%',
                height: '200px'
              }
            }).run();
            
            console.log('✅ SkeletonNode 插入完成');
          }
        });
      }
    }
  });

  // 清理函数
  useEffect(() => {
    return () => {
      console.log('🧹 清理编辑器资源');
      if (collaborationManagerRef.current) {
        collaborationManagerRef.current.destroy();
      }
    };
  }, []);

  if (!editor) {
    return <div>正在加载编辑器...</div>;
  }

  return (
    <div ref={rootRef} className="editor-container">
      {/* 协同状态栏 */}
      {enableCollaboration && (
        <div style={{
          background: '#f8f9fa',
          borderBottom: '1px solid #e9ecef',
          padding: '8px 15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: collaborationStatus === 'connected' ? '#28a745' : 
                              collaborationStatus === 'connecting' ? '#ffc107' : '#dc3545'
            }} />
            <span>
              协同状态: {
                collaborationStatus === 'connected' ? '已连接' :
                collaborationStatus === 'connecting' ? '连接中...' : '已断开'
              }
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>在线用户: {connectedUsers.length}</span>
            {connectedUsers.map(user => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  backgroundColor: user.color + '20',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: user.color
                  }}
                />
                {user.name}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <EditorContent editor={editor} />
    </div>
  );
};

export default Editor;
