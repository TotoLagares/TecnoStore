const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const ApiError = require('./ApiError');
const User = require('../models/User');

// Helper para endpoints con auth condicional (p. ej. rutas públicas que
// cambian de comportamiento si el visitante manda un token de admin).
// No reemplaza a `verifyToken`: ese sigue siendo el middleware para rutas
// que son 🔒 siempre.

function getAuthUser(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) return null;

  try {
    const decoded = jwt.verify(token, jwtSecret);
    return { id: decoded.id, role: decoded.role };
  } catch (e) {
    return null;
  }
}

// Exige un admin: sin token → 401; con cuenta de cliente → 403.
// Igual que requireAdmin, el rol se lee de la base.
async function requireAuth(req) {
  const user = getAuthUser(req);
  if (!user) {
    throw new ApiError(401, 'Se requiere autenticación');
  }
  const dbUser = await User.findById(user.id).select('role');
  if (!dbUser || dbUser.role !== 'admin') {
    throw new ApiError(403, 'No tenés permisos de administrador');
  }
  return user;
}

module.exports = { getAuthUser, requireAuth };
