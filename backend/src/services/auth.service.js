// Service: Auth
// Ver contrato en specs/03-api-contract.md (sección Auth)

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const mailService = require('./mail.service');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
}

// Lanza 409 si el email ya lo usa otra cuenta (excludeId: la cuenta propia).
async function assertEmailAvailable(email, excludeId) {
  const filter = { email };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await User.findOne(filter);
  if (existing) {
    throw new ApiError(409, 'Ya existe una cuenta registrada con ese email');
  }
}

exports.register = async function register(data) {
  await assertEmailAvailable(data.email);

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    passwordHash,
  });

  return user;
};

exports.login = async function login(credentials) {
  const user = await User.findOne({ email: credentials.email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  const matches = await bcrypt.compare(credentials.password, user.passwordHash);
  if (!matches) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  const token = signToken(user);
  user.passwordHash = undefined;

  return { token, user };
};

exports.getById = async function getById(id) {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }
  return user;
};

exports.updateMe = async function updateMe(id, data) {
  const user = await User.findById(id).select('+passwordHash');
  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }

  if (data.email !== undefined && data.email !== user.email) {
    await assertEmailAvailable(data.email, user._id);
    user.email = data.email;
  }
  if (data.firstName !== undefined) user.firstName = data.firstName;
  if (data.lastName !== undefined) user.lastName = data.lastName;
  if (data.phone !== undefined) user.phone = data.phone;

  // Cambio de contraseña: no se aplica directamente. Se guarda como pendiente
  // y se manda un mail con un link para confirmarlo.
  let rawChangeToken = null;
  if (data.newPassword !== undefined) {
    // Para cambiar la contraseña hay que confirmar la actual.
    const matches = await bcrypt.compare(data.currentPassword || '', user.passwordHash);
    if (!matches) {
      throw new ApiError(400, 'La contraseña actual es incorrecta');
    }
    rawChangeToken = crypto.randomBytes(32).toString('hex');
    user.pendingPasswordHash = await bcrypt.hash(data.newPassword, 10);
    user.passwordChangeToken = hashToken(rawChangeToken);
    user.passwordChangeExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  }

  await user.save();

  if (rawChangeToken) {
    try {
      await mailService.sendPasswordChangeConfirmation(user, rawChangeToken);
    } catch (err) {
      console.error('[mail] No se pudo enviar el mail de confirmación de contraseña:', err.message);
      throw new ApiError(502, 'No pudimos enviar el mail de confirmación. Probá de nuevo en unos minutos.');
    }
  }

  user.passwordHash = undefined;
  user.pendingPasswordHash = undefined;
  user.passwordChangeToken = undefined;
  user.passwordChangeExpires = undefined;

  return { user, passwordChangePending: Boolean(rawChangeToken) };
};

// Aplica el cambio de contraseña pendiente (link del mail). Token de un solo uso.
exports.confirmPasswordChange = async function confirmPasswordChange(token) {
  const user = await User.findOne({
    passwordChangeToken: hashToken(token),
    passwordChangeExpires: { $gt: new Date() },
  }).select('+passwordHash +pendingPasswordHash +passwordChangeToken +passwordChangeExpires');

  if (!user || !user.pendingPasswordHash) {
    throw new ApiError(400, 'El enlace es inválido o ya expiró');
  }

  user.passwordHash = user.pendingPasswordHash;
  user.pendingPasswordHash = undefined;
  user.passwordChangeToken = undefined;
  user.passwordChangeExpires = undefined;
  await user.save();

  return true;
};

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// No revela si el email existe: el controller responde siempre lo mismo.
exports.forgotPassword = async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user) {
    return;
  }

  // En la base se guarda solo el hash del token; el token "crudo" viaja por mail.
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.resetToken = hashToken(rawToken);
  user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  try {
    await mailService.sendPasswordReset(user, rawToken);
  } catch (err) {
    // El error se loguea en el servidor; al cliente no se le dice nada distinto.
    console.error('[mail] No se pudo enviar el mail de recuperación:', err.message);
  }
};

exports.resetPassword = async function resetPassword(token, newPassword) {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    resetToken: hashedToken,
    resetTokenExpires: { $gt: new Date() },
  }).select('+passwordHash +resetToken +resetTokenExpires');

  if (!user) {
    throw new ApiError(400, 'El token es inválido o ya expiró');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  // Token de un solo uso: se borra apenas se usa.
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  return true;
};
