const express = require('express');
const router = express.Router();

const businessInfoController = require('../../controllers/businessInfo.controller');
const verifyToken = require('../../middlewares/auth.middleware');
const requireAdmin = require('../../middlewares/requireAdmin.middleware');
const validateRequest = require('../../utils/validateRequest');
const { upsertRules } = require('../../validators/businessInfo.validator');

router.get('/', businessInfoController.get);
router.put('/', verifyToken, requireAdmin, upsertRules, validateRequest, businessInfoController.upsert);

module.exports = router;
