const express = require('express');
const router = express.Router();

const statsController = require('../../controllers/stats.controller');
const verifyToken = require('../../middlewares/auth.middleware');
const requireAdmin = require('../../middlewares/requireAdmin.middleware');

router.get('/', verifyToken, requireAdmin, statsController.getSummary);

module.exports = router;
