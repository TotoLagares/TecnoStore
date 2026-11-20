# Contrato de API — TecnoStore (entrega final)

Base URL: `http://localhost:4000/api`

Este documento es la **fuente de verdad** del backend: el frontend lo consume y los tests automáticos (`backend/tests/`) lo verifican.

## Convenciones

- Respuesta de éxito: `{ "data": ..., "message"?: "..." }`.
- Respuesta de error: `{ "message": "...", "errors"?: [{ "field": "...", "message": "..." }] }`.
  `errors` aparece solo en errores de validación (400).
- Auth: header `Authorization: Bearer <token>` en todo endpoint marcado 🔒.
- Todos los `POST/PUT/PATCH` validan el body con `express-validator` (allowlist: el backend ignora cualquier campo que no esté documentado acá).
- Nunca se devuelven `passwordHash`, `resetToken` ni `resetTokenExpires`.
- Nunca se devuelven stack traces ni mensajes internos de MongoDB.

## Códigos de error

| Código | Cuándo |
|---|---|
| 400 | Body inválido (validación), **query param inválido** (por ejemplo `limit=0`, `limit=abc`, `page=0`, `minPrice=-1`, `sort=xyz`, `availability=otro`, `featured=quizas`, `status=otro`), JSON mal formado, **id con formato inválido** (`CastError`), token de reseteo inválido/expirado, contraseña actual incorrecta en `PUT /auth/me` |
| 413 | Body demasiado grande (más de 100 kb) |
| 401 | Sin token / token inválido o expirado / credenciales incorrectas en login |
| 404 | Recurso no encontrado o ruta inexistente |
| 409 | Conflicto: email duplicado, nombre de categoría duplicado, categoría con productos asociados |
| 500 | Error inesperado (mensaje genérico `"Error interno del servidor"`) |

---

## Auth (`/api/auth`)

| Método | Ruta | Auth | Body | Respuesta |
|---|---|---|---|---|
| POST | `/register` | — | `{firstName, lastName, email, phone, password}` | `201` `{data: user}`. `409` si el email ya existe. |
| POST | `/login` | — | `{email, password}` | `200` `{data: {token, user}}`. `401` `"Credenciales inválidas"` (mismo mensaje si el email no existe o si la contraseña está mal). |
| GET | `/me` | 🔒 | — | `200` `{data: user}` |
| PUT | `/me` | 🔒 | `{firstName?, lastName?, email?, phone?, currentPassword?, newPassword?}` | `200` `{data: user}`. Si viene `newPassword`, `currentPassword` es obligatorio y debe coincidir (si no: `400`). `409` si el nuevo email ya lo usa otra cuenta. |
| POST | `/forgot-password` | — | `{email}` | Email con formato inválido → `400` (validación). Con un email válido, **siempre** `200` con el mismo mensaje genérico (`"Si el email está registrado, te enviamos un correo con las instrucciones"`), exista o no la cuenta. Si existe, se envía un **mail real** con el link `${FRONTEND_URL}/restablecer-contrasena?token=<token>` (vence en 1 hora). El token **no** se devuelve en la respuesta ni se imprime en consola. |
| POST | `/reset-password` | — | `{token, newPassword}` | `200` si es válido. `400` si el token es inválido o expiró. El token es de un solo uso. |

Reglas de validación:
- `email`: formato válido; se guarda en minúsculas y sin espacios (no se usa `normalizeEmail`, para no alterar direcciones de Gmail con puntos o `+`).
- `password` / `newPassword`: mínimo 8 caracteres, al menos una letra y un número.
- `firstName`, `lastName`: requeridos, 2–60 caracteres.
- `phone`: requerido, 6–25 caracteres, solo dígitos, espacios, `+`, `-` y paréntesis.

"Logout" no tiene endpoint: el cliente descarta el token (JWT stateless).

## Categorías (`/api/categories`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | — | Categorías **activas**, ordenadas por nombre. Cada una incluye `productCount` (publicaciones activas). Con `?all=true` 🔒 devuelve todas (activas e inactivas), también ordenadas por nombre, y `productCount` cuenta **todas** sus publicaciones. `?all=true` sin token → `401`. |
| GET | `/:id` | — | Detalle. Si la categoría está inactiva, requiere token (sin token → `401`). |
| POST | `/` | 🔒 | `{name, description?, isActive?}` → `201`. `409` si el nombre ya existe (sin distinguir mayúsculas). |
| PUT | `/:id` | 🔒 | `{name?, description?, isActive?}` → `200`. `409` si el nombre choca con otra categoría. |
| DELETE | `/:id` | 🔒 | `200`. `409` si tiene publicaciones asociadas (activas o no). |

Validación: `name` 2–50 caracteres; `description` hasta 300.

## Productos / Publicaciones (`/api/products`)

### Listados

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | — | Público. Solo publicaciones con `isActive: true` **y** cuya categoría esté activa. |
| GET | `/admin` | 🔒 | Todas las publicaciones. Acepta además `isActive=true|false`. |

Query params (ambos listados):

