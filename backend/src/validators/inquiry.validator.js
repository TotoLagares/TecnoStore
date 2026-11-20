const { body, query } = require('express-validator');
const { PHONE_REGEX, PHONE_MSG } = require('./auth.validator');

const STATUSES = ['pendiente', 'leida', 'respondida'];

exports.createRules = [
  body('name', 'El nombre debe tener entre 2 y 80 caracteres').isString().bail().trim().isLength({ min: 2, max: 80 }),
  body('email', 'Email inválido').isString().bail().trim().toLowerCase().isEmail(),
  body('phone', PHONE_MSG)
    .optional({ values: 'falsy' })
    .isString()
    .bail()
    .trim()
    .isLength({ min: 6, max: 25 })
    .matches(PHONE_REGEX),
  body('subject', 'El asunto debe tener entre 3 y 120 caracteres').isString().bail().trim().isLength({ min: 3, max: 120 }),
  body('message', 'El mensaje debe tener entre 10 y 2000 caracteres').isString().bail().trim().isLength({ min: 10, max: 2000 }),
];

exports.listRules = [
  query('status').optional().isIn(STATUSES).withMessage('Estado inválido'),
  query('search').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero mayor o igual a 1'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit debe ser un entero mayor o igual a 1'),
];

exports.updateStatusRules = [
  body('status').isIn(STATUSES).withMessage('Estado inválido'),
];
