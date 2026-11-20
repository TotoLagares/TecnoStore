// Endpoints de /api/inquiries
import { request } from './client';

export async function createInquiry(data) {
  const json = await request('/inquiries', { method: 'POST', body: data });
  return json.data;
}

// params: { status, search, page, limit }
export async function getInquiries(params) {
  const json = await request('/inquiries', { params });
  return json.data; // { items, total, page, limit, totalPages }
}

export async function getInquiry(id) {
  const json = await request(`/inquiries/${id}`);
  return json.data;
}

export async function updateInquiryStatus(id, status) {
  const json = await request(`/inquiries/${id}/status`, { method: 'PATCH', body: { status } });
  return json.data;
}

export async function deleteInquiry(id) {
  await request(`/inquiries/${id}`, { method: 'DELETE' });
}
