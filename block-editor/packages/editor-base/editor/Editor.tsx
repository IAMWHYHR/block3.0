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
  placeholder?: string;
  onEditorReady?: (editor: any) => void;
  onCollaborationStatusChange?: (status: EditorCollaborationStatus) => void;
  onUsersChange?: (users: EditorUserInfo[]) => void;
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
  onEditorReady,
  onCollaborationStatusChange,
  onUsersChange,
  onUpdate
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
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      Strike,
      Code,
      CodeBlock,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
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
    content: '',
    onUpdate: ({ editor }) => {
      console.log('编辑器内容已更新');
      if (onUpdate) {
        onUpdate(editor.getHTML());
      }
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
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  // 工具栏回调函数
  const addSkeleton = useCallback((skeletonMicroName = 'micro-app') => {
    if (editor) {
      editor.chain().focus().insertContent({
        type: 'skeletonNode',
        attrs: {
          microName: skeletonMicroName,
          wsUrl,
          width: '100%',
          height: '300px'
        }
      }).run();
    }
  }, [editor, wsUrl]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }   

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

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
      
      <div className="editor-toolbar">
        {/* 文本格式 */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
        >
          粗体
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
        >
          斜体
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
        >
          下划线
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
        >
          删除线
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
        >
          代码
        </button>

        {/* 分隔线 */}
        <div style={{ width: '1px', height: '20px', background: '#dee2e6', margin: '0 4px' }} />

        {/* 标题 */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
        >
          H3
        </button>

        {/* 分隔线 */}
        <div style={{ width: '1px', height: '20px', background: '#dee2e6', margin: '0 4px' }} />

        {/* 列表 */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
        >
          无序列表
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
        >
          有序列表
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
        >
          引用
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
        >
          代码块
        </button>

        {/* 分隔线 */}
        <div style={{ width: '1px', height: '20px', background: '#dee2e6', margin: '0 4px' }} />

        {/* 链接 */}
        <button
          onClick={setLink}
          className={`toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}
        >
          链接
        </button>

        {/* 分隔线 */}
        <div style={{ width: '1px', height: '20px', background: '#dee2e6', margin: '0 4px' }} />

        {/* 微应用骨架 */}
        <button
          onClick={() => addSkeleton('micro-app')}
          className="toolbar-btn"
          title="插入微应用1 (金字塔)"
        >
          🏗️ 微应用1
        </button>
        <button
          onClick={() => addSkeleton('micro-app-2')}
          className="toolbar-btn"
          title="插入微应用2 (功能演示)"
        >
          🔧 微应用2
        </button>
        <button
          onClick={() => addSkeleton('pyramid-app')}
          className="toolbar-btn"
          title="插入金字塔应用"
        >
          📊 金字塔
        </button>

        {/* 分隔线 */}
        <div style={{ width: '1px', height: '20px', background: '#dee2e6', margin: '0 4px' }} />

        {/* 撤销/重做 */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="toolbar-btn"
        >
          撤销
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="toolbar-btn"
        >
          重做
        </button>
      </div>
      
      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default Editor;
