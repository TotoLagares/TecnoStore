# Manual de Instalación — TecnoStore

Esta guía explica cómo dejar el sistema completo corriendo desde cero en una máquina limpia: el **backend** (API REST + MongoDB + envío de mails) y el **frontend** (React: sitio público + panel de administración).

## 1. Requisitos

- **Node.js** 22 o superior (probado con Node 24) y npm. Vite 8 y el runner de tests (`node --test` con patrones) no funcionan en versiones anteriores.
- **MongoDB** local, o una base en la nube ([MongoDB Atlas](https://www.mongodb.com/atlas), capa gratuita).
- Un navegador actualizado (Chrome, Firefox, Safari o Edge).
- Opcional: la extensión **REST Client** de VS Code para probar la API con `requests.http` (o Postman / Insomnia).
- Opcional, para que los mails lleguen de verdad: una cuenta de Gmail con verificación en 2 pasos (ver 3.2). Sin esto todo funciona igual y los mails se ven en Ethereal.

No hace falta Docker.

### Instalar MongoDB local

**macOS (Homebrew):**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows / Linux:** instalar MongoDB Community Server desde <https://www.mongodb.com/try/download/community> y dejar el servicio iniciado.

En los dos casos MongoDB queda escuchando en `mongodb://127.0.0.1:27017`. Alternativa sin instalar nada: crear un cluster gratuito en MongoDB Atlas y usar su connection string en `MONGO_URI`.

## 2. Instalar dependencias

El proyecto tiene dos aplicaciones independientes, cada una con su `package.json`:

```bash
cd tecnostore/backend
npm install

cd ../frontend
npm install
```

## 3. Configurar el backend (`backend/.env`)

```bash
cd tecnostore/backend
cp .env.example .env
```

### 3.1 Variables

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto de la API | `4000` |
| `NODE_ENV` | `development`, `production` o `test` | `development` |
| `MONGO_URI` | Connection string de MongoDB | `mongodb://127.0.0.1:27017/tecnostore` |
| `JWT_SECRET` | Secreto para firmar los tokens JWT | *(obligatorio: definir uno propio)* |
| `JWT_EXPIRES_IN` | Vigencia del token | `1d` |
| `CORS_ORIGIN` | Origen(es) del frontend habilitados. Varios, separados por coma | `http://localhost:5173` |
| `FRONTEND_URL` | URL del frontend, para el link del mail de recuperación | `http://localhost:5173` |
| `SMTP_HOST` | Servidor SMTP (ej. `smtp.gmail.com`). Vacío = Ethereal en desarrollo | *(vacío)* |
| `SMTP_PORT` | Puerto SMTP (`465` con SSL, `587` con STARTTLS) | `587` |
| `SMTP_SECURE` | `true` para el 465, `false` para el 587 | `false` |
| `SMTP_USER` | Usuario SMTP (la cuenta de Gmail) | *(vacío)* |
| `SMTP_PASS` | Contraseña SMTP (con Gmail, la **contraseña de aplicación**) | *(vacío)* |
| `MAIL_FROM` | Remitente de los mails (con Gmail, la misma cuenta de `SMTP_USER`) | `TecnoStore <no-reply@tecnostore.com>` |
| `BUSINESS_EMAIL` | Destinatario de los avisos de consultas si el comercio no tiene email cargado | *(vacío)* |

`JWT_SECRET` no tiene valor por defecto: poné cualquier string largo y aleatorio.

### 3.2 Envío de mails

El backend manda mails reales con **nodemailer** en tres casos: recuperación de contraseña, aviso al comercio cuando llega una consulta y confirmación al visitante.

**Opción A — Gmail (los mails llegan de verdad), paso a paso:**

1. Entrar a la cuenta de Google → **Seguridad** → activar la **Verificación en 2 pasos** (es obligatoria para el paso siguiente).
2. Ir a <https://myaccount.google.com/apppasswords>, escribir un nombre (por ejemplo "TecnoStore") y crear la **contraseña de aplicación**. Google muestra 16 letras: copiarlas.
3. Completar en `backend/.env`:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=tu.cuenta@gmail.com
   SMTP_PASS=xxxxxxxxxxxxxxxx
   MAIL_FROM=TecnoStore <tu.cuenta@gmail.com>
   ```

   `SMTP_PASS` va **sin espacios**. La contraseña normal de la cuenta no sirve: Gmail la rechaza.
4. Reiniciar el backend. Para probar: pedir "¿Olvidaste tu contraseña?" con `admin@tecnostore.com`. Como esa casilla es ficticia, para ver un mail real conviene registrar un admin con un email propio o enviar una consulta desde "Contacto" con tu email.

**Opción B — Ethereal (desarrollo, sin configurar nada):** si `SMTP_HOST` queda vacío, el backend crea una cuenta de prueba en [Ethereal](https://ethereal.email/). Los mails **no llegan** al destinatario, pero la consola del backend muestra un link para verlos en el navegador:

```
[mail] Vista previa (Ethereal): https://ethereal.email/message/...
```

Así se prueba la recuperación de contraseña: se abre la vista previa, se hace clic en "Restablecer contraseña" y se elige la nueva en el frontend. Ethereal necesita conexión a internet.

Si un envío falla, la API **no** devuelve error: la consulta se guarda igual y el problema queda en la consola (`[mail] No se pudo enviar ...`).

Los avisos de consultas van al email cargado en **Panel → Comercio** (el seed pone `contacto@tecnostore.com`, que es ficticio: cambialo por uno propio para recibirlos). Si ese campo queda vacío, se usa `BUSINESS_EMAIL`.

## 4. Configurar el frontend (`frontend/.env`)

```bash
cd tecnostore/frontend
cp .env.example .env
```

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `VITE_API_URL` | URL base de la API | `http://localhost:4000/api` |

Con el backend en el puerto 4000 no hace falta cambiar nada. Si se modifica, hay que reiniciar `npm run dev` (Vite lee el `.env` al arrancar).

## 5. Crear y cargar la base de datos (seed)

Con MongoDB corriendo y el `backend/.env` configurado:

```bash
cd tecnostore/backend
npm run seed
```

`backend/seed/seed.js` es el script de creación de la base: **borra** las colecciones (`users`, `categories`, `products`, `businessinfos`, `inquiries`) y carga:

- **Usuario admin de prueba:** `admin@tecnostore.com` / `Admin123`.
- **10 categorías de hardware:** Periféricos, Placas de video, Memorias RAM, Procesadores, Motherboards, Fuentes de alimentación, Gabinetes, Almacenamiento, Refrigeración y Monitores.
- **118 productos** (entre 10 y 14 por categoría) con precio, descripción técnica y la foto oficial del modelo, disponibilidad variada (16 agotados) y 13 destacados. Dos quedan ocultos a propósito, para ver la diferencia entre el sitio y el panel. Los datos están en `backend/seed/productos.js` y las fotos en `backend/public/productos` (el back las sirve en `/img/productos/...`).
- **Información del comercio** (TecnoStore, con email `contacto@tecnostore.com`).
- **3 consultas de ejemplo**, una por estado (pendiente, leída, respondida).

Se puede volver a correr cuando se quiera para volver a este estado inicial.

## 6. Levantar el sistema

Hacen falta **dos terminales**, una para cada aplicación.

**Terminal 1 — backend:**

```bash
cd tecnostore/backend
npm run dev        # con recarga automática (nodemon)
# o: npm start     # sin recarga
```

La API queda en `http://localhost:4000` (endpoints bajo `/api`). Verificación rápida:

```bash
curl http://localhost:4000/health
# {"status":"ok"}
```

**Terminal 2 — frontend:**

```bash
cd tecnostore/frontend
npm run dev
```

Abrir **<http://localhost:5173>**:

- **Sitio público:** Inicio, Catálogo, Nosotros y Contacto.
- **Panel de administración:** botón "Ingresar" (arriba a la derecha) con `admin@tecnostore.com` / `Admin123`.

Para generar la versión de producción del frontend: `npm run build` (queda en `frontend/dist/`) y `npm run preview` para verla.

## 7. Probar la API (opcional)

El archivo `requests.http` (raíz del proyecto) trae todos los endpoints. Se abre en VS Code con la extensión **REST Client** y se hace clic en "Send Request" arriba de cada bloque, en orden: el login guarda el token y los siguientes requests lo reutilizan.

También se puede usar `curl`:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tecnostore.com","password":"Admin123"}'
```

## 8. Tests automáticos del backend

Los tests (`backend/tests/`, con `node:test` y `supertest`) **borran las colecciones** de la base que usan. Por seguridad, se niegan a correr contra el puerto `27017` (la base de desarrollo): necesitan otra instancia de MongoDB, por ejemplo en el puerto `27018`.

**1. Levantar un MongoDB de prueba** (en otra terminal; la carpeta puede ser cualquiera vacía):

```bash
mkdir -p ~/mongo-test
mongod --dbpath ~/mongo-test --port 27018
```

(Alternativa: una base de MongoDB Atlas distinta de la de desarrollo.)

**2. Correr los tests** desde `backend/`:

macOS / Linux:

```bash
MONGO_URI=mongodb://127.0.0.1:27018/tecnostore_test JWT_SECRET=test-secret NODE_ENV=test npm test
```

Windows (PowerShell):

```powershell
$env:MONGO_URI="mongodb://127.0.0.1:27018/tecnostore_test"; $env:JWT_SECRET="test-secret"; $env:NODE_ENV="test"; npm test
```

Con `NODE_ENV=test` los mails no salen a la red: quedan en memoria (`sentMails` de `src/services/mail.service.js`) y los tests los leen, por ejemplo para sacar el token del mail de recuperación.

## 9. Estructura del proyecto

```
tecnostore/
  specs/                        # Specs (fuente de verdad del desarrollo)
    01-functional-spec.md       # Descripción funcional
    02-data-model.md            # Modelo de datos
    03-api-contract.md          # Contrato de la API
    04-frontend.md              # Frontend: diseño, pantallas y diagrama de navegación
  docs/
    manual-instalacion.md       # Este archivo
  requests.http                 # Colección de requests (REST Client)
  backend/
    src/
      app.js                    # Crea la app de Express (middlewares + rutas)
      server.js                 # Punto de entrada: conecta a Mongo y levanta el servidor
      config/                   # env.js, db.js
      models/                   # Schemas de Mongoose
      routes/                   # Definición de endpoints
      middlewares/              # Auth (JWT), manejo de errores, 404
      validators/               # Reglas de express-validator por recurso
      controllers/              # Manejan req/res y delegan en los services
      services/                 # Lógica de negocio; mail.service.js envía los mails
      utils/                    # ApiError, asyncHandler, validateRequest, authContext, escapeRegex
    seed/seed.js                # Script de creación y carga de la base
    tests/                      # Tests automáticos (npm test)
    .env.example
  frontend/
    index.html
    vite.config.js
    .env.example
    src/
      main.jsx · App.jsx        # Arranque y definición de rutas
      api/                      # client.js (fetch centralizado) + un módulo por recurso
      context/                  # AuthContext (sesión), BusinessInfoContext (datos del comercio)
      hooks/                    # useFetch, useForm, useDocumentTitle
      components/               # Componentes reutilizables (Button, Field, Modal, ProductCard, ...)
      layouts/                  # PublicLayout (Navbar + Footer), AuthLayout, AdminLayout
      pages/public/             # Inicio, Catálogo, Detalle, Nosotros, Contacto, 404
      pages/auth/               # Ingresar, Crear cuenta, Recuperar y Restablecer contraseña
      pages/admin/              # Resumen, Publicaciones, Categorías, Consultas, Comercio, Mi perfil
      styles/                   # variables.css (sistema de diseño) y global.css
      utils/                    # format.js (precio, fechas, código de ficha), validators.js
```

## 10. Errores comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `No se pudo conectar a la base de datos` al arrancar el backend | MongoDB no está corriendo o `MONGO_URI` está mal | Iniciar MongoDB (`brew services start mongodb-community` o el servicio de Windows) y revisar `MONGO_URI` |
| El frontend muestra "No se pudo conectar con el servidor" | El backend no está levantado, o `VITE_API_URL` apunta a otro puerto | Levantar el backend (paso 6) y revisar `frontend/.env`; reiniciar `npm run dev` después de cambiarlo |
| Error de **CORS** en la consola del navegador | El origen del frontend no está en `CORS_ORIGIN` (por ejemplo, Vite arrancó en otro puerto porque el 5173 estaba ocupado, o se abrió `127.0.0.1` en lugar de `localhost`) | Abrir `http://localhost:5173`, o agregar el origen a `CORS_ORIGIN` (se pueden poner varios separados por coma) y reiniciar el backend |
| El panel pide ingresar de nuevo ("Tu sesión expiró") | El token venció (dura `JWT_EXPIRES_IN`) o cambió `JWT_SECRET` | Volver a ingresar |
| `JsonWebTokenError` / error al iniciar sesión | `JWT_SECRET` no está definido | Agregarlo al `backend/.env` |
| Los mails no llegan y la consola muestra `Vista previa (Ethereal)` | `SMTP_HOST` está vacío: se usa Ethereal | Abrir el link de la consola, o configurar Gmail (3.2) |
| `[mail] No se pudo enviar ...` con `Invalid login` / `535` | Gmail rechazó las credenciales | Usar una **contraseña de aplicación** (no la de la cuenta), sin espacios, y revisar `SMTP_USER` |
| `[mail] No se pudo enviar ...` con `ECONNREFUSED` o timeout | Host o puerto SMTP incorrectos, o sin internet | `465` + `SMTP_SECURE=true`, o `587` + `SMTP_SECURE=false` |
| El link del mail de recuperación abre otra URL | `FRONTEND_URL` no coincide con la del frontend | Ajustar `FRONTEND_URL` y reiniciar el backend |
| El catálogo está vacío | No se corrió el seed, o el backend usa otra base | Correr `npm run seed` con el mismo `.env` que el backend |
| `npm test` falla con "No se permite correr los tests contra el puerto 27017" | Es a propósito: los tests borran la base | Usar otra instancia de MongoDB (paso 8) |
