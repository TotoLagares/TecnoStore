# Exposición TPO — TecnoStore

Guion para una exposición de **menos de 10 minutos** entre **2 personas** (Persona A y Persona B).
La idea: explicar cómo armamos el backend y demostrar los endpoints más importantes en Postman.

---

## Resumen del tiempo


| #   | Bloque                                 | Quién | Tiempo     |
| --- | -------------------------------------- | ----- | ---------- |
| 1   | Intro: qué es TecnoStore y el stack    | A     | ~1 min     |
| 2   | Arquitectura y estructura del proyecto | A     | ~1:30 min  |
| 3   | Modelo de datos                        | B     | ~1 min     |
| 4   | Demo Postman: sitio público            | B     | ~1:30 min  |
| 5   | Demo Postman: auth + admin             | A     | ~2:30 min  |
| 6   | Demo Postman: consultas                | B     | ~1 min     |
| 7   | Cierre                                 | B     | ~30 seg    |
|     | **Total**                              |       | **~9 min** |


---



## 1. Intro (A, ~1 min)

- TecnoStore es una plataforma web para un comercio de **tecnología**: un sitio público donde los clientes ven productos y mandan consultas, y un área privada donde el dueño administra todo.
- **Stack:**
  - Backend: **Node.js + Express** (API REST).
  - Base de datos: **MongoDB** con **Mongoose** (NoSQL, a elección según la consigna).
  - Frontend: React + React Router (consume esta API).
- Hoy mostramos la API, que es donde está toda la lógica de negocio.



## 2. Arquitectura (A, ~1:30 min)

Arquitectura **en capas**. Cada request pasa por este camino:

```
Request → Route → Middleware de auth → Validator → Controller → Service → Model (MongoDB)
                                                                      ↓
                                               Error middleware ← (si algo falla)
```


| Capa        | Carpeta            | Qué hace                                                           |
| ----------- | ------------------ | ------------------------------------------------------------------ |
| Routes      | `src/routes/api/`  | Define los endpoints y qué middlewares usa cada uno                |
| Middlewares | `src/middlewares/` | `verifyToken` (JWT), manejo de errores centralizado, 404           |
| Validators  | `src/validators/`  | Reglas con **express-validator** (validación del lado del backend) |
| Controllers | `src/controllers/` | Reciben el request y arman la respuesta HTTP                       |
| Services    | `src/services/`    | **Lógica de negocio** (ej: no borrar una categoría con productos)  |
| Models      | `src/models/`      | Esquemas de Mongoose                                               |


**Puntos para destacar:**

- **Separación de responsabilidades:** el controller no sabe de Mongo, el service no sabe de HTTP.
- **Manejo de errores centralizado:** los services lanzan un `ApiError(status, mensaje)` y un único `error.middleware.js` los convierte en respuestas JSON con el código correcto (400, 401, 404, 409, 500).
- **Formato de respuesta uniforme:** siempre `{ data, message }`, o `{ message, errors[] }` si hay error de validación.
- **Seguridad:**
  - Contraseñas hasheadas con **bcrypt** (nunca se guardan en texto plano).
  - Autenticación con **JWT**: el login devuelve un token que se manda en el header `Authorization: Bearer <token>`.
  - El `passwordHash` y los tokens de recuperación tienen `select: false` → nunca salen en las respuestas.
- **Configuración por** `.env` (puerto, URI de Mongo, secreto JWT, CORS).
- **Seed** (`npm run seed`): carga el admin, 10 categorías de hardware y **118 productos** con su foto oficial (la consigna pide mínimo 20).



## 3. Modelo de datos (B, ~1 min)

5 colecciones:


| Colección        | Campos principales                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **User**         | firstName, lastName, email (**único**), phone, passwordHash, role                                                            |
| **Category**     | name (único), description, isActive                                                                                          |
| **Product**      | name, **category (ref → Category)**, description, images[], price, availability (`disponible`/`agotado`), isActive, featured |
| **Inquiry**      | name, email, phone, subject, message, status (`pendiente`/`leida`/`respondida`)                                              |
| **BusinessInfo** | businessName, description, address, phone, socialMedia, businessHours[]                                                      |


