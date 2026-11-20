// Service: envío de mails con nodemailer
// Ver contrato en specs/03-api-contract.md (sección "Envío de mails").
//
// Elige el transporte según la configuración:
//   - NODE_ENV=test   -> transporte en memoria (no sale nada a la red) y cada
//                        mail queda guardado en `sentMails` para los tests.
//   - SMTP_HOST en .env -> SMTP real (por ejemplo Gmail con contraseña de aplicación).
//   - Sin SMTP_HOST (desarrollo) -> cuenta de prueba de Ethereal; se loguea
//                        la URL para ver el mail en el navegador.

const nodemailer = require('nodemailer');
const {
  nodeEnv,
  smtpHost,
  smtpPort,
  smtpSecure,
  smtpUser,
  smtpPass,
  mailFrom,
  frontendUrl,
} = require('../config/env');

// Mails enviados en modo test (los tests leen de acá, p. ej. el token de reseteo).
exports.sentMails = [];

// Guardamos la promesa (no el transporte) para que, si salen dos mails a la
// vez, los dos esperen al mismo transporte en lugar de crear dos.
let transporterPromise = null;

async function createTransporter() {
  if (nodeEnv === 'test') {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (smtpHost) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  if (nodeEnv === 'production') {
    throw new Error('SMTP no configurado: definí SMTP_HOST en el .env');
  }

  console.warn('[mail] SMTP_HOST no está definido: se usa una cuenta de prueba de Ethereal (los mails NO llegan a destino).');
  const account = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
}

// Crea el transporte la primera vez que se necesita y después lo reutiliza.
// Si falla (por ejemplo, Ethereal sin red), se descarta para reintentar en el próximo mail.
function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((err) => {
      transporterPromise = null;
      throw err;
    });
  }
  return transporterPromise;
}