| Param | Valores | Notas |
|---|---|---|
| `search` | texto | Búsqueda parcial, sin distinguir mayúsculas, en `name` y `description` (regex con el texto escapado: `"note"` encuentra `"Notebook"`). |
| `category` | ObjectId | id con formato inválido → `400`. |
| `availability` | `disponible` \| `agotado` | |
| `featured` | `true` \| `false` | |
| `minPrice`, `maxPrice` | número ≥ 0 | |
| `sort` | `recent` (default) \| `price_asc` \| `price_desc` \| `name_asc` | |
| `page` | entero ≥ 1 (default 1) | |
| `limit` | entero 1–50 (default 12) | Valores mayores se recortan a 50. |

Respuesta: `{ data: { items: [...], total, page, limit, totalPages } }`. Cada item trae `category` populada como `{ _id, name }`.

### Detalle y escritura

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/:id` | — | Detalle (con `category` populada). Si la publicación está inactiva **o** su categoría está inactiva, requiere token (sin token → `401`). Inexistente → `404`. id inválido → `400`. |
| POST | `/` | 🔒 | `{name, category, description, images[], price, availability?, featured?, isActive?}` → `201`. Categoría inexistente → `404`. |
| PUT | `/:id` | 🔒 | Mismos campos, todos opcionales → `200`. |
| PATCH | `/:id/toggle-active` | 🔒 | Invierte `isActive` → `200`. |
| DELETE | `/:id` | 🔒 | `200`. |

Validación: `name` 3–120 caracteres; `description` 10–2000; `images` array de 1 a 8 URLs `http(s)` válidas; `price` número ≥ 0; `availability` ∈ {`disponible`, `agotado`}; `featured`/`isActive` booleanos.

## Información institucional (`/api/business-info`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | — | Datos del comercio (o `data: null` si todavía no se cargó). |
| PUT | `/` | 🔒 | Upsert del documento único; responde `200` tanto al crear como al actualizar. Body: `{businessName, description?, address?, phone?, email?, socialMedia?: {instagram?, facebook?, whatsapp?}, businessHours?: string[]}`. |

Validación: `businessName` 2–80; `description` hasta 1000; `address` hasta 150; `phone` con el mismo formato que en el registro (6–25 caracteres) si viene no vacío; `email` formato válido; `instagram`/`facebook` URLs válidas si vienen; `whatsapp` solo dígitos (8–15). En `email`, `phone`, `address`, `description` y las tres redes se acepta **string vacío para borrar el dato** (el backend lo guarda como vacío o sin definir, y el GET lo devuelve vacío u omitido); `businessHours` array de strings (máx. 10, cada uno ≤ 60).

`email` es el correo de contacto público del comercio y también el destinatario de los avisos de nuevas consultas.

## Consultas / Contacto (`/api/inquiries`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/` | — | `{name, email, phone?, subject, message}` → `201`, con `status: 'pendiente'`. Además se envían **dos mails reales**: un aviso al comercio (`BusinessInfo.email`, o `BUSINESS_EMAIL` del `.env` si no hay) y una confirmación de recepción al visitante. Si el envío de mails falla, la consulta **igual se guarda** y se responde `201` (el error se loguea en el servidor). |
| GET | `/` | 🔒 | Lista (más recientes primero). Query: `status?` (un valor fuera del enum → `400`), `search?` (nombre, email o asunto), `page?`, `limit?` (entero ≥ 1, default 20; los valores mayores a 50 se recortan a 50). Respuesta paginada igual que productos. |
| GET | `/:id` | 🔒 | Detalle. |
| PATCH | `/:id/status` | 🔒 | `{status: 'pendiente'|'leida'|'respondida'}` → `200`. |
| DELETE | `/:id` | 🔒 | `200`. |

Validación: `name` 2–80; `email` válido; `phone` opcional con el mismo formato que en registro; `subject` 3–120; `message` 10–2000. El contenido del visitante se **escapa** antes de insertarlo en el HTML de los mails.

## Métricas (`/api/stats`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | 🔒 | Resumen para el dashboard del panel. |

```json
{
  "data": {
    "products": { "total": 27, "active": 25, "inactive": 2, "outOfStock": 6, "featured": 8 },
    "categories": { "total": 7, "active": 7 },
    "inquiries": { "total": 3, "pendiente": 1, "leida": 1, "respondida": 1 },
    "productsByCategory": [ { "categoryId": "...", "name": "Notebooks", "count": 4 } ],
    "latestInquiries": [ /* hasta 5, más recientes primero */ ]
  }
}
```

Reglas de conteo:
- `products.*` cuenta **todas** las publicaciones, activas o no (incluidas `outOfStock` y `featured`).
- `productsByCategory` lista **todas** las categorías (activas e inactivas, también las que tienen 0) ordenadas por nombre, y `count` incluye las publicaciones inactivas.

## Salud

`GET /health` (fuera de `/api`) → `{ "status": "ok" }`.

## Envío de mails (configuración)

`backend/src/services/mail.service.js` usa **nodemailer** con SMTP configurado por `.env`:
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `BUSINESS_EMAIL`, `FRONTEND_URL`.

- Con SMTP configurado (por ejemplo, Gmail con contraseña de aplicación) los mails se envían de verdad.
- Sin `SMTP_HOST` en desarrollo: se usa una cuenta de prueba de Ethereal y se loguea la URL de vista previa, con una advertencia.
- Con `NODE_ENV=test`: se usa un transporte en memoria y los mails enviados quedan en el array `sentMails` exportado por `mail.service.js`, para que los tests los inspeccionen (por ejemplo, para leer el token del mail de recuperación).
