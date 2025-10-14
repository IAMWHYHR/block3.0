const express = require('express');
const router = express.Router();
const pyramidController = require('../controllers/pyramidController');

// 金字塔路由
router.post('/', pyramidController.createPyramid);
router.get('/', pyramidController.getAllPyramids);
router.get('/:id', pyramidController.getPyramidById);
router.put('/:id', pyramidController.updatePyramid);
router.delete('/:id', pyramidController.deletePyramid);

module.exports = router;










