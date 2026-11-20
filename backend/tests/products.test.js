// Tests de /api/products (ver specs/03-api-contract.md, sección Productos)

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const { app, request, modelos } = h;

before(h.conectar);
after(h.desconectar);

// Catálogo de prueba que usan los tests de listados:
//
//   Nombre               Categoría          Precio  Disponib.   Destac.  Activo
//   Notebook Lenovo      Notebooks (act.)   1000    disponible  sí       sí
//   Notebook HP          Notebooks (act.)    800    agotado     no       sí
//   Smartphone Samsung   Smartphones (act.)  500    disponible  sí       sí
//   Smartphone Viejo     Smartphones (act.)  100    disponible  no       NO
//   Consola Retro        Retro (INACTIVA)    300    disponible  no       sí
//
// Públicos (activos y con categoría activa): Lenovo, HP, Samsung.
let admin;
let cat;
let p;

async function cargarCatalogo() {
  await h.limpiarBase();
  admin = await h.crearAdmin();
  cat = {
    notebooks: await h.crearCategoria({ name: 'Notebooks' }),
    smartphones: await h.crearCategoria({ name: 'Smartphones' }),
    retro: await h.crearCategoria({ name: 'Retro', isActive: false }),
  };
  const dia = (n) => new Date(Date.UTC(2026, 0, n));
  p = {
    lenovo: await h.crearProducto({
      name: 'Notebook Lenovo',
      description: 'Equipo liviano para trabajar',
      category: cat.notebooks._id,
      price: 1000,
      featured: true,
      createdAt: dia(5),
    }),
    hp: await h.crearProducto({
      name: 'Notebook HP',
      description: 'Ideal para estudiantes',
      category: cat.notebooks._id,
      price: 800,
      availability: 'agotado',
      createdAt: dia(4),
    }),
    samsung: await h.crearProducto({
      name: 'Smartphone Samsung',
      description: 'Celular con pantalla OLED',
      category: cat.smartphones._id,
      price: 500,
      featured: true,
      createdAt: dia(3),
    }),
    viejo: await h.crearProducto({
      name: 'Smartphone Viejo',
      description: 'Modelo discontinuado',
      category: cat.smartphones._id,
      price: 100,
      isActive: false,
      createdAt: dia(2),
    }),
    retro: await h.crearProducto({
      name: 'Consola Retro',
      description: 'Consola de colección',
      category: cat.retro._id,
      price: 300,
      createdAt: dia(1),
    }),
  };
}

const listar = (query = '') => request(app).get(`/api/products${query}`);
const listarAdmin = (query = '') => request(app).get(`/api/products/admin${query}`).set(h.auth(admin.token));
const nombres = (res) => res.body.data.items.map((i) => i.name);
const mismosNombres = (res, esperados) => assert.deepEqual(nombres(res).sort(), [...esperados].sort());

