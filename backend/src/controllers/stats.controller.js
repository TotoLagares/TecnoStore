// Controller: Stats
// Ver contrato en specs/03-api-contract.md (sección Métricas)
const statsService = require('../services/stats.service');
const asyncHandler = require('../utils/asyncHandler');

exports.getSummary = asyncHandler(async function getSummary(req, res) {
  const summary = await statsService.getSummary();
  res.json({ data: summary });
});
