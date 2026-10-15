import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";

/** Carga un recurso GET; devuelve datos, estado de carga, error y una función para recargar. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) return;
    let cancelado = false;
    setLoading(true);
    api<T>(path)
      .then((d) => { if (!cancelado) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelado) setError(e instanceof ApiError ? e : new ApiError(0, String(e))); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload, setData };
}
