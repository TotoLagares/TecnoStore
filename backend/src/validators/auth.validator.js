const { body } = require('express-validator');

// Formato de teléfono: dígitos, espacios, +, - y paréntesis. Lo reutiliza el
// validator de consultas.
const PHONE_REGEX = /^[0-9 +\-()]+$/;

const EMAIL_MSG = 'Email inválido';
const FIRST_NAME_MSG = 'El nombre debe tener entre 2 y 60 caracteres';
const LAST_NAME_MSG = 'El apellido debe tener entre 2 y 60 caracteres';
const PHONE_MSG = 'El teléfono debe tener entre 6 y 25 caracteres (dígitos, espacios, +, - y paréntesis)';
const PASSWORD_MSG = 'La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número';

// No usamos normalizeEmail(): altera direcciones de Gmail con puntos o "+".
// Solo sacamos espacios y pasamos a minúsculas.
function emailField(field) {
  return body(field, EMAIL_MSG).isString().bail().trim().toLowerCase().isEmail();
}

function passwordField(field) {
  return body(field, PASSWORD_MSG)
    .isString()
    .bail()
    .isLength({ min: 8 })
    .matches(/[A-Za-z]/)
    .matches(/[0-9]/);
}

exports.PHONE_REGEX = PHONE_REGEX;
exports.PHONE_MSG = PHONE_MSG;

exports.registerRules = [
  body('firstName', FIRST_NAME_MSG).isString().bail().trim().isLength({ min: 2, max: 60 }),
  body('lastName', LAST_NAME_MSG).isString().bail().trim().isLength({ min: 2, max: 60 }),
  emailField('email'),
  body('phone', PHONE_MSG).isString().bail().trim().isLength({ min: 6, max: 25 }).matches(PHONE_REGEX),
  passwordField('password'),
];

exports.loginRules = [
  emailField('email'),
  body('password', 'La contraseña es requerida').isString().bail().notEmpty(),
];

exports.updateMeRules = [
  body('firstName', FIRST_NAME_MSG).optional().isString().bail().trim().isLength({ min: 2, max: 60 }),
  body('lastName', LAST_NAME_MSG).optional().isString().bail().trim().isLength({ min: 2, max: 60 }),
  emailField('email').optional(),
  body('phone', PHONE_MSG).optional().isString().bail().trim().isLength({ min: 6, max: 25 }).matches(PHONE_REGEX),
  passwordField('newPassword').optional(),
  // Si viene newPassword, la contraseña actual es obligatoria.
  body('currentPassword', 'Ingresá tu contraseña actual para poder cambiarla')
    .if(body('newPassword').exists())
    .isString()
    .bail()
    .notEmpty(),
];

exports.forgotPasswordRules = [emailField('email')];

exports.resetPasswordRules = [
  body('token', 'El token es requerido').isString().bail().trim().notEmpty(),
  passwordField('newPassword'),
];

exports.confirmPasswordChangeRules = [
  body('token', 'El token es requerido').isString().bail().trim().notEmpty(),
];
