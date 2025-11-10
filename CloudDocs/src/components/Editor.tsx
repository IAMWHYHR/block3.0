import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import './Editor.css';

interface EditorProps {
  documentId?: string;
  userName?: string;
  userColor?: string;
}

const Editor: React.FC<EditorProps> = ({
  documentId = 'default-document',
  userName: propUserName,
  userColor: propUserColor,
}) => {
  const [isConnected, setIsConnected] = useState(false);

  // 使用 useRef 存储随机生成的值，确保只生成一次
  const defaultUserNameRef = useRef<string | undefined>(undefined);
  const defaultUserColorRef = useRef<string | undefined>(undefined);
  
  const userName = propUserName || defaultUserNameRef.current || 
    (defaultUserNameRef.current = `User-${Math.floor(Math.random() * 1000)}`);
  const userColor = propUserColor || defaultUserColorRef.current || 
    (defaultUserColorRef.current = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`);

  // 创建 Yjs 文档
  const ydoc = useMemo(() => new Y.Doc(), []);

  // 使用 useRef 来存储 setState 函数，避免在 useMemo 依赖中引起重新创建
  const setIsConnectedRef = useRef(setIsConnected);
  useEffect(() => {
    setIsConnectedRef.current = setIsConnected;
  }, []);

  // 生成一个稳定的 token（基于用户名），使用 useRef 确保只生成一次
  const tokenRef = useRef<string | null>(null);
  if (!tokenRef.current) {
    tokenRef.current = `token-${userName}-${documentId}`;
  }
  const token = tokenRef.current;

  // 确保 token 是有效的字符串
  const finalToken = useMemo(() => {
    const t = token || `token-${userName}-${documentId}` || 'default-token';
    return typeof t === 'string' ? t : String(t);
  }, [token, userName, documentId]);

  // 创建 Hocuspocus Provider
  const provider = useMemo(
    () => {
      console.log('🔑 创建 Provider，Token:', finalToken.substring(0, 30) + '...');
      
      const p = new HocuspocusProvider({
        url: 'ws://localhost:1234',
        name: 'aaaa',
        document: ydoc,
        token: finalToken,
        connect: true,
        onConnect: () => {
          console.log('✅ Provider 连接成功');
          setIsConnectedRef.current(true);
        },
        onDisconnect: () => {
          console.log('❌ Provider 断开连接');
          setIsConnectedRef.current(false);
        },
        onStatus: ({ status }: { status: string }) => {
          console.log('🔄 Provider 状态:', status);
          if (status === 'connected') {
            setIsConnectedRef.current(true);
          } else if (status === 'disconnected') {
            setIsConnectedRef.current(false);
          }
        },
        onAuthenticationFailed: ({ reason }: { reason: any }) => {
          console.error('❌ 认证失败:', reason);
          console.error('使用的 Token:', finalToken);
        },
      });
      
      return p;
    },
    [documentId, ydoc, finalToken]
  );

  // 获取 provider 的 awareness 对象
  const awareness = provider.awareness;

  // 设置本地用户状态到 awareness
  useEffect(() => {
    if (awareness) {
      const defaultUser = {
        name: userName,
        color: userColor,
        cursor: null,
      };
      
      awareness.setLocalStateField('user', {
        ...defaultUser,
      });
    }
  }, [awareness, userName, userColor]);

  // 创建编辑器实例
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
        field: 'content',
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: userName,
          color: userColor,
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
      if (provider) {
        provider.destroy();
      }
      if (ydoc) {
        ydoc.destroy();
      }
    };
  }, [editor, provider, ydoc]);

  if (!editor) {
    return <div className="editor-loading">加载编辑器...</div>;
  }

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
        >
          <s>S</s>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'is-active' : ''}
        >
          {'</>'}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          •
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
        >
          1.
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
        >
          "
        </button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          ─
        </button>
      </div>
      <div className="editor-content-wrapper">
        <EditorContent editor={editor} />
      </div>
      <div className="editor-status">
        <span className="status-indicator">
          {isConnected ? '🟢 已连接' : '🟡 连接中...'}
        </span>
        <span className="status-user">
          用户: {userName}
        </span>
        <span className="status-doc" style={{ fontSize: '0.75rem', marginLeft: '1rem', color: '#666' }}>
          文档: {documentId}
        </span>
        <span className="status-clients" style={{ fontSize: '0.75rem', marginLeft: '1rem', color: '#666' }}>
          在线用户: {awareness ? Array.from(awareness.getStates().keys()).length : 0}
        </span>
      </div>
    </div>
  );
};

export default Editor;

