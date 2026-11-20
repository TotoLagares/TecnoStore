// Service: Inquiries (consultas de contacto)
// Ver contrato en specs/03-api-contract.md (sección Consultas / Contacto)

const Inquiry = require('../models/Inquiry');
const BusinessInfo = require('../models/BusinessInfo');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');
const mailService = require('./mail.service');
const { businessEmail } = require('../config/env');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Destinatario de los avisos: el email del comercio o, si no hay, BUSINESS_EMAIL del .env.
async function getNotificationEmail() {
  const info = await BusinessInfo.findOne().select('email');
  return (info && info.email) || businessEmail;
}

// Aviso al comercio. Si no hay destinatario configurado, no se envía.
async function sendNotification(inquiry) {
  const toEmail = await getNotificationEmail();
  if (!toEmail) {
    console.warn('[mail] No hay email del comercio ni BUSINESS_EMAIL: no se envía el aviso de la consulta.');
    return;
  }
  await mailService.sendInquiryNotification(inquiry, toEmail);
}

// Los mails se mandan después de guardar y EN PARALELO (así la respuesta tarda
// lo que el más lento, no la suma de los dos). Promise.allSettled espera a
// ambos aunque uno falle; los errores se loguean y la consulta queda guardada igual.
async function sendInquiryMails(inquiry) {
  const [notification, confirmation] = await Promise.allSettled([
    sendNotification(inquiry),
    mailService.sendInquiryConfirmation(inquiry),
  ]);

  if (notification.status === 'rejected') {
    console.error('[mail] No se pudo enviar el aviso de la consulta al comercio:', notification.reason.message);
  }
  if (confirmation.status === 'rejected') {
    console.error('[mail] No se pudo enviar la confirmación al visitante:', confirmation.reason.message);
  }
}

exports.create = async function create(data) {
  const inquiry = await Inquiry.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    subject: data.subject,
    message: data.message,
  });

  await sendInquiryMails(inquiry);
  return inquiry;
};

exports.list = async function list(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { subject: regex }];
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const [items, total] = await Promise.all([
    Inquiry.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Inquiry.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
};

exports.getById = async function getById(id) {
  const inquiry = await Inquiry.findById(id);
  if (!inquiry) {
    throw new ApiError(404, 'Consulta no encontrada');
  }
  return inquiry;
};

exports.updateStatus = async function updateStatus(id, status) {
  const inquiry = await Inquiry.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );
  if (!inquiry) {
    throw new ApiError(404, 'Consulta no encontrada');
  }
  return inquiry;
};

exports.remove = async function remove(id) {
  const inquiry = await Inquiry.findByIdAndDelete(id);
  if (!inquiry) {
    throw new ApiError(404, 'Consulta no encontrada');
  }
  return true;
};
