// Controller: Auth
// Ver contrato en specs/03-api-contract.md (sección Auth)
const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

exports.register = asyncHandler(async function register(req, res) {
  const user = await authService.register(req.body);
  res.status(201).json({ data: user, message: 'Cuenta creada correctamente' });
});

exports.login = asyncHandler(async function login(req, res) {
  const { token, user } = await authService.login(req.body);
  res.json({ data: { token, user }, message: 'Sesión iniciada correctamente' });
});

exports.me = asyncHandler(async function me(req, res) {
  const user = await authService.getById(req.userId);
  res.json({ data: user });
});

exports.updateMe = asyncHandler(async function updateMe(req, res) {
  const { user, passwordChangePending } = await authService.updateMe(req.userId, req.body);
  const message = passwordChangePending
    ? 'Te enviamos un mail para confirmar el cambio de contraseña'
    : 'Datos actualizados correctamente';
  res.json({ data: user, passwordChangePending, message });
});

exports.confirmPasswordChange = asyncHandler(async function confirmPasswordChange(req, res) {
  await authService.confirmPasswordChange(req.body.token);
  res.json({ message: 'Contraseña actualizada correctamente' });
});

exports.forgotPassword = asyncHandler(async function forgotPassword(req, res) {
  await authService.forgotPassword(req.body.email);
  // Mismo mensaje exista o no la cuenta (así no se puede averiguar qué emails están registrados).
  res.json({
    message: 'Si el email está registrado, te enviamos un correo con las instrucciones',
  });
});

exports.resetPassword = asyncHandler(async function resetPassword(req, res) {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.json({ message: 'Contraseña actualizada correctamente' });
});
