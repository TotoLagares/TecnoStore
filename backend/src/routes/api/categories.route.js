const express = require('express');
const router = express.Router();

const categoryController = require('../../controllers/category.controller');
const verifyToken = require('../../middlewares/auth.middleware');
const requireAdmin = require('../../middlewares/requireAdmin.middleware');
const validateRequest = require('../../utils/validateRequest');
const { createRules, updateRules } = require('../../validators/category.validator');

router.get('/', categoryController.list);
router.get('/:id', categoryController.getById);
router.post('/', verifyToken, requireAdmin, createRules, validateRequest, categoryController.create);
router.put('/:id', verifyToken, requireAdmin, updateRules, validateRequest, categoryController.update);
router.delete('/:id', verifyToken, requireAdmin, categoryController.remove);

module.exports = router;