- Producto → Categoría es una **referencia** (como una FK); con `populate` devolvemos el nombre de la categoría.
- Índice de **texto** en `name` + `description` para el buscador.
- Distinguir `isActive` (publicada o no) de `availability` (hay stock o no).

Detalle completo en `specs/02-data-model.md`.

---



## Demo en Postman



### Preparación (hacer ANTES de la exposición)

1. Levantar Mongo: `mongod --dbpath ~/mongodb/data --logpath ~/mongodb/log/mongod.log --fork`
2. Cargar datos: `cd backend && npm run seed`
3. Levantar la API: `npm run dev` → tiene que decir `Conectado a MongoDB` y `escuchando en el puerto 4000`.
4. En Postman crear un **Environment** con:
  - `baseUrl` = `http://localhost:4000/api`
  - `token` = (vacío)
  - `categoryId`, `productId`, `inquiryId` = (vacíos)
5. En el request de **Login**, pestaña **Scripts → Post-response**, pegar esto para que guarde el token solo:
  ```js
   pm.environment.set("token", pm.response.json().data.token);
  ```
   En los requests protegidos: pestaña **Authorization → Bearer Token →** `{{token}}`.
6. Tener los requests ya creados y **en orden** dentro de una colección (los de abajo). No tipear en vivo.
7. Copiar un `_id` de categoría (de `GET /categories`) en la variable `categoryId`.

> Tip: si algo se rompe en vivo, `npm run seed` deja la base como nueva.



### 4. Sitio público (B, ~1:30 min)

Sin token: cualquier visitante puede usarlos.


