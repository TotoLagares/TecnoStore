// Script de creación/carga de la base de datos (equivalente al "script de
// creación de BD" para Mongo, que no tiene DDL como SQL Server).
//
// Limpia las colecciones relevantes y crea:
//   - 1 usuario admin de prueba
//   - 10 categorías de hardware
//   - entre 10 y 14 productos por categoría (ver seed/productos.js), 2 despublicados
//   - 1 documento de BusinessInfo
//   - 3 consultas de ejemplo (una por cada estado)
//
// Las fotos de los productos están en backend/public/productos y el back las
// sirve en /img/productos/<archivo>.
//
// Ver specs/02-data-model.md (sección "Datos precargados").
//
// Uso: npm run seed   (desde backend/, con MONGO_URI configurado en .env)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const BusinessInfo = require('../src/models/BusinessInfo');
const Inquiry = require('../src/models/Inquiry');
const PRODUCTS_BY_CATEGORY = require('./productos');

const ADMIN_EMAIL = 'admin@tecnostore.com';
const ADMIN_PASSWORD = 'Admin123';

const CATEGORIES = [
  { name: 'Periféricos', description: 'Mouses, teclados, auriculares y mousepads.' },
  { name: 'Placas de video', description: 'Placas NVIDIA GeForce y AMD Radeon para gaming y diseño.' },
  { name: 'Memorias RAM', description: 'Memorias DDR4 y DDR5 para PCs de escritorio y notebooks.' },
  { name: 'Procesadores', description: 'Procesadores AMD Ryzen e Intel Core.' },
  { name: 'Motherboards', description: 'Placas madre para AMD (AM4 y AM5) e Intel (LGA1700).' },
  { name: 'Fuentes de alimentación', description: 'Fuentes certificadas 80 Plus, de 550 W a 850 W.' },
  { name: 'Gabinetes', description: 'Gabinetes Micro-ATX y ATX, con buen flujo de aire.' },
  { name: 'Almacenamiento', description: 'SSD M.2 NVMe, SSD SATA, discos rígidos y discos externos.' },
  { name: 'Refrigeración', description: 'Coolers por aire, watercooling, ventiladores y pasta térmica.' },
  { name: 'Monitores', description: 'Monitores Full HD, QHD, 4K y ultrawide para gaming y trabajo.' },
];

// Publicaciones que quedan ocultas a propósito, para ver la diferencia entre
// el listado público y el del panel de administración.
const INACTIVE_SLUGS = ['thermaltake-versa-h18', 'evga-600-w1'];

// URL con la que el navegador pide las fotos al back.
const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'productos');

// Busca la foto del producto por su slug (puede ser .jpg, .png o .webp).
function imageUrl(slug, files) {
  const file = files.find((name) => name.startsWith(`${slug}.`));
  return file ? `${API_URL}/img/productos/${file}` : null;
}

// Una consulta por estado, para que el panel no arranque vacío.
const SAMPLE_INQUIRIES = [
  {
    name: 'Lucía Fernández',
    email: 'lucia.fernandez@example.com',
    phone: '11 5555-1234',
    subject: 'Compatibilidad Ryzen 7 7800X3D',
    message: '¡Hola! ¿El Ryzen 7 7800X3D funciona con la MSI PRO B650M-A WIFI sin actualizar la BIOS? ¿Hacen envíos a La Plata?',
    status: 'pendiente',
  },
  {
    name: 'Martín Gómez',
    email: 'martin.gomez@example.com',
    subject: 'Cuotas sin interés',
    message: 'Buenas tardes, ¿aceptan tarjeta de crédito en cuotas sin interés para la RTX 5070 de MSI?',
    status: 'leida',
  },
  {
    name: 'Sofía Ramírez',
    email: 'sofia.ramirez@example.com',
    phone: '+54 9 11 4444-9876',
    subject: 'Stock del Noctua NH-D15',
    message: 'Hola, vi que el cooler Noctua NH-D15 figura como agotado. ¿Saben cuándo vuelve a ingresar?',
    status: 'respondida',
  },
];

async function seed() {
  await connectDB();

  console.log('[seed] Limpiando colecciones...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    BusinessInfo.deleteMany({}),
    Inquiry.deleteMany({}),
  ]);

  console.log('[seed] Creando usuario admin...');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    firstName: 'Admin',
    lastName: 'TecnoStore',
    email: ADMIN_EMAIL,
    phone: '011-4000-0000',
    passwordHash,
    role: 'admin',
  });

  console.log('[seed] Creando categorías...');
  const categories = await Category.insertMany(CATEGORIES);
  const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c]));

  console.log('[seed] Creando productos...');
  const files = fs.readdirSync(IMAGES_DIR);
  const productDocs = [];
  for (const [categoryName, items] of Object.entries(PRODUCTS_BY_CATEGORY)) {
    const category = categoryByName[categoryName];
    for (const item of items) {
      const image = imageUrl(item.slug, files);
      if (!image) {
        console.warn(`[seed]   Sin foto para "${item.slug}": el producto no se carga`);
        continue;
      }
      productDocs.push({
        name: item.name,
        category: category._id,
        description: item.description,
        images: [image],
        price: item.price,
        availability: item.availability || 'disponible',
        isActive: !INACTIVE_SLUGS.includes(item.slug),
        featured: item.featured || false,
      });
    }
  }

  const products = await Product.insertMany(productDocs);

  console.log('[seed] Creando información del comercio...');
  await BusinessInfo.create({
    businessName: 'TecnoStore',
    description:
      'Hardware para armar o mejorar tu PC: placas de video, procesadores, memorias, periféricos y monitores, con asesoramiento de verdad.',
    address: 'Av. Siempre Viva 1234, CABA',
    phone: '011-4000-0000',
    // Los avisos de consultas llegan a este email: se toma BUSINESS_EMAIL del .env.
    email: process.env.BUSINESS_EMAIL || 'contacto@tecnostore.com',
    socialMedia: {
      instagram: 'https://instagram.com/tecnostore',
      facebook: 'https://facebook.com/tecnostore',
      whatsapp: '5491140000000',
    },
    businessHours: ['Lun a Vie 9 a 18hs', 'Sáb 9 a 13hs'],
  });

  console.log('[seed] Creando consultas de ejemplo...');
  const inquiries = await Inquiry.insertMany(SAMPLE_INQUIRIES);

  console.log('[seed] Listo');
  console.log(`[seed]   Usuario admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`[seed]   Categorías: ${categories.length}`);
  console.log(`[seed]   Productos: ${products.length} (${INACTIVE_SLUGS.length} despublicados para pruebas)`);
  console.log(`[seed]   Consultas: ${inquiries.length}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] Error al cargar los datos:', err);
  process.exit(1);
});
