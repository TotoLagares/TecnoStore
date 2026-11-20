// Controller: Usuarios
const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async function list(req, res) {
  const users = await userService.list();
  res.json({ data: users });
});

exports.updateRole = asyncHandler(async function updateRole(req, res) {
  const user = await userService.updateRole(req.params.id, req.body.role, req.userId);
  const message = user.role === 'admin' ? 'Ahora es administrador' : 'Ya no es administrador';
  res.json({ data: user, message });
});
