import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { SkeletonNode } from '../sketetonNode/skeletonNode';
import { 
  EditorCollaborationConfig, 
  EditorUserInfo,
  EditorCollaborationStatus 
} from '../collaboration/editorCollaboration';
import { globalCollaborationManager } from '../collaboration/globalCollaborationManager';
import { editorStyles, mergeStyles } from './EditorStyles';

export interface EditorProps {
  microName: string;
  wsUrl: string;
  roomName?: string;
  enableCollaboration?: boolean;
  useHocuspocus?: boolean;
  userInfo?: Partial<EditorUserInfo>;
  placeholder?: string;
  onUpdate?: (html: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ 
  microName, 
  wsUrl, 
  roomName = 'default-room',
  enableCollaboration = true,
  useHocuspocus = true,
  userInfo,
  placeholder = '开始编写...',
  onUpdate
}) => {
  const [collaborationStatus, setCollaborationStatus] = useState<EditorCollaborationStatus>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState<EditorUserInfo[]>([]);
  const [isCollaborationReady, setIsCollaborationReady] = useState(false);
  const connectionRef = useRef<any>(null);

  // 初始化协同连接
  useEffect(() => {
    if (enableCollaboration) {
      console.log('🔧 初始化全局协同连接...');
      
      const config: EditorCollaborationConfig = {
        wsUrl,
        roomName,
        microName,
        useHocuspocus
      };
      
      try {
        // 获取或创建全局连接
        const connection = globalCollaborationManager.getConnection(config);
        connectionRef.current = connection;
        
        // 设置用户信息
        if (userInfo) {
          globalCollaborationManager.setUser(config, userInfo);
        }
        
        // 延迟设置ready状态，确保连接建立
        setTimeout(() => {
          setIsCollaborationReady(true);
          console.log('✅ 全局协同连接已准备就绪');
        }, 1000);
        
        // 监听协同状态变化
        const unsubscribeStatus = globalCollaborationManager.onStatusChange(config, (status) => {
          setCollaborationStatus(status);
        });
        
        // 监听用户变化
        const unsubscribeUsers = globalCollaborationManager.onUsersChange(config, () => {
          const users = globalCollaborationManager.getOnlineUsers(config);
          setConnectedUsers(users);
        });
        
        return () => {
          console.log('🧹 编辑器组件卸载，释放协同连接引用');
          unsubscribeStatus();
          unsubscribeUsers();
          // 释放连接引用，但不销毁连接
          globalCollaborationManager.releaseConnection(config);
        };
        
      } catch (error) {
        console.error('❌ 全局协同连接初始化失败:', error);
      }
    }
  }, [enableCollaboration, wsUrl, roomName, microName, useHocuspocus, userInfo]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用历史记录，因为协同编辑有自己的历史管理
        history: enableCollaboration ? false : undefined,
      }),
      ...(enableCollaboration && isCollaborationReady && connectionRef.current ? [
        Collaboration.configure({
          document: connectionRef.current.ydoc,
        })
      ] : []),
      SkeletonNode
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML());
      }
    },
    onCreate: ({ editor }) => {
      console.log('🎉 TipTap 编辑器创建完成!');
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
        placeholder,
        style: 'min-height: 1200px; margin: 0 8px; outline: none; border: none;',
      },
    },
  }, [enableCollaboration, isCollaborationReady, connectionRef.current, userInfo, microName, placeholder, onUpdate]);

  // 插入微应用的函数
  const insertMicroApp = (microAppName: string) => {
    if (!editor) return;
    
    editor.chain().focus().insertContent({
      type: 'skeletonNode',
      attrs: {
        microName: microAppName,
        wsUrl,
        roomName,
        width: '100%',
        height: '800px'
      }
    }).run();
  };

  // 注意：协同连接的清理现在由全局管理器处理
  // 组件卸载时只会释放引用，不会销毁连接

  if (!editor) {
    return <div>加载中...</div>;
  }

  return (
    <div style={editorStyles.editorContainer}>
      {/* 协同状态显示 */}
      {enableCollaboration && (
        <div style={mergeStyles(
          editorStyles.collaborationStatus,
          collaborationStatus === 'connected' 
            ? editorStyles.collaborationStatusConnected 
            : editorStyles.collaborationStatusDisconnected
        )}>
          <div style={editorStyles.collaborationStatusInfo}>
            <div style={mergeStyles(
              editorStyles.collaborationStatusIndicator,
              collaborationStatus === 'connected' 
                ? editorStyles.collaborationStatusIndicatorConnected 
                : editorStyles.collaborationStatusIndicatorDisconnected
            )} />
            <span>
              协同状态: {collaborationStatus === 'connected' ? '已连接' : '未连接'}
              {connectedUsers.length > 0 && ` (${connectedUsers.length} 用户在线)`}
            </span>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div style={editorStyles.editorToolbar}>
        {/* 金字塔插入按钮 */}
        <button
          onClick={() => insertMicroApp('pyramid-app')}
          style={mergeStyles(editorStyles.microAppBtn, editorStyles.microAppBtnPyramid)}
        >
          📊 插入金字塔
        </button>
      </div>

      {/* 编辑器内容 */}
      <div style={editorStyles.editorContent}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default Editor;