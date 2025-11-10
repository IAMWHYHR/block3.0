import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Link from '@tiptap/extension-link';
import Strike from '@tiptap/extension-strike';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import { SkeletonNode } from '../sketetonNode/skeletonNode';
import { BlockDocumentExtension } from './BlockDocumentExtension';
import { globalCollaborationManager } from '../collaboration/globalCollaborationManager';
import { editorStyles, mergeStyles } from './EditorStyles';
export const Editor = ({ microName, wsUrl, roomName = 'default-room', enableCollaboration = true, useHocuspocus = true, userInfo, placeholder = '开始编写...', onUpdate }) => {
    const [collaborationStatus, setCollaborationStatus] = useState('disconnected');
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [isCollaborationReady, setIsCollaborationReady] = useState(false);
    const connectionRef = useRef(null);
    // 初始化协同连接
    useEffect(() => {
        if (enableCollaboration) {
            console.log('🔧 初始化全局协同连接...');
            const config = {
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
                    // 将 provider 挂载到 window 上，方便调试
                    if (connection.provider && typeof window !== 'undefined') {
                        window.blockEditorProvider = connection.provider;
                        window.blockEditorConnection = connection;
                        window.blockEditorYdoc = connection.ydoc;
                        console.log('🔧 Provider 已挂载到 window.blockEditorProvider');
                        console.log('🔧 Connection 已挂载到 window.blockEditorConnection');
                        console.log('🔧 YDoc 已挂载到 window.blockEditorYdoc');
                    }
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
                    // 清理 window 上的挂载（可选，因为可能有多个编辑器实例）
                    // if (typeof window !== 'undefined') {
                    //   delete (window as any).blockEditorProvider;
                    //   delete (window as any).blockEditorConnection;
                    //   delete (window as any).blockEditorYdoc;
                    //   delete (window as any).blockEditor;
                    // }
                };
            }
            catch (error) {
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
            // 添加文本格式扩展
            Code,
            CodeBlock.configure({
                HTMLAttributes: {
                    class: 'code-block',
                },
            }),
            Strike,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'link',
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            ...(enableCollaboration && isCollaborationReady && connectionRef.current ? [
                Collaboration.configure({
                    document: connectionRef.current.ydoc,
                }),
                // BlockDocumentExtension 必须在 Collaboration 之后，以便访问 ydoc
                BlockDocumentExtension
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
            // 将 editor 挂载到 window 上，方便调试
            if (typeof window !== 'undefined') {
                window.blockEditor = editor;
                console.log('🔧 Editor 已挂载到 window.blockEditor');
            }
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
    const insertMicroApp = (microAppName) => {
        if (!editor)
            return;
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
    // 插入节点的函数
    const insertNode = (nodeType, attrs) => {
        if (!editor)
            return;
        switch (nodeType) {
            case 'paragraph':
                editor.chain().focus().setParagraph().run();
                break;
            case 'heading1':
                editor.chain().focus().toggleHeading({ level: 1 }).run();
                break;
            case 'heading2':
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                break;
            case 'heading3':
                editor.chain().focus().toggleHeading({ level: 3 }).run();
                break;
            case 'bulletList':
                editor.chain().focus().toggleBulletList().run();
                break;
            case 'orderedList':
                editor.chain().focus().toggleOrderedList().run();
                break;
            case 'blockquote':
                editor.chain().focus().toggleBlockquote().run();
                break;
            case 'codeBlock':
                editor.chain().focus().toggleCodeBlock().run();
                break;
            case 'horizontalRule':
                editor.chain().focus().setHorizontalRule().run();
                break;
            default:
                break;
        }
    };
    // 注意：协同连接的清理现在由全局管理器处理
    // 组件卸载时只会释放引用，不会销毁连接
    if (!editor) {
        return _jsx("div", { children: "\u52A0\u8F7D\u4E2D..." });
    }
    return (_jsxs("div", { style: editorStyles.editorContainer, children: [enableCollaboration && (_jsx("div", { style: mergeStyles(editorStyles.collaborationStatus, collaborationStatus === 'connected'
                    ? editorStyles.collaborationStatusConnected
                    : editorStyles.collaborationStatusDisconnected), children: _jsxs("div", { style: editorStyles.collaborationStatusInfo, children: [_jsx("div", { style: mergeStyles(editorStyles.collaborationStatusIndicator, collaborationStatus === 'connected'
                                ? editorStyles.collaborationStatusIndicatorConnected
                                : editorStyles.collaborationStatusIndicatorDisconnected) }), _jsxs("span", { children: ["\u534F\u540C\u72B6\u6001: ", collaborationStatus === 'connected' ? '已连接' : '未连接', connectedUsers.length > 0 && ` (${connectedUsers.length} 用户在线)`] })] }) })), _jsxs("div", { style: editorStyles.editorToolbar, children: [_jsxs("div", { style: editorStyles.toolbarGroup, children: [_jsx("button", { onClick: () => editor.chain().focus().toggleBold().run(), disabled: !editor.can().chain().focus().toggleBold().run(), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('bold') ? editorStyles.toolbarBtnActive : {}), title: "\u7C97\u4F53 (Ctrl+B)", children: _jsx("strong", { children: "B" }) }), _jsx("button", { onClick: () => editor.chain().focus().toggleItalic().run(), disabled: !editor.can().chain().focus().toggleItalic().run(), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('italic') ? editorStyles.toolbarBtnActive : {}), title: "\u659C\u4F53 (Ctrl+I)", children: _jsx("em", { children: "I" }) }), _jsx("button", { onClick: () => editor.chain().focus().toggleUnderline().run(), disabled: !editor.can().chain().focus().toggleUnderline().run(), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('underline') ? editorStyles.toolbarBtnActive : {}), title: "\u4E0B\u5212\u7EBF (Ctrl+U)", children: _jsx("u", { children: "U" }) }), _jsx("button", { onClick: () => editor.chain().focus().toggleStrike().run(), disabled: !editor.can().chain().focus().toggleStrike().run(), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('strike') ? editorStyles.toolbarBtnActive : {}), title: "\u5220\u9664\u7EBF", children: _jsx("s", { children: "S" }) }), _jsx("button", { onClick: () => editor.chain().focus().toggleCode().run(), disabled: !editor.can().chain().focus().toggleCode().run(), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('code') ? editorStyles.toolbarBtnActive : {}), title: "\u884C\u5185\u4EE3\u7801", children: '</>' })] }), _jsx("div", { style: editorStyles.toolbarDivider }), _jsxs("div", { style: editorStyles.toolbarGroup, children: [_jsx("button", { onClick: () => insertNode('paragraph'), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('paragraph') ? editorStyles.toolbarBtnActive : {}), title: "\u6BB5\u843D", children: "P" }), _jsx("button", { onClick: () => insertNode('heading1'), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('heading', { level: 1 }) ? editorStyles.toolbarBtnActive : {}), title: "\u6807\u9898 1", children: "H1" }), _jsx("button", { onClick: () => insertNode('heading2'), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('heading', { level: 2 }) ? editorStyles.toolbarBtnActive : {}), title: "\u6807\u9898 2", children: "H2" }), _jsx("button", { onClick: () => insertNode('heading3'), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('heading', { level: 3 }) ? editorStyles.toolbarBtnActive : {}), title: "\u6807\u9898 3", children: "H3" }), _jsx("button", { onClick: () => insertNode('bulletList'), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('bulletList') ? editorStyles.toolbarBtnActive : {}), title: "\u65E0\u5E8F\u5217\u8868", children: "\u2022" }), _jsx("button", { onClick: () => insertNode('orderedList'), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('orderedList') ? editorStyles.toolbarBtnActive : {}), title: "\u6709\u5E8F\u5217\u8868", children: "1." }), _jsx("button", { onClick: () => insertNode('blockquote'), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('blockquote') ? editorStyles.toolbarBtnActive : {}), title: "\u5F15\u7528", children: "\"" }), _jsx("button", { onClick: () => insertNode('codeBlock'), style: mergeStyles(editorStyles.toolbarBtn, editor.isActive('codeBlock') ? editorStyles.toolbarBtnActive : {}), title: "\u4EE3\u7801\u5757", children: '{ }' }), _jsx("button", { onClick: () => insertNode('horizontalRule'), style: mergeStyles(editorStyles.toolbarBtn), title: "\u6C34\u5E73\u5206\u5272\u7EBF", children: "\u2500" })] }), _jsx("div", { style: editorStyles.toolbarDivider }), _jsx("div", { style: editorStyles.toolbarGroup, children: _jsx("button", { onClick: () => insertMicroApp('pyramid-app'), style: mergeStyles(editorStyles.microAppBtn, editorStyles.microAppBtnPyramid), title: "\u63D2\u5165\u91D1\u5B57\u5854\u5FAE\u5E94\u7528", children: "\uD83D\uDCCA \u63D2\u5165\u91D1\u5B57\u5854" }) })] }), _jsx("div", { style: editorStyles.editorContent, children: _jsx(EditorContent, { editor: editor }) })] }));
};
export default Editor;
