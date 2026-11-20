// Trae datos de la API y maneja los estados de carga y error.
// Uso: const { data, loading, error, reload } = useFetch(() => getProducts(params), [params]);
// Se vuelve a ejecutar cuando cambia algún valor de `deps`.
import { useEffect, useState } from 'react';

export default function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    // Si el componente cambia de datos antes de que llegue la respuesta
    // anterior, ignoramos esa respuesta vieja.
    let ignore = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((err) => {
        if (!ignore) setError(err);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadCount]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  return { data, loading, error, reload, setData };
}
