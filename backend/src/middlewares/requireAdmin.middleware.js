const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// Va después de verifyToken: deja pasar solo a los usuarios con rol admin.
// El rol se lee de la base (no del token), así cuando un admin le da o le
// quita el permiso a alguien, vale en el momento, sin volver a iniciar sesión.
module.exports = async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'admin') {
      return next(new ApiError(403, 'No tenés permisos de administrador'));
    }
    next();
  } catch (err) {
    next(err);
  }
};
