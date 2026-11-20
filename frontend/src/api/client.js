// Cliente HTTP único: todos los requests a la API pasan por acá.
// - Arma la URL con VITE_API_URL.
// - Agrega el token si hay sesión.
// - Si la respuesta no es ok, lanza un ApiError con status, message y fieldErrors.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(status, message, fieldErrors = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors; // { campo: mensaje }
  }
}

// El AuthContext guarda acá el token y la función a llamar ante un 401.
let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Convierte { q: 'note', page: 2, vacio: '' } en "?q=note&page=2"
function buildQuery(params) {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

// errors: [{ field, message }] -> { field: message }
function toFieldErrors(errors) {
  const result = {};
  for (const error of errors || []) {
    if (!result[error.field]) result[error.field] = error.message;
  }
  return result;
}

// options: { method, body, params, redirectOn401 }
// redirectOn401: false para requests donde un 401 no significa "sesión vencida".
export async function request(path, options = {}) {
  const { method = 'GET', body, params, redirectOn401 = true } = options;

  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let response;
  try {
    response = await fetch(API_URL + path + buildQuery(params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisá tu conexión.');
  }

  let json = null;
  try {
    json = await response.json();
  } catch (err) {
    json = null; // respuesta sin cuerpo JSON
  }

  if (!response.ok) {
    // Token vencido o inválido en un request autenticado: se cierra la sesión.
    if (response.status === 401 && authToken && redirectOn401 && onUnauthorized) {
      onUnauthorized();
    }
    const message = (json && json.message) || 'Ocurrió un error inesperado';
    throw new ApiError(response.status, message, toFieldErrors(json && json.errors));
  }

  return json;
}
