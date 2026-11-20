// Endpoints de /api/auth
import { request } from './client';

export async function login(email, password) {
  const json = await request('/auth/login', { method: 'POST', body: { email, password } });
  return json.data; // { token, user }
}

export async function register(data) {
  const json = await request('/auth/register', { method: 'POST', body: data });
  return json.data;
}

// redirectOn401 = false: al validar la sesión guardada, un 401 solo la limpia.
export async function getMe({ redirectOn401 = true } = {}) {
  const json = await request('/auth/me', { redirectOn401 });
  return json.data;
}

export async function updateMe(data) {
  const json = await request('/auth/me', { method: 'PUT', body: data });
  return json.data;
}

export async function forgotPassword(email) {
  const json = await request('/auth/forgot-password', { method: 'POST', body: { email } });
  return json.message;
}

// Aplica el cambio de contraseña pendiente (link del mail de confirmación).
export async function confirmPasswordChange(token) {
  const json = await request('/auth/confirm-password-change', { method: 'POST', body: { token } });
  return json.message;
}

export async function resetPassword(token, newPassword) {
  const json = await request('/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
  });
  return json.message;
}
