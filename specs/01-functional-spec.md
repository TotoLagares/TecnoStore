# Spec Funcional — TecnoStore

> Plataforma web para un comercio del rubro **Tecnología** (notebooks, smartphones, accesorios, componentes de PC, gaming, audio y video, smart home). TPO de Aplicaciones Interactivas: cumple la consigna "Plataforma Web para Pequeños Comercios" con un **sitio público** para los visitantes y un **panel de administración** para el dueño del comercio.

## Alcance (entrega final)

El sistema está completo:

- **Backend:** API REST en Node + Express + MongoDB (Mongoose), con datos precargados (seed) y tests automáticos. Contrato en `03-api-contract.md`.
- **Frontend:** aplicación React (Vite + React Router) con el sitio público y el panel. Spec en `04-frontend.md`.
- **Envío real de mails** con nodemailer (SMTP, por ejemplo Gmail; en desarrollo, Ethereal).
- **Seguridad en los endpoints:** JWT, validación estricta de body y query params, allowlist de campos, errores genéricos sin detalles internos, recuperación de contraseña sin enumeración de usuarios y CORS configurable.

## Roles

No hay roles intermedios: cualquier usuario autenticado es administrador (un solo comercio, que puede tener varias cuentas de acceso).

### Visitante (sin cuenta)

| Pantalla | Qué puede hacer |
|---|---|
| Inicio (`/`) | Ver la presentación del comercio, una ficha resumen (cantidad de productos, de categorías y el horario de hoy), los productos destacados, las categorías con su cantidad de productos y los datos de contacto. |
| Catálogo (`/productos`) | Buscar por texto y filtrar por categoría, disponibilidad y rango de precio; ordenar (recientes, precio, nombre) y paginar. Los filtros quedan en la URL, así el link se puede compartir y el botón "atrás" funciona. |
| Detalle (`/productos/:id`) | Ver la galería de imágenes, la ficha (código, precio, estado de stock, descripción, especificaciones) y otros productos de la misma categoría. Desde ahí, "Consultar por este producto". |
| Nosotros (`/nosotros`) | Ver la descripción del comercio, la dirección, el teléfono, el email, los horarios y las redes sociales. |
| Contacto (`/contacto`) | Enviar una consulta (nombre, email, teléfono opcional, asunto y mensaje). Recibe una copia por mail. Si llega desde un producto, el asunto ya viene completo. |

### Administrador (con cuenta)

| Pantalla | Qué puede hacer |
|---|---|
| Ingresar / Crear cuenta | Iniciar sesión o registrarse (al registrarse entra directo al panel). |
| Recuperar / Restablecer contraseña | Pedir un link por mail y elegir una contraseña nueva con ese link (vence en 1 hora y sirve una sola vez). |
| Resumen (`/admin`) | Ver las métricas del comercio: publicaciones activas, ocultas, agotadas y destacadas, consultas pendientes, publicaciones por categoría (barras) y las últimas consultas. |
| Publicaciones | Listar, buscar y filtrar (categoría, estado, disponibilidad); crear y editar con hasta 8 imágenes (agregar, quitar y reordenar, con vista previa); publicar/ocultar con un clic y eliminar con confirmación. |
| Categorías | Crear y editar (en un modal), activar/desactivar y eliminar. No se puede eliminar una categoría con publicaciones. |
| Consultas | Ver las consultas por estado (pestañas con contadores), buscarlas, abrir el detalle (al abrir una pendiente se marca como leída), cambiar el estado, responder por email y eliminar. |
| Comercio | Editar la información institucional: nombre, descripción, dirección, teléfono, email, redes y horarios. Los cambios se ven al instante en el sitio público. |
| Mi perfil | Modificar sus datos personales (incluido el email) y cambiar la contraseña confirmando la actual. |
| Cerrar sesión | Desde el panel o desde el sitio ("Salir"). Se descarta el token (JWT sin estado). |

## Entidades funcionales

