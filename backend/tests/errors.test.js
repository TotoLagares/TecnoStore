// Tests transversales: manejo de errores, datos sensibles y seguridad de los
// endpoints protegidos (ver specs/03-api-contract.md, Convenciones y Códigos de error)

const { describe, it, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const h = require('./helpers');

const { app, request, modelos } = h;

before(h.conectar);
after(h.desconectar);

describe('Rutas y formato', () => {
  it('GET /health → { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('ruta inexistente dentro de /api → 404 con message', async () => {
    const res = await request(app).get('/api/no-existe');
    assert.equal(res.status, 404);
    assert.equal(typeof res.body.message, 'string');
  });

  it('ruta inexistente fuera de /api → 404', async () => {
    assert.equal((await request(app).get('/cualquier-cosa')).status, 404);
  });

  it('método no soportado en una ruta existente → 404', async () => {
    assert.equal((await request(app).patch('/api/categories')).status, 404);
  });

  it('JSON mal formado → 400 con message (sin stack)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@a.com", ');
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.message, 'string');
    assert.equal(res.body.stack, undefined);
    assert.ok(!JSON.stringify(res.body).includes('at JSON.parse'));
  });
});

describe('Body demasiado grande → 413', () => {
  // Un body JSON de unos 110 kb (el límite del contrato es 100 kb).
  const textoGrande = 'x'.repeat(110 * 1024);

  for (const [ruta, body] of [
    ['/api/inquiries', { name: 'Ana', email: 'ana@mail.test', subject: 'Hola hola', message: textoGrande }],
    ['/api/auth/login', { email: 'a@a.com', password: textoGrande }],
  ]) {
    it(`POST ${ruta} con más de 100 kb → 413 con message (sin stack)`, async () => {
      const errorOriginal = console.error;
      console.error = () => {};
      let res;
      try {
        res = await request(app).post(ruta).send(body);
      } finally {
        console.error = errorOriginal;
      }
      assert.equal(res.status, 413, `Status ${res.status}`);
      assert.equal(typeof res.body.message, 'string');
      assert.equal(res.body.stack, undefined);
    });
  }

  it('un body de unos 90 kb no da 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@a.com', password: 'x'.repeat(90 * 1024) });
    assert.notEqual(res.status, 413);
  });
});

describe('id con formato inválido → 400 (CastError)', () => {
  let token;
  before(async () => {
    await h.limpiarBase();
    token = (await h.crearAdmin()).token;
  });

  const casos = [
    ['GET', '/api/products/123', false],
    ['GET', '/api/categories/zzz', false],
    ['GET', '/api/inquiries/123', true],
    ['PUT', '/api/products/123', true],
    ['PUT', '/api/categories/123', true],
    ['DELETE', '/api/products/123', true],
    ['DELETE', '/api/categories/123', true],
    ['DELETE', '/api/inquiries/123', true],
    ['PATCH', '/api/products/123/toggle-active', true],
    ['PATCH', '/api/inquiries/123/status', true],
  ];
  for (const [metodo, ruta, conToken] of casos) {
    it(`${metodo} ${ruta} → 400 sin mensajes internos de Mongo`, async () => {
      let req = request(app)[metodo.toLowerCase()](ruta);
      if (conToken) req = req.set(h.auth(token));
      // Mandamos un body válido para que el 400 venga del id y no de la validación.
      const res = await req.send(metodo === 'PATCH' ? { status: 'leida' } : { name: 'Nombre válido' });
      assert.equal(res.status, 400, JSON.stringify(res.body));
      const texto = JSON.stringify(res.body);
      assert.ok(!texto.includes('Cast to ObjectId'), `Filtra el mensaje de Mongoose: ${texto}`);
      assert.ok(!texto.includes('BSONError'), texto);
    });
  }
});

describe('Error inesperado → 500 genérico', () => {
  it('responde 500 "Error interno del servidor" sin stack ni detalles internos', async () => {
    // Simulamos que la base falla: todos los métodos de lectura de Product tiran error.
    const falla = () => {
      throw new Error('MongoServerError: detalle-interno-secreto en tecnostore.products');
    };
    const metodos = ['find', 'findOne', 'findById', 'countDocuments', 'aggregate', 'estimatedDocumentCount'];
    for (const m of metodos) mock.method(modelos.Product, m, falla);
    const errorOriginal = console.error;
    console.error = () => {}; // el servidor loguea el error; no ensuciamos la salida
    try {
      const res = await request(app).get('/api/products');
      assert.equal(res.status, 500);
      assert.equal(res.body.message, 'Error interno del servidor');
      assert.equal(res.body.stack, undefined);
      assert.ok(!JSON.stringify(res.body).includes('detalle-interno-secreto'));
    } finally {
      console.error = errorOriginal;
      mock.restoreAll();
    }
  });
});

