const { validationResult } = require('express-validator');

// Corta el request con 400 si alguna regla de express-validator falló.
// onlyFirstError: un solo mensaje por campo, aunque falle más de una regla.
module.exports = function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: errors.array({ onlyFirstError: true }).map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};
