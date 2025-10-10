const fs = require('fs');
const path = require('path');

class PyramidModel {
  constructor() {
    this.dataPath = path.join(__dirname, '../../database/pyramids.json');
    this.initDataFile();
  }

  initDataFile() {
    // 确保数据库目录存在
    const dbDir = path.dirname(this.dataPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // 如果数据文件不存在，创建空数组
    if (!fs.existsSync(this.dataPath)) {
      fs.writeFileSync(this.dataPath, JSON.stringify([], null, 2));
      console.log('金字塔数据文件初始化成功');
    } else {
      console.log('金字塔数据文件已存在');
    }
  }

  readData() {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('读取数据失败:', err.message);
      return [];
    }
  }

  writeData(data) {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      console.error('写入数据失败:', err.message);
      return false;
    }
  }

  // 创建金字塔
  createPyramid(name, levels, levelData) {
    try {
      const id = require('uuid').v4();
      const pyramids = this.readData();
      
      const newPyramid = {
        id,
        name,
        levels,
        levelData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      pyramids.push(newPyramid);
      this.writeData(pyramids);
      
      return { id, name, levels, levelData };
    } catch (err) {
      throw err;
    }
  }

  // 获取所有金字塔
  getAllPyramids() {
    try {
      const pyramids = this.readData();
      return pyramids.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      throw err;
    }
  }

  // 根据ID获取金字塔
  getPyramidById(id) {
    try {
      const pyramids = this.readData();
      return pyramids.find(pyramid => pyramid.id === id) || null;
    } catch (err) {
      throw err;
    }
  }

  // 更新金字塔
  updatePyramid(id, name, levels, levelData) {
    try {
      const pyramids = this.readData();
      const index = pyramids.findIndex(pyramid => pyramid.id === id);
      
      if (index === -1) {
        throw new Error('金字塔不存在');
      }
      
      pyramids[index] = {
        ...pyramids[index],
        name,
        levels,
        levelData,
        updatedAt: new Date().toISOString()
      };
      
      this.writeData(pyramids);
      return { id, name, levels, levelData };
    } catch (err) {
      throw err;
    }
  }

  // 删除金字塔
  deletePyramid(id) {
    try {
      const pyramids = this.readData();
      const index = pyramids.findIndex(pyramid => pyramid.id === id);
      
      if (index === -1) {
        throw new Error('金字塔不存在');
      }
      
      pyramids.splice(index, 1);
      this.writeData(pyramids);
      
      return { id };
    } catch (err) {
      throw err;
    }
  }
}

module.exports = PyramidModel;
