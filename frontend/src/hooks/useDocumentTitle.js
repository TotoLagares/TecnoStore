// Cambia el título de la pestaña: useDocumentTitle('Catálogo') -> "Catálogo · TecnoStore"
import { useEffect } from 'react';

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · TecnoStore` : 'TecnoStore';
  }, [title]);
}
