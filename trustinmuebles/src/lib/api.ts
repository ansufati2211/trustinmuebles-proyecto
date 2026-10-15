const BASE: string = import.meta.env.VITE_API_URL ?? "/api/v1";
const TOKEN_KEY = "tm_token";

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* sin storage */ }
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Convierte rutas relativas del backend (p. ej. /api/v1/archivos/…) en URLs absolutas. */
export function assetUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  const origin = /^https?:\/\//.test(BASE) ? new URL(BASE).origin : "";
  return origin + url;
}

const CONFIG_ERRONEA =
  !import.meta.env.VITE_API_URL && !["localhost", "127.0.0.1"].includes(window.location.hostname);

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  if (CONFIG_ERRONEA) {
    throw new ApiError(0, "Falta configurar VITE_API_URL: este sitio no sabe dónde está el servidor.");
  }
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(BASE + path, { ...init, headers });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. ¿Está encendido el backend?");
  }
  if (!res.ok) {
    let detalle = res.statusText;
    try { detalle = (await res.json()).detail ?? detalle; } catch { /* sin cuerpo */ }
    if (res.status === 401 && token) {
      // la sesión caducó: avisamos a AuthProvider para volver a /login
      setToken(null);
      window.dispatchEvent(new Event("tm:sesion-expirada"));
    }
    throw new ApiError(res.status, detalle || `Error ${res.status}`);
  }
  return res;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await request(path, init);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

/** Descarga un archivo protegido (con el JWT) y lo guarda con su nombre. */
export async function descargar(path: string, nombre: string) {
  const res = await request(path);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
