const express = require('express');
const router = express.Router();

const authController = require('../../controllers/auth.controller');
const verifyToken = require('../../middlewares/auth.middleware');
const validateRequest = require('../../utils/validateRequest');
const {
  registerRules,
  loginRules,
  updateMeRules,
  forgotPasswordRules,
  resetPasswordRules,
  confirmPasswordChangeRules,
} = require('../../validators/auth.validator');

router.post('/register', registerRules, validateRequest, authController.register);
router.post('/login', loginRules, validateRequest, authController.login);
router.get('/me', verifyToken, authController.me);
router.put('/me', verifyToken, updateMeRules, validateRequest, authController.updateMe);
router.post(
  '/forgot-password',
  forgotPasswordRules,
  validateRequest,
  authController.forgotPassword
);
router.post(
  '/reset-password',
  resetPasswordRules,
  validateRequest,
  authController.resetPassword
);

router.post(
  '/confirm-password-change',
  confirmPasswordChangeRules,
  validateRequest,
  authController.confirmPasswordChange
);

module.exports = router;
