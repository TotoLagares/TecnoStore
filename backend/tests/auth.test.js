// Tests de /api/auth (ver specs/03-api-contract.md, sección Auth)

const { describe, it, before, after, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const { app, request, modelos } = h;

const MENSAJE_FORGOT = 'Si el email está registrado, te enviamos un correo con las instrucciones';

// Datos válidos de registro; cada test pisa lo que necesita.
const usuarioValido = (extra = {}) => ({
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan@tecnostore.test',
  phone: '+54 (11) 4444-5555',
  password: 'Clave1234',
  ...extra,
});

const registrar = (body) => request(app).post('/api/auth/register').send(body);
const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });

before(h.conectar);
after(h.desconectar);
beforeEach(h.limpiarBase);

describe('POST /api/auth/register', () => {
  it('crea el usuario y responde 201 con data: user (sin datos sensibles)', async () => {
    const res = await registrar(usuarioValido());
    assert.equal(res.status, 201);
    assert.equal(res.body.data.email, 'juan@tecnostore.test');
    assert.equal(res.body.data.firstName, 'Juan');
    assert.equal(res.body.data.lastName, 'Pérez');
    assert.equal(res.body.data.phone, '+54 (11) 4444-5555');
    assert.ok(res.body.data._id);
    h.esperarSinDatosSensibles(res);
  });

  it('guarda el email en minúsculas y sin espacios', async () => {
    const res = await registrar(usuarioValido({ email: '  Juan.Perez@TecnoStore.TEST  ' }));
    assert.equal(res.status, 201);
    assert.equal(res.body.data.email, 'juan.perez@tecnostore.test');
  });

  it('no altera emails de Gmail con puntos o "+" (no usa normalizeEmail)', async () => {
    const res = await registrar(usuarioValido({ email: 'juan.perez+tienda@gmail.com' }));
    assert.equal(res.status, 201);
    assert.equal(res.body.data.email, 'juan.perez+tienda@gmail.com');
  });

  it('la cuenta nueva es de cliente, no de admin', async () => {
    const res = await registrar(usuarioValido());
    assert.equal(res.body.data.role, 'cliente');
  });

  it('ignora un role enviado en el body (no se puede registrar como admin)', async () => {
    const res = await registrar(usuarioValido({ role: 'admin' }));
    assert.equal(res.status, 201);
    assert.equal(res.body.data.role, 'cliente');
  });

  it('un cliente puede ver y editar su perfil pero no usar el panel (403)', async () => {
    await registrar(usuarioValido());
    const token = (await login('juan@tecnostore.test', 'Clave1234')).body.data.token;

    assert.equal((await request(app).get('/api/auth/me').set(h.auth(token))).status, 200);
    assert.equal(
      (await request(app).put('/api/auth/me').set(h.auth(token)).send({ firstName: 'Juana' })).status,
      200
    );
    const prohibidos = [
      request(app).get('/api/stats'),
      request(app).get('/api/products/admin'),
      request(app).get('/api/inquiries'),
      request(app).get('/api/categories?all=true'),
      request(app).post('/api/categories').send({ name: 'Nueva', description: 'Una categoría' }),
      request(app).put('/api/business-info').send({}),
    ];
    for (const pedido of prohibidos) {
      const res = await pedido.set(h.auth(token));
      assert.equal(res.status, 403, `${res.req.method} ${res.req.path} → ${res.status}`);
    }
  });

  it('permite hacer login con el usuario recién registrado', async () => {
    await registrar(usuarioValido());
    const res = await login('juan@tecnostore.test', 'Clave1234');
    assert.equal(res.status, 200);
  });

  it('email duplicado → 409', async () => {
    await registrar(usuarioValido());
    const res = await registrar(usuarioValido({ firstName: 'Otro' }));
    assert.equal(res.status, 409);
    assert.equal(typeof res.body.message, 'string');
  });

  it('email duplicado con otras mayúsculas/minúsculas → 409', async () => {
    await registrar(usuarioValido({ email: 'juan@tecnostore.test' }));
    const res = await registrar(usuarioValido({ email: 'JUAN@TecnoStore.Test' }));
    assert.equal(res.status, 409);
  });

  it('body vacío → 400 con errores en todos los campos requeridos', async () => {
    const res = await registrar({});
    h.esperarErrorDeValidacion(res, ['firstName', 'lastName', 'email', 'phone', 'password']);
  });

  it('email con formato inválido → 400', async () => {
    h.esperarErrorDeValidacion(await registrar(usuarioValido({ email: 'no-es-un-email' })), ['email']);
  });

  for (const [descripcion, password] of [
    ['menos de 8 caracteres', 'Abc1234'],
    ['sin números', 'SoloLetras'],
    ['sin letras', '12345678'],
  ]) {
    it(`password débil (${descripcion}) → 400`, async () => {
      h.esperarErrorDeValidacion(await registrar(usuarioValido({ password })), ['password']);
    });
  }

  it('firstName / lastName con menos de 2 o más de 60 caracteres → 400', async () => {
    h.esperarErrorDeValidacion(await registrar(usuarioValido({ firstName: 'J' })), ['firstName']);
    h.esperarErrorDeValidacion(await registrar(usuarioValido({ lastName: 'x'.repeat(61) })), ['lastName']);
  });

  it('phone con caracteres no permitidos o largo inválido → 400', async () => {
    h.esperarErrorDeValidacion(await registrar(usuarioValido({ phone: '11-4444-abcd' })), ['phone']);
    h.esperarErrorDeValidacion(await registrar(usuarioValido({ phone: '12345' })), ['phone']);
    h.esperarErrorDeValidacion(await registrar(usuarioValido({ phone: '1'.repeat(26) })), ['phone']);
  });

  it('allowlist: ignora role, passwordHash, _id y otros campos extra', async () => {
    const idFalso = h.idInexistente();
    const res = await registrar(
      usuarioValido({
        role: 'superadmin',
        passwordHash: 'hash-inyectado',
        _id: idFalso,
        resetToken: 'token-inyectado',
        esVip: true,
      })
    );
    assert.equal(res.status, 201);
    assert.notEqual(res.body.data._id, idFalso);
    assert.notEqual(res.body.data.role, 'superadmin');
    assert.equal(res.body.data.esVip, undefined);

    const enBase = await modelos.User.findOne({ email: 'juan@tecnostore.test' }).select(
      '+passwordHash +resetToken'
    );
    assert.equal(enBase.role, 'cliente');
    assert.notEqual(enBase.passwordHash, 'hash-inyectado');
    assert.ok(!enBase.resetToken);

    // La contraseña real sigue funcionando.
    assert.equal((await login('juan@tecnostore.test', 'Clave1234')).status, 200);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registrar(usuarioValido());
  });

  it('credenciales correctas → 200 con { token, user }', async () => {
    const res = await login('juan@tecnostore.test', 'Clave1234');
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.data.token, 'string');
    assert.equal(res.body.data.user.email, 'juan@tecnostore.test');
    h.esperarSinDatosSensibles(res);
  });

  it('acepta el email con otras mayúsculas (se guarda en minúsculas)', async () => {
    const res = await login('JUAN@TecnoStore.test', 'Clave1234');
    assert.equal(res.status, 200);
  });

  it('contraseña incorrecta → 401 "Credenciales inválidas"', async () => {
    const res = await login('juan@tecnostore.test', 'OtraClave99');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Credenciales inválidas');
  });

  it('email inexistente → 401 con el MISMO mensaje', async () => {
    const res = await login('nadie@tecnostore.test', 'Clave1234');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Credenciales inválidas');
  });

  it('body vacío → 400 con errors[] en email y password', async () => {
    h.esperarErrorDeValidacion(await request(app).post('/api/auth/login').send({}), ['email', 'password']);
  });
});

