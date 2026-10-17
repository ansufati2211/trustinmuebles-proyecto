import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { api, getToken, post, setToken } from "./api";
import type { Sesion, Usuario } from "./types";

interface AuthCtx {
  usuario: Usuario | null;
  cargando: boolean;
  login: (codigoCuenta: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState<boolean>(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api<Usuario>("/auth/me")
      .then(setUsuario)
      .catch(() => setToken(null))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const salir = () => setUsuario(null);
    window.addEventListener("tm:sesion-expirada", salir);
    return () => window.removeEventListener("tm:sesion-expirada", salir);
  }, []);

  const login = useCallback(async (codigoCuenta: string, password: string) => {
    const s = await post<Sesion>("/auth/login", { codigoCuenta, password });
    setToken(s.token);
    setUsuario(s.usuario);
  }, []);
  const logout = useCallback(() => { setToken(null); setUsuario(null); }, []);

  return <Ctx.Provider value={{ usuario, cargando, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return c;
}

/** Envuelve rutas que exigen sesión; si no hay, lleva a /login y vuelve después. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  if (cargando) return <div className="flex-1 flex items-center justify-center text-muted-foreground font-semibold">Cargando…</div>;
  if (!usuario) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
