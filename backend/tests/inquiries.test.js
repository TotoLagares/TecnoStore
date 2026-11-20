// Tests de /api/inquiries (ver specs/03-api-contract.md, sección Consultas / Contacto)

const { describe, it, before, after, beforeEach, mock } = require('node:test');
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

const consultaValida = (extra = {}) => ({
  name: 'María Gómez',
  email: 'maria@mail.test',
  phone: '11 5555-6666',
  subject: 'Consulta por notebook',
  message: 'Hola, ¿tienen stock de la Notebook Lenovo?',
  ...extra,
});

const enviar = (body) => request(app).post('/api/inquiries').send(body);

// Hace que una función de mail.service.js tire error (simula el SMTP caído)
// y silencia console.error, porque el servidor loguea la falla.
function simularFallaDeMail(...funciones) {
  const mailService = require('../src/services/mail.service');
  for (const nombre of funciones) {
    mock.method(mailService, nombre, async () => {
      throw new Error('smtp caído');
    });
  }
  mock.method(console, 'error', () => {});
}

describe('POST /api/inquiries', () => {
  it('guarda la consulta → 201 con status "pendiente"', async () => {
    const res = await enviar(consultaValida());
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'pendiente');
    assert.equal(res.body.data.name, 'María Gómez');
    assert.equal(res.body.data.subject, 'Consulta por notebook');
    const enBase = await modelos.Inquiry.findById(res.body.data._id);
    assert.ok(enBase);
    assert.equal(enBase.message, 'Hola, ¿tienen stock de la Notebook Lenovo?');
  });

  it('el teléfono es opcional', async () => {
    const { phone, ...sinTelefono } = consultaValida();
    assert.ok(phone);
    assert.equal((await enviar(sinTelefono)).status, 201);
  });

  it('manda 2 mails: aviso al comercio (BusinessInfo.email) y confirmación al visitante', async () => {
    await request(app)
      .put('/api/business-info')
      .set(h.auth(admin.token))
      .send({ businessName: 'TecnoStore', email: 'comercio@tecnostore.test' });
    h.limpiarMails();

    const res = await enviar(consultaValida());
    assert.equal(res.status, 201);

    const mails = h.obtenerMails();
    assert.equal(mails.length, 2);
    const destinatarios = mails.map(h.destinatarioDeMail);
    assert.ok(destinatarios.some((d) => d.includes('comercio@tecnostore.test')), JSON.stringify(destinatarios));
    assert.ok(destinatarios.some((d) => d.includes('maria@mail.test')), JSON.stringify(destinatarios));
  });

  it('si no hay BusinessInfo, el aviso va a BUSINESS_EMAIL del .env', async () => {
    const res = await enviar(consultaValida());
    assert.equal(res.status, 201);
    const destinatarios = h.obtenerMails().map(h.destinatarioDeMail);
    assert.equal(destinatarios.length, 2);
    assert.ok(destinatarios.some((d) => d.includes(process.env.BUSINESS_EMAIL)), JSON.stringify(destinatarios));
    assert.ok(destinatarios.some((d) => d.includes('maria@mail.test')));
  });

  it('el aviso al comercio incluye el mensaje del visitante', async () => {
    await enviar(consultaValida());
    const aviso = h.obtenerMails().find((m) => !h.destinatarioDeMail(m).includes('maria@mail.test'));
    assert.ok(aviso);
    assert.ok(h.contenidoDeMail(aviso).includes('¿tienen stock de la Notebook Lenovo?'));
  });

  it('escapa el HTML del visitante en los mails (<script> no aparece crudo)', async () => {
    const res = await enviar(
      consultaValida({
        name: 'Hacker <b>malo</b>',
        subject: 'Asunto <img src=x onerror=alert(1)>',
        message: 'Hola <script>alert("xss")</script> chau',
      })
    );
    assert.equal(res.status, 201);
    const mails = h.obtenerMails();
    assert.equal(mails.length, 2);
    // Al menos un mail (el aviso) tiene que mostrar el mensaje en el HTML.
    assert.ok(mails.some((m) => h.htmlDeMail(m).includes('&lt;script&gt;')), 'El mensaje escapado debería aparecer en el HTML');
    for (const mail of mails) {
      const html = h.htmlDeMail(mail);
      assert.ok(!html.includes('<script>'), `HTML sin escapar: ${html}`);
      assert.ok(!html.includes('<b>malo</b>'), `HTML sin escapar: ${html}`);
      assert.ok(!html.includes('<img src=x'), `HTML sin escapar: ${html}`);
    }
  });

  describe('si falla el envío de mails', () => {
    // Después de cada test, las funciones vuelven a ser las originales.
    beforeEach(() => mock.restoreAll());
    after(() => mock.restoreAll());

    const casos = [
      ['falla el aviso al comercio', ['sendInquiryNotification']],
      ['falla la confirmación al visitante', ['sendInquiryConfirmation']],
      ['fallan los dos mails', ['sendInquiryNotification', 'sendInquiryConfirmation']],
    ];
    for (const [descripcion, funciones] of casos) {
      it(`${descripcion}: igual responde 201 y la consulta queda guardada`, async () => {
        simularFallaDeMail(...funciones);
        const res = await enviar(consultaValida());
        mock.restoreAll();
        assert.equal(res.status, 201, JSON.stringify(res.body));
        assert.equal(res.body.data.status, 'pendiente');
        assert.ok(await modelos.Inquiry.findById(res.body.data._id));
        assert.equal(await modelos.Inquiry.countDocuments(), 1);
        // Verificamos que el mock se usó: los mails que "fallaron" no se mandaron.
        assert.equal(h.obtenerMails().length, 2 - funciones.length);
      });
    }
  });

  it('body vacío → 400 con errores en name, email, subject y message', async () => {
    h.esperarErrorDeValidacion(await enviar({}), ['name', 'email', 'subject', 'message']);
    assert.equal(await modelos.Inquiry.countDocuments(), 0);
    assert.equal(h.obtenerMails().length, 0);
  });

  const casosInvalidos = [
    ['name de 1 caracter', { name: 'M' }, 'name'],
    ['name de 81 caracteres', { name: 'M'.repeat(81) }, 'name'],
    ['email inválido', { email: 'maria-at-mail' }, 'email'],
    ['phone con letras', { phone: '11-abcd-1234' }, 'phone'],
    ['phone de 5 caracteres', { phone: '12345' }, 'phone'],
    ['subject de 2 caracteres', { subject: 'Ho' }, 'subject'],
    ['subject de 121 caracteres', { subject: 'x'.repeat(121) }, 'subject'],
    ['message de 9 caracteres', { message: 'Hola hola' }, 'message'],
    ['message de 2001 caracteres', { message: 'x'.repeat(2001) }, 'message'],
  ];
  for (const [descripcion, extra, campo] of casosInvalidos) {
    it(`${descripcion} → 400`, async () => {
      h.esperarErrorDeValidacion(await enviar(consultaValida(extra)), [campo]);
      assert.equal(await modelos.Inquiry.countDocuments(), 0);
    });
  }

  it('allowlist: ignora status, _id y campos extra', async () => {
    const idFalso = h.idInexistente();
    const res = await enviar(consultaValida({ status: 'respondida', _id: idFalso, prioridad: 'alta' }));
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'pendiente');
    assert.notEqual(res.body.data._id, idFalso);
    const enBase = await modelos.Inquiry.findById(res.body.data._id).lean();
    assert.equal(enBase.status, 'pendiente');
    assert.equal(enBase.prioridad, undefined);
  });
});

