import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { SkeletonNode } from '../sketetonNode/skeletonNode';
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
                height: '200px'
            }
        }).run();
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
                                : editorStyles.collaborationStatusIndicatorDisconnected) }), _jsxs("span", { children: ["\u534F\u540C\u72B6\u6001: ", collaborationStatus === 'connected' ? '已连接' : '未连接', connectedUsers.length > 0 && ` (${connectedUsers.length} 用户在线)`] })] }) })), _jsx("div", { style: editorStyles.editorToolbar, children: _jsx("button", { onClick: () => insertMicroApp('pyramid-app'), style: mergeStyles(editorStyles.microAppBtn, editorStyles.microAppBtnPyramid), children: "\uD83D\uDCCA \u63D2\u5165\u91D1\u5B57\u5854" }) }), _jsx("div", { style: editorStyles.editorContent, children: _jsx(EditorContent, { editor: editor }) })] }));
};
export default Editor;
