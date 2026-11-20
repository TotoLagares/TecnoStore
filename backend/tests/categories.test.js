// Tests de /api/categories (ver specs/03-api-contract.md, sección Categorías)

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const { app, request, modelos } = h;

let admin;

before(h.conectar);
after(h.desconectar);
beforeEach(async () => {
  await h.limpiarBase();
  admin = await h.crearAdmin();
});

describe('GET /api/categories (público)', () => {
  it('devuelve solo las activas, ordenadas por nombre', async () => {
    await h.crearCategoria({ name: 'Smartphones' });
    await h.crearCategoria({ name: 'Audio' });
    await h.crearCategoria({ name: 'Notebooks' });
    await h.crearCategoria({ name: 'Retro', isActive: false });

    const res = await request(app).get('/api/categories');
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.map((c) => c.name),
      ['Audio', 'Notebooks', 'Smartphones']
    );
  });

  it('productCount cuenta solo las publicaciones activas', async () => {
    const cat = await h.crearCategoria({ name: 'Notebooks' });
    const vacia = await h.crearCategoria({ name: 'Vacía' });
    await h.crearProducto({ category: cat._id });
    await h.crearProducto({ category: cat._id });
    await h.crearProducto({ category: cat._id, isActive: false });

    const res = await request(app).get('/api/categories');
    const porNombre = Object.fromEntries(res.body.data.map((c) => [c.name, c]));
    assert.equal(porNombre.Notebooks.productCount, 2);
    assert.equal(porNombre['Vacía'].productCount, 0);
    assert.ok(vacia);
  });

  it('?all=true sin token → 401', async () => {
    const res = await request(app).get('/api/categories?all=true');
    assert.equal(res.status, 401);
  });

  it('?all=true con token basura → 401', async () => {
    const res = await request(app).get('/api/categories?all=true').set(h.auth('basura'));
    assert.equal(res.status, 401);
  });

  it('?all=true con token → todas, y productCount cuenta TODAS las publicaciones', async () => {
    const activa = await h.crearCategoria({ name: 'Notebooks' });
    const inactiva = await h.crearCategoria({ name: 'Retro', isActive: false });
    await h.crearProducto({ category: activa._id });
    await h.crearProducto({ category: activa._id, isActive: false });
    await h.crearProducto({ category: inactiva._id });

    const res = await request(app).get('/api/categories?all=true').set(h.auth(admin.token));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.map((c) => c.name), ['Notebooks', 'Retro']);
    const porNombre = Object.fromEntries(res.body.data.map((c) => [c.name, c]));
    assert.equal(porNombre.Notebooks.productCount, 2);
    assert.equal(porNombre.Retro.productCount, 1);
    assert.equal(porNombre.Retro.isActive, false);
  });
});

describe('GET /api/categories?all=true (orden)', () => {
  it('devuelve activas e inactivas ordenadas por nombre', async () => {
    await h.crearCategoria({ name: 'Smartphones' });
    await h.crearCategoria({ name: 'Zeta', isActive: false });
    await h.crearCategoria({ name: 'Audio', isActive: false });
    await h.crearCategoria({ name: 'Notebooks' });
    const res = await request(app).get('/api/categories?all=true').set(h.auth(admin.token));
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.map((c) => c.name),
      ['Audio', 'Notebooks', 'Smartphones', 'Zeta']
    );
  });
});

