// Helpers compartidos por todos los tests.
//
// Cómo correr la suite (desde backend/):
//   MONGO_URI=mongodb://127.0.0.1:27018/tecnostore_test JWT_SECRET=test-secret NODE_ENV=test npm test
//
// IMPORTANTE: los tests BORRAN las colecciones. Por eso este archivo se niega a
// correr si no estamos en NODE_ENV=test o si la base apunta al puerto 27017
// (la base "real" de desarrollo).

const path = require('node:path');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// 1. Chequeos de seguridad y configuración del entorno
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Los tests deben correrse con NODE_ENV=test');
}
if (!process.env.MONGO_URI) {
  throw new Error('Falta MONGO_URI (por ejemplo mongodb://127.0.0.1:27018/tecnostore_test)');
}
if (process.env.MONGO_URI.includes(':27017')) {
  throw new Error('No se permite correr los tests contra el puerto 27017 (base real)');
}

// `node --test` corre cada archivo en un proceso separado y EN PARALELO.
// Para que un archivo no borre los datos de otro, cada uno usa su propia base:
// tecnostore_test_auth, tecnostore_test_products, etc.
const archivoDeTest = path.basename(process.argv[1] || 'general', '.test.js');
const uri = new URL(process.env.MONGO_URI);
const baseOriginal = uri.pathname.replace('/', '') || 'tecnostore_test';
uri.pathname = `/${baseOriginal}_${archivoDeTest.replace(/[^a-zA-Z0-9]/g, '_')}`;
process.env.MONGO_URI = uri.toString();

// Valores por defecto para variables que usa el backend (si no vinieron por consola).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.BUSINESS_EMAIL = process.env.BUSINESS_EMAIL || 'comercio-env@tecnostore.test';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Recién ahora cargamos el backend (lee las variables de entorno al cargarse).
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const app = require('../src/app');
const dbModule = require('../src/config/db');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Inquiry = require('../src/models/Inquiry');
const BusinessInfo = require('../src/models/BusinessInfo');

// db.js puede exportar la función directamente o como { connectDB }.
const connectDB = typeof dbModule === 'function' ? dbModule : dbModule.connectDB;

// ---------------------------------------------------------------------------
// 2. Conexión y limpieza de la base
// ---------------------------------------------------------------------------

async function conectar() {
  await connectDB();
  // Arrancamos de una base vacía y con los índices creados (por ejemplo, el
  // índice único de email).
  await mongoose.connection.dropDatabase();
  await Promise.all(mongoose.modelNames().map((nombre) => mongoose.model(nombre).createIndexes()));
}

async function desconectar() {
  await mongoose.disconnect();
}

// Vacía todas las colecciones (sin borrar los índices) y la lista de mails.
async function limpiarBase() {
  const colecciones = Object.values(mongoose.connection.collections);
  await Promise.all(colecciones.map((c) => c.deleteMany({})));
  limpiarMails();
}

// ---------------------------------------------------------------------------
// 3. Fábricas de datos de prueba
// ---------------------------------------------------------------------------

let contador = 0;
const siguiente = () => ++contador;

// Crea un usuario admin directamente en la base y hace login por la API para
// obtener un token real. Devuelve { token, user, email, password }.
async function crearAdmin(datos = {}) {
  const n = siguiente();
  const password = datos.password || 'Admin1234';
  const email = datos.email || `admin${n}@tecnostore.test`;

  await User.create({
    firstName: datos.firstName || 'Ada',
    lastName: datos.lastName || 'Lovelace',
    email,
    phone: datos.phone || '11 4444-5555',
    passwordHash: await bcrypt.hash(password, 4),
    role: 'admin',
  });

  const res = await request(app).post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200, `El login del admin de prueba falló: ${JSON.stringify(res.body)}`);

  return { token: res.body.data.token, user: res.body.data.user, email, password };
}

// Cambia la fecha de creación de un documento (para probar ordenamientos).
async function fijarFechaCreacion(Modelo, id, fecha) {
  await Modelo.collection.updateOne({ _id: id }, { $set: { createdAt: fecha } });
}

async function crearCategoria(datos = {}) {
  const n = siguiente();
  return Category.create({
    name: `Categoría ${n}`,
    description: 'Categoría de prueba',
    isActive: true,
    ...datos,
  });
}

// Si no se pasa `category`, crea una categoría activa nueva.
async function crearProducto(datos = {}) {
  const n = siguiente();
  const { createdAt, ...resto } = datos;
  const category = resto.category || (await crearCategoria())._id;

  const producto = await Product.create({
    name: `Producto de prueba ${n}`,
    description: 'Descripción de prueba con más de diez caracteres',
    images: ['https://picsum.photos/seed/tecnostore/400'],
    price: 1000,
    availability: 'disponible',
    featured: false,
    isActive: true,
    ...resto,
    category,
  });

  if (createdAt) await fijarFechaCreacion(Product, producto._id, createdAt);
  return producto;
}

