const { body } = require('express-validator');

const NAME_MSG = 'El nombre debe tener entre 2 y 50 caracteres';
const DESCRIPTION_MSG = 'La descripción puede tener hasta 300 caracteres';

exports.createRules = [
  body('name', NAME_MSG).isString().bail().trim().isLength({ min: 2, max: 50 }),
  body('description', DESCRIPTION_MSG).optional().isString().bail().trim().isLength({ max: 300 }),
  body('isActive').optional().isBoolean({ strict: true }).withMessage('isActive debe ser booleano'),
];

exports.updateRules = [
  body('name', NAME_MSG).optional().isString().bail().trim().isLength({ min: 2, max: 50 }),
  body('description', DESCRIPTION_MSG).optional().isString().bail().trim().isLength({ max: 300 }),
  body('isActive').optional().isBoolean({ strict: true }).withMessage('isActive debe ser booleano'),
];
