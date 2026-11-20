const { body, query } = require('express-validator');

const AVAILABILITY = ['disponible', 'agotado'];
const SORTS = ['recent', 'price_asc', 'price_desc', 'name_asc'];

const NAME_MSG = 'El nombre debe tener entre 3 y 120 caracteres';
const DESCRIPTION_MSG = 'La descripción debe tener entre 10 y 2000 caracteres';
const IMAGES_MSG = 'Debe incluir entre 1 y 8 imágenes';
const IMAGE_URL_MSG = 'Cada imagen debe ser una URL http(s) válida';
const PRICE_MSG = 'El precio debe ser un número mayor o igual a 0';

// Reglas para los query params de los listados (público y admin).
exports.listRules = [
  query('search').optional().isString().trim(),
  query('category').optional().isMongoId().withMessage('La categoría es inválida'),
  query('availability').optional().isIn(AVAILABILITY).withMessage('Disponibilidad inválida'),
  query('featured').optional().isIn(['true', 'false']).withMessage('featured debe ser true o false'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive debe ser true o false'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice debe ser un número mayor o igual a 0'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice debe ser un número mayor o igual a 0'),
  query('sort').optional().isIn(SORTS).withMessage('Orden inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un entero mayor o igual a 1'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit debe ser un entero mayor o igual a 1'),
];

exports.createRules = [
  body('name', NAME_MSG).isString().bail().trim().isLength({ min: 3, max: 120 }),
  body('category').isMongoId().withMessage('La categoría es inválida'),
  body('description', DESCRIPTION_MSG).isString().bail().trim().isLength({ min: 10, max: 2000 }),
  body('images', IMAGES_MSG).isArray({ min: 1, max: 8 }),
  body('images.*', IMAGE_URL_MSG).isString().bail().trim().isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body('price', PRICE_MSG).isFloat({ min: 0 }),
  body('availability').optional().isIn(AVAILABILITY).withMessage('Disponibilidad inválida'),
  body('featured').optional().isBoolean({ strict: true }).withMessage('featured debe ser booleano'),
  body('isActive').optional().isBoolean({ strict: true }).withMessage('isActive debe ser booleano'),
];

// Mismas reglas que en el alta, pero todos los campos son opcionales.
exports.updateRules = [
  body('name', NAME_MSG).optional().isString().bail().trim().isLength({ min: 3, max: 120 }),
  body('category').optional().isMongoId().withMessage('La categoría es inválida'),
  body('description', DESCRIPTION_MSG).optional().isString().bail().trim().isLength({ min: 10, max: 2000 }),
  body('images', IMAGES_MSG).optional().isArray({ min: 1, max: 8 }),
  body('images.*', IMAGE_URL_MSG).optional().isString().bail().trim().isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body('price', PRICE_MSG).optional().isFloat({ min: 0 }),
  body('availability').optional().isIn(AVAILABILITY).withMessage('Disponibilidad inválida'),
  body('featured').optional().isBoolean({ strict: true }).withMessage('featured debe ser booleano'),
  body('isActive').optional().isBoolean({ strict: true }).withMessage('isActive debe ser booleano'),
];
