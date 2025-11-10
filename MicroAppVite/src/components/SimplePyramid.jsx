import React, { useState, useEffect } from 'react';

const SimplePyramid = (props) => {
  // 从 props 中获取协同相关的方法和数据
  const {
    // 新的统一接口
    collaborationService,
    collaborationStatus,
    onlineUsers,
    blockContext,
    microName,
    wsUrl,
  } = props || {};

  // 检查是否启用了协同功能 - 优先使用blockContext
  const isCollaborationEnabled = !!(blockContext?.sharedData || collaborationService);

  // 本地状态（当协同功能不可用时使用）
  const [localLevels, setLocalLevels] = useState(3);
  const [localLevelData, setLocalLevelData] = useState([
    { text: '顶层', color: '#ff6b6b' },
    { text: '中层', color: '#4ecdc4' },
    { text: '底层', color: '#45b7d1' }
  ]);
  const [localPyramids, setLocalPyramids] = useState([]);
  const [localSelectedPyramidId, setLocalSelectedPyramidId] = useState('');

  // 协同状态
  const [levels, setLevels] = useState(3);
  const [levelData, setLevelData] = useState([
    { text: '顶层', color: '#ff6b6b' },
    { text: '中层', color: '#4ecdc4' },
    { text: '底层', color: '#45b7d1' }
  ]);
  const [pyramids, setPyramids] = useState([]);
  const [selectedPyramidId, setSelectedPyramidId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 本地协同状态，用于UI显示
  const [localCollaborationStatus, setLocalCollaborationStatus] = useState('disconnected');

  // API 基础URL
  const API_BASE_URL = 'http://localhost:3000/api';

  // 协同数据同步
  useEffect(() => {
    if (isCollaborationEnabled) {
      const currentLevels = blockContext?.sharedData?.getPyramidData('levels') || 3;
      const currentLevelData = blockContext?.sharedData?.getPyramidData('levelData') || [
        { text: '顶层', color: '#ff6b6b' },
        { text: '中层', color: '#4ecdc4' },
        { text: '底层', color: '#45b7d1' }
      ];
      const currentSelectedId = blockContext?.sharedData?.getPyramidData('selectedPyramidId') || '';
      const currentListData = blockContext?.sharedData?.getRealTimeListData() || [];

      setLevels(currentLevels);
      setLevelData(currentLevelData);
      setSelectedPyramidId(currentSelectedId);
      setPyramids(currentListData);
    } else {
      setLevels(localLevels);
      setLevelData(localLevelData);
      setSelectedPyramidId(localSelectedPyramidId);
      setPyramids(localPyramids);
    }
  }, [isCollaborationEnabled, localLevels, localLevelData, localSelectedPyramidId, localPyramids, blockContext]);

  // 实时数据同步 - 使用实时数据获取方法
  useEffect(() => {
    if (isCollaborationEnabled && (blockContext?.sharedData || collaborationService)) {
      console.log('🔍 设置实时数据同步');
      
      const syncData = () => {
        // 优先使用SharedDataService，其次使用协同服务
        const realTimeData = blockContext?.sharedData?.getRealTimeData() || 
                           collaborationService?.getRealTimeData() || {};
        const realTimeListData = blockContext?.sharedData?.getRealTimeListData() || 
                               collaborationService?.getRealTimeListData() || [];
        
        console.log('📊 实时数据同步:', { realTimeData, realTimeListData });
        
        const currentLevels = realTimeData.levels || 3;
        const currentLevelData = realTimeData.levelData || [
          { text: '顶层', color: '#ff6b6b' },
          { text: '中层', color: '#4ecdc4' },
          { text: '底层', color: '#45b7d1' }
        ];
        const currentSelectedId = realTimeData.selectedPyramidId || '';

        setLevels(currentLevels);
        setLevelData(currentLevelData);
        setSelectedPyramidId(currentSelectedId);
        setPyramids(realTimeListData);
        
        // 检查协同状态，如果数据能正常获取，说明协同已连接
        if (realTimeData && Object.keys(realTimeData).length > 0) {
          if (localCollaborationStatus !== 'connected') {
            console.log('✅ 通过数据同步检测到协同已连接');
            setLocalCollaborationStatus('connected');
          }
        }
      };

      // 初始同步
      syncData();

      // 设置定时同步（作为备用方案）
      const syncInterval = setInterval(syncData, 1000);

      return () => {
        console.log('🧹 清理实时数据同步');
        clearInterval(syncInterval);
      };
    }
  }, [isCollaborationEnabled, collaborationService, blockContext]);

  // 监听协同数据变化并实时更新UI - 使用blockContext
  useEffect(() => {
    if (isCollaborationEnabled && blockContext?.sharedData) {
      console.log('🔍 设置协同数据监听器');
      
      // 监听共享数据变化
      const handleDataChange = () => {
        console.log('📊 协同数据变化，更新UI');
        const currentLevels = blockContext.sharedData.getPyramidData('levels') || 3;
        const currentLevelData = blockContext.sharedData.getPyramidData('levelData') || [
          { text: '顶层', color: '#ff6b6b' },
          { text: '中层', color: '#4ecdc4' },
          { text: '底层', color: '#45b7d1' }
        ];
        const currentSelectedId = blockContext.sharedData.getPyramidData('selectedPyramidId') || '';
        const currentListData = blockContext.sharedData.getRealTimeListData() || [];

        setLevels(currentLevels);
        setLevelData(currentLevelData);
        setSelectedPyramidId(currentSelectedId);
        setPyramids(currentListData);
      };

      // 使用blockContext的SharedMap和SharedArray进行监听
      const sharedMap = blockContext.sharedData.getMap('sharedData');
      const sharedArray = blockContext.sharedData.getArray('listData');

      // 监听Map变化
      const unsubscribeMap = sharedMap.subscribe(handleDataChange);
      
      // 监听Array变化
      const unsubscribeArray = sharedArray.subscribe(handleDataChange);

      return () => {
        console.log('🧹 清理协同数据监听器');
        unsubscribeMap();
        unsubscribeArray();
      };
    }
  }, [isCollaborationEnabled, blockContext]);

  // 更新层数的协同方法
  const updateLevels = (newLevels) => {
    if (isCollaborationEnabled && blockContext?.sharedData) {
      blockContext.sharedData.updatePyramidData('levels', newLevels);
    } else {
      setLocalLevels(newLevels);
    }
  };

  // 更新层数据的协同方法
  const updateLevelData = (newLevelData) => {
    if (isCollaborationEnabled) {
      if (blockContext?.sharedData) {
        blockContext.sharedData.updatePyramidData('levelData', newLevelData);
      } else if (collaborationService) {
        collaborationService.updateData('levelData', newLevelData);
      }
    } else {
      setLocalLevelData(newLevelData);
    }
  };

  // 更新选中金字塔ID的协同方法
  const updateSelectedPyramidId = (newId) => {
    if (isCollaborationEnabled) {
      if (blockContext?.sharedData) {
        blockContext.sharedData.updatePyramidData('selectedPyramidId', newId);
      } else if (collaborationService) {
        collaborationService.updateData('selectedPyramidId', newId);
      }
    } else {
      setLocalSelectedPyramidId(newId);
    }
  };

  // 获取所有金字塔列表
  const fetchPyramids = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/pyramids`);
      
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error('服务器返回的不是JSON格式数据');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPyramids(result.data);
      } else {
        setError('获取金字塔列表失败: ' + result.message);
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 根据ID获取金字塔数据
  const fetchPyramidById = async (id) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/pyramids/${id}`);
      const result = await response.json();
      
      if (result.success) {
        const pyramid = result.data;
        updateLevels(pyramid.levels);
        updateLevelData(pyramid.levelData);
      } else {
        setError('获取金字塔数据失败: ' + result.message);
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 保存当前金字塔到后端
  const savePyramid = async () => {
    try {
      setLoading(true);
      setError('');
      
      const pyramidData = {
        name: `金字塔_${new Date().toLocaleString()}`,
        levels: levels,
        levelData: levelData
      };

      const response = await fetch(`${API_BASE_URL}/pyramids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pyramidData)
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchPyramids();
      } else {
        setError('保存金字塔失败: ' + result.message);
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 监听协同状态变化 - 优先使用blockContext
  useEffect(() => {
    const currentStatus = collaborationStatus || 'disconnected';
    console.log('🔄 协同状态变化:', currentStatus);
    setLocalCollaborationStatus(currentStatus);
  }, [collaborationStatus]);

  // 初始协同状态检查 - 使用blockContext
  useEffect(() => {
    if (isCollaborationEnabled) {
      console.log('🔍 初始协同状态检查:', {
        collaborationStatus,
        isCollaborationEnabled,
        hasCollaborationService: !!collaborationService,
        hasBlockContext: !!blockContext?.sharedData,
        microName,
        wsUrl
      });
      
      // 如果协同功能已启用，设置为连接中状态
      if (blockContext?.sharedData || collaborationService) {
        setLocalCollaborationStatus('connecting');
        console.log('🔄 设置初始状态为连接中');
      }
    }
  }, [isCollaborationEnabled, blockContext, collaborationService, microName, wsUrl]);

  // 组件挂载时获取金字塔列表
  useEffect(() => {
    fetchPyramids();
  }, []);

  const addLevel = () => {
    if (levels < 6) {
      const newLevel = {
        text: `层级 ${levels + 1}`,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      };
      const newLevelData = [...levelData, newLevel];
      updateLevelData(newLevelData);
      updateLevels(levels + 1);
    }
  };

  const removeLevel = () => {
    if (levels > 2) {
      const newLevelData = levelData.slice(0, -1);
      updateLevelData(newLevelData);
      updateLevels(levels - 1);
    }
  };

  const updateLevelText = (index, newText) => {
    const updatedData = [...levelData];
    updatedData[index].text = newText;
    updateLevelData(updatedData);
  };

  const updateLevelColor = (index, newColor) => {
    const updatedData = [...levelData];
    updatedData[index].color = newColor;
    updateLevelData(updatedData);
  };

  // 渲染金字塔层级 - 完美正三角形计算
  const renderPyramidLevel = (level, index) => {
    // 正三角形金字塔的数学计算
    const pyramidBaseWidth = 400; // 金字塔底部宽度（像素）
    const pyramidHeight = 300;    // 金字塔总高度（像素）
    
    // 计算当前层级的宽度：基于正三角形几何关系
    // 每层宽度 = 底层宽度 * (当前层数 / 总层数)
    const currentWidth = pyramidBaseWidth * ((index + 1) / levels);
    
    // 计算当前层级的高度：基于正三角形几何关系
    // 每层高度 = 总高度 / 总层数
    const layerHeight = pyramidHeight / levels;
    
    // 居中对齐
    const leftOffset = (pyramidBaseWidth - currentWidth) / 2;
    
    // 垂直堆叠：从底部开始，固定间距
    const topOffset = 2;
    
    return (
      <div
        key={index}
        style={{
          width: `${currentWidth}px`,
          height: `${layerHeight}px`,
          backgroundColor: level.color,
          margin: '0 auto',
          marginLeft: `${leftOffset}px`,
          marginTop: `${topOffset}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderBottom: index < levels - 1 ? '2px solid white' : 'none',
          transition: 'all 0.3s ease',
          zIndex: levels - index,
          borderRadius: '0', // 矩形层级，无圆角
        }}
      >
        <input
          type="text"
          value={level.text}
          onChange={(e) => updateLevelText(index, e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            outline: 'none',
            width: '80%',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            padding: '4px 8px',
          }}
        />
        <input
          type="color"
          value={level.color}
          onChange={(e) => updateLevelColor(index, e.target.value)}
          style={{
            position: 'absolute',
            right: '12px',
            top: '12px',
            width: '24px',
            height: '24px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ margin: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* 标题栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #d9d9d9'
      }}>
        <h2 style={{ margin: 0, color: '#262626' }}>SmartArt 金字塔</h2>
        {isCollaborationEnabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: localCollaborationStatus === 'connected' ? '#52c41a' : 
                              localCollaborationStatus === 'connecting' ? '#faad14' : '#ff4d4f'
            }} />
            <span style={{ color: '#666', fontSize: '14px' }}>
              协同: {localCollaborationStatus === 'connected' ? '已连接' : 
                    localCollaborationStatus === 'connecting' ? '连接中' : '已断开'}
              {onlineUsers && onlineUsers.length > 0 && 
                ` (${onlineUsers.length} 用户在线)`}
            </span>
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '20px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={removeLevel}
          disabled={levels <= 2}
          style={{
            padding: '8px 16px',
            backgroundColor: levels <= 2 ? '#f5f5f5' : '#ff4d4f',
            color: levels <= 2 ? '#bfbfbf' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: levels <= 2 ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          - 减少层级
        </button>
        <button
          onClick={addLevel}
          disabled={levels >= 6}
          style={{
            padding: '8px 16px',
            backgroundColor: levels >= 6 ? '#f5f5f5' : '#1890ff',
            color: levels >= 6 ? '#bfbfbf' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: levels >= 6 ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          + 增加层级
        </button>
      </div>


      {/* 金字塔显示区域 */}
      <div style={{ 
        textAlign: 'center',
        background: '#f8f9fa',
        width: '440px', // 金字塔宽度 + 左右边距
        height: '340px', // 金字塔高度 + 上下边距
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        position: 'relative',
        margin: '0 auto'
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '20px',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '16px', color: '#666' }}>加载中...</div>
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {levelData.map((level, index) => renderPyramidLevel(level, index))}
        </div>
      </div>
    </div>
  );
};

export default SimplePyramid;
