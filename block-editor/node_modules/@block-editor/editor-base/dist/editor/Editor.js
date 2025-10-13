import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { SkeletonNode } from '../sketetonNode/skeletonNode';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
export const Editor = ({ microName, wsUrl, onEditorReady }) => {
    const ydocRef = useRef(null);
    const providerRef = useRef(null);
    const rootRef = useRef(null);
    const editor = useEditor({
        extensions: [
            StarterKit,
            SkeletonNode
        ],
        content: '<p>欢迎使用编辑器！</p>',
        onUpdate: ({ editor }) => {
            console.log('编辑器内容已更新');
        },
        onCreate: ({ editor }) => {
            console.log('🎉 TipTap 编辑器创建完成!');
            console.log('🔍 编辑器扩展:', editor.extensionManager.extensions);
            // 初始化Yjs文档和WebSocket协同
            if (!ydocRef.current) {
                console.log('🔧 初始化 Yjs 文档和 WebSocket 协同...');
                ydocRef.current = new Y.Doc();
                providerRef.current = new WebsocketProvider(wsUrl, `editor-${microName}`, ydocRef.current);
                console.log('✅ Yjs 和 WebSocket 协同初始化完成');
            }
            // 通知父组件编辑器已准备就绪
            if (onEditorReady) {
                onEditorReady({
                    editor,
                    ydoc: ydocRef.current,
                    provider: providerRef.current,
                    insertSkeletonNode: () => {
                        console.log('🎯 正在插入 SkeletonNode...', {
                            microName,
                            wsUrl
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
            if (providerRef.current) {
                providerRef.current.destroy();
            }
            if (ydocRef.current) {
                ydocRef.current.destroy();
            }
        };
    }, []);
    if (!editor) {
        return _jsx("div", { children: "\u6B63\u5728\u52A0\u8F7D\u7F16\u8F91\u5668..." });
    }
    return (_jsx("div", { ref: rootRef, className: "editor-container", children: _jsx(EditorContent, { editor: editor }) }));
};
export default Editor;
