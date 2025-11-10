// Editor组件样式定义
export const editorStyles = {
  // 协同状态显示
  collaborationStatus: {
    padding: '8px 12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  collaborationStatusConnected: {
    backgroundColor: '#d4edda',
    border: '1px solid #c3e6cb',
    color: '#155724',
  },
  collaborationStatusDisconnected: {
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    color: '#721c24',
  },
  collaborationStatusInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  collaborationStatusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  collaborationStatusIndicatorConnected: {
    backgroundColor: '#28a745',
  },
  collaborationStatusIndicatorDisconnected: {
    backgroundColor: '#dc3545',
  },

  // 工具栏
  editorToolbar: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },

  // 工具栏分组
  toolbarGroup: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },

  // 工具栏分隔线
  toolbarDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#dee2e6',
    margin: '0 4px',
  },

  // 基本按钮样式
  toolbarBtn: {
    padding: '6px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#333',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toolbarBtnActive: {
    backgroundColor: '#007bff',
    color: '#fff',
    borderColor: '#007bff',
  },

  // 微应用按钮组
  microAppButtons: {
    marginLeft: '16px',
    display: 'flex',
    gap: '8px',
  },

  // 微应用按钮样式
  microAppBtn: {
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  microAppBtn1: {
    border: '1px solid #28a745',
    backgroundColor: '#28a745',
    color: '#fff',
  },
  microAppBtn2: {
    border: '1px solid #17a2b8',
    backgroundColor: '#17a2b8',
    color: '#fff',
  },
  microAppBtnPyramid: {
    border: '1px solid #ffc107',
    backgroundColor: '#ffc107',
    color: '#000',
  },

  // 编辑器内容区域
  editorContent: {
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    minHeight: '1200px',
    margin: '0 8px',
  },

  // 编辑器容器
  editorContainer: {
    // 容器样式可以在这里添加
  },
};

// 合并样式的工具函数
export const mergeStyles = (...styles: any[]) => {
  return Object.assign({}, ...styles);
};
