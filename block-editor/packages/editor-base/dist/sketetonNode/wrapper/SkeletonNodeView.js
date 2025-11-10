import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { loadMicroApp } from 'qiankun';
import { globalCollaborationManager } from '../../collaboration/collaboration';
import { createCollaborationService } from '../../services/CollaborationService';
import { createBlockContext } from '../../services/BlockContextService';
// 微应用配置映射
const microAppConfigs = {
    'micro-app': {
        entry: '//localhost:7200',
        container: '#micro-app-container'
    },
    'micro-app-2': {
        entry: '//localhost:7200',
        container: '#micro-app-container'
    },
    'pyramid-app': {
        entry: '//localhost:7200',
        container: '#micro-app-container'
    },
    'demo-micro-app': {
        entry: '//localhost:7200',
        container: '#micro-app-container'
    },
    'chart-app': {
        entry: '//localhost:7200',
        container: '#micro-app-container'
    }
};
const SkeletonNodeView = ({ node, editor, updateAttributes, deleteNode }) => {
    console.log('🎯 SkeletonNodeView 被渲染了!', { node, editor, updateAttributes, deleteNode });
    const containerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [microAppInstance, setMicroAppInstance] = useState(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isUnmounting, setIsUnmounting] = useState(false);
    const isInitializedRef = useRef(false);
    // 协同状态
    const [collaborationStatus, setCollaborationStatus] = useState('disconnected');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [collaborationData, setCollaborationData] = useState({});
    const [collaborationListData, setCollaborationListData] = useState([]);
    const [isCollaborationReady, setIsCollaborationReady] = useState(false);
    const connectionRef = useRef(null); // 存储全局连接引用
    // 服务实例
    const collaborationServiceRef = useRef(null);
    const blockContextRef = useRef(null);
    const { microName, wsUrl, width = '100%', height = '200px' } = node.attrs;
    console.log('📝 SkeletonNodeView 属性:', { microName, wsUrl, width, height });
    // 初始化协同
    useEffect(() => {
        if (microName && wsUrl) {
            console.log('🔧 初始化协同服务和BlockContext');
            const config = {
                wsUrl,
                roomName: `pyramid-room-${microName}`, // 使用固定的房间名称，确保多用户协同
                microName,
                useHocuspocus: true
            };
            try {
                // 获取或创建全局连接
                const connection = globalCollaborationManager.getConnection(config);
                connectionRef.current = connection;
                // 创建协同服务
                const collaborationService = createCollaborationService(config);
                collaborationServiceRef.current = collaborationService;
                // 创建BlockContext，传入协同连接
                const blockContext = createBlockContext(connection);
                blockContextRef.current = blockContext;
                // 设置用户信息 - 使用更稳定的用户标识
                const userId = localStorage.getItem('pyramid-user-id') || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const userName = localStorage.getItem('pyramid-user-name') || `用户-${userId.substr(-6)}`;
                const userColor = localStorage.getItem('pyramid-user-color') || `#${Math.floor(Math.random() * 16777215).toString(16)}`;
                // 保存用户信息到localStorage
                localStorage.setItem('pyramid-user-id', userId);
                localStorage.setItem('pyramid-user-name', userName);
                localStorage.setItem('pyramid-user-color', userColor);
                const userInfo = {
                    id: userId,
                    name: userName,
                    color: userColor
                };
                // 使用协同服务设置用户信息
                collaborationService.setUser(userInfo);
                // 基于实际连接状态设置ready状态
                const checkConnectionReady = () => {
                    if (connection.status === 'connected') {
                        setIsCollaborationReady(true);
                        console.log('✅ 全局协同连接已准备就绪');
                    }
                    else {
                        console.log('⏳ 等待协同连接建立，当前状态:', connection.status);
                        // 如果连接失败，设置一个最大等待时间
                        setTimeout(() => {
                            if (connection.status !== 'connected') {
                                console.log('⚠️ 协同连接超时，强制设置为ready状态');
                                setIsCollaborationReady(true);
                            }
                        }, 5000); // 5秒超时
                    }
                };
                // 立即检查一次
                checkConnectionReady();
                // 监听协同状态变化
                const unsubscribeStatus = collaborationService.onStatusChange((status) => {
                    console.log('🔄 协同状态变化:', {
                        status,
                        connectionId: connection.id,
                        roomName: config.roomName,
                        microName: config.microName,
                        wsUrl: config.wsUrl
                    });
                    setCollaborationStatus(status);
                    // 当连接成功时设置ready状态
                    if (status === 'connected' && !isCollaborationReady) {
                        setIsCollaborationReady(true);
                        console.log('✅ 协同连接成功，设置为ready状态');
                    }
                });
                // 监听用户变化
                const unsubscribeUsers = collaborationService.onUsersChange(() => {
                    const users = collaborationService.getOnlineUsers();
                    console.log('👥 在线用户变化:', users);
                    setOnlineUsers(users);
                });
                // 监听数据变化
                const unsubscribeData = connection.ydoc.getMap('sharedData').observe(() => {
                    const data = collaborationService.getAllData();
                    console.log('📊 共享数据变化:', data);
                    setCollaborationData(data);
                });
                // 监听列表变化
                const unsubscribeList = connection.ydoc.getArray('listData').observe(() => {
                    const listData = collaborationService.getListData();
                    console.log('📋 列表数据变化:', listData);
                    setCollaborationListData(listData);
                });
                return () => {
                    console.log('🧹 清理协同监听器');
                    unsubscribeStatus();
                    unsubscribeUsers();
                    // 释放连接引用，但不销毁连接
                    if (collaborationServiceRef.current) {
                        collaborationServiceRef.current.releaseConnection();
                    }
                };
            }
            catch (error) {
                console.error('❌ 全局协同连接初始化失败:', error);
            }
        }
    }, [microName, wsUrl]);
    // 使用容器加载微应用的内部函数
    const loadMicroAppWithContainer = useCallback(async (container) => {
        try {
            // 构建统一的props接口
            const props = {
                container: container,
                microName: microName,
                wsUrl: wsUrl,
                collaborationService: collaborationServiceRef.current,
                collaborationStatus: collaborationStatus,
                onlineUsers: onlineUsers,
                blockContext: blockContextRef.current,
                debugInfo: {
                    microName,
                    wsUrl,
                    collaborationStatus,
                    onlineUsersCount: onlineUsers.length,
                    isCollaborationReady,
                    hasCollaborationService: !!collaborationServiceRef.current,
                    hasBlockContext: !!blockContextRef.current
                }
            };
            // 为金字塔微应用添加特定props
            let pyramidProps = null;
            if (microName === 'pyramid-app') {
                pyramidProps = {
                    ...props,
                    // 金字塔特定数据
                    pyramidData: collaborationData,
                    pyramidListData: collaborationListData,
                    // 金字塔特定协同对象（向后兼容）
                    pyramidProvider: connectionRef.current?.provider,
                    pyramidSharedData: connectionRef.current?.ydoc.getMap('sharedData'),
                    pyramidList: connectionRef.current?.ydoc.getArray('listData'),
                    pyramidYdoc: connectionRef.current?.ydoc
                };
                console.log('📦 金字塔微应用props:', {
                    ...pyramidProps,
                    collaborationService: '[CollaborationService]',
                    blockContext: '[BlockContext]',
                    pyramidProvider: '[Provider]',
                    pyramidSharedData: '[SharedData]',
                    pyramidList: '[List]',
                    pyramidYdoc: '[YDoc]'
                });
            }
            else {
                console.log('📦 通用微应用props:', {
                    ...props,
                    collaborationService: '[CollaborationService]',
                    blockContext: '[BlockContext]'
                });
            }
            console.log('🔍 微应用 props 详细调试:', {
                microName,
                isCollaborationEnabled: !!(connectionRef.current?.provider && connectionRef.current?.ydoc),
                connection: !!connectionRef.current,
                provider: !!connectionRef.current?.provider,
                ydoc: !!connectionRef.current?.ydoc,
                collaborationStatus: connectionRef.current?.status || 'disconnected',
                isCollaborationReady,
                connectionStatus: connectionRef.current?.status,
                debugInfo: microName === 'pyramid-app' ? props.debugInfo : undefined
            });
            // 如果协同连接有问题，记录警告但继续加载
            if (microName === 'pyramid-app' && (!connectionRef.current || !connectionRef.current.provider)) {
                console.warn('⚠️ 协同连接有问题，但继续加载微应用');
            }
            // 生成唯一的微应用名称，避免重复加载冲突
            const uniqueMicroName = `${microName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('🆔 使用唯一微应用名称:', uniqueMicroName);
            // 检查是否已有同名实例，如果有则先卸载
            try {
                const existingInstance = window.__POWERED_BY_QIANKUN__ ?
                    window.__POWERED_BY_QIANKUN__.getAppStatus?.(uniqueMicroName) : null;
                if (existingInstance) {
                    console.log('⚠️ 发现同名微应用实例，先卸载:', uniqueMicroName);
                    // 这里不需要手动卸载，qiankun会自动处理
                }
            }
            catch (err) {
                console.log('ℹ️ 检查现有实例时出错（正常情况）:', err);
            }
            // 加载微应用
            const finalProps = microName === 'pyramid-app' ? (pyramidProps || props) : props;
            const instance = await loadMicroApp({
                name: uniqueMicroName,
                entry: microAppConfigs[microName].entry,
                container: container,
                props: finalProps
            });
            // 再次检查是否正在卸载
            if (isUnmounting) {
                console.log('⚠️ 微应用加载完成但组件正在卸载，跳过状态设置');
                try {
                    instance.unmount();
                }
                catch (err) {
                    console.error('❌ 卸载刚加载的微应用失败:', err);
                }
                return;
            }
            console.log('✅ 微应用加载成功:', instance);
            setMicroAppInstance(instance);
            setIsMounted(true);
        }
        catch (err) {
            console.error('❌ 微应用加载失败:', err);
            setError(`微应用加载失败: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            setIsLoading(false);
        }
    }, [microName, wsUrl, collaborationStatus, onlineUsers, isCollaborationReady, collaborationData, collaborationListData, isUnmounting]);
    // 加载微应用
    const loadMicroApplication = useCallback(async () => {
        if (isUnmounting) {
            console.log('⚠️ 组件正在卸载，跳过微应用加载');
            return;
        }
        // 检查协同连接是否已准备就绪
        if (microName === 'pyramid-app' && !connectionRef.current) {
            console.log('⏳ 协同连接未初始化，等待连接建立...');
            // 等待协同连接建立
            setTimeout(() => {
                if (!isUnmounting) {
                    loadMicroApplication();
                }
            }, 1000);
            return;
        }
        // 对于金字塔应用，如果连接存在但未ready，也允许加载（避免无限等待）
        if (microName === 'pyramid-app' && connectionRef.current && !isCollaborationReady) {
            console.log('⚠️ 协同连接存在但未ready，继续加载微应用（避免无限等待）');
        }
        if (!microName || !containerRef.current) {
            console.warn('⚠️ 缺少必要参数:', { microName, containerRef: containerRef.current });
            return;
        }
        const config = microAppConfigs[microName];
        if (!config) {
            console.error('❌ 未找到微应用配置:', microName);
            setError(`未找到微应用配置: ${microName}`);
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            console.log('🔄 开始加载微应用:', { microName, config });
            // 如果已有实例，先卸载
            if (microAppInstance) {
                console.log('🗑️ 卸载现有微应用实例');
                microAppInstance.unmount();
                setMicroAppInstance(null);
            }
            // 创建容器
            const container = document.createElement('div');
            container.id = 'micro-app-container';
            container.style.cssText = `
        width: 100%;
        height: 100%;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: rgba(240, 248, 255, 0.9);
      `;
            // 清空并添加容器
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
                containerRef.current.appendChild(container);
                console.log('✅ 容器已添加到DOM:', {
                    containerId: container.id,
                    containerInDOM: document.contains(container),
                    parentElement: container.parentElement?.tagName
                });
                // 使用多重检查确保容器确实存在于DOM中
                const checkContainerAndLoad = () => {
                    const containerExists = !!container;
                    const containerInDOM = container ? document.contains(container) : false;
                    const containerHasParent = container ? !!container.parentElement : false;
                    const containerRefExists = !!containerRef.current;
                    const containerRefInDOM = containerRef.current ? document.contains(containerRef.current) : false;
                    console.log('🔍 容器检查详情:', {
                        container: containerExists,
                        containerId: container?.id,
                        containerInDOM,
                        containerHasParent,
                        containerParent: container?.parentElement?.tagName,
                        containerParentId: container?.parentElement?.id,
                        containerRef: containerRefExists,
                        containerRefInDOM,
                        containerStyle: container ? window.getComputedStyle(container).display : 'N/A'
                    });
                    // 多重检查：容器存在、在DOM中、有父元素
                    if (!containerExists || !containerInDOM || !containerHasParent) {
                        console.error('❌ 容器检查失败:', {
                            container: containerExists,
                            inDOM: containerInDOM,
                            hasParent: containerHasParent,
                            containerParent: container?.parentElement?.tagName,
                            containerParentId: container?.parentElement?.id
                        });
                        setError('容器不存在或已被移除，无法加载微应用');
                        setIsLoading(false);
                        return;
                    }
                    // 额外检查：确保容器可见
                    const computedStyle = window.getComputedStyle(container);
                    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                        console.warn('⚠️ 容器不可见，但继续加载微应用');
                    }
                    console.log('✅ 容器检查通过，开始加载微应用');
                    // 容器检查通过，继续执行微应用加载
                    loadMicroAppWithContainer(container);
                };
                // 使用requestAnimationFrame确保DOM更新完成
                requestAnimationFrame(() => {
                    // 再次使用requestAnimationFrame确保渲染完成
                    requestAnimationFrame(checkContainerAndLoad);
                });
            }
            else {
                console.error('❌ containerRef.current 不存在，无法添加容器');
                setError('容器引用不存在');
                setIsLoading(false);
                return;
            }
        }
        catch (err) {
            console.error('❌ 微应用加载失败:', err);
            setError(`微应用加载失败: ${err instanceof Error ? err.message : String(err)}`);
            setIsLoading(false);
        }
    }, [microName, containerRef, microAppInstance, wsUrl, isCollaborationReady]);
    // 卸载微应用
    const unloadMicroApplication = useCallback(() => {
        if (microAppInstance) {
            console.log('🗑️ 卸载微应用:', microName);
            setIsUnmounting(true);
            try {
                // 检查容器是否仍然存在
                if (containerRef.current && document.contains(containerRef.current)) {
                    console.log('✅ 开始卸载微应用实例');
                    microAppInstance.unmount();
                    // 等待卸载完成后再清理容器
                    setTimeout(() => {
                        if (containerRef.current) {
                            containerRef.current.innerHTML = '';
                            console.log('✅ 容器已清理');
                        }
                    }, 100);
                }
                else {
                    console.log('⚠️ 容器不存在，跳过微应用卸载');
                }
                // 立即清理状态
                setMicroAppInstance(null);
                setIsMounted(false);
                console.log('✅ 微应用状态已清理');
            }
            catch (err) {
                console.error('❌ 微应用卸载失败:', err);
                // 即使卸载失败，也要清理状态
                setMicroAppInstance(null);
                setIsMounted(false);
            }
        }
    }, [microAppInstance, microName]);
    // 删除节点
    const handleDeleteNode = useCallback(() => {
        console.log('🗑️ 删除 SkeletonNode');
        if (deleteNode) {
            deleteNode();
        }
    }, [deleteNode]);
    // 更新节点属性
    const handleUpdateAttributes = useCallback((newAttrs) => {
        console.log('🔄 更新节点属性:', newAttrs);
        if (updateAttributes) {
            updateAttributes(newAttrs);
        }
    }, [updateAttributes]);
    // 组件挂载时自动加载微应用
    useEffect(() => {
        if (!isInitializedRef.current && microName && wsUrl) {
            isInitializedRef.current = true;
            console.log('🚀 自动加载微应用');
            loadMicroApplication();
        }
    }, [microName, wsUrl, loadMicroApplication]);
    // 清理
    useEffect(() => {
        return () => {
            console.log('🧹 SkeletonNodeView 清理开始');
            // 设置卸载状态，防止新的加载操作
            setIsUnmounting(true);
            // 立即执行清理，不使用setTimeout
            console.log('🧹 SkeletonNodeView 执行实际清理');
            // 先检查容器是否仍然存在
            if (microAppInstance && containerRef.current) {
                try {
                    // 检查容器是否还在DOM中
                    if (document.contains(containerRef.current)) {
                        console.log('✅ 容器存在，正常卸载微应用');
                        microAppInstance.unmount();
                        // 立即清理容器
                        containerRef.current.innerHTML = '';
                        console.log('✅ 容器已清理');
                    }
                    else {
                        console.log('⚠️ 容器已被移除，跳过微应用卸载');
                    }
                }
                catch (err) {
                    console.error('❌ 清理时卸载微应用失败:', err);
                }
            }
            else if (microAppInstance) {
                console.log('⚠️ 微应用实例存在但容器不存在，跳过卸载');
            }
            // 注意：协同连接的清理现在由全局管理器处理
            // 组件卸载时只会释放引用，不会销毁连接
        };
    }, [microAppInstance]);
    // 监听属性变化
    useEffect(() => {
        console.log('🔄 SkeletonNodeView 属性变化:', { microName, wsUrl, width, height });
    }, [microName, wsUrl, width, height]);
    return (_jsxs(NodeViewWrapper, { className: "skeleton-node", style: {
            width,
            height,
            position: 'relative'
        }, children: [_jsxs("div", { style: {
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    zIndex: 1000,
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                }, children: [microName === 'pyramid-app' && (_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 8px',
                            background: '#f8f9fa',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }, children: [_jsx("div", { style: {
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: collaborationStatus === 'connected' ? '#28a745' :
                                        collaborationStatus === 'connecting' ? '#ffc107' : '#dc3545'
                                } }), _jsxs("span", { children: ["\u534F\u540C: ", collaborationStatus === 'connected' ? '已连接' :
                                        collaborationStatus === 'connecting' ? '连接中' : '已断开'] }), onlineUsers && onlineUsers.length > 0 && (_jsxs("span", { children: ["(", onlineUsers.length, " \u7528\u6237\u5728\u7EBF)"] }))] })), _jsxs("select", { value: microName, onChange: (e) => updateAttributes({ microName: e.target.value }), style: { padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px' }, children: [_jsx("option", { value: "", children: "\u9009\u62E9\u5FAE\u5E94\u7528..." }), _jsx("option", { value: "micro-app", children: "\u5FAE\u5E94\u75281 (\u91D1\u5B57\u5854)" }), _jsx("option", { value: "micro-app-2", children: "\u5FAE\u5E94\u75282 (\u529F\u80FD\u6F14\u793A)" }), _jsx("option", { value: "pyramid-app", children: "\u91D1\u5B57\u5854\u5E94\u7528" })] }), _jsx("input", { type: "text", placeholder: "\u5BBD\u5EA6", value: width, onChange: (e) => updateAttributes({ width: e.target.value }), style: { padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', width: '80px' } }), _jsx("input", { type: "text", placeholder: "\u9AD8\u5EA6", value: height, onChange: (e) => updateAttributes({ height: e.target.value }), style: { padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', width: '80px' } }), _jsx("button", { onClick: loadMicroApplication, disabled: isLoading, style: {
                            padding: '4px 8px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.5 : 1
                        }, children: isLoading ? '加载中...' : '重新加载' }), _jsx("button", { onClick: handleDeleteNode, style: {
                            padding: '4px 8px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }, children: "\u5220\u9664" })] }), _jsxs("div", { style: {
                    width: '100%',
                    height: '100%',
                    minHeight: '200px',
                    border: '1px solid #e9ecef',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(248, 249, 250, 0.8)'
                }, children: [!microName && (_jsx("div", { className: "skeleton-placeholder", children: "\u8BF7\u9009\u62E9\u8981\u52A0\u8F7D\u7684\u5FAE\u5E94\u7528" })), isLoading && (_jsx("div", { className: "skeleton-loading", children: _jsx("div", { children: "\uD83D\uDD04 \u6B63\u5728\u52A0\u8F7D\u5FAE\u5E94\u7528..." }) })), error && (_jsxs("div", { className: "skeleton-error", children: [_jsxs("div", { children: ["\u274C ", error] }), _jsx("button", { onClick: loadMicroApplication, style: {
                                    marginTop: '10px',
                                    padding: '6px 12px',
                                    background: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }, children: "\u91CD\u8BD5" })] })), _jsx("div", { ref: containerRef, style: {
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            borderRadius: '4px',
                            minHeight: '200px',
                            backgroundColor: 'rgba(255, 255, 255, 0.6)'
                        } })] })] }));
};
export default SkeletonNodeView;