describe('GET /api/products (listado público)', () => {
  before(cargarCatalogo);

  it('devuelve la forma paginada { items, total, page, limit, totalPages }', async () => {
    const res = await listar();
    assert.equal(res.status, 200);
    const { items, total, page, limit, totalPages } = res.body.data;
    assert.ok(Array.isArray(items));
    assert.equal(total, 3);
    assert.equal(page, 1);
    assert.equal(limit, 12);
    assert.equal(totalPages, 1);
  });

  it('excluye las publicaciones inactivas y las de categorías inactivas', async () => {
    mismosNombres(await listar(), ['Notebook Lenovo', 'Notebook HP', 'Smartphone Samsung']);
  });

  it('cada item trae category populada como { _id, name }', async () => {
    const res = await listar();
    for (const item of res.body.data.items) {
      assert.equal(typeof item.category, 'object');
      assert.ok(item.category._id);
      assert.equal(typeof item.category.name, 'string');
    }
    const lenovo = res.body.data.items.find((i) => i.name === 'Notebook Lenovo');
    assert.equal(lenovo.category.name, 'Notebooks');
    assert.equal(lenovo.category._id, cat.notebooks._id.toString());
  });

  describe('search', () => {
    it('búsqueda parcial y sin distinguir mayúsculas: "note" encuentra "Notebook"', async () => {
      mismosNombres(await listar('?search=note'), ['Notebook Lenovo', 'Notebook HP']);
      mismosNombres(await listar('?search=NOTE'), ['Notebook Lenovo', 'Notebook HP']);
    });

    it('también busca en la descripción', async () => {
      mismosNombres(await listar('?search=oled'), ['Smartphone Samsung']);
    });

    it('no encuentra productos inactivos', async () => {
      assert.equal((await listar('?search=viejo')).body.data.total, 0);
    });

    for (const texto of ['(', '[', '*', '+', '?', '\\', '.*', 'a|b']) {
      it(`caracteres especiales de regex no rompen: "${texto}" → 200`, async () => {
        const res = await listar(`?search=${encodeURIComponent(texto)}`);
        assert.equal(res.status, 200);
        // El texto se busca literal: ningún producto contiene estos caracteres.
        assert.equal(res.body.data.total, 0);
      });
    }
  });

  describe('filtros', () => {
    it('category filtra por id', async () => {
      mismosNombres(await listar(`?category=${cat.notebooks._id}`), ['Notebook Lenovo', 'Notebook HP']);
    });

    it('category de una categoría inactiva → lista vacía', async () => {
      const res = await listar(`?category=${cat.retro._id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.total, 0);
    });

    it('category con formato inválido → 400', async () => {
      assert.equal((await listar('?category=no-es-un-id')).status, 400);
    });

    it('availability=disponible / agotado', async () => {
      mismosNombres(await listar('?availability=disponible'), ['Notebook Lenovo', 'Smartphone Samsung']);
      mismosNombres(await listar('?availability=agotado'), ['Notebook HP']);
    });

    it('featured=true / false', async () => {
      mismosNombres(await listar('?featured=true'), ['Notebook Lenovo', 'Smartphone Samsung']);
      mismosNombres(await listar('?featured=false'), ['Notebook HP']);
    });

    it('minPrice y maxPrice (incluyentes)', async () => {
      mismosNombres(await listar('?minPrice=800'), ['Notebook Lenovo', 'Notebook HP']);
      mismosNombres(await listar('?maxPrice=800'), ['Notebook HP', 'Smartphone Samsung']);
      mismosNombres(await listar('?minPrice=600&maxPrice=900'), ['Notebook HP']);
    });

    it('se pueden combinar filtros', async () => {
      mismosNombres(await listar(`?category=${cat.notebooks._id}&availability=disponible&search=len`), [
        'Notebook Lenovo',
      ]);
    });
  });

  describe('sort', () => {
    it('por defecto (recent): los más recientes primero', async () => {
      assert.deepEqual(nombres(await listar()), ['Notebook Lenovo', 'Notebook HP', 'Smartphone Samsung']);
    });

    it('sort=recent', async () => {
      assert.deepEqual(nombres(await listar('?sort=recent')), [
        'Notebook Lenovo',
        'Notebook HP',
        'Smartphone Samsung',
      ]);
    });

    it('sort=price_asc', async () => {
      assert.deepEqual(nombres(await listar('?sort=price_asc')), [
        'Smartphone Samsung',
        'Notebook HP',
        'Notebook Lenovo',
      ]);
    });

    it('sort=price_desc', async () => {
      assert.deepEqual(nombres(await listar('?sort=price_desc')), [
        'Notebook Lenovo',
        'Notebook HP',
        'Smartphone Samsung',
      ]);
    });

    it('sort=name_asc', async () => {
      assert.deepEqual(nombres(await listar('?sort=name_asc')), [
        'Notebook HP',
        'Notebook Lenovo',
        'Smartphone Samsung',
      ]);
    });
  });

  describe('paginación', () => {
    it('page y limit', async () => {
      const pagina1 = await listar('?sort=price_asc&limit=2&page=1');
      assert.equal(pagina1.status, 200);
      assert.deepEqual(nombres(pagina1), ['Smartphone Samsung', 'Notebook HP']);
      assert.equal(pagina1.body.data.total, 3);
      assert.equal(pagina1.body.data.page, 1);
      assert.equal(pagina1.body.data.limit, 2);
      assert.equal(pagina1.body.data.totalPages, 2);

      const pagina2 = await listar('?sort=price_asc&limit=2&page=2');
      assert.deepEqual(nombres(pagina2), ['Notebook Lenovo']);
      assert.equal(pagina2.body.data.page, 2);
    });
  });
});

describe('GET /api/products?limit=500', () => {
  before(async () => {
    await h.limpiarBase();
    const categoria = await h.crearCategoria();
    await modelos.Product.insertMany(
      Array.from({ length: 55 }, (_, i) => ({
        name: `Producto masivo ${i}`,
        description: 'Producto generado para probar el límite',
        images: ['https://picsum.photos/400'],
        price: i,
        category: categoria._id,
      }))
    );
  });

  it('limit=500 se recorta a 50', async () => {
    const res = await listar('?limit=500');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.limit, 50);
    assert.equal(res.body.data.items.length, 50);
    assert.equal(res.body.data.total, 55);
    assert.equal(res.body.data.totalPages, 2);
  });
});

describe('GET /api/products/admin', () => {
  before(cargarCatalogo);

  it('devuelve TODAS las publicaciones (incluidas inactivas y de categorías inactivas)', async () => {
    const res = await listarAdmin();
    assert.equal(res.status, 200);
    assert.equal(res.body.data.total, 5);
  });

  it('isActive=false / isActive=true', async () => {
    mismosNombres(await listarAdmin('?isActive=false'), ['Smartphone Viejo']);
    mismosNombres(await listarAdmin('?isActive=true'), [
      'Notebook Lenovo',
      'Notebook HP',
      'Smartphone Samsung',
      'Consola Retro',
    ]);
  });

  it('acepta los mismos filtros que el público (search, category, sort)', async () => {
    mismosNombres(await listarAdmin('?search=smart'), ['Smartphone Samsung', 'Smartphone Viejo']);
    mismosNombres(await listarAdmin(`?category=${cat.retro._id}`), ['Consola Retro']);
    assert.deepEqual(nombres(await listarAdmin('?sort=price_asc&limit=2')), [
      'Smartphone Viejo',
      'Consola Retro',
    ]);
  });

  it('category inválida → 400', async () => {
    assert.equal((await listarAdmin('?category=xyz')).status, 400);
  });

  it('sin token → 401', async () => {
    assert.equal((await request(app).get('/api/products/admin')).status, 401);
  });
});

describe('GET /api/products/:id', () => {
  before(cargarCatalogo);

  it('publicación activa → 200 con category populada', async () => {
    const res = await request(app).get(`/api/products/${p.lenovo._id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Notebook Lenovo');
    assert.equal(res.body.data.category.name, 'Notebooks');
    assert.equal(res.body.data.category._id, cat.notebooks._id.toString());
  });

  it('publicación inactiva: sin token → 401, con token → 200', async () => {
    assert.equal((await request(app).get(`/api/products/${p.viejo._id}`)).status, 401);
    const res = await request(app).get(`/api/products/${p.viejo._id}`).set(h.auth(admin.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Smartphone Viejo');
  });

  it('publicación activa de categoría inactiva: sin token → 401, con token → 200', async () => {
    assert.equal((await request(app).get(`/api/products/${p.retro._id}`)).status, 401);
    const res = await request(app).get(`/api/products/${p.retro._id}`).set(h.auth(admin.token));
    assert.equal(res.status, 200);
  });

  it('publicación inactiva con token basura → 401', async () => {
    const res = await request(app).get(`/api/products/${p.viejo._id}`).set(h.auth('basura'));
    assert.equal(res.status, 401);
  });

  it('inexistente → 404', async () => {
    assert.equal((await request(app).get(`/api/products/${h.idInexistente()}`)).status, 404);
  });

  it('id inválido → 400', async () => {
    assert.equal((await request(app).get('/api/products/123')).status, 400);
  });
});

describe('Escritura de productos', () => {
  let categoria;
  beforeEach(async () => {
    await h.limpiarBase();
    admin = await h.crearAdmin();
    categoria = await h.crearCategoria({ name: 'Notebooks' });
  });

  const productoValido = (extra = {}) => ({
    name: 'Notebook Dell',
    category: categoria._id.toString(),
    description: 'Notebook de 14 pulgadas con 16GB de RAM',
    images: ['https://picsum.photos/400', 'http://ejemplo.com/foto.jpg'],
    price: 1500,
    ...extra,
  });

  const crear = (body) => request(app).post('/api/products').set(h.auth(admin.token)).send(body);
  const actualizar = (id, body) =>
    request(app).put(`/api/products/${id}`).set(h.auth(admin.token)).send(body);

  describe('POST /api/products', () => {
    it('crea la publicación → 201 con los valores por defecto', async () => {
      const res = await crear(productoValido());
      assert.equal(res.status, 201);
      assert.equal(res.body.data.name, 'Notebook Dell');
      assert.equal(res.body.data.price, 1500);
      assert.equal(res.body.data.availability, 'disponible');
      assert.equal(res.body.data.featured, false);
      assert.equal(res.body.data.isActive, true);
      assert.equal(res.body.data.images.length, 2);
      assert.equal(await modelos.Product.countDocuments(), 1);
    });

    it('acepta availability, featured e isActive', async () => {
      const res = await crear(productoValido({ availability: 'agotado', featured: true, isActive: false }));
      assert.equal(res.status, 201);
      assert.equal(res.body.data.availability, 'agotado');
      assert.equal(res.body.data.featured, true);
      assert.equal(res.body.data.isActive, false);
    });

    it('price 0 es válido', async () => {
      assert.equal((await crear(productoValido({ price: 0 }))).status, 201);
    });

    it('categoría inexistente → 404', async () => {
      const res = await crear(productoValido({ category: h.idInexistente() }));
      assert.equal(res.status, 404);
      assert.equal(await modelos.Product.countDocuments(), 0);
    });

    it('categoría con formato inválido → 400', async () => {
      assert.equal((await crear(productoValido({ category: 'abc' }))).status, 400);
    });

    it('body vacío → 400 con errores en todos los campos requeridos', async () => {
      h.esperarErrorDeValidacion(await crear({}), ['name', 'category', 'description', 'images', 'price']);
    });

    const casosInvalidos = [
      ['name de 2 caracteres', { name: 'ab' }, 'name'],
      ['name de 121 caracteres', { name: 'x'.repeat(121) }, 'name'],
      ['description de 9 caracteres', { description: 'corta1234' }, 'description'],
      ['description de 2001 caracteres', { description: 'x'.repeat(2001) }, 'description'],
      ['images vacío', { images: [] }, 'images'],
      ['images con 9 URLs', { images: Array(9).fill('https://picsum.photos/400') }, 'images'],
      ['images con una URL que no es http(s)', { images: ['ftp://ejemplo.com/a.jpg'] }, 'images'],
      ['images con texto que no es URL', { images: ['no es una url'] }, 'images'],
      ['images que no es array', { images: 'https://picsum.photos/400' }, 'images'],
      ['price negativo', { price: -1 }, 'price'],
      ['price no numérico', { price: 'caro' }, 'price'],
      ['availability fuera del enum', { availability: 'pocas' }, 'availability'],
      ['featured no booleano', { featured: 'quizas' }, 'featured'],
      ['isActive no booleano', { isActive: 'quizas' }, 'isActive'],
    ];
    for (const [descripcion, extra, campo] of casosInvalidos) {
      it(`${descripcion} → 400`, async () => {
        const res = await crear(productoValido(extra));
        assert.equal(res.status, 400, JSON.stringify(res.body));
        // Para images el campo puede venir como "images" o "images[0]".
        assert.ok(Array.isArray(res.body.errors));
        assert.ok(
          res.body.errors.some((e) => e.field === campo || e.field.startsWith(`${campo}[`)),
          `Se esperaba error en ${campo}: ${JSON.stringify(res.body.errors)}`
        );
        assert.equal(await modelos.Product.countDocuments(), 0);
      });
    }

    it('allowlist: ignora _id, createdAt y campos extra', async () => {
      const idFalso = h.idInexistente();
      const res = await crear(
        productoValido({ _id: idFalso, createdAt: '2000-01-01T00:00:00.000Z', rating: 5 })
      );
      assert.equal(res.status, 201);
      assert.notEqual(res.body.data._id, idFalso);
      assert.equal(res.body.data.rating, undefined);
      const enBase = await modelos.Product.findById(res.body.data._id).lean();
      assert.equal(enBase.rating, undefined);
      assert.ok(enBase.createdAt.getFullYear() > 2000);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('actualiza solo los campos enviados → 200', async () => {
      const producto = await h.crearProducto({ category: categoria._id, name: 'Notebook Dell' });
      const res = await actualizar(producto._id, { price: 999, featured: true });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.price, 999);
      assert.equal(res.body.data.featured, true);
      assert.equal(res.body.data.name, 'Notebook Dell');
    });

    it('puede cambiar de categoría', async () => {
      const producto = await h.crearProducto({ category: categoria._id });
      const otra = await h.crearCategoria({ name: 'Gaming' });
      const res = await actualizar(producto._id, { category: otra._id.toString() });
      assert.equal(res.status, 200);
      const enBase = await modelos.Product.findById(producto._id);
      assert.equal(enBase.category.toString(), otra._id.toString());
    });

    it('acepta las URLs de imágenes del seed (localhost) → 200', async () => {
      const producto = await h.crearProducto({ category: categoria._id });
      const images = [
        'http://localhost:4000/img/productos/amd-ryzen-5-5600.jpg',
        'https://picsum.photos/400',
      ];
      const res = await actualizar(producto._id, { images, price: 1234 });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.deepEqual(res.body.data.images, images);
    });

    it('categoría inexistente → 404', async () => {
      const producto = await h.crearProducto({ category: categoria._id });
      assert.equal((await actualizar(producto._id, { category: h.idInexistente() })).status, 404);
    });

    it('datos inválidos → 400 con errors[]', async () => {
      const producto = await h.crearProducto({ category: categoria._id });
      h.esperarErrorDeValidacion(
        await actualizar(producto._id, { name: 'ab', price: -5, availability: 'x' }),
        ['name', 'price', 'availability']
      );
    });

    it('inexistente → 404', async () => {
      assert.equal((await actualizar(h.idInexistente(), { price: 10 })).status, 404);
    });

    it('id inválido → 400', async () => {
      assert.equal((await actualizar('123', { price: 10 })).status, 400);
    });

    it('allowlist: ignora _id, createdAt y campos extra', async () => {
      const producto = await h.crearProducto({ category: categoria._id });
      const antes = await modelos.Product.findById(producto._id).lean();
      const res = await actualizar(producto._id, {
        _id: h.idInexistente(),
        createdAt: '2000-01-01T00:00:00.000Z',
        rating: 5,
        price: 10,
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data._id, producto._id.toString());
      const despues = await modelos.Product.findById(producto._id).lean();
      assert.equal(despues.price, 10);
      assert.equal(despues.rating, undefined);
      assert.equal(despues.createdAt.getTime(), antes.createdAt.getTime());
    });
  });

  describe('PATCH /api/products/:id/toggle-active', () => {
    const alternar = (id) =>
      request(app).patch(`/api/products/${id}/toggle-active`).set(h.auth(admin.token));

    it('invierte isActive en cada llamada', async () => {
      const producto = await h.crearProducto({ category: categoria._id });
      const primera = await alternar(producto._id);
      assert.equal(primera.status, 200);
      assert.equal(primera.body.data.isActive, false);
      const segunda = await alternar(producto._id);
      assert.equal(segunda.body.data.isActive, true);
    });

    it('inexistente → 404', async () => {
      assert.equal((await alternar(h.idInexistente())).status, 404);
    });

    it('id inválido → 400', async () => {
      assert.equal((await alternar('123')).status, 400);
    });
  });

  describe('DELETE /api/products/:id', () => {
    const borrar = (id) => request(app).delete(`/api/products/${id}`).set(h.auth(admin.token));

    it('borra → 200 y después GET da 404', async () => {
      const producto = await h.crearProducto({ category: categoria._id });
      assert.equal((await borrar(producto._id)).status, 200);
      assert.equal(await modelos.Product.countDocuments(), 0);
      assert.equal((await request(app).get(`/api/products/${producto._id}`)).status, 404);
    });

    it('inexistente → 404', async () => {
      assert.equal((await borrar(h.idInexistente())).status, 404);
    });

    it('id inválido → 400', async () => {
      assert.equal((await borrar('123')).status, 400);
    });
  });
});

describe('Query params inválidos → 400 con errors[]', () => {
  before(cargarCatalogo);

  const invalidos = [
    ['limit=0', 'limit'],
    ['limit=-3', 'limit'],
    ['limit=abc', 'limit'],
    ['page=0', 'page'],
    ['page=abc', 'page'],
    ['minPrice=-1', 'minPrice'],
    ['maxPrice=-1', 'maxPrice'],
    ['minPrice=barato', 'minPrice'],
    ['sort=xyz', 'sort'],
    ['availability=otro', 'availability'],
    ['featured=quizas', 'featured'],
  ];

  for (const [query, campo] of invalidos) {
    it(`GET /api/products?${query} → 400`, async () => {
      h.esperarErrorDeValidacion(await listar(`?${query}`), [campo]);
    });
    it(`GET /api/products/admin?${query} → 400`, async () => {
      h.esperarErrorDeValidacion(await listarAdmin(`?${query}`), [campo]);
    });
  }

  it('GET /api/products/admin?isActive=quizas → 400', async () => {
    h.esperarErrorDeValidacion(await listarAdmin('?isActive=quizas'), ['isActive']);
  });
});
