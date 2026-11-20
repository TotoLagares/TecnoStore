// Controller: Inquiries (consultas de contacto)
// Ver contrato en specs/03-api-contract.md (sección Consultas / Contacto)
const inquiryService = require('../services/inquiry.service');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async function create(req, res) {
  const inquiry = await inquiryService.create(req.body);
  res.status(201).json({ data: inquiry, message: 'Consulta enviada correctamente' });
});

exports.list = asyncHandler(async function list(req, res) {
  const result = await inquiryService.list(req.query);
  res.json({ data: result });
});

exports.getById = asyncHandler(async function getById(req, res) {
  const inquiry = await inquiryService.getById(req.params.id);
  res.json({ data: inquiry });
});

exports.updateStatus = asyncHandler(async function updateStatus(req, res) {
  const inquiry = await inquiryService.updateStatus(req.params.id, req.body.status);
  res.json({ data: inquiry, message: 'Estado de la consulta actualizado' });
});

exports.remove = asyncHandler(async function remove(req, res) {
  await inquiryService.remove(req.params.id);
  res.json({ message: 'Consulta eliminada correctamente' });
});
