// Tests de /api/stats (ver specs/03-api-contract.md, sección Métricas)

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const { app, request } = h;

let admin;

before(h.conectar);
after(h.desconectar);
beforeEach(async () => {
  await h.limpiarBase();
  admin = await h.crearAdmin();
});

const pedirStats = () => request(app).get('/api/stats').set(h.auth(admin.token));

describe('GET /api/stats', () => {
  it('sin token → 401', async () => {
    assert.equal((await request(app).get('/api/stats')).status, 401);
  });

  it('con la base vacía: todo en cero y listas vacías (forma exacta)', async () => {
    const res = await pedirStats();
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, {
      products: { total: 0, active: 0, inactive: 0, outOfStock: 0, featured: 0 },
      categories: { total: 0, active: 0 },
      inquiries: { total: 0, pendiente: 0, leida: 0, respondida: 0 },
      productsByCategory: [],
      latestInquiries: [],
    });
  });

  describe('con datos cargados', () => {
    // Datos de prueba (pensados para que se note si se cuentan o no los inactivos):
    //
    //   Categoría             Estado     Productos
    //   Notebooks             activa     3 activos (1 agotado, 2 destacados)
    //   Smartphones           activa     1 activo + 1 INACTIVO (agotado y destacado)
    //   Retro                 INACTIVA   1 activo
    //   Vacía                 activa     ninguno
    //
    //   7 consultas: 3 pendientes, 2 leídas, 2 respondidas
    //
    // Reglas del contrato: products.* cuenta TODAS las publicaciones (activas o no);
    // productsByCategory lista TODAS las categorías (también inactivas y con 0),
    // ordenadas por nombre, y count incluye las publicaciones inactivas.
    const cat = {};
    const dia = (n) => new Date(Date.UTC(2026, 0, n));

    beforeEach(async () => {
      // Se crean en desorden a propósito para verificar el orden por nombre.
      cat.vacia = await h.crearCategoria({ name: 'Vacía' });
      cat.smartphones = await h.crearCategoria({ name: 'Smartphones' });
      cat.retro = await h.crearCategoria({ name: 'Retro', isActive: false });
      cat.notebooks = await h.crearCategoria({ name: 'Notebooks' });

      await h.crearProducto({ category: cat.notebooks._id, featured: true });
      await h.crearProducto({ category: cat.notebooks._id, featured: true });
      await h.crearProducto({ category: cat.notebooks._id, availability: 'agotado' });
      await h.crearProducto({ category: cat.smartphones._id });
      await h.crearProducto({
        category: cat.smartphones._id,
        isActive: false,
        availability: 'agotado',
        featured: true,
      });
      await h.crearProducto({ category: cat.retro._id });

      const estados = ['pendiente', 'leida', 'respondida', 'pendiente', 'leida', 'respondida', 'pendiente'];
      for (let i = 0; i < estados.length; i++) {
        await h.crearConsulta({ subject: `Consulta ${i + 1}`, status: estados[i], createdAt: dia(i + 1) });
      }
    });

    it('tiene exactamente las claves del contrato', async () => {
      const { data } = (await pedirStats()).body;
      assert.deepEqual(Object.keys(data).sort(), [
        'categories',
        'inquiries',
        'latestInquiries',
        'products',
        'productsByCategory',
      ]);
      assert.deepEqual(Object.keys(data.products).sort(), ['active', 'featured', 'inactive', 'outOfStock', 'total']);
      assert.deepEqual(Object.keys(data.categories).sort(), ['active', 'total']);
      assert.deepEqual(Object.keys(data.inquiries).sort(), ['leida', 'pendiente', 'respondida', 'total']);
    });

    it('products cuenta TODAS las publicaciones (outOfStock y featured incluyen inactivas)', async () => {
      const { data } = (await pedirStats()).body;
      // total 6; activas 5 (incluye la de Retro: isActive es del producto);
      // agotados 2 y destacados 3, contando el producto inactivo.
      assert.deepEqual(data.products, { total: 6, active: 5, inactive: 1, outOfStock: 2, featured: 3 });
    });

    it('categories e inquiries con los números correctos', async () => {
      const { data } = (await pedirStats()).body;
      assert.deepEqual(data.categories, { total: 4, active: 3 });
      assert.deepEqual(data.inquiries, { total: 7, pendiente: 3, leida: 2, respondida: 2 });
    });

    it('productsByCategory: todas las categorías, ordenadas por nombre, count con inactivas', async () => {
      const { data } = (await pedirStats()).body;
      for (const fila of data.productsByCategory) {
        assert.deepEqual(Object.keys(fila).sort(), ['categoryId', 'count', 'name']);
      }
      assert.deepEqual(
        data.productsByCategory.map((f) => ({ categoryId: String(f.categoryId), name: f.name, count: f.count })),
        [
          { categoryId: cat.notebooks._id.toString(), name: 'Notebooks', count: 3 },
          { categoryId: cat.retro._id.toString(), name: 'Retro', count: 1 },
          { categoryId: cat.smartphones._id.toString(), name: 'Smartphones', count: 2 },
          { categoryId: cat.vacia._id.toString(), name: 'Vacía', count: 0 },
        ]
      );
    });

    it('latestInquiries: hasta 5, más recientes primero', async () => {
      const { data } = (await pedirStats()).body;
      assert.equal(data.latestInquiries.length, 5);
      assert.deepEqual(
        data.latestInquiries.map((c) => c.subject),
        ['Consulta 7', 'Consulta 6', 'Consulta 5', 'Consulta 4', 'Consulta 3']
      );
    });
  });
});
