// Validaciones del front. Usan las MISMAS reglas que el backend
// (ver specs/03-api-contract.md), así el usuario ve el error antes de enviar.
// Cada función validateX recibe los valores del formulario y devuelve un
// objeto { campo: mensaje } solo con los campos que tienen error.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9 +\-()]+$/;
const URL_REGEX = /^https?:\/\/[^\s.]+\.[^\s]+$/i;

// ---------- Reglas sueltas (devuelven el mensaje de error o '') ----------

export function checkLength(value, min, max, label) {
  const text = String(value || '').trim();
  if (min > 0 && text === '') return `${label} es obligatorio`;
  if (text.length < min) return `${label} debe tener al menos ${min} caracteres`;
  if (text.length > max) return `${label} puede tener hasta ${max} caracteres`;
  return '';
}

export function checkEmail(value) {
  const text = String(value || '').trim();
  if (text === '') return 'El email es obligatorio';
  if (!EMAIL_REGEX.test(text)) return 'Ingresá un email válido';
  return '';
}

export function checkPhone(value, { required = true } = {}) {
  const text = String(value || '').trim();
  if (text === '') return required ? 'El teléfono es obligatorio' : '';
  if (text.length < 6 || text.length > 25) return 'El teléfono debe tener entre 6 y 25 caracteres';
  if (!PHONE_REGEX.test(text)) return 'Usá solo números, espacios, +, - y paréntesis';
  return '';
}

export function checkPassword(value) {
  const text = String(value || '');
  if (text === '') return 'La contraseña es obligatoria';
  if (text.length < 8 || !/[A-Za-z]/.test(text) || !/[0-9]/.test(text)) {
    return 'Mínimo 8 caracteres, con al menos una letra y un número';
  }
  return '';
}

export function checkUrl(value, { required = false } = {}) {
  const text = String(value || '').trim();
  if (text === '') return required ? 'La URL es obligatoria' : '';
  if (!URL_REGEX.test(text)) return 'Ingresá una URL válida que empiece con http:// o https://';
  return '';
}

// Saca las claves sin error: { a: '', b: 'x' } -> { b: 'x' }
function onlyErrors(errors) {
  const result = {};
  for (const key of Object.keys(errors)) {
    if (errors[key]) result[key] = errors[key];
  }
  return result;
}

// ---------- Formularios ----------

export function validateContact(values) {
  return onlyErrors({
    name: checkLength(values.name, 2, 80, 'El nombre'),
    email: checkEmail(values.email),
    phone: checkPhone(values.phone, { required: false }),
    subject: checkLength(values.subject, 3, 120, 'El asunto'),
    message: checkLength(values.message, 10, 2000, 'El mensaje'),
  });
}

export function validateLogin(values) {
  return onlyErrors({
    email: checkEmail(values.email),
    password: values.password ? '' : 'La contraseña es obligatoria',
  });
}

export function validateRegister(values) {
  return onlyErrors({
    firstName: checkLength(values.firstName, 2, 60, 'El nombre'),
    lastName: checkLength(values.lastName, 2, 60, 'El apellido'),
    email: checkEmail(values.email),
    phone: checkPhone(values.phone),
    password: checkPassword(values.password),
    confirmPassword:
      values.confirmPassword === values.password ? '' : 'Las contraseñas no coinciden',
  });
}

export function validateEmailOnly(values) {
  return onlyErrors({ email: checkEmail(values.email) });
}

export function validateResetPassword(values) {
  return onlyErrors({
    newPassword: checkPassword(values.newPassword),
    confirmPassword:
      values.confirmPassword === values.newPassword ? '' : 'Las contraseñas no coinciden',
  });
}

export function validateProfile(values) {
  return onlyErrors({
    firstName: checkLength(values.firstName, 2, 60, 'El nombre'),
    lastName: checkLength(values.lastName, 2, 60, 'El apellido'),
    email: checkEmail(values.email),
    phone: checkPhone(values.phone),
  });
}

export function validateChangePassword(values) {
  return onlyErrors({
    currentPassword: values.currentPassword ? '' : 'Ingresá tu contraseña actual',
    newPassword: checkPassword(values.newPassword),
    confirmPassword:
      values.confirmPassword === values.newPassword ? '' : 'Las contraseñas no coinciden',
  });
}

export function validateCategory(values) {
  return onlyErrors({
    name: checkLength(values.name, 2, 50, 'El nombre'),
    description: checkLength(values.description, 0, 300, 'La descripción'),
  });
}

export function validateProduct(values) {
  const images = (values.images || []).map((url) => String(url).trim()).filter(Boolean);
  let imagesError = '';
  if (images.length === 0) imagesError = 'Agregá al menos una imagen';
  else if (images.length > 8) imagesError = 'Podés cargar hasta 8 imágenes';
  else if (images.some((url) => checkUrl(url))) imagesError = 'Cada imagen debe ser una URL http(s) válida';

  const price = Number(values.price);
  const priceError =
    values.price === '' || values.price === undefined || Number.isNaN(price) || price < 0
      ? 'El precio debe ser un número mayor o igual a 0'
      : '';

  return onlyErrors({
    name: checkLength(values.name, 3, 120, 'El nombre'),
    category: values.category ? '' : 'Elegí una categoría',
    description: checkLength(values.description, 10, 2000, 'La descripción'),
    price: priceError,
    images: imagesError,
  });
}

export function validateBusinessInfo(values) {
  const hours = values.businessHours || [];
  let hoursError = '';
  if (hours.length > 10) hoursError = 'Podés cargar hasta 10 líneas de horario';
  else if (hours.some((line) => String(line).length > 60)) hoursError = 'Cada horario puede tener hasta 60 caracteres';

  const whatsapp = String(values.whatsapp || '').trim();

  return onlyErrors({
    businessName: checkLength(values.businessName, 2, 80, 'El nombre del comercio'),
    description: checkLength(values.description, 0, 1000, 'La descripción'),
    address: checkLength(values.address, 0, 150, 'La dirección'),
    phone: checkPhone(values.phone, { required: false }),
    email: values.email ? checkEmail(values.email) : '',
    instagram: checkUrl(values.instagram),
    facebook: checkUrl(values.facebook),
    whatsapp: whatsapp && !/^[0-9]{8,15}$/.test(whatsapp) ? 'Solo números, entre 8 y 15 dígitos' : '',
    businessHours: hoursError,
  });
}

// ---------- Redirecciones ----------

// Solo acepta rutas internas ("/admin/productos"). Evita redirigir a otro
// sitio con valores como "//otro.com" o "/\otro.com" en ?next=.
export function isSafeInternalPath(path) {
  return typeof path === 'string' && /^\/(?![/\\])/.test(path) && !path.includes('\\');
}
