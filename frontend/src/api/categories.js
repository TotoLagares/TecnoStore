// Endpoints de /api/categories
import { request } from './client';

// all = true: todas las categorías (requiere sesión)
export async function getCategories({ all = false } = {}) {
  const json = await request('/categories', { params: all ? { all: 'true' } : undefined });
  return json.data;
}

export async function getCategory(id) {
  const json = await request(`/categories/${id}`);
  return json.data;
}

export async function createCategory(data) {
  const json = await request('/categories', { method: 'POST', body: data });
  return json.data;
}

export async function updateCategory(id, data) {
  const json = await request(`/categories/${id}`, { method: 'PUT', body: data });
  return json.data;
}

export async function deleteCategory(id) {
  await request(`/categories/${id}`, { method: 'DELETE' });
}
