const { body } = require('express-validator');
const { PHONE_REGEX, PHONE_MSG } = require('./auth.validator');

const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true };

exports.upsertRules = [
  body('businessName', 'El nombre del comercio debe tener entre 2 y 80 caracteres')
    .isString()
    .bail()
    .trim()
    .isLength({ min: 2, max: 80 }),
  // values: 'falsy' -> en description, address, phone, email y las redes se
  // acepta el string vacío para borrar el dato.
  body('description', 'La descripción puede tener hasta 1000 caracteres')
    .optional({ values: 'falsy' })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 1000 }),
  body('address', 'La dirección puede tener hasta 150 caracteres')
    .optional({ values: 'falsy' })
    .isString()
    .bail()
    .trim()
    .isLength({ max: 150 }),
  body('phone', PHONE_MSG)
    .optional({ values: 'falsy' })
    .isString()
    .bail()
    .trim()
    .isLength({ min: 6, max: 25 })
    .matches(PHONE_REGEX),
  body('email', 'Email inválido')
    .optional({ values: 'falsy' })
    .isString()
    .bail()
    .trim()
    .toLowerCase()
    .isEmail(),

  body('socialMedia', 'socialMedia debe ser un objeto').optional().isObject(),
  body('socialMedia.instagram', 'La URL de Instagram es inválida')
    .optional({ values: 'falsy' })
    .isString()
    .bail()
    .trim()
    .isURL(URL_OPTIONS),
  body('socialMedia.facebook', 'La URL de Facebook es inválida')
    .optional({ values: 'falsy' })
    .isString()
    .bail()
    .trim()
    .isURL(URL_OPTIONS),
  body('socialMedia.whatsapp', 'El WhatsApp debe tener entre 8 y 15 dígitos, sin espacios ni símbolos')
    .optional({ values: 'falsy' })
    .isString()
    .bail()
    .trim()
    .matches(/^[0-9]{8,15}$/),

  body('businessHours', 'Los horarios deben ser una lista de hasta 10 elementos')
    .optional()
    .isArray({ max: 10 }),
  body('businessHours.*', 'Cada horario debe ser un texto de hasta 60 caracteres')
    .isString()
    .bail()
    .trim()
    .isLength({ max: 60 }),
];