describe('GET /api/auth/me', () => {
  it('devuelve el usuario logueado sin datos sensibles', async () => {
    const admin = await h.crearAdmin({ email: 'ada@tecnostore.test' });
    const res = await request(app).get('/api/auth/me').set(h.auth(admin.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, 'ada@tecnostore.test');
    h.esperarSinDatosSensibles(res);
  });
});

describe('PUT /api/auth/me', () => {
  let admin;
  beforeEach(async () => {
    admin = await h.crearAdmin({ email: 'ada@tecnostore.test', password: 'Admin1234' });
  });

  const actualizar = (body) => request(app).put('/api/auth/me').set(h.auth(admin.token)).send(body);
  const confirmar = (body) => request(app).post('/api/auth/confirm-password-change').send(body);

  it('actualiza nombre, apellido y teléfono → 200', async () => {
    const res = await actualizar({ firstName: 'Grace', lastName: 'Hopper', phone: '11 5555-6666' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.firstName, 'Grace');
    assert.equal(res.body.data.lastName, 'Hopper');
    assert.equal(res.body.data.phone, '11 5555-6666');
    h.esperarSinDatosSensibles(res);
  });

  it('actualiza el email (en minúsculas) y se puede loguear con el nuevo', async () => {
    const res = await actualizar({ email: ' Nuevo@TecnoStore.test ' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, 'nuevo@tecnostore.test');
    assert.equal((await login('nuevo@tecnostore.test', 'Admin1234')).status, 200);
  });

  it('email que ya usa otra cuenta → 409 (también con otras mayúsculas)', async () => {
    await h.crearAdmin({ email: 'otro@tecnostore.test' });
    assert.equal((await actualizar({ email: 'otro@tecnostore.test' })).status, 409);
    assert.equal((await actualizar({ email: 'OTRO@tecnostore.test' })).status, 409);
  });

  it('mandar su propio email no es conflicto → 200', async () => {
    assert.equal((await actualizar({ email: 'ada@tecnostore.test' })).status, 200);
  });

  it('newPassword sin currentPassword → 400', async () => {
    const res = await actualizar({ newPassword: 'NuevaClave1' });
    assert.equal(res.status, 400);
    // La contraseña no cambió.
    assert.equal((await login('ada@tecnostore.test', 'Admin1234')).status, 200);
  });

  it('currentPassword incorrecta → 400 y no cambia la contraseña', async () => {
    const res = await actualizar({ currentPassword: 'Incorrecta1', newPassword: 'NuevaClave1' });
    assert.equal(res.status, 400);
    assert.equal((await login('ada@tecnostore.test', 'NuevaClave1')).status, 401);
    assert.equal((await login('ada@tecnostore.test', 'Admin1234')).status, 200);
  });

  it('newPassword débil → 400', async () => {
    h.esperarErrorDeValidacion(
      await actualizar({ currentPassword: 'Admin1234', newPassword: 'corta' }),
      ['newPassword']
    );
  });

  it('cambio de contraseña → 200 pendiente: manda mail y todavía no cambia', async () => {
    const res = await actualizar({ currentPassword: 'Admin1234', newPassword: 'NuevaClave1' });
    assert.equal(res.status, 200);
    assert.equal(res.body.passwordChangePending, true);
    h.esperarSinDatosSensibles(res);

    const mails = h.obtenerMails();
    assert.equal(mails.length, 1);
    assert.equal(h.destinatarioDeMail(mails[0]), 'ada@tecnostore.test');
    assert.ok(h.extraerTokenDeConfirmacion(mails[0]), 'El mail debe traer el link de confirmación');

    // Hasta confirmar, sigue valiendo la contraseña vieja.
    assert.equal((await login('ada@tecnostore.test', 'Admin1234')).status, 200);
    assert.equal((await login('ada@tecnostore.test', 'NuevaClave1')).status, 401);
  });

  it('confirmar desde el link del mail → la nueva funciona y la vieja no', async () => {
    await actualizar({ currentPassword: 'Admin1234', newPassword: 'NuevaClave1' });
    const token = h.extraerTokenDeConfirmacion(h.obtenerMails()[0]);

    const res = await confirmar({ token });
    assert.equal(res.status, 200);
    assert.equal((await login('ada@tecnostore.test', 'NuevaClave1')).status, 200);
    assert.equal((await login('ada@tecnostore.test', 'Admin1234')).status, 401);
  });

  it('el link de confirmación es de un solo uso', async () => {
    await actualizar({ currentPassword: 'Admin1234', newPassword: 'NuevaClave1' });
    const token = h.extraerTokenDeConfirmacion(h.obtenerMails()[0]);
    assert.equal((await confirmar({ token })).status, 200);
    assert.equal((await confirmar({ token })).status, 400);
  });

  it('confirmar con token inválido o sin token → 400', async () => {
    assert.equal((await confirmar({ token: 'cualquier-cosa' })).status, 400);
    h.esperarErrorDeValidacion(await confirmar({}), ['token']);
  });

  it('el link vencido no sirve', async () => {
    await actualizar({ currentPassword: 'Admin1234', newPassword: 'NuevaClave1' });
    const token = h.extraerTokenDeConfirmacion(h.obtenerMails()[0]);
    await modelos.User.updateOne({ email: 'ada@tecnostore.test' }, { passwordChangeExpires: new Date(Date.now() - 1000) });
    assert.equal((await confirmar({ token })).status, 400);
    assert.equal((await login('ada@tecnostore.test', 'Admin1234')).status, 200);
  });

  it('si no se puede mandar el mail → 502 y la contraseña no cambia', async () => {
    const mailService = require('../src/services/mail.service');
    mock.method(mailService, 'sendPasswordChangeConfirmation', async () => {
      throw new Error('smtp caído');
    });
    mock.method(console, 'error', () => {});
    let res;
    try {
      res = await actualizar({ currentPassword: 'Admin1234', newPassword: 'NuevaClave1' });
    } finally {
      mock.restoreAll();
    }
    assert.equal(res.status, 502);
    assert.equal((await login('ada@tecnostore.test', 'Admin1234')).status, 200);
  });

  it('campos inválidos → 400 con errors[]', async () => {
    h.esperarErrorDeValidacion(await actualizar({ firstName: 'G', email: 'mal', phone: 'abc' }), [
      'firstName',
      'email',
      'phone',
    ]);
  });

  it('allowlist: ignora role, passwordHash, password y _id', async () => {
    const res = await actualizar({
      firstName: 'Grace',
      role: 'superadmin',
      passwordHash: 'hash-inyectado',
      password: 'Inyectada1',
      _id: h.idInexistente(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data._id, admin.user._id);
    const enBase = await modelos.User.findById(admin.user._id).select('+passwordHash');
    assert.equal(enBase.role, 'admin');
    assert.notEqual(enBase.passwordHash, 'hash-inyectado');
    // `password` no es un campo del PUT /me: la contraseña sigue siendo la original.
    assert.equal((await login('ada@tecnostore.test', 'Admin1234')).status, 200);
    assert.equal((await login('ada@tecnostore.test', 'Inyectada1')).status, 401);
  });
});

describe('POST /api/auth/forgot-password y /reset-password', () => {
  beforeEach(async () => {
    await h.crearAdmin({ email: 'ada@tecnostore.test', password: 'Admin1234' });
  });

  const olvide = (email) => request(app).post('/api/auth/forgot-password').send({ email });
  const resetear = (body) => request(app).post('/api/auth/reset-password').send(body);

  // Pide el reseteo y devuelve el token que vino en el mail.
  async function pedirToken() {
    h.limpiarMails();
    await olvide('ada@tecnostore.test');
    const mails = h.obtenerMails();
    assert.equal(mails.length, 1);
    const token = h.extraerTokenDeMail(mails[0]);
    assert.ok(token, 'El mail debe tener un link con el token');
    return token;
  }

  it('responde 200 con el MISMO mensaje exista o no el email', async () => {
    const existe = await olvide('ada@tecnostore.test');
    const noExiste = await olvide('nadie@tecnostore.test');
    assert.equal(existe.status, 200);
    assert.equal(noExiste.status, 200);
    assert.equal(existe.body.message, MENSAJE_FORGOT);
    assert.equal(noExiste.body.message, MENSAJE_FORGOT);
    assert.deepEqual(existe.body, noExiste.body);
  });

  it('si el email existe, manda UN mail a esa dirección con el link y el token', async () => {
    const res = await olvide('ada@tecnostore.test');
    assert.equal(res.status, 200);
    const mails = h.obtenerMails();
    assert.equal(mails.length, 1);
    assert.ok(h.destinatarioDeMail(mails[0]).includes('ada@tecnostore.test'));
    const contenido = h.contenidoDeMail(mails[0]);
    assert.ok(
      contenido.includes(`${process.env.FRONTEND_URL}/restablecer-contrasena?token=`),
      'El link debe ser ${FRONTEND_URL}/restablecer-contrasena?token=<token>'
    );
    assert.ok(h.extraerTokenDeMail(mails[0]));
  });

  it('funciona aunque el email venga con otras mayúsculas', async () => {
    await olvide('ADA@TecnoStore.test');
    assert.equal(h.obtenerMails().length, 1);
  });

  it('si el email no existe, no manda ningún mail', async () => {
    await olvide('nadie@tecnostore.test');
    assert.equal(h.obtenerMails().length, 0);
  });

  it('el token NO viene en la respuesta', async () => {
    const res = await olvide('ada@tecnostore.test');
    const token = h.extraerTokenDeMail(h.obtenerMails()[0]);
    const texto = JSON.stringify(res.body);
    assert.ok(!texto.includes(token), 'La respuesta no debe contener el token');
    h.esperarSinDatosSensibles(res);
  });

  it('el token NO se imprime en consola', async () => {
    const impreso = [];
    const originales = {};
    for (const metodo of ['log', 'info', 'warn', 'error', 'debug']) {
      originales[metodo] = console[metodo];
      console[metodo] = (...args) => impreso.push(args.map(String).join(' '));
    }
    try {
      await olvide('ada@tecnostore.test');
    } finally {
      Object.assign(console, originales);
    }
    const token = h.extraerTokenDeMail(h.obtenerMails()[0]);
    assert.ok(!impreso.join('\n').includes(token), 'El token apareció en la consola');
  });

  it('guarda en la base un hash del token, no el token en claro', async () => {
    const token = await pedirToken();
    const enBase = await h.modelos.User.findOne({ email: 'ada@tecnostore.test' }).select(
      '+resetToken +resetTokenExpires'
    );
    assert.ok(enBase.resetToken);
    assert.notEqual(enBase.resetToken, token);
    // Vence en (aproximadamente) 1 hora.
    const minutos = (enBase.resetTokenExpires.getTime() - Date.now()) / 60000;
    assert.ok(minutos > 55 && minutos <= 61, `Vence en ${minutos} minutos`);
  });

  it('con el token del mail el reset funciona: 200 y la nueva contraseña sirve', async () => {
    const token = await pedirToken();
    const res = await resetear({ token, newPassword: 'NuevaClave1' });
    assert.equal(res.status, 200);
    h.esperarSinDatosSensibles(res);
    assert.equal((await login('ada@tecnostore.test', 'NuevaClave1')).status, 200);
    assert.equal((await login('ada@tecnostore.test', 'Admin1234')).status, 401);
  });

  it('el token es de un solo uso: el segundo intento → 400', async () => {
    const token = await pedirToken();
    assert.equal((await resetear({ token, newPassword: 'NuevaClave1' })).status, 200);
    const segunda = await resetear({ token, newPassword: 'OtraClave22' });
    assert.equal(segunda.status, 400);
    assert.equal((await login('ada@tecnostore.test', 'NuevaClave1')).status, 200);
  });

  it('token inválido → 400', async () => {
    const res = await resetear({ token: 'esto-no-es-un-token', newPassword: 'NuevaClave1' });
    assert.equal(res.status, 400);
  });

  it('token expirado → 400', async () => {
    const token = await pedirToken();
    await h.modelos.User.collection.updateOne(
      { email: 'ada@tecnostore.test' },
      { $set: { resetTokenExpires: new Date(Date.now() - 1000) } }
    );
    assert.equal((await resetear({ token, newPassword: 'NuevaClave1' })).status, 400);
    assert.equal((await login('ada@tecnostore.test', 'Admin1234')).status, 200);
  });

  it('pedir un token nuevo invalida el anterior', async () => {
    const viejo = await pedirToken();
    const nuevo = await pedirToken();
    assert.notEqual(viejo, nuevo);
    assert.equal((await resetear({ token: viejo, newPassword: 'NuevaClave1' })).status, 400);
    assert.equal((await resetear({ token: nuevo, newPassword: 'NuevaClave1' })).status, 200);
  });

  it('newPassword débil → 400 y el token sigue sirviendo', async () => {
    const token = await pedirToken();
    h.esperarErrorDeValidacion(await resetear({ token, newPassword: 'debil' }), ['newPassword']);
    assert.equal((await resetear({ token, newPassword: 'NuevaClave1' })).status, 200);
  });

  it('reset sin body → 400 con errors[] en token y newPassword', async () => {
    h.esperarErrorDeValidacion(await resetear({}), ['token', 'newPassword']);
  });

  it('forgot con email mal formado → 400 con errors[] y no manda mails', async () => {
    h.esperarErrorDeValidacion(await olvide('esto-no-es-un-email'), ['email']);
    assert.equal(h.obtenerMails().length, 0);
  });

  it('si falla el envío del mail, igual responde 200 con el mismo mensaje', async () => {
    const mailService = require('../src/services/mail.service');
    mock.method(mailService, 'sendPasswordReset', async () => {
      throw new Error('smtp caído');
    });
    mock.method(console, 'error', () => {}); // el servidor loguea la falla
    let res;
    try {
      res = await olvide('ada@tecnostore.test');
    } finally {
      mock.restoreAll();
    }
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.message, MENSAJE_FORGOT);
    // El mock se usó: no quedó ningún mail en sentMails.
    assert.equal(h.obtenerMails().length, 0);
  });

  it('forgot sin email → 400 con errors[]', async () => {
    h.esperarErrorDeValidacion(await request(app).post('/api/auth/forgot-password').send({}), ['email']);
  });
});
