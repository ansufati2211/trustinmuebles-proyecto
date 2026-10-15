import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

const DEMO = "juan.perez@demo.pe";

export default function Login() {
  const { usuario, login, registrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const desde = (location.state as { from?: string } | null)?.from ?? "/post-sale";

  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState(DEMO);
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={desde} replace />;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (modo === "login") await login(email, password);
      else await registrar(nombre, email, password);
      navigate(desde, { replace: true });
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 429 ? "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
        : status === 401 ? "Correo o contraseña incorrectos"
        : err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setEnviando(false);
    }
  };

  const campo = "w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium";

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-secondary/40 to-white px-4 py-16">
      <Card className="w-full max-w-md rounded-[2rem] shadow-xl border-gray-100 bg-white">
        <CardContent className="p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary/10 p-2 rounded-xl"><Shield className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-black text-foreground">{modo === "login" ? "Ingresar" : "Crear cuenta"}</h1>
              <p className="text-sm text-muted-foreground font-medium">Tu compra segura, de principio a fin.</p>
            </div>
          </div>

          <form onSubmit={enviar} className="space-y-4">
            {modo === "registro" && (
              <input required className={campo} placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            )}
            <input required type="email" className={campo} placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input required type="password" minLength={modo === "registro" ? 8 : undefined} className={campo} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p role="alert" className="text-sm font-semibold text-danger bg-danger/10 rounded-xl px-4 py-3">{error}</p>}
            <Button type="submit" disabled={enviando} className="w-full h-12 rounded-xl font-bold">
              {enviando ? "Un momento…" : modo === "login" ? "Ingresar" : "Crear cuenta"}
            </Button>
          </form>

          <button type="button" onClick={() => { setModo(modo === "login" ? "registro" : "login"); setError(null); }} className="mt-6 w-full text-sm font-bold text-primary hover:underline">
            {modo === "login" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta"}
          </button>
          {modo === "login" && (
            <p className="mt-4 text-xs text-center text-muted-foreground font-medium">
              Demo: juan.perez@demo.pe / demo1234 (comprador) · maria.fernandez@demo.pe (gestora legal)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
