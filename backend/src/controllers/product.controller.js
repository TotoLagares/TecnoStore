// Controller: Products
// Ver contrato en specs/03-api-contract.md (sección Productos / Publicaciones)
const productService = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { requireAuth } = require('../utils/authContext');

exports.listPublic = asyncHandler(async function listPublic(req, res) {
  const result = await productService.listPublic(req.query);
  res.json({ data: result });
});

exports.listAdmin = asyncHandler(async function listAdmin(req, res) {
  const result = await productService.listAdmin(req.query);
  res.json({ data: result });
});

exports.getById = asyncHandler(async function getById(req, res) {
  const product = await productService.getById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Publicación no encontrada');
  }
  const isPublic = await productService.isPublic(product);
  if (!isPublic) {
    // Publicación despublicada (o de una categoría inactiva): solo un admin
    // autenticado puede verla.
    await requireAuth(req);
  }
  res.json({ data: product });
});

exports.create = asyncHandler(async function create(req, res) {
  const product = await productService.create(req.body);
  res.status(201).json({ data: product, message: 'Publicación creada correctamente' });
});

exports.update = asyncHandler(async function update(req, res) {
  const product = await productService.update(req.params.id, req.body);
  res.json({ data: product, message: 'Publicación actualizada correctamente' });
});

exports.toggleActive = asyncHandler(async function toggleActive(req, res) {
  const product = await productService.toggleActive(req.params.id);
  res.json({
    data: product,
    message: product.isActive ? 'Publicación activada' : 'Publicación desactivada',
  });
});

exports.remove = asyncHandler(async function remove(req, res) {
  await productService.remove(req.params.id);
  res.json({ message: 'Publicación eliminada correctamente' });
});
