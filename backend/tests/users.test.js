// Tests de /api/users (panel de cuentas registradas)

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const { app, request, modelos } = h;

before(h.conectar);
after(h.desconectar);
beforeEach(h.limpiarBase);

// Registra un cliente por la API y devuelve { id, token }.
async function crearCliente(email = 'cliente@tecnostore.test') {
  const registro = await request(app).post('/api/auth/register').send({
    firstName: 'Juan',
    lastName: 'Pérez',
    email,
    phone: '11 4444-5555',
    password: 'Clave1234',
  });
  const login = await request(app).post('/api/auth/login').send({ email, password: 'Clave1234' });
  return { id: registro.body.data._id, token: login.body.data.token };
}

const cambiarRol = (token, id, role) =>
  request(app).patch(`/api/users/${id}/role`).set(h.auth(token)).send({ role });

describe('GET /api/users', () => {
  it('un admin ve todas las cuentas, sin datos sensibles', async () => {
    const admin = await h.crearAdmin();
    await crearCliente();
    const res = await request(app).get('/api/users').set(h.auth(admin.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    const roles = res.body.data.map((u) => u.role).sort();
    assert.deepEqual(roles, ['admin', 'cliente']);
    h.esperarSinDatosSensibles(res);
  });

  it('sin token → 401; un cliente → 403', async () => {
    assert.equal((await request(app).get('/api/users')).status, 401);
    const cliente = await crearCliente();
    assert.equal((await request(app).get('/api/users').set(h.auth(cliente.token))).status, 403);
  });
});

describe('PATCH /api/users/:id/role', () => {
  it('un admin hace admin a un cliente, y le sirve sin volver a loguearse', async () => {
    const admin = await h.crearAdmin();
    const cliente = await crearCliente();
    assert.equal((await request(app).get('/api/stats').set(h.auth(cliente.token))).status, 403);

    const res = await cambiarRol(admin.token, cliente.id, 'admin');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.role, 'admin');
    // Con el mismo token de antes ya puede usar el panel.
    assert.equal((await request(app).get('/api/stats').set(h.auth(cliente.token))).status, 200);
  });

  it('quitarle el rol de admin a otro le corta el acceso en el momento', async () => {
    const admin = await h.crearAdmin();
    const otro = await h.crearAdmin();
    const res = await cambiarRol(admin.token, otro.user._id, 'cliente');
    assert.equal(res.status, 200);
    assert.equal((await request(app).get('/api/stats').set(h.auth(otro.token))).status, 403);
  });

  it('no puede cambiar su propio rol → 400', async () => {
    const admin = await h.crearAdmin();
    const res = await cambiarRol(admin.token, admin.user._id, 'cliente');
    assert.equal(res.status, 400);
    const enBase = await modelos.User.findById(admin.user._id);
    assert.equal(enBase.role, 'admin');
  });

  it('rol inválido → 400 con errors[]', async () => {
    const admin = await h.crearAdmin();
    const cliente = await crearCliente();
    h.esperarErrorDeValidacion(await cambiarRol(admin.token, cliente.id, 'superadmin'), ['role']);
  });

  it('usuario inexistente → 404; id mal formado → 400', async () => {
    const admin = await h.crearAdmin();
    assert.equal((await cambiarRol(admin.token, h.idInexistente(), 'admin')).status, 404);
    assert.equal((await cambiarRol(admin.token, 'no-es-un-id', 'admin')).status, 400);
  });

  it('un cliente no puede hacerse admin → 403', async () => {
    const cliente = await crearCliente();
    assert.equal((await cambiarRol(cliente.token, cliente.id, 'admin')).status, 403);
  });
});
