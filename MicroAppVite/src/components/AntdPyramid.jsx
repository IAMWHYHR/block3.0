import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Input, 
  Select, 
  Space, 
  Row, 
  Col, 
  Typography, 
  ColorPicker,
  Divider,
  Alert,
  Spin,
  message
} from 'antd';
import { PlusOutlined, MinusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const AntdPyramid = (props) => {
  // 从 props 中获取协同相关的方法和数据
  const {
    // 新的统一接口
    collaborationService,
    collaborationStatus,
    onlineUsers,
    blockContext,
    microName,
    wsUrl,
    debugInfo,
    // 金字塔特定数据（向后兼容）
    pyramidProvider,
    pyramidSharedData,
    pyramidList,
    pyramidData,
    pyramidListData,
    pyramidOnlineUsers,
    pyramidCollaborationStatus,
    updatePyramidData,
    addPyramidToList,
    updatePyramidInList,
    removePyramidFromList,
    setPyramidUser,
    getRealTimeData,
    getRealTimeListData,
    isCollaborationEnabled: propsCollaborationEnabled
  } = props || {};

  // 检查是否启用了协同功能
  const isCollaborationEnabled = !!(collaborationService || (pyramidProvider && pyramidSharedData));

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

      setLevels(currentLevels);
      setLevelData(currentLevelData);
      setSelectedPyramidId(currentSelectedId);
      setPyramids(pyramidListData || []);
    } else {
      setLevels(localLevels);
      setLevelData(localLevelData);
      setSelectedPyramidId(localSelectedPyramidId);
      setPyramids(localPyramids);
    }
  }, [isCollaborationEnabled, pyramidData, pyramidListData, localLevels, localLevelData, localSelectedPyramidId, localPyramids, blockContext]);

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

  // 监听协同数据变化并实时更新UI
  useEffect(() => {
    if (isCollaborationEnabled && pyramidSharedData) {
      console.log('🔍 设置协同数据监听器');
      
      // 监听共享数据变化
      const handleDataChange = () => {
        console.log('📊 协同数据变化，更新UI');
        const currentLevels = blockContext?.sharedData?.getPyramidData('levels') || 3;
        const currentLevelData = blockContext?.sharedData?.getPyramidData('levelData') || [
          { text: '顶层', color: '#ff6b6b' },
          { text: '中层', color: '#4ecdc4' },
          { text: '底层', color: '#45b7d1' }
        ];
        const currentSelectedId = blockContext?.sharedData?.getPyramidData('selectedPyramidId') || '';

        setLevels(currentLevels);
        setLevelData(currentLevelData);
        setSelectedPyramidId(currentSelectedId);
      };

      // 监听列表数据变化
      const handleListChange = () => {
        console.log('📋 协同列表数据变化，更新UI');
        setPyramids(pyramidListData || []);
      };

      // 直接监听Yjs数据结构的变化
      if (pyramidSharedData.observe) {
        pyramidSharedData.observe(handleDataChange);
      }

      if (pyramidList && pyramidList.observe) {
        pyramidList.observe(handleListChange);
      }

      return () => {
        console.log('🧹 清理协同数据监听器');
        if (pyramidSharedData.unobserve) {
          pyramidSharedData.unobserve(handleDataChange);
        }
        if (pyramidList && pyramidList.unobserve) {
          pyramidList.unobserve(handleListChange);
        }
      };
    }
  }, [isCollaborationEnabled, pyramidSharedData, pyramidList, pyramidListData]);

  // 更新层数的协同方法
  const updateLevels = (newLevels) => {
    if (isCollaborationEnabled && updatePyramidData) {
      updatePyramidData('levels', newLevels);
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
        message.success('金字塔列表加载成功');
      } else {
        setError('获取金字塔列表失败: ' + result.message);
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
      message.error('获取金字塔列表失败');
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
        message.success('金字塔数据加载成功');
      } else {
        setError('获取金字塔数据失败: ' + result.message);
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
      message.error('获取金字塔数据失败');
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
        message.success('金字塔保存成功！');
      } else {
        setError('保存金字塔失败: ' + result.message);
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
      message.error('保存金字塔失败');
    } finally {
      setLoading(false);
    }
  };

  // 监听协同状态变化
  useEffect(() => {
    const currentStatus = collaborationStatus || pyramidCollaborationStatus || 'disconnected';
    console.log('🔄 协同状态变化:', currentStatus);
    setLocalCollaborationStatus(currentStatus);
  }, [collaborationStatus, pyramidCollaborationStatus]);

  // 初始协同状态检查
  useEffect(() => {
    if (isCollaborationEnabled) {
      console.log('🔍 初始协同状态检查:', {
        collaborationStatus,
        pyramidCollaborationStatus,
        isCollaborationEnabled,
        hasCollaborationService: !!collaborationService,
        hasProvider: !!pyramidProvider,
        hasSharedData: !!pyramidSharedData,
        microName,
        wsUrl
      });
      
      // 如果协同功能已启用，设置为连接中状态
      if (blockContext?.sharedData || collaborationService || (pyramidProvider && pyramidSharedData)) {
        setLocalCollaborationStatus('connecting');
        console.log('🔄 设置初始状态为连接中');
      }
    }
  }, [isCollaborationEnabled, blockContext, collaborationService, pyramidProvider, pyramidSharedData, microName, wsUrl]);

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
      message.success('层级添加成功');
    } else {
      message.warning('最多只能有6层');
    }
  };

  const removeLevel = () => {
    if (levels > 2) {
      const newLevelData = levelData.slice(0, -1);
      updateLevelData(newLevelData);
      updateLevels(levels - 1);
      message.success('层级删除成功');
    } else {
      message.warning('最少需要2层');
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

  // 渲染金字塔层级 - 正三角形计算
  const renderPyramidLevel = (level, index) => {
    // 正三角形金字塔的数学计算
    const baseWidth = 100; // 底层宽度（百分比）
    const topWidth = 20;   // 顶层最小宽度（百分比）
    
    // 计算当前层级的宽度：线性递减，形成正三角形
    const widthRatio = (levels - 1 - index) / (levels - 1); // 从1递减到0
    const currentWidth = topWidth + (baseWidth - topWidth) * widthRatio;
    
    // 每层高度：固定高度，确保整体协调
    const layerHeight = 50; // 每层高度（像素）
    
    // 居中对齐
    const leftOffset = (100 - currentWidth) / 2;
    
    // 垂直堆叠：无重叠，形成清晰的层级分隔
    const topOffset = index * layerHeight;
    
    return (
      <div
        key={index}
        style={{
          width: `${currentWidth}%`,
          height: `${layerHeight}px`,
          backgroundColor: level.color,
          margin: '0 auto',
          marginLeft: `${leftOffset}%`,
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
        <Input
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
        <ColorPicker
          value={level.color}
          onChange={(color) => updateLevelColor(index, color.toHexString())}
          style={{
            position: 'absolute',
            right: '12px',
            top: '12px',
          }}
          size="small"
        />
      </div>
    );
  };

  return (
    <Card 
      title={
        <Space>
          <Title level={3} style={{ margin: 0 }}>SmartArt 金字塔</Title>
          {isCollaborationEnabled && (
            <Space size="small">
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: localCollaborationStatus === 'connected' ? '#52c41a' : 
                                localCollaborationStatus === 'connecting' ? '#faad14' : '#ff4d4f'
              }} />
              <Text type="secondary">
                协同: {localCollaborationStatus === 'connected' ? '已连接' : 
                      localCollaborationStatus === 'connecting' ? '连接中' : '已断开'}
                {(onlineUsers || pyramidOnlineUsers) && (onlineUsers || pyramidOnlineUsers).length > 0 && 
                  ` (${(onlineUsers || pyramidOnlineUsers).length} 用户在线)`}
              </Text>
            </Space>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<MinusOutlined />}
            onClick={removeLevel}
            disabled={levels <= 2}
            type="primary"
            danger
          >
            减少层级
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={addLevel}
            disabled={levels >= 6}
            type="primary"
          >
            增加层级
          </Button>
        </Space>
      }
      style={{ margin: '20px' }}
    >
      {/* 金字塔选择器 */}
      <Card size="small" style={{ marginBottom: '20px' }}>
        <Title level={5}>选择金字塔模板</Title>
        <Space wrap>
          <Select
            value={selectedPyramidId}
            onChange={(value) => {
              updateSelectedPyramidId(value);
              if (value) {
                fetchPyramidById(value);
              }
            }}
            style={{ minWidth: 200 }}
            placeholder="选择金字塔模板..."
          >
            <Option value="">选择金字塔模板...</Option>
            {pyramids.map(pyramid => (
              <Option key={pyramid.id} value={pyramid.id}>
                {pyramid.name} ({pyramid.levels}层)
              </Option>
            ))}
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchPyramids}
            loading={loading}
          >
            刷新列表
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={savePyramid}
            loading={loading}
            type="primary"
          >
            保存当前金字塔
          </Button>
        </Space>
        {error && (
          <Alert
            message={error}
            type="error"
            style={{ marginTop: '10px' }}
            closable
            onClose={() => setError('')}
          />
        )}
      </Card>

      {/* 金字塔显示区域 */}
      <Card 
        style={{ 
          textAlign: 'center',
          background: '#f8f9fa',
          minHeight: levels * 50 + 60 + 'px', // 根据新的层级高度调整
          border: '1px solid #dee2e6'
        }}
      >
        <Spin spinning={loading}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            {levelData.map((level, index) => renderPyramidLevel(level, index))}
          </div>
        </Spin>
      </Card>

      <Divider />
      
      {/* 使用说明 */}
      <Card size="small">
        <Title level={5}>使用说明</Title>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>点击文本可直接编辑每层内容</li>
          <li>点击颜色选择器可更改每层颜色</li>
          <li>使用 +/- 按钮调整金字塔层级（2-6层）</li>
          <li>正三角形金字塔设计：每层都是矩形，整体构成正三角形</li>
          <li>层级之间有白色分隔线，层次分明</li>
          <li>底层最宽（100%），顶层最窄（20%），线性递减形成完美正三角形</li>
          <li>每层高度固定50px，确保整体比例协调</li>
          <li>选择模板可快速加载预设金字塔</li>
          <li>保存当前金字塔到后端数据库</li>
        </ul>
      </Card>
    </Card>
  );
};

export default AntdPyramid;