describe('GET /api/inquiries', () => {
  const listar = (query = '') => request(app).get(`/api/inquiries${query}`).set(h.auth(admin.token));
  const asuntos = (res) => res.body.data.items.map((i) => i.subject);

  beforeEach(async () => {
    const dia = (n) => new Date(Date.UTC(2026, 0, n));
    await h.crearConsulta({ name: 'Ana', email: 'ana@mail.test', subject: 'Envíos al interior', status: 'pendiente', createdAt: dia(1) });
    await h.crearConsulta({ name: 'Beto', email: 'beto@mail.test', subject: 'Garantía', status: 'leida', createdAt: dia(2) });
    await h.crearConsulta({ name: 'Carla', email: 'carla@empresa.test', subject: 'Factura A', status: 'respondida', createdAt: dia(3) });
  });

  it('lista paginada, más recientes primero', async () => {
    const res = await listar();
    assert.equal(res.status, 200);
    assert.deepEqual(asuntos(res), ['Factura A', 'Garantía', 'Envíos al interior']);
    assert.equal(res.body.data.total, 3);
    assert.equal(res.body.data.page, 1);
    assert.equal(res.body.data.limit, 20);
    assert.equal(res.body.data.totalPages, 1);
  });

  it('filtra por status', async () => {
    assert.deepEqual(asuntos(await listar('?status=leida')), ['Garantía']);
    assert.deepEqual(asuntos(await listar('?status=pendiente')), ['Envíos al interior']);
  });

  it('search busca en nombre, email o asunto (parcial, sin mayúsculas)', async () => {
    assert.deepEqual(asuntos(await listar('?search=ANA')), ['Envíos al interior']);
    assert.deepEqual(asuntos(await listar('?search=empresa')), ['Factura A']);
    assert.deepEqual(asuntos(await listar('?search=garan')), ['Garantía']);
  });

  it('search con caracteres especiales de regex no rompe', async () => {
    const res = await listar(`?search=${encodeURIComponent('(')}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.total, 0);
  });

  it('paginación con page y limit', async () => {
    const pagina1 = await listar('?limit=2&page=1');
    assert.deepEqual(asuntos(pagina1), ['Factura A', 'Garantía']);
    assert.equal(pagina1.body.data.total, 3);
    assert.equal(pagina1.body.data.limit, 2);
    assert.equal(pagina1.body.data.totalPages, 2);
    const pagina2 = await listar('?limit=2&page=2');
    assert.deepEqual(asuntos(pagina2), ['Envíos al interior']);
    assert.equal(pagina2.body.data.page, 2);
  });

  it('sin token → 401', async () => {
    assert.equal((await request(app).get('/api/inquiries')).status, 401);
  });

  for (const [query, campo] of [
    ['status=otro', 'status'],
    ['limit=0', 'limit'],
    ['limit=abc', 'limit'],
    ['page=0', 'page'],
  ]) {
    it(`query inválido ${query} → 400 con errors[]`, async () => {
      h.esperarErrorDeValidacion(await listar(`?${query}`), [campo]);
    });
  }
});

describe('GET /api/inquiries?limit=500', () => {
  beforeEach(async () => {
    await modelos.Inquiry.insertMany(
      Array.from({ length: 55 }, (_, i) => ({
        name: `Visitante ${i}`,
        email: `visitante${i}@mail.test`,
        subject: `Consulta masiva ${i}`,
        message: 'Mensaje generado para probar el límite',
      }))
    );
  });

  it('limit=500 se recorta a 50', async () => {
    const res = await request(app).get('/api/inquiries?limit=500').set(h.auth(admin.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.limit, 50);
    assert.equal(res.body.data.items.length, 50);
    assert.equal(res.body.data.total, 55);
    assert.equal(res.body.data.totalPages, 2);
  });
});

describe('GET /api/inquiries/:id', () => {
  const ver = (id) => request(app).get(`/api/inquiries/${id}`).set(h.auth(admin.token));

  it('devuelve el detalle', async () => {
    const consulta = await h.crearConsulta({ subject: 'Garantía extendida' });
    const res = await ver(consulta._id);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.subject, 'Garantía extendida');
  });

  it('inexistente → 404', async () => {
    assert.equal((await ver(h.idInexistente())).status, 404);
  });

  it('id inválido → 400', async () => {
    assert.equal((await ver('123')).status, 400);
  });
});

describe('PATCH /api/inquiries/:id/status', () => {
  const cambiar = (id, body) =>
    request(app).patch(`/api/inquiries/${id}/status`).set(h.auth(admin.token)).send(body);

  for (const status of ['leida', 'respondida', 'pendiente']) {
    it(`cambia a "${status}" → 200`, async () => {
      const consulta = await h.crearConsulta({ status: status === 'pendiente' ? 'leida' : 'pendiente' });
      const res = await cambiar(consulta._id, { status });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, status);
      assert.equal((await modelos.Inquiry.findById(consulta._id)).status, status);
    });
  }

  it('status inválido → 400 con errors[status]', async () => {
    const consulta = await h.crearConsulta();
    h.esperarErrorDeValidacion(await cambiar(consulta._id, { status: 'cerrada' }), ['status']);
    assert.equal((await modelos.Inquiry.findById(consulta._id)).status, 'pendiente');
  });

  it('sin status → 400', async () => {
    const consulta = await h.crearConsulta();
    h.esperarErrorDeValidacion(await cambiar(consulta._id, {}), ['status']);
  });

  it('allowlist: solo cambia status (ignora message, email, etc.)', async () => {
    const consulta = await h.crearConsulta({ message: 'Mensaje original del visitante' });
    const res = await cambiar(consulta._id, { status: 'leida', message: 'Mensaje pisado', email: 'otro@mail.test' });
    assert.equal(res.status, 200);
    const enBase = await modelos.Inquiry.findById(consulta._id);
    assert.equal(enBase.message, 'Mensaje original del visitante');
    assert.equal(enBase.email, consulta.email);
  });

  it('inexistente → 404', async () => {
    assert.equal((await cambiar(h.idInexistente(), { status: 'leida' })).status, 404);
  });

  it('id inválido → 400', async () => {
    assert.equal((await cambiar('123', { status: 'leida' })).status, 400);
  });
});

describe('DELETE /api/inquiries/:id', () => {
  const borrar = (id) => request(app).delete(`/api/inquiries/${id}`).set(h.auth(admin.token));

  it('borra → 200 y después da 404', async () => {
    const consulta = await h.crearConsulta();
    assert.equal((await borrar(consulta._id)).status, 200);
    assert.equal(await modelos.Inquiry.countDocuments(), 0);
    assert.equal((await borrar(consulta._id)).status, 404);
  });

  it('inexistente → 404', async () => {
    assert.equal((await borrar(h.idInexistente())).status, 404);
  });

  it('id inválido → 400', async () => {
    assert.equal((await borrar('123')).status, 400);
  });
});
