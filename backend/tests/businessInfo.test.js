// Tests de /api/business-info (ver specs/03-api-contract.md, sección Información institucional)

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

const infoValida = (extra = {}) => ({
  businessName: 'TecnoStore',
  description: 'Tienda de tecnología',
  address: 'Av. Siempre Viva 742',
  phone: '11 4444-5555',
  email: 'contacto@tecnostore.test',
  socialMedia: {
    instagram: 'https://instagram.com/tecnostore',
    facebook: 'https://facebook.com/tecnostore',
    whatsapp: '5491144445555',
  },
  businessHours: ['Lun a Vie 9-18', 'Sáb 9-13'],
  ...extra,
});

const guardar = (body) => request(app).put('/api/business-info').set(h.auth(admin.token)).send(body);

// El upsert responde 200 tanto al crear como al actualizar.
const esExito = (res) => assert.equal(res.status, 200, JSON.stringify(res.body));

describe('GET /api/business-info', () => {
  it('sin datos cargados → 200 con data: null', async () => {
    const res = await request(app).get('/api/business-info');
    assert.equal(res.status, 200);
    assert.equal(res.body.data, null);
  });

  it('devuelve lo que se guardó con PUT (sin token)', async () => {
    await guardar(infoValida());
    const res = await request(app).get('/api/business-info');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.businessName, 'TecnoStore');
    assert.equal(res.body.data.email, 'contacto@tecnostore.test');
    assert.equal(res.body.data.socialMedia.instagram, 'https://instagram.com/tecnostore');
    assert.equal(res.body.data.socialMedia.whatsapp, '5491144445555');
    assert.deepEqual(res.body.data.businessHours, ['Lun a Vie 9-18', 'Sáb 9-13']);
  });
});

