// Controller: Business Info
// Ver contrato en specs/03-api-contract.md (sección Información institucional)
const businessInfoService = require('../services/businessInfo.service');
const asyncHandler = require('../utils/asyncHandler');

exports.get = asyncHandler(async function get(req, res) {
  const info = await businessInfoService.get();
  res.json({ data: info });
});

exports.upsert = asyncHandler(async function upsert(req, res) {
  const info = await businessInfoService.upsert(req.body);
  res.json({ data: info, message: 'Información del comercio actualizada correctamente' });
});
