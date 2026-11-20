// Punto de entrada: conecta a MongoDB y levanta el servidor HTTP.
const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`[server] TecnoStore API escuchando en el puerto ${port}`);
    });
  })
  .catch((err) => {
    console.error('[server] No se pudo conectar a la base de datos', err);
    process.exit(1);
  });
