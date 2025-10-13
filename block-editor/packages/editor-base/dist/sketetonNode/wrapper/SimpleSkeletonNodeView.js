import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NodeViewWrapper } from '@tiptap/react';
const SimpleSkeletonNodeView = ({ node }) => {
    console.log('🎯 SimpleSkeletonNodeView 被渲染了!', { node });
    const { microName, wsUrl } = node.attrs;
    return (_jsx(NodeViewWrapper, { className: "skeleton-node-wrapper", children: _jsxs("div", { style: {
                border: '2px solid #007bff',
                borderRadius: '8px',
                padding: '20px',
                margin: '16px 0',
                background: '#f8f9fa'
            }, children: [_jsx("h3", { children: "\uD83C\uDF89 SkeletonNode \u6E32\u67D3\u6210\u529F!" }), _jsxs("p", { children: ["\u5FAE\u5E94\u7528\u540D\u79F0: ", microName || '未设置'] }), _jsxs("p", { children: ["WebSocket\u5730\u5740: ", wsUrl || '未设置'] }), _jsx("p", { children: "\u5982\u679C\u4F60\u770B\u5230\u8FD9\u4E2A\u5185\u5BB9\uFF0C\u8BF4\u660E SkeletonNodeView \u6B63\u5E38\u5DE5\u4F5C\uFF01" })] }) }));
};
export default SimpleSkeletonNodeView;