// Crea una consulta directo en la base (sin mandar mails).
async function crearConsulta(datos = {}) {
  const n = siguiente();
  const { createdAt, ...resto } = datos;
  const consulta = await Inquiry.create({
    name: `Visitante ${n}`,
    email: `visitante${n}@mail.test`,
    subject: `Consulta número ${n}`,
    message: 'Hola, quería consultar por un producto.',
    ...resto,
  });
  if (createdAt) await fijarFechaCreacion(Inquiry, consulta._id, createdAt);
  return consulta;
}

// Un ObjectId válido que no existe en la base.
const idInexistente = () => new mongoose.Types.ObjectId().toString();

// Header de autorización listo para usar: .set(auth(token))
const auth = (token) => ({ Authorization: `Bearer ${token}` });

// ---------------------------------------------------------------------------
// 4. Mails enviados (transporte en memoria de mail.service.js en NODE_ENV=test)
// ---------------------------------------------------------------------------

function obtenerMails() {
  // Se carga "tarde" para que un error acá no rompa los tests que no usan mails.
  const { sentMails } = require('../src/services/mail.service');
  assert.ok(Array.isArray(sentMails), 'mail.service.js debe exportar el array sentMails');
  return sentMails;
}

function limpiarMails() {
  try {
    obtenerMails().length = 0;
  } catch {
    // Si todavía no existe mail.service.js, no hay nada que limpiar.
  }
}

// Destinatario(s) de un mail como texto, sin importar si `to` es string,
// array u objeto { address }.
function destinatarioDeMail(mail) {
  const to = mail.to ?? mail.envelope?.to;
  const lista = Array.isArray(to) ? to : [to];
  return lista.map((d) => (typeof d === 'object' && d !== null ? d.address : String(d))).join(', ').toLowerCase();
}

function htmlDeMail(mail) {
  return String(mail.html ?? '');
}

// Todo el contenido legible del mail (asunto + texto + html).
function contenidoDeMail(mail) {
  return [mail.subject, mail.text, mail.html].filter(Boolean).join('\n');
}

// Busca el token del link `${FRONTEND_URL}/restablecer-contrasena?token=<token>`.
function extraerTokenDeMail(mail) {
  const match = contenidoDeMail(mail).match(/restablecer-contrasena\?token=([A-Za-z0-9._~%-]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Busca el token del link `${FRONTEND_URL}/confirmar-contrasena?token=<token>`.
function extraerTokenDeConfirmacion(mail) {
  const match = contenidoDeMail(mail).match(/confirmar-contrasena\?token=([A-Za-z0-9._~%-]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------------------------------------------------------------------------
// 5. Otros asserts útiles
// ---------------------------------------------------------------------------

// Verifica un 400 de validación y que `errors[]` incluya los campos esperados.
function esperarErrorDeValidacion(res, campos) {
  assert.equal(res.status, 400, `Se esperaba 400 y llegó ${res.status}: ${JSON.stringify(res.body)}`);
  assert.equal(typeof res.body.message, 'string');
  assert.ok(Array.isArray(res.body.errors), 'La respuesta 400 de validación debe traer errors[]');
  const camposConError = res.body.errors.map((e) => e.field);
  for (const e of res.body.errors) {
    assert.equal(typeof e.message, 'string', 'Cada error debe tener message');
  }
  for (const campo of campos) {
    assert.ok(
      camposConError.includes(campo),
      `Se esperaba un error en "${campo}". Campos con error: ${JSON.stringify(camposConError)}`
    );
  }
}

// Verifica que una respuesta no filtre datos sensibles.
function esperarSinDatosSensibles(res) {
  const texto = JSON.stringify(res.body);
  for (const prohibido of [
    'passwordHash',
    'resetToken',
    'resetTokenExpires',
    'pendingPasswordHash',
    'passwordChangeToken',
    '"password"',
  ]) {
    assert.ok(!texto.includes(prohibido), `La respuesta no debe incluir ${prohibido}: ${texto}`);
  }
  assert.ok(!/\$2[aby]\$/.test(texto), 'La respuesta no debe incluir un hash de bcrypt');
}

module.exports = {
  app,
  request,
  mongoose,
  modelos: { User, Category, Product, Inquiry, BusinessInfo },
  conectar,
  desconectar,
  limpiarBase,
  crearAdmin,
  crearCategoria,
  crearProducto,
  crearConsulta,
  fijarFechaCreacion,
  idInexistente,
  auth,
  obtenerMails,
  limpiarMails,
  destinatarioDeMail,
  htmlDeMail,
  contenidoDeMail,
  extraerTokenDeMail,
  extraerTokenDeConfirmacion,
  esperarErrorDeValidacion,
  esperarSinDatosSensibles,
};
