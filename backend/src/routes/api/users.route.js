const express = require('express');
const router = express.Router();

const userController = require('../../controllers/user.controller');
const verifyToken = require('../../middlewares/auth.middleware');
const requireAdmin = require('../../middlewares/requireAdmin.middleware');
const validateRequest = require('../../utils/validateRequest');
const { updateRoleRules } = require('../../validators/user.validator');

router.get('/', verifyToken, requireAdmin, userController.list);
router.patch(
  '/:id/role',
  verifyToken,
  requireAdmin,
  updateRoleRules,
  validateRequest,
  userController.updateRole
);

module.exports = router;
