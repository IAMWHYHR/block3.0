const PyramidModel = require('../models/Pyramid');

class PyramidController {
  constructor() {
    this.pyramidModel = new PyramidModel();
  }

  // 创建金字塔
  async createPyramid(req, res) {
    try {
      const { name, levels, levelData } = req.body;
      
      // 验证数据
      if (!name || !levels || !levelData) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: name, levels, levelData'
        });
      }

      if (!Array.isArray(levelData) || levelData.length !== levels) {
        return res.status(400).json({
          success: false,
          message: 'levelData 必须是数组且长度等于 levels'
        });
      }

      const pyramid = await this.pyramidModel.createPyramid(name, levels, levelData);
      
      res.status(201).json({
        success: true,
        message: '金字塔创建成功',
        data: pyramid
      });
    } catch (error) {
      console.error('创建金字塔失败:', error);
      res.status(500).json({
        success: false,
        message: '创建金字塔失败',
        error: error.message
      });
    }
  }

  // 获取所有金字塔
  async getAllPyramids(req, res) {
    try {
      const pyramids = await this.pyramidModel.getAllPyramids();
      
      res.json({
        success: true,
        message: '获取金字塔列表成功',
        data: pyramids
      });
    } catch (error) {
      console.error('获取金字塔列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取金字塔列表失败',
        error: error.message
      });
    }
  }

  // 根据ID获取金字塔
  async getPyramidById(req, res) {
    try {
      const { id } = req.params;
      const pyramid = await this.pyramidModel.getPyramidById(id);
      
      if (!pyramid) {
        return res.status(404).json({
          success: false,
          message: '金字塔不存在'
        });
      }
      
      res.json({
        success: true,
        message: '获取金字塔成功',
        data: pyramid
      });
    } catch (error) {
      console.error('获取金字塔失败:', error);
      res.status(500).json({
        success: false,
        message: '获取金字塔失败',
        error: error.message
      });
    }
  }

  // 更新金字塔
  async updatePyramid(req, res) {
    try {
      const { id } = req.params;
      const { name, levels, levelData } = req.body;
      
      // 验证数据
      if (!name || !levels || !levelData) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: name, levels, levelData'
        });
      }

      if (!Array.isArray(levelData) || levelData.length !== levels) {
        return res.status(400).json({
          success: false,
          message: 'levelData 必须是数组且长度等于 levels'
        });
      }

      const pyramid = await this.pyramidModel.updatePyramid(id, name, levels, levelData);
      
      res.json({
        success: true,
        message: '金字塔更新成功',
        data: pyramid
      });
    } catch (error) {
      console.error('更新金字塔失败:', error);
      if (error.message === '金字塔不存在') {
        return res.status(404).json({
          success: false,
          message: '金字塔不存在'
        });
      }
      res.status(500).json({
        success: false,
        message: '更新金字塔失败',
        error: error.message
      });
    }
  }

  // 删除金字塔
  async deletePyramid(req, res) {
    try {
      const { id } = req.params;
      await this.pyramidModel.deletePyramid(id);
      
      res.json({
        success: true,
        message: '金字塔删除成功'
      });
    } catch (error) {
      console.error('删除金字塔失败:', error);
      if (error.message === '金字塔不存在') {
        return res.status(404).json({
          success: false,
          message: '金字塔不存在'
        });
      }
      res.status(500).json({
        success: false,
        message: '删除金字塔失败',
        error: error.message
      });
    }
  }
}

// 创建控制器实例
const pyramidController = new PyramidController();

// 导出控制器方法
module.exports = {
  createPyramid: pyramidController.createPyramid.bind(pyramidController),
  getAllPyramids: pyramidController.getAllPyramids.bind(pyramidController),
  getPyramidById: pyramidController.getPyramidById.bind(pyramidController),
  updatePyramid: pyramidController.updatePyramid.bind(pyramidController),
  deletePyramid: pyramidController.deletePyramid.bind(pyramidController)
};


