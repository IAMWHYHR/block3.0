import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Link from '@tiptap/extension-link';
import { SkeletonNode } from '../nodes/SkeletonNode';

const Editor = ({ onUpdate, placeholder = '开始编写...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
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