describe('PUT /api/business-info', () => {
  it('crea el documento la primera vez → 200 (no 201) y devuelve data', async () => {
    const res = await guardar(infoValida());
    esExito(res);
    assert.equal(res.body.data.businessName, 'TecnoStore');
    assert.equal(await modelos.BusinessInfo.countDocuments(), 1);
  });

  it('las siguientes veces actualiza el MISMO documento (singleton)', async () => {
    const primero = await guardar(infoValida());
    const segundo = await guardar(infoValida({ businessName: 'TecnoStore Plus' }));
    esExito(segundo);
    assert.equal(segundo.body.data.businessName, 'TecnoStore Plus');
    assert.equal(segundo.body.data._id, primero.body.data._id);
    assert.equal(await modelos.BusinessInfo.countDocuments(), 1);
  });

  it('solo businessName es obligatorio', async () => {
    esExito(await guardar({ businessName: 'TecnoStore' }));
  });

  it('permite string vacío en instagram/facebook para borrarlos', async () => {
    await guardar(infoValida());
    const res = await guardar(infoValida({ socialMedia: { instagram: '', facebook: '', whatsapp: '5491144445555' } }));
    esExito(res);
    assert.ok(!res.body.data.socialMedia.instagram);
    assert.ok(!res.body.data.socialMedia.facebook);
  });

  it('acepta description de 1000, address de 150 y phone vacío', async () => {
    esExito(await guardar(infoValida({ description: 'x'.repeat(1000), address: 'x'.repeat(150), phone: '' })));
  });

  it('string vacío en email, phone, address, description y las tres redes borra el dato', async () => {
    await guardar(infoValida());
    const res = await guardar(
      infoValida({
        email: '',
        phone: '',
        address: '',
        description: '',
        socialMedia: { instagram: '', facebook: '', whatsapp: '' },
      })
    );
    esExito(res);
    const data = res.body.data;
    for (const campo of ['email', 'phone', 'address', 'description']) {
      assert.ok(!data[campo], `${campo} debería quedar vacío: ${JSON.stringify(data[campo])}`);
    }
    assert.ok(!data.socialMedia.instagram);
    assert.ok(!data.socialMedia.facebook);
    assert.ok(!data.socialMedia.whatsapp);

    // El GET público también los devuelve vacíos u omitidos.
    const get = await request(app).get('/api/business-info');
    assert.ok(!get.body.data.email);
    assert.ok(!get.body.data.socialMedia.whatsapp);
  });

  it('con el email del comercio vacío, el aviso de una consulta va a BUSINESS_EMAIL', async () => {
    await guardar(infoValida({ email: '' }));
    h.limpiarMails();
    const res = await request(app).post('/api/inquiries').send({
      name: 'Visitante',
      email: 'visitante@example.com',
      subject: 'Consulta de prueba',
      message: 'Mensaje de prueba para el aviso.',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const destinatarios = h.obtenerMails().map(h.destinatarioDeMail);
    assert.ok(destinatarios.includes(process.env.BUSINESS_EMAIL.toLowerCase()), JSON.stringify(destinatarios));
  });

  it('un email no vacío pero inválido sigue dando 400', async () => {
    h.esperarErrorDeValidacion(await guardar(infoValida({ email: '   x  ' })), ['email']);
  });

  it('sin businessName → 400', async () => {
    h.esperarErrorDeValidacion(await guardar({ description: 'Sin nombre' }), ['businessName']);
  });

  const casosInvalidos = [
    ['businessName de 1 caracter', { businessName: 'T' }, 'businessName'],
    ['businessName de 81 caracteres', { businessName: 'T'.repeat(81) }, 'businessName'],
    ['email inválido', { email: 'no-es-email' }, 'email'],
    ['description de 1001 caracteres', { description: 'x'.repeat(1001) }, 'description'],
    ['address de 151 caracteres', { address: 'x'.repeat(151) }, 'address'],
    ['phone con letras', { phone: 'abc' }, 'phone'],
    ['phone de 5 caracteres', { phone: '12345' }, 'phone'],
    ['phone de 26 caracteres', { phone: '1'.repeat(26) }, 'phone'],
    ['instagram que no es URL', { socialMedia: { instagram: 'mi instagram' } }, 'socialMedia.instagram'],
    ['facebook que no es URL', { socialMedia: { facebook: 'facebook' } }, 'socialMedia.facebook'],
    ['whatsapp con letras', { socialMedia: { whatsapp: '54911abc' } }, 'socialMedia.whatsapp'],
    ['whatsapp de 7 dígitos', { socialMedia: { whatsapp: '1234567' } }, 'socialMedia.whatsapp'],
    ['whatsapp de 16 dígitos', { socialMedia: { whatsapp: '1'.repeat(16) } }, 'socialMedia.whatsapp'],
    ['businessHours que no es array', { businessHours: 'Lun a Vie' }, 'businessHours'],
    ['businessHours con 11 elementos', { businessHours: Array(11).fill('Lun 9-18') }, 'businessHours'],
    ['businessHours con un elemento de 61 caracteres', { businessHours: ['x'.repeat(61)] }, 'businessHours'],
  ];
  for (const [descripcion, extra, campo] of casosInvalidos) {
    it(`${descripcion} → 400`, async () => {
      const res = await guardar(infoValida(extra));
      assert.equal(res.status, 400, JSON.stringify(res.body));
      assert.ok(Array.isArray(res.body.errors));
      assert.ok(
        res.body.errors.some((e) => e.field === campo || e.field.startsWith(`${campo}[`)),
        `Se esperaba error en ${campo}: ${JSON.stringify(res.body.errors)}`
      );
      assert.equal(await modelos.BusinessInfo.countDocuments(), 0);
    });
  }

  it('allowlist: ignora _id y campos extra', async () => {
    const idFalso = h.idInexistente();
    const res = await guardar(infoValida({ _id: idFalso, cuit: '20-12345678-9', socialMedia: { tiktok: 'x' } }));
    esExito(res);
    assert.notEqual(res.body.data._id, idFalso);
    const enBase = await modelos.BusinessInfo.findOne().lean();
    assert.equal(enBase.cuit, undefined);
    assert.equal(enBase.socialMedia?.tiktok, undefined);
  });
});
