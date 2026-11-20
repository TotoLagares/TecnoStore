const express = require('express');
const router = express.Router();

const productController = require('../../controllers/product.controller');
const verifyToken = require('../../middlewares/auth.middleware');
const requireAdmin = require('../../middlewares/requireAdmin.middleware');
const validateRequest = require('../../utils/validateRequest');
const { listRules, createRules, updateRules } = require('../../validators/product.validator');

router.get('/', listRules, validateRequest, productController.listPublic);
router.get('/admin', verifyToken, requireAdmin, listRules, validateRequest, productController.listAdmin);
router.get('/:id', productController.getById);
router.post('/', verifyToken, requireAdmin, createRules, validateRequest, productController.create);
router.put('/:id', verifyToken, requireAdmin, updateRules, validateRequest, productController.update);
router.patch('/:id/toggle-active', verifyToken, requireAdmin, productController.toggleActive);
router.delete('/:id', verifyToken, requireAdmin, productController.remove);

module.exports = router;
