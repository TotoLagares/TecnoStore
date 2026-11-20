import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite: plugin de React y el puerto por defecto (5173).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
