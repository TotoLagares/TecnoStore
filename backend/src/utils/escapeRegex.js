// Escapa los caracteres especiales de las expresiones regulares, para poder
// usar el texto que escribe el usuario dentro de un RegExp sin riesgo
// (por ejemplo, que "c++" o ".*" se busquen literalmente).
module.exports = function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
