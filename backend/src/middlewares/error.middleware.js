const ApiError = require('../utils/ApiError');

// Manejo centralizado de errores. Nunca se devuelven stack traces ni
// mensajes internos de MongoDB: el detalle solo se loguea en el servidor.
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  // JSON mal formado en el body (lo lanza express.json()).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la petición no es un JSON válido' });
  }

  // Body más grande que el límite de express.json() (100 kb por defecto).
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'El cuerpo de la petición es demasiado grande' });
  }

  // Id con formato inválido (por ejemplo /api/products/123).
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Identificador inválido' });
  }

  // Validaciones del schema de Mongoose.
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.kind === 'ObjectId' ? 'Identificador inválido' : e.message,
    }));
    return res.status(400).json({ message: 'Datos inválidos', errors });
  }

  // Índice único duplicado.
  if (err.code === 11000) {
    return res.status(409).json({ message: 'El recurso ya existe (dato duplicado)' });
  }

  console.error('[error]', err);
  return res.status(500).json({ message: 'Error interno del servidor' });
};
