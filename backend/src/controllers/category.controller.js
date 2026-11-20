// Controller: Categories
// Ver contrato en specs/03-api-contract.md (sección Categorías)
const categoryService = require('../services/category.service');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../utils/authContext');

exports.list = asyncHandler(async function list(req, res) {
  const all = req.query.all === 'true';
  if (all) {
    // GET /?all=true está 🔒 según el contrato, pero la ruta es pública
    // (así el visitante no necesita token para el caso normal).
    await requireAuth(req);
  }
  const categories = await categoryService.list({ all });
  res.json({ data: categories });
});

exports.getById = asyncHandler(async function getById(req, res) {
  const category = await categoryService.getById(req.params.id);
  if (!category.isActive) {
    // Categoría inactiva: solo un admin autenticado puede verla.
    await requireAuth(req);
  }
  res.json({ data: category });
});

exports.create = asyncHandler(async function create(req, res) {
  const category = await categoryService.create(req.body);
  res.status(201).json({ data: category, message: 'Categoría creada correctamente' });
});

exports.update = asyncHandler(async function update(req, res) {
  const category = await categoryService.update(req.params.id, req.body);
  res.json({ data: category, message: 'Categoría actualizada correctamente' });
});

exports.remove = asyncHandler(async function remove(req, res) {
  await categoryService.remove(req.params.id);
  res.json({ message: 'Categoría eliminada correctamente' });
});