- **Comercio (BusinessInfo):** registro único con los datos institucionales. Su email es el de contacto público y el que recibe los avisos de consultas nuevas.
- **Categoría:** agrupa publicaciones. Nombre único (sin distinguir mayúsculas). Puede estar activa o inactiva.
- **Publicación (Product):** producto publicado. Pertenece a una categoría, tiene precio, 1 a 8 imágenes, un estado de **disponibilidad** (disponible/agotado, lo ve el visitante) y un estado de **publicación** (publicada/oculta: una publicación oculta no aparece en el sitio aunque exista en la base). Puede ser **destacada**.
- **Consulta (Inquiry):** mensaje enviado desde el formulario de contacto. Estado pendiente, leída o respondida.
- **Usuario (User):** cuenta de administrador.

El detalle de campos está en `02-data-model.md`.

## Flujos principales

1. **Compra informada del visitante:** Inicio → Catálogo (busca y filtra) → Detalle → "Consultar por este producto" → Contacto con el asunto precargado → envía. La consulta se guarda, el comercio recibe un aviso por mail y el visitante una confirmación.
2. **Alta de una publicación:** Ingresar → Publicaciones → "Nueva publicación" → completa los datos y las imágenes → Guardar → aparece en el catálogo público (si está publicada y su categoría está activa).
3. **Ocultar un producto:** Publicaciones → "Ocultar" → deja de verse en el sitio, pero sigue en el panel para volver a publicarlo.
4. **Atención de consultas:** el admin ve el contador de pendientes en el menú → Consultas → abre una (pasa a leída) → "Responder por email" → la marca como respondida.
5. **Recuperación de contraseña:** "¿Olvidaste tu contraseña?" → ingresa el email → recibe un mail con el link → elige la contraseña nueva → vuelve a Ingresar con un aviso.
6. **Sesión vencida:** si el token expiró, al entrar al panel se pide ingresar de nuevo ("Tu sesión expiró") y después se vuelve a la pantalla en la que estaba.

El diagrama de navegación completo está en `04-frontend.md` (sección "Diagrama de navegación").

## Reglas de negocio

1. No puede haber dos usuarios con el mismo email (se valida en el service con un mensaje claro, además del índice único).
2. Toda publicación pertenece a una categoría existente.
3. El sitio público solo muestra publicaciones activas **de categorías activas**. El detalle de una publicación oculta (o de una categoría inactiva) solo lo ve un admin con sesión.
4. Las consultas se guardan siempre: primero se guardan y después se mandan los mails. Si el envío falla, la consulta queda guardada y el visitante recibe la respuesta de éxito (el error se registra en el servidor).
5. No se puede eliminar una categoría con publicaciones asociadas (activas o no): se responde 409.
6. Todo endpoint de escritura del panel requiere un JWT válido (`Authorization: Bearer <token>`).
7. Recuperación de contraseña: la respuesta es siempre la misma, exista o no la cuenta; el link vence en 1 hora y es de un solo uso.
8. Contraseñas de al menos 8 caracteres, con una letra y un número. Para cambiarla desde el perfil hay que ingresar la actual.
9. Nunca se devuelven datos sensibles (hash de la contraseña, token de recuperación) ni detalles internos de los errores.
10. Las validaciones del frontend usan las mismas reglas que el backend, pero el backend siempre valida (la validación del cliente no es una barrera de seguridad).

## Funcionalidades adicionales implementadas

- **Envío real de mails:** recuperación de contraseña, aviso de consulta nueva al comercio y confirmación al visitante (templates HTML con la identidad del sitio y el contenido del usuario escapado).
- **Publicaciones destacadas:** se marcan desde el panel y se muestran en el Inicio.
- **Varias imágenes por publicación:** hasta 8, con galería y miniaturas en el detalle.
- **Buscador avanzado:** búsqueda parcial en nombre y descripción, filtros combinables (categoría, disponibilidad, precio), orden y paginación, todo reflejado en la URL.
- **Dashboard de métricas** en el panel.
- **Estado de stock visible** (disponible/agotado) y código de ficha por producto.
- **Diseño responsive** (mobile-first) y accesible (labels, foco visible, mensajes de error asociados a cada campo).
- **Tests automáticos** del backend (`npm test`, con `node:test` y `supertest`).
