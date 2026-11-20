// Punto de entrada: monta la app con el router y los providers globales.
// Los estilos globales van primero: así los .module.css de cada componente
// se cargan después y pueden ajustarlos.
import './styles/global.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import { BusinessInfoProvider } from './context/BusinessInfoContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* AuthProvider va dentro del router porque usa useNavigate */}
      <AuthProvider>
        <BusinessInfoProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BusinessInfoProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
