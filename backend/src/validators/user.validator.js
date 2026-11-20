const { body } = require('express-validator');

exports.updateRoleRules = [
  body('role', 'El rol tiene que ser "admin" o "cliente"').isIn(['admin', 'cliente']),
];