describe('GET /api/categories/:id', () => {
  it('categoría activa → 200 sin token', async () => {
    const cat = await h.crearCategoria({ name: 'Notebooks' });
    const res = await request(app).get(`/api/categories/${cat._id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Notebooks');
    assert.equal(res.body.data._id, cat._id.toString());
  });

  it('categoría inactiva sin token → 401, con token → 200', async () => {
    const cat = await h.crearCategoria({ name: 'Retro', isActive: false });
    assert.equal((await request(app).get(`/api/categories/${cat._id}`)).status, 401);
    const conToken = await request(app).get(`/api/categories/${cat._id}`).set(h.auth(admin.token));
    assert.equal(conToken.status, 200);
    assert.equal(conToken.body.data.name, 'Retro');
  });

  it('inexistente → 404', async () => {
    assert.equal((await request(app).get(`/api/categories/${h.idInexistente()}`)).status, 404);
  });

  it('id con formato inválido → 400', async () => {
    assert.equal((await request(app).get('/api/categories/123')).status, 400);
  });
});

describe('POST /api/categories', () => {
  const crear = (body) => request(app).post('/api/categories').set(h.auth(admin.token)).send(body);

  it('crea la categoría → 201 (activa por defecto)', async () => {
    const res = await crear({ name: 'Notebooks', description: 'Portátiles' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'Notebooks');
    assert.equal(res.body.data.description, 'Portátiles');
    assert.equal(res.body.data.isActive, true);
    assert.equal(await modelos.Category.countDocuments(), 1);
  });

  it('acepta isActive: false', async () => {
    const res = await crear({ name: 'Retro', isActive: false });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.isActive, false);
  });

  it('nombre duplicado → 409', async () => {
    await crear({ name: 'Notebooks' });
    assert.equal((await crear({ name: 'Notebooks' })).status, 409);
  });

  it('nombre duplicado sin distinguir mayúsculas → 409', async () => {
    await crear({ name: 'Notebooks' });
    const res = await crear({ name: 'NOTEBOOKS' });
    assert.equal(res.status, 409);
    assert.equal(await modelos.Category.countDocuments(), 1);
  });

  it('sin nombre → 400 con errors[name]', async () => {
    h.esperarErrorDeValidacion(await crear({}), ['name']);
  });

  it('nombre de 1 o de 51 caracteres → 400', async () => {
    h.esperarErrorDeValidacion(await crear({ name: 'N' }), ['name']);
    h.esperarErrorDeValidacion(await crear({ name: 'N'.repeat(51) }), ['name']);
  });

  it('descripción de más de 300 caracteres → 400', async () => {
    h.esperarErrorDeValidacion(await crear({ name: 'Notebooks', description: 'x'.repeat(301) }), [
      'description',
    ]);
  });

  it('allowlist: ignora _id, productCount y campos extra', async () => {
    const idFalso = h.idInexistente();
    const res = await crear({ name: 'Notebooks', _id: idFalso, productCount: 99, color: 'rojo' });
    assert.equal(res.status, 201);
    assert.notEqual(res.body.data._id, idFalso);
    assert.equal(res.body.data.color, undefined);
    const enBase = await modelos.Category.findOne({ name: 'Notebooks' }).lean();
    assert.equal(enBase.color, undefined);
    assert.equal(enBase.productCount, undefined);
  });
});

describe('PUT /api/categories/:id', () => {
  const actualizar = (id, body) =>
    request(app).put(`/api/categories/${id}`).set(h.auth(admin.token)).send(body);

  it('actualiza nombre, descripción e isActive → 200', async () => {
    const cat = await h.crearCategoria({ name: 'Notebooks' });
    const res = await actualizar(cat._id, {
      name: 'Laptops',
      description: 'Nueva descripción',
      isActive: false,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Laptops');
    assert.equal(res.body.data.description, 'Nueva descripción');
    assert.equal(res.body.data.isActive, false);
  });

  it('nombre que choca con otra categoría (sin distinguir mayúsculas) → 409', async () => {
    await h.crearCategoria({ name: 'Notebooks' });
    const otra = await h.crearCategoria({ name: 'Audio' });
    assert.equal((await actualizar(otra._id, { name: 'Notebooks' })).status, 409);
    assert.equal((await actualizar(otra._id, { name: 'notebooks' })).status, 409);
  });

  it('volver a mandar su propio nombre no es conflicto → 200', async () => {
    const cat = await h.crearCategoria({ name: 'Notebooks' });
    assert.equal((await actualizar(cat._id, { name: 'Notebooks' })).status, 200);
  });

  it('datos inválidos → 400 con errors[]', async () => {
    const cat = await h.crearCategoria();
    h.esperarErrorDeValidacion(await actualizar(cat._id, { name: 'N', description: 'x'.repeat(301) }), [
      'name',
      'description',
    ]);
  });

  it('inexistente → 404', async () => {
    assert.equal((await actualizar(h.idInexistente(), { name: 'Nuevo nombre' })).status, 404);
  });

  it('id inválido → 400', async () => {
    assert.equal((await actualizar('no-es-un-id', { name: 'Nuevo nombre' })).status, 400);
  });

  it('allowlist: ignora _id y campos extra', async () => {
    const cat = await h.crearCategoria({ name: 'Notebooks' });
    const res = await actualizar(cat._id, { _id: h.idInexistente(), color: 'rojo', description: 'Ok' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data._id, cat._id.toString());
    const enBase = await modelos.Category.findById(cat._id).lean();
    assert.equal(enBase.color, undefined);
  });
});

describe('DELETE /api/categories/:id', () => {
  const borrar = (id) => request(app).delete(`/api/categories/${id}`).set(h.auth(admin.token));

  it('borra una categoría sin productos → 200 y después da 404', async () => {
    const cat = await h.crearCategoria();
    assert.equal((await borrar(cat._id)).status, 200);
    assert.equal(await modelos.Category.countDocuments(), 0);
    assert.equal((await request(app).get(`/api/categories/${cat._id}`).set(h.auth(admin.token))).status, 404);
  });

  it('con publicaciones activas → 409 y no se borra', async () => {
    const cat = await h.crearCategoria();
    await h.crearProducto({ category: cat._id });
    assert.equal((await borrar(cat._id)).status, 409);
    assert.equal(await modelos.Category.countDocuments(), 1);
  });

  it('con publicaciones inactivas → también 409', async () => {
    const cat = await h.crearCategoria();
    await h.crearProducto({ category: cat._id, isActive: false });
    assert.equal((await borrar(cat._id)).status, 409);
  });

  it('inexistente → 404', async () => {
    assert.equal((await borrar(h.idInexistente())).status, 404);
  });

  it('id inválido → 400', async () => {
    assert.equal((await borrar('abc')).status, 400);
  });
});
