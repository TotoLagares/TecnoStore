// Endpoints de /api/products
import { request } from './client';

// params: { search, category, availability, featured, minPrice, maxPrice, sort, page, limit }
export async function getProducts(params) {
  const json = await request('/products', { params });
  return json.data; // { items, total, page, limit, totalPages }
}

export async function getAdminProducts(params) {
  const json = await request('/products/admin', { params });
  return json.data;
}

export async function getProduct(id) {
  const json = await request(`/products/${id}`);
  return json.data;
}

export async function createProduct(data) {
  const json = await request('/products', { method: 'POST', body: data });
  return json.data;
}

export async function updateProduct(id, data) {
  const json = await request(`/products/${id}`, { method: 'PUT', body: data });
  return json.data;
}

export async function toggleProductActive(id) {
  const json = await request(`/products/${id}/toggle-active`, { method: 'PATCH' });
  return json.data;
}

export async function deleteProduct(id) {
  await request(`/products/${id}`, { method: 'DELETE' });
}
