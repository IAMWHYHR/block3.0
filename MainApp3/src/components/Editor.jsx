import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Link from '@tiptap/extension-link';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { SkeletonNode } from '../nodes/SkeletonNode';
import { provider, ydoc, cleanup } from '../collaboration';

const Editor = ({ onUpdate, placeholder = '开始编写...' }) => {
  const [collaborationStatus, setCollaborationStatus] = useState('connecting');
  const [connectedUsers, setConnectedUsers] = useState([]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用历史记录，因为协同编辑有自己的历史管理
        history: false,
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
      // 协同编辑扩展
      Collaboration.configure({
        document: ydoc,
      }),
      // 协同光标扩展
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: `用户${Math.floor(Math.random() * 1000)}`,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        },
      }),
      SkeletonNode,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  // 监听协同状态
  useEffect(() => {
    if (!provider) return;

    const handleConnect = () => {
      setCollaborationStatus('connected');
      console.log('✅ 协同编辑已连接');
    };

    const handleDisconnect = () => {
      setCollaborationStatus('disconnected');
      console.log('❌ 协同编辑已断开');
    };

    const handleStatus = ({ status }) => {
      setCollaborationStatus(status);
    };

    const handleAwareness = ({ states }) => {
      const users = Array.from(states.entries()).map(([key, state]) => ({
        id: key,
        name: state.user?.name || 'Anonymous',
        color: state.user?.color || '#000000',
      }));
      setConnectedUsers(users);
    };

    provider.on('connect', handleConnect);
    provider.on('disconnect', handleDisconnect);
    provider.on('status', handleStatus);
    provider.on('awareness', handleAwareness);

    return () => {
      provider.off('connect', handleConnect);
      provider.off('disconnect', handleDisconnect);
      provider.off('status', handleStatus);
      provider.off('awareness', handleAwareness);
    };
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
      cleanup();
    };
  }, [editor]);

  const addSkeleton = useCallback((microAppName = 'micro-app') => {
    if (editor) {
      editor.chain().focus().setSkeleton({ 
        microAppName,
        width: '100%',
        height: '300px'
      }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
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

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-container">
      {/* 协同状态栏 */}
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

        {/* 对齐功能暂时移除，避免兼容性问题 */}

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
