// Endpoints de /api/business-info
import { request } from './client';

// Devuelve los datos del comercio o null si todavía no se cargaron.
export async function getBusinessInfo() {
  const json = await request('/business-info');
  return json.data;
}

export async function updateBusinessInfo(data) {
  const json = await request('/business-info', { method: 'PUT', body: data });
  return json.data;
}
