const PyramidModel = require('../models/Pyramid');

async function initDatabase() {
  console.log('🔄 初始化数据库...');
  
  try {
    const pyramidModel = new PyramidModel();
    
    // 等待一下让表创建完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 创建一些示例数据
    const samplePyramids = [
      {
        name: '默认金字塔',
        levels: 3,
        levelData: [
          { text: '顶层', color: '#ff6b6b' },
          { text: '中层', color: '#4ecdc4' },
          { text: '底层', color: '#45b7d1' }
        ]
      },
      {
        name: '组织架构',
        levels: 4,
        levelData: [
          { text: 'CEO', color: '#8e44ad' },
          { text: '部门经理', color: '#3498db' },
          { text: '团队负责人', color: '#2ecc71' },
          { text: '普通员工', color: '#f39c12' }
        ]
      },
      {
        name: '产品层次',
        levels: 5,
        levelData: [
          { text: '核心功能', color: '#e74c3c' },
          { text: '主要功能', color: '#e67e22' },
          { text: '辅助功能', color: '#f1c40f' },
          { text: '扩展功能', color: '#2ecc71' },
          { text: '未来功能', color: '#3498db' }
        ]
      }
    ];

    console.log('📊 创建示例数据...');
    
    for (const pyramid of samplePyramids) {
      try {
        await pyramidModel.createPyramid(
          pyramid.name,
          pyramid.levels,
          pyramid.levelData
        );
        console.log(`✅ 创建示例金字塔: ${pyramid.name}`);
      } catch (error) {
        console.log(`⚠️  跳过重复数据: ${pyramid.name}`);
      }
    }
    
    console.log('🎉 数据库初始化完成!');
    
    // 显示所有数据
    const allPyramids = await pyramidModel.getAllPyramids();
    console.log(`📈 当前数据库中共有 ${allPyramids.length} 个金字塔`);
    
    // JSON 文件存储不需要关闭连接
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
