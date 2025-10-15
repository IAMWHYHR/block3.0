import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Link from '@tiptap/extension-link';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { SkeletonNode } from '../sketetonNode/skeletonNode';
import { EditorCollaborationManager } from '../collaboration/editorCollaboration';
export const Editor = ({ microName, wsUrl, roomName = 'default-room', enableCollaboration = true, useHocuspocus = true, userInfo, placeholder = '开始编写...', onEditorReady, onCollaborationStatusChange, onUsersChange, onUpdate }) => {
    const collaborationManagerRef = useRef(null);
    const rootRef = useRef(null);
    const [collaborationStatus, setCollaborationStatus] = useState('disconnected');
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [isCollaborationReady, setIsCollaborationReady] = useState(false);
    // 初始化协同管理器
    useEffect(() => {
        if (enableCollaboration && !collaborationManagerRef.current) {
            console.log('🔧 初始化协同管理器...');
            console.log('协同配置:', { wsUrl, roomName, microName, useHocuspocus, userInfo });
            const config = {
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
            }
            catch (error) {
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
                        color: userInfo?.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
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
        if (!editor)
            return;
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
        return _jsx("div", { children: "\u6B63\u5728\u52A0\u8F7D\u7F16\u8F91\u5668..." });
    }
    return (_jsxs("div", { ref: rootRef, className: "editor-container", children: [enableCollaboration && (_jsxs("div", { style: {
                    background: '#f8f9fa',
                    borderBottom: '1px solid #e9ecef',
                    padding: '8px 15px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '14px'
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("div", { style: {
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: collaborationStatus === 'connected' ? '#28a745' :
                                        collaborationStatus === 'connecting' ? '#ffc107' : '#dc3545'
                                } }), _jsxs("span", { children: ["\u534F\u540C\u72B6\u6001: ", collaborationStatus === 'connected' ? '已连接' :
                                        collaborationStatus === 'connecting' ? '连接中...' : '已断开'] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsxs("span", { children: ["\u5728\u7EBF\u7528\u6237: ", connectedUsers.length] }), connectedUsers.map(user => (_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 6px',
                                    backgroundColor: user.color + '20',
                                    borderRadius: '12px',
                                    fontSize: '12px'
                                }, children: [_jsx("div", { style: {
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: user.color
                                        } }), user.name] }, user.id)))] })] })), _jsxs("div", { className: "editor-toolbar", children: [_jsx("button", { onClick: () => editor.chain().focus().toggleBold().run(), disabled: !editor.can().chain().focus().toggleBold().run(), className: `toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`, children: "\u7C97\u4F53" }), _jsx("button", { onClick: () => editor.chain().focus().toggleItalic().run(), disabled: !editor.can().chain().focus().toggleItalic().run(), className: `toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`, children: "\u659C\u4F53" }), _jsx("button", { onClick: () => editor.chain().focus().toggleUnderline().run(), disabled: !editor.can().chain().focus().toggleUnderline().run(), className: `toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`, children: "\u4E0B\u5212\u7EBF" }), _jsx("button", { onClick: () => editor.chain().focus().toggleStrike().run(), disabled: !editor.can().chain().focus().toggleStrike().run(), className: `toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`, children: "\u5220\u9664\u7EBF" }), _jsx("button", { onClick: () => editor.chain().focus().toggleCode().run(), disabled: !editor.can().chain().focus().toggleCode().run(), className: `toolbar-btn ${editor.isActive('code') ? 'active' : ''}`, children: "\u4EE3\u7801" }), _jsx("div", { style: { width: '1px', height: '20px', background: '#dee2e6', margin: '0 4px' } }), _jsx("button", { onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), className: `toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`, children: "H1" }), _jsx("button", { onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), className: `toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`, children: "H2" }), _jsx("button", { onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), className: `toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`, children: "H3" }), _jsx("div", { style: { width: '1px', height: '20px', background: '#dee2e6', margin: '0 4px' } }), _jsx("button", { onClick: () => editor.chain().focus().toggleBulletList().run(), className: `toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`, children: "\u65E0\u5E8F\u5217\u8868" }), _jsx("button", { onClick: () => editor.chain().focus().toggleOrderedList().run(), className: `toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`, children: "\u6709\u5E8F\u5217\u8868" }), _jsx("button", { onClick: () => editor.chain().focus().toggleBlockquote().run(), className: `toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`, children: "\u5F15\u7528" }), _jsx("button", { onClick: () => editor.chain().focus().toggleCodeBlock().run(), className: `toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`, children: "\u4EE3\u7801\u5757" }), _jsx("div", { style: { width: '1px', height: '20px', background: '#dee2e6', margin: '0 4px' } }), _jsx("button", { onClick: setLink, className: `toolbar-btn ${editor.isActive('link') ? 'active' : ''}`, children: "\u94FE\u63A5" }), _jsx("div", { style: { width: '1px', height: '20px', background: '#dee2e6', margin: '0 4px' } }), _jsx("button", { onClick: () => addSkeleton('micro-app'), className: "toolbar-btn", title: "\u63D2\u5165\u5FAE\u5E94\u75281 (\u91D1\u5B57\u5854)", children: "\uD83C\uDFD7\uFE0F \u5FAE\u5E94\u75281" }), _jsx("button", { onClick: () => addSkeleton('micro-app-2'), className: "toolbar-btn", title: "\u63D2\u5165\u5FAE\u5E94\u75282 (\u529F\u80FD\u6F14\u793A)", children: "\uD83D\uDD27 \u5FAE\u5E94\u75282" }), _jsx("button", { onClick: () => addSkeleton('pyramid-app'), className: "toolbar-btn", title: "\u63D2\u5165\u91D1\u5B57\u5854\u5E94\u7528", children: "\uD83D\uDCCA \u91D1\u5B57\u5854" }), _jsx("div", { style: { width: '1px', height: '20px', background: '#dee2e6', margin: '0 4px' } }), _jsx("button", { onClick: () => editor.chain().focus().undo().run(), disabled: !editor.can().chain().focus().undo().run(), className: "toolbar-btn", children: "\u64A4\u9500" }), _jsx("button", { onClick: () => editor.chain().focus().redo().run(), disabled: !editor.can().chain().focus().redo().run(), className: "toolbar-btn", children: "\u91CD\u505A" })] }), _jsx("div", { className: "editor-content", children: _jsx(EditorContent, { editor: editor }) })] }));
};
export default Editor;
