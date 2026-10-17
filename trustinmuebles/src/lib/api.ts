// En desarrollo, Vite reenvía /api al backend (vite.config.ts), así que no hace falta CORS ni configuración.
const BASE = "/api/v1";
const TOKEN_KEY = "tm_token";

// sessionStorage: la sesión termina al cerrar la pestaña, útil cuando varios participantes comparten equipo.
export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t: string | null) => {
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* sin storage */ }
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Con FormData el navegador fija el Content-Type (multipart) con su separador; no se debe forzar JSON.
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
    let detalle = "";
    try { detalle = (await res.json()).detail ?? ""; } catch { /* sin cuerpo */ }
    if (res.status === 401 && token) {
      // la sesión caducó: avisamos a AuthProvider para volver a /login
      setToken(null);
      window.dispatchEvent(new Event("tm:sesion-expirada"));
    }
    if (res.status === 403) detalle = detalle || "Su rol no permite esta operación.";
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
export const put = <T>(path: string, body: unknown) => api<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

/** Sube un archivo como multipart en el campo indicado. */
export function subirArchivo<T>(path: string, campo: string, archivo: File) {
  const datos = new FormData();
  datos.append(campo, archivo);
  return api<T>(path, { method: "POST", body: datos });
}

/** Abre en otra pestaña un PDF protegido (necesita el token, por eso no es un enlace directo). */
export async function abrirPdf(path: string) {
  const res = await request(path);
  const url = URL.createObjectURL(await res.blob());
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