| Request                                            | Qué mostrar                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET {{baseUrl}}/business-info`                    | La info institucional del comercio (dirección, redes, horarios)                                                                |
| `GET {{baseUrl}}/products`                         | Listado **paginado** (`total`, `page`, `totalPages`) y solo productos **activos**. La categoría viene con su nombre (populate) |
| `GET {{baseUrl}}/products?search=notebook`         | **Búsqueda** por texto en nombre y descripción                                                                                 |
| `GET {{baseUrl}}/products?category={{categoryId}}` | **Filtro por categoría**                                                                                                       |


> Frase para decir: "El listado público filtra `isActive: true` en el backend, así una publicación desactivada nunca le llega al visitante."



### 5. Auth + administración (A, ~2:30 min)


| #   | Request                                                     | Qué mostrar                                                                                                               | Respuesta esperada                                    |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | `POST {{baseUrl}}/products` **sin token**                   | Las rutas de admin están protegidas                                                                                       | **401** "No se proporcionó un token de autenticación" |
| 2   | `POST {{baseUrl}}/auth/login`                               | Body: `{"email":"admin@tecnostore.com","password":"Admin123"}` → devuelve el **JWT** (el script lo guarda en `{{token}}`) | **200**                                               |
| 3   | `POST {{baseUrl}}/products` con token y **body inválido**   | Body: `{"name":"","price":-5}` → **validación del backend**, error campo por campo                                        | **400** con `errors[]`                                |
| 4   | `POST {{baseUrl}}/products` con token y body válido         | Crear la publicación (ver body abajo)                                                                                     | **201**                                               |
| 5   | `PATCH {{baseUrl}}/products/{{productId}}/toggle-active`    | **Activar/desactivar** la publicación: `isActive` pasa a `false`                                                          | **200**                                               |
| 6   | `DELETE {{baseUrl}}/categories/{{categoryId}}`              | **Regla de negocio:** no se puede borrar una categoría que tiene productos                                                | **409**                                               |
| 7   | `POST {{baseUrl}}/auth/register` con `admin@tecnostore.com` | **No se permiten emails duplicados** (lo pide la consigna)                                                                | **409**                                               |


Body del paso 4:

{  
  "name": "Notebook Demo",  
  "category": "{{categoryId}}",  
  "description": "Publicación creada en la exposición",  
  "images": ["https://picsum.photos/seed/demo/600/400"],  
  "price": 999999,  
  "availability": "disponible"  
}

En el paso 4 conviene agregar un post-response script para guardar el id:

```js
pm.environment.set("productId", pm.response.json().data._id);
```

Body del paso 7:

```json
{
  "firstName": "Otro",
  "lastName": "Admin",
  "email": "admin@tecnostore.com",
  "phone": "011-1111-1111",
  "password": "123456"
}
```

> Si sobra tiempo: `GET {{baseUrl}}/products/admin` muestra también las publicaciones desactivadas (el público no las ve).



### 6. Consultas / contacto (B, ~1 min)


| #   | Request                                                      | Qué mostrar                                                                       | Respuesta esperada |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------ |
| 1   | `POST {{baseUrl}}/inquiries` **sin token**                   | Un visitante manda una consulta; queda guardada en la base con estado `pendiente` | **201**            |
| 2   | `GET {{baseUrl}}/inquiries?status=pendiente` con token       | El admin ve las consultas y las puede filtrar por estado                          | **200**            |
| 3   | `PATCH {{baseUrl}}/inquiries/{{inquiryId}}/status` con token | Body `{"status":"respondida"}` → cambia el estado                                 | **200**            |


Body del paso 1:

```json
{
  "name": "Juan Pérez",
  "email": "juan@mail.com",
  "phone": "011-3333-3333",
  "subject": "Consulta por stock",
  "message": "Hola, ¿tienen stock de la RTX 4060?"
}
```

Post-response script del paso 1: `pm.environment.set("inquiryId", pm.response.json().data._id);`

## 7. Cierre (B, ~30 seg)

- Cumplimos lo que pide la consigna para el backend: CRUD de productos y categorías, info del comercio, consultas con estados, registro/login/recuperación de contraseña, validaciones en backend, autenticación con JWT y manejo de errores.
- Además de los productos precargados, dejamos documentación en `specs/` (descripción funcional, modelo de datos, contrato de la API) y el manual de instalación en `docs/`.
- **Posibles mejoras:** envío real de mails (recuperación de contraseña y contacto), dashboard con métricas, subida de imágenes en vez de URLs.

---



## Posibles preguntas del profesor


| Pregunta                                                 | Respuesta corta                                                                                                                                                                                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Por qué MongoDB?                                        | Los productos tienen campos flexibles (array de imágenes, redes sociales) y encaja natural con JSON/JavaScript. Con Mongoose igual tenemos esquemas y validaciones.                                                                             |
| ¿Cómo funciona la autenticación?                         | En el login comparamos la contraseña con bcrypt y firmamos un JWT con el id y el rol (vence en 1 día). El middleware `verifyToken` lo verifica en cada ruta protegida.                                                                          |
| ¿Cómo se recupera la contraseña?                         | `POST /auth/forgot-password` genera un token aleatorio, guarda su **hash** con vencimiento de 1 hora y `POST /auth/reset-password` lo valida. Hoy el token se devuelve en la respuesta y se loguea en consola, porque no mandamos mails reales. |
| ¿Dónde se valida?                                        | En el backend con express-validator (cada ruta tiene sus reglas) y además con los esquemas de Mongoose. La consigna pide validar también en el frontend (formularios de React).                                                                 |
| ¿Qué pasa si hay un error inesperado?                    | El `asyncHandler` lo captura y lo pasa al middleware de errores, que responde 500 sin exponer detalles internos.                                                                                                                                |
| ¿Por qué no se puede borrar una categoría con productos? | Para no dejar productos huérfanos; se puede desactivar (`isActive: false`) en su lugar.                                                                                                                                                         |
| ¿Qué es `isActive` vs `availability`?                    | `isActive` = si la publicación se muestra; `availability` = si hay stock. Un producto puede estar publicado pero agotado.                                                                                                                       |


