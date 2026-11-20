// Service: Usuarios (panel de cuentas registradas)
// Un admin ve todas las cuentas y puede darles o quitarles el rol de admin.

const User = require('../models/User');
const ApiError = require('../utils/ApiError');

exports.list = async function list() {
  return User.find()
    .select('firstName lastName email phone role createdAt')
    .sort({ createdAt: -1 });
};

exports.updateRole = async function updateRole(id, role, currentUserId) {
  // Así un admin no puede sacarse el permiso a sí mismo por error
  // (y siempre queda al menos un admin).
  if (String(id) === String(currentUserId)) {
    throw new ApiError(400, 'No podés cambiar tu propio rol');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }

  user.role = role;
  await user.save();
  return user;
};
