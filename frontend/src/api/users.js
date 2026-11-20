// Endpoints de /api/users (solo admin)
import { request } from './client';

export async function getUsers() {
  const json = await request('/users');
  return json.data;
}

// role: 'admin' | 'cliente'
export async function updateUserRole(id, role) {
  const json = await request(`/users/${id}/role`, { method: 'PATCH', body: { role } });
  return json.data;
}
