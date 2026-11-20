// Funciones de formato que se usan en varias pantallas.

const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

// 850000 -> "$ 850.000"
export function formatPrice(value) {
  return priceFormatter.format(Number(value) || 0);
}

// "2026-11-06T22:50:04.598Z" -> "6 nov 2026"
export function formatDate(isoDate) {
  if (!isoDate) return '-';
  return new Date(isoDate).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Fecha y hora para las listas del panel: "06/11/2026 20:32" (24 horas).
// Se arma a mano para no depender de cómo cada navegador formatea la hora.
export function formatDateTime(isoDate) {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  const pad = (number) => String(number).padStart(2, '0');
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${day} ${time}`;
}