async function sendMail({ to, subject, html, text, replyTo }) {
  const transport = await getTransporter();
  const info = await transport.sendMail({ from: mailFrom, to, subject, html, text, replyTo });

  if (nodeEnv === 'test') {
    exports.sentMails.push({ to, subject, html, text });
  }

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[mail] Vista previa (Ethereal): ${previewUrl}`);
  }

  return info;
}

// Escapa los caracteres especiales de HTML. Se usa para todo lo que escribe
// el usuario, así nadie puede inyectar HTML en los mails.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Colores de la identidad visual del sitio (los mismos de frontend/src/styles/variables.css).
// Los clientes de mail no cargan Google Fonts: se usan fuentes del sistema.
const PAPER = '#F3F1EC';
const SURFACE = '#FFFFFF';
const INK = '#121212';
const INK_2 = '#55524C';
const LINE = '#D9D5CC';
const ACCENT = '#2340F5';
const MONO = "'Courier New', monospace";
const SANS = 'Arial, Helvetica, sans-serif';

// Estilos que se repiten en varios mails.
const LABEL_STYLE = `font-family: ${MONO}; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: ${INK_2};`;
const BOX_STYLE = `white-space: pre-line; background: ${PAPER}; border: 1px solid ${LINE}; border-radius: 2px; padding: 12px; margin: 4px 0 16px;`;

// Estructura común de todos los mails: wordmark, contenido y pie.
function layout(title, content) {
  return `
<div style="font-family: ${SANS}; background: ${PAPER}; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: ${SURFACE}; border: 1px solid ${LINE}; border-radius: 2px;">
    <div style="padding: 16px 24px; border-bottom: 1px solid ${LINE};">
      <span style="display: inline-block; width: 10px; height: 10px; background: ${ACCENT}; margin-right: 8px;"></span>
      <strong style="font-family: ${MONO}; font-size: 16px; letter-spacing: 0.12em; color: ${INK};">TECNOSTORE</strong>
    </div>
    <div style="padding: 24px; color: ${INK}; font-size: 15px; line-height: 1.5;">
      <h1 style="font-size: 20px; color: ${INK}; margin: 0 0 16px;">${title}</h1>
      ${content}
    </div>
    <div style="padding: 12px 24px; border-top: 1px solid ${LINE}; ${LABEL_STYLE}">
      Mensaje automático de TecnoStore
    </div>
  </div>
</div>`;
}

// Fila de la tabla de datos de una consulta (etiqueta en mono + valor).
function dataRow(label, value) {
  return `<tr>
          <td style="width: 110px; padding: 6px 16px 6px 0; border-bottom: 1px solid ${LINE}; ${LABEL_STYLE}">${label}</td>
          <td style="padding: 6px 0; border-bottom: 1px solid ${LINE};">${escapeHtml(value)}</td>
        </tr>`;
}

exports.sendPasswordReset = async function sendPasswordReset(user, rawToken) {
  const link = `${frontendUrl}/restablecer-contrasena?token=${rawToken}`;
  const name = escapeHtml(user.firstName);

  const html = layout(
    'Recuperación de contraseña',
    `
      <p>Hola ${name}:</p>
      <p>Recibimos un pedido para restablecer la contraseña de tu cuenta. Para elegir una nueva, hacé clic en el siguiente botón:</p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: ${ACCENT}; color: #FFFFFF; padding: 12px 20px; border-radius: 2px; text-decoration: none; font-weight: bold;">Restablecer contraseña</a>
      </p>
      <p>Si el botón no funciona, copiá este enlace en el navegador:<br><a href="${link}" style="color: ${ACCENT}; word-break: break-all;">${link}</a></p>
      <p>El enlace vence en 1 hora y se puede usar una sola vez. Si no pediste el cambio, ignorá este mensaje.</p>
    `
  );

  const text = `Hola ${user.firstName}:

Recibimos un pedido para restablecer la contraseña de tu cuenta.
Para elegir una nueva, abrí este enlace: ${link}

El enlace vence en 1 hora y se puede usar una sola vez. Si no pediste el cambio, ignorá este mensaje.`;

  return sendMail({
    to: user.email,
    subject: 'TecnoStore - Recuperación de contraseña',
    html,
    text,
  });
};

exports.sendPasswordChangeConfirmation = async function sendPasswordChangeConfirmation(user, rawToken) {
  const link = `${frontendUrl}/confirmar-contrasena?token=${rawToken}`;
  const name = escapeHtml(user.firstName);

  const html = layout(
    'Confirmá el cambio de contraseña',
    `
      <p>Hola ${name}:</p>
      <p>Pediste cambiar la contraseña de tu cuenta desde tu perfil. Para que el cambio se aplique, confirmalo con el siguiente botón:</p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: ${ACCENT}; color: #FFFFFF; padding: 12px 20px; border-radius: 2px; text-decoration: none; font-weight: bold;">Confirmar cambio</a>
      </p>
      <p>Si el botón no funciona, copiá este enlace en el navegador:<br><a href="${link}" style="color: ${ACCENT}; word-break: break-all;">${link}</a></p>
      <p>El enlace vence en 1 hora. Hasta que lo confirmes, tu contraseña sigue siendo la de siempre. Si no fuiste vos, ignorá este mensaje y cambiá tu contraseña.</p>
    `
  );

  const text = `Hola ${user.firstName}:

Pediste cambiar la contraseña de tu cuenta. Para que el cambio se aplique, abrí este enlace: ${link}

El enlace vence en 1 hora. Hasta que lo confirmes, tu contraseña sigue siendo la de siempre. Si no fuiste vos, ignorá este mensaje.`;

  return sendMail({
    to: user.email,
    subject: 'TecnoStore - Confirmá el cambio de contraseña',
    html,
    text,
  });
};

exports.sendInquiryNotification = async function sendInquiryNotification(inquiry, toEmail) {
  const html = layout(
    'Nueva consulta recibida',
    `
      <p>Llegó una nueva consulta desde el formulario de contacto del sitio.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        ${dataRow('Nombre', inquiry.name)}
        ${dataRow('Email', inquiry.email)}
        ${dataRow('Teléfono', inquiry.phone || '-')}
        ${dataRow('Asunto', inquiry.subject)}
      </table>
      <div style="${LABEL_STYLE}">Mensaje</div>
      <p style="${BOX_STYLE}">${escapeHtml(inquiry.message)}</p>
      <p>Podés responder directamente a este mail o gestionar la consulta desde el panel de administración.</p>
    `
  );

  const text = `Nueva consulta recibida

Nombre: ${inquiry.name}
Email: ${inquiry.email}
Teléfono: ${inquiry.phone || '-'}
Asunto: ${inquiry.subject}

Mensaje:
${inquiry.message}`;

  return sendMail({
    to: toEmail,
    subject: `Nueva consulta: ${inquiry.subject}`,
    html,
    text,
    replyTo: inquiry.email,
  });
};

exports.sendInquiryConfirmation = async function sendInquiryConfirmation(inquiry) {
  const html = layout(
    'Recibimos tu consulta',
    `
      <p>Hola ${escapeHtml(inquiry.name)}:</p>
      <p>Gracias por escribirnos. Recibimos tu consulta y te vamos a responder a la brevedad.</p>
      <div style="${LABEL_STYLE}">Asunto</div>
      <p style="margin: 4px 0 16px;">${escapeHtml(inquiry.subject)}</p>
      <div style="${LABEL_STYLE}">Tu mensaje</div>
      <p style="${BOX_STYLE}">${escapeHtml(inquiry.message)}</p>
    `
  );

  const text = `Hola ${inquiry.name}:

Gracias por escribirnos. Recibimos tu consulta y te vamos a responder a la brevedad.

Asunto: ${inquiry.subject}
${inquiry.message}`;

  return sendMail({
    to: inquiry.email,
    subject: 'TecnoStore - Recibimos tu consulta',
    html,
    text,
  });
};

exports.escapeHtml = escapeHtml;
