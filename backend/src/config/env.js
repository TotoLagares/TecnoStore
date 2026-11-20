require('dotenv').config();

// CORS_ORIGIN acepta uno o varios orígenes separados por coma.
// Ej: "http://localhost:5173,http://127.0.0.1:5173"
function parseOrigins(value) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tecnostore',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN || 'http://localhost:5173'),

  // URL del frontend: se usa para armar el link de recuperación de contraseña.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Envío de mails (ver src/services/mail.service.js)
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || 'TecnoStore <no-reply@tecnostore.com>',
  // Destinatario de los avisos de consultas si BusinessInfo no tiene email.
  businessEmail: process.env.BUSINESS_EMAIL || '',
};
