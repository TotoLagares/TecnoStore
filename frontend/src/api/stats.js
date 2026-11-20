// Endpoint de /api/stats (dashboard del panel)
import { request } from './client';

export async function getStats() {
  const json = await request('/stats');
  return json.data;
}
