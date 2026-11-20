// Crea y configura la app de Express (middlewares + rutas).
// No se conecta a la base ni escucha un puerto: eso lo hace src/server.js.
// Separarlo permite que los tests usen la app con supertest.
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { corsOrigins, nodeEnv } = require('./config/env');

const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');

const notFound = require('./middlewares/notFound.middleware');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

app.use(cors({ origin: corsOrigins }));
// express.json() rechaza con 413 los bodies de más de 100 kb (límite por defecto).
app.use(express.json({ limit: '100kb' }));

// En los tests no queremos el log de cada request.
if (nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Fotos de los productos precargados (backend/public/productos).
// Ej: http://localhost:4000/img/productos/corsair-rm750e.jpg
app.use('/img', express.static(path.join(__dirname, '..', 'public')));

app.use('/', indexRouter);
app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