describe('Ninguna respuesta incluye passwordHash / resetToken', () => {
  before(h.limpiarBase);

  it('register, login, me, PUT me, forgot-password y reset-password', async () => {
    const usuario = {
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan@tecnostore.test',
      phone: '11 4444-5555',
      password: 'Clave1234',
    };
    const respuestas = [];

    respuestas.push(await request(app).post('/api/auth/register').send(usuario));
    const login = await request(app).post('/api/auth/login').send({ email: usuario.email, password: usuario.password });
    respuestas.push(login);
    const token = login.body.data.token;

    respuestas.push(await request(app).get('/api/auth/me').set(h.auth(token)));
    respuestas.push(await request(app).put('/api/auth/me').set(h.auth(token)).send({ firstName: 'Juana' }));
    respuestas.push(
      await request(app)
        .put('/api/auth/me')
        .set(h.auth(token))
        .send({ currentPassword: 'Clave1234', newPassword: 'NuevaClave1' })
    );

    h.limpiarMails();
    respuestas.push(await request(app).post('/api/auth/forgot-password').send({ email: usuario.email }));
    const resetToken = h.extraerTokenDeMail(h.obtenerMails()[0]);
    // Aun con un token de reseteo pendiente, /me no lo devuelve.
    respuestas.push(await request(app).get('/api/auth/me').set(h.auth(token)));
    respuestas.push(
      await request(app).post('/api/auth/reset-password').send({ token: resetToken, newPassword: 'OtraClave22' })
    );

    for (const res of respuestas) {
      assert.ok(res.status < 300, `${res.req.method} ${res.req.path} → ${res.status}`);
      h.esperarSinDatosSensibles(res);
    }
  });
});

// ---------------------------------------------------------------------------
// Seguridad: TODOS los endpoints 🔒 rechazan pedidos sin token o con token malo
// ---------------------------------------------------------------------------

describe('Seguridad: endpoints protegidos', () => {
  // Ids de recursos que EXISTEN, para que un 404 no tape un 401 faltante.
  const ids = {};
  let adminId;

  before(async () => {
    await h.limpiarBase();
    const admin = await h.crearAdmin();
    adminId = admin.user._id;
    const categoria = await h.crearCategoria({ name: 'Notebooks' });
    const categoriaInactiva = await h.crearCategoria({ name: 'Retro', isActive: false });
    ids.categoria = categoria._id;
    ids.categoriaInactiva = categoriaInactiva._id;
    ids.producto = (await h.crearProducto({ category: categoria._id }))._id;
    ids.productoInactivo = (await h.crearProducto({ category: categoria._id, isActive: false }))._id;
    ids.productoDeCategoriaInactiva = (await h.crearProducto({ category: categoriaInactiva._id }))._id;
    ids.consulta = (await h.crearConsulta())._id;
  });

  // [método, ruta]. ":clave" se reemplaza por ids[clave] al correr el test
  // (los ids recién existen después del before).
  const protegidos = [
    ['GET', '/api/auth/me'],
    ['PUT', '/api/auth/me'],
    ['GET', '/api/categories?all=true'],
    ['GET', '/api/categories/:categoriaInactiva'],
    ['POST', '/api/categories'],
    ['PUT', '/api/categories/:categoria'],
    ['DELETE', '/api/categories/:categoria'],
    ['GET', '/api/products/admin'],
    ['GET', '/api/products/:productoInactivo'],
    ['GET', '/api/products/:productoDeCategoriaInactiva'],
    ['POST', '/api/products'],
    ['PUT', '/api/products/:producto'],
    ['PATCH', '/api/products/:producto/toggle-active'],
    ['DELETE', '/api/products/:producto'],
    ['PUT', '/api/business-info'],
    ['GET', '/api/inquiries'],
    ['GET', '/api/inquiries/:consulta'],
    ['PATCH', '/api/inquiries/:consulta/status'],
    ['DELETE', '/api/inquiries/:consulta'],
    ['GET', '/api/stats'],
  ];
  const armarRuta = (plantilla) => plantilla.replace(/:(\w+)/g, (_, clave) => ids[clave]);

  // Distintas formas de NO estar autenticado.
  const credencialesInvalidas = [
    ['sin header Authorization', () => null],
    ['token basura', () => 'Bearer basura'],
    ['"Bearer" sin token', () => 'Bearer '],
    ['esquema distinto de Bearer', () => 'Basic YWRtaW46YWRtaW4='],
    ['token firmado con otro secreto', () => `Bearer ${jwt.sign({ id: adminId, role: 'admin' }, 'otro-secreto')}`],
    [
      'token expirado',
      () =>
        `Bearer ${jwt.sign(
          { id: adminId, role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 },
          process.env.JWT_SECRET
        )}`,
    ],
  ];

  for (const [metodo, plantilla] of protegidos) {
    for (const [descripcion, header] of credencialesInvalidas) {
      it(`${metodo} ${plantilla} con ${descripcion} → 401`, async () => {
        const ruta = armarRuta(plantilla);
        let req = request(app)[metodo.toLowerCase()](ruta);
        const valor = header();
        if (valor !== null) req = req.set('Authorization', valor);
        // Body vacío: si la validación corriera antes que la auth, daría 400 (y sería un bug).
        const res = await req.send({});
        assert.equal(res.status, 401, `${metodo} ${ruta} → ${res.status}: ${JSON.stringify(res.body)}`);
        assert.equal(typeof res.body.message, 'string');
      });
    }
  }

  it('después de todos esos pedidos rechazados, nada se modificó ni se borró', async () => {
    assert.ok(await modelos.Category.findById(ids.categoria));
    const producto = await modelos.Product.findById(ids.producto);
    assert.ok(producto);
    assert.equal(producto.isActive, true);
    const consulta = await modelos.Inquiry.findById(ids.consulta);
    assert.ok(consulta);
    assert.equal(consulta.status, 'pendiente');
    assert.equal(await modelos.BusinessInfo.countDocuments(), 0);
  });
});
