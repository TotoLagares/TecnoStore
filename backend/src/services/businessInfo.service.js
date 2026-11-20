// Service: Business Info
// Ver contrato en specs/03-api-contract.md (sección Información institucional)
//
// BusinessInfo es un documento singleton: nunca hay más de uno. `get` no lo
// crea (businessName es requerido y no tenemos un valor razonable para
// inventar), pero `upsert` sí, así el primer PUT del admin lo da de alta.

const BusinessInfo = require('../models/BusinessInfo');

// Allowlist de las redes sociales: se ignora cualquier otra clave.
function pickSocialMedia(socialMedia) {
  return {
    instagram: socialMedia.instagram,
    facebook: socialMedia.facebook,
    whatsapp: socialMedia.whatsapp,
  };
}

exports.get = async function get() {
  return BusinessInfo.findOne();
};

exports.upsert = async function upsert(data) {
  const existing = await BusinessInfo.findOne();

  const payload = {
    businessName: data.businessName,
    ...(data.description !== undefined && { description: data.description }),
    ...(data.address !== undefined && { address: data.address }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.socialMedia !== undefined && { socialMedia: pickSocialMedia(data.socialMedia) }),
    ...(data.businessHours !== undefined && { businessHours: data.businessHours }),
  };

  if (!existing) {
    return BusinessInfo.create(payload);
  }

  Object.assign(existing, payload);
  await existing.save();
  return existing;
};
