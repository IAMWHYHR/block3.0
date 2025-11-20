import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';

const SimpleSkeletonNodeView: React.FC<any> = ({ node }) => {
  console.log('🎯 SimpleSkeletonNodeView 被渲染了!', { node });
  
  const { microName, wsUrl } = node.attrs;

  return (
    <NodeViewWrapper className="skeleton-node-wrapper">
      <div style={{
        border: '2px solid #007bff',
        borderRadius: '8px',
        padding: '20px',
        margin: '16px 0',
        background: '#f8f9fa'
      }}>
        <h3>🎉 SkeletonNode 渲染成功!</h3>
        <p>微应用名称: {microName || '未设置'}</p>
        <p>WebSocket地址: {wsUrl || '未设置'}</p>
        <p>如果你看到这个内容，说明 SkeletonNodeView 正常工作！</p>
      </div>
    </NodeViewWrapper>
  );
};

export default SimpleSkeletonNodeView;





























