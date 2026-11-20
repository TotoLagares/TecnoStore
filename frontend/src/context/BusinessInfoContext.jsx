// Datos del comercio (GET /business-info) compartidos por toda la app.
// Se piden UNA sola vez y los usan el Footer, el Home, Nosotros y Contacto.
// Cuando el admin edita el comercio, llama a reload() para actualizarlos.
import { createContext, useContext } from 'react';
import { getBusinessInfo } from '../api/businessInfo';
import useFetch from '../hooks/useFetch';

const BusinessInfoContext = createContext(null);

export function BusinessInfoProvider({ children }) {
  const { data, loading, error, reload } = useFetch(getBusinessInfo, []);

  return (
    <BusinessInfoContext.Provider value={{ info: data, loading, error, reload }}>
      {children}
    </BusinessInfoContext.Provider>
  );
}

export function useBusinessInfo() {
  return useContext(BusinessInfoContext);
}
