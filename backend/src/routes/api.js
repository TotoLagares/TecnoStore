const express = require('express');
const router = express.Router();

router.use('/auth', require('./api/auth.route'));
router.use('/categories', require('./api/categories.route'));
router.use('/products', require('./api/products.route'));
router.use('/business-info', require('./api/businessInfo.route'));
router.use('/inquiries', require('./api/inquiries.route'));
router.use('/users', require('./api/users.route'));
router.use('/stats', require('./api/stats.route'));

module.exports = router;
