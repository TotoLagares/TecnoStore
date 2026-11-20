const express = require('express');
const router = express.Router();

const inquiryController = require('../../controllers/inquiry.controller');
const verifyToken = require('../../middlewares/auth.middleware');
const requireAdmin = require('../../middlewares/requireAdmin.middleware');
const validateRequest = require('../../utils/validateRequest');
const { createRules, listRules, updateStatusRules } = require('../../validators/inquiry.validator');

router.post('/', createRules, validateRequest, inquiryController.create);
router.get('/', verifyToken, requireAdmin, listRules, validateRequest, inquiryController.list);
router.get('/:id', verifyToken, requireAdmin, inquiryController.getById);
router.patch(
  '/:id/status',
  verifyToken,
  requireAdmin,
  updateStatusRules,
  validateRequest,
  inquiryController.updateStatus
);
router.delete('/:id', verifyToken, requireAdmin, inquiryController.remove);

module.exports = router;
