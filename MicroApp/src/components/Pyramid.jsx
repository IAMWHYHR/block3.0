import React, { useState, useEffect } from 'react';

const Pyramid = () => {
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

  // API 基础URL
  const API_BASE_URL = 'http://localhost:3000/api';

  // 获取所有金字塔列表
  const fetchPyramids = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/pyramids`);
      const result = await response.json();
      
      if (result.success) {
        setPyramids(result.data);
        console.log('获取金字塔列表成功:', result.data);
      } else {
        setError('获取金字塔列表失败: ' + result.message);
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
      console.error('获取金字塔列表失败:', err);
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
        setLevels(pyramid.levels);
        setLevelData(pyramid.levelData);
        console.log('获取金字塔数据成功:', pyramid);
      } else {
        setError('获取金字塔数据失败: ' + result.message);
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
      console.error('获取金字塔数据失败:', err);
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
        console.log('保存金字塔成功:', result.data);
        // 重新获取金字塔列表
        await fetchPyramids();
        alert('金字塔保存成功！');
      } else {
        setError('保存金字塔失败: ' + result.message);
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
      console.error('保存金字塔失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取金字塔列表
  useEffect(() => {
    fetchPyramids();
  }, []);

  const addLevel = () => {
    if (levels < 6) { // 限制最大层级
      const newLevel = {
        text: `层级 ${levels + 1}`,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      };
      setLevelData([...levelData, newLevel]);
      setLevels(levels + 1);
    }
  };

  const removeLevel = () => {
    if (levels > 2) { // 限制最小层级
      setLevelData(levelData.slice(0, -1));
      setLevels(levels - 1);
    }
  };

  const updateLevelText = (index, newText) => {
    const updatedData = [...levelData];
    updatedData[index].text = newText;
    setLevelData(updatedData);
  };

  const updateLevelColor = (index, newColor) => {
    const updatedData = [...levelData];
    updatedData[index].color = newColor;
    setLevelData(updatedData);
  };

  const renderPyramidLevel = (level, index) => {
    const width = 100 - (index * 15); // 每层递减15%
    const height = 60 / levels; // 根据层级数量调整高度
    
    return (
      <div
        key={index}
        style={{
          width: `${width}%`,
          height: `${height}vh`,
          backgroundColor: level.color,
          margin: '0 auto',
          marginBottom: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          position: 'relative',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease'
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
            width: '80%'
          }}
        />
        <input
          type="color"
          value={level.color}
          onChange={(e) => updateLevelColor(index, e.target.value)}
          style={{
            position: 'absolute',
            right: '5px',
            top: '5px',
            width: '20px',
            height: '20px',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '2px solid #e9ecef'
      }}>
        <h3 style={{ margin: 0, color: '#495057' }}>SmartArt 金字塔</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={removeLevel}
            disabled={levels <= 2}
            style={{
              padding: '8px 16px',
              backgroundColor: levels <= 2 ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: levels <= 2 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            - 减少层级
          </button>
          <button
            onClick={addLevel}
            disabled={levels >= 6}
            style={{
              padding: '8px 16px',
              backgroundColor: levels >= 6 ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: levels >= 6 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            + 增加层级
          </button>
        </div>
      </div>

      {/* 金字塔选择器 */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>选择金字塔模板</h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedPyramidId}
            onChange={(e) => {
              setSelectedPyramidId(e.target.value);
              if (e.target.value) {
                fetchPyramidById(e.target.value);
              }
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ced4da',
              fontSize: '14px',
              minWidth: '200px'
            }}
          >
            <option value="">选择金字塔模板...</option>
            {pyramids.map(pyramid => (
              <option key={pyramid.id} value={pyramid.id}>
                {pyramid.name} ({pyramid.levels}层)
              </option>
            ))}
          </select>
          <button
            onClick={fetchPyramids}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {loading ? '加载中...' : '刷新列表'}
          </button>
          <button
            onClick={savePyramid}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {loading ? '保存中...' : '保存当前金字塔'}
          </button>
        </div>
        {error && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '300px',
        justifyContent: 'center'
      }}>
        {levelData.map((level, index) => renderPyramidLevel(level, index))}
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px',
        backgroundColor: '#e9ecef',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#6c757d'
      }}>
        <strong>使用说明：</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>点击文本可直接编辑每层内容</li>
          <li>点击颜色选择器可更改每层颜色</li>
          <li>使用 +/- 按钮调整金字塔层级（2-6层）</li>
          <li>金字塔会自动调整大小和间距</li>
          <li>选择模板可快速加载预设金字塔</li>
          <li>保存当前金字塔到后端数据库</li>
        </ul>
      </div>
    </div>
  );
};

export default Pyramid;







