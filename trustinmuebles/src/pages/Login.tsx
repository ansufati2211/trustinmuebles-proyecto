import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const desde = (location.state as { from?: string } | null)?.from ?? "/casos";

  const [codigoCuenta, setCodigoCuenta] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={desde} replace />;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(codigoCuenta.trim(), password);
      navigate(desde, { replace: true });
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 429 ? "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
        : status === 401 ? "Código de cuenta o contraseña incorrectos"
        : err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setEnviando(false);
    }
  };

  const campo = "w-full h-12 px-4 rounded-xl border border-border bg-superficie focus:bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium";

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-secondary/40 to-white px-4 py-16">
      <Card className="w-full max-w-md rounded-[2rem] shadow-xl border-border bg-white">
        <CardContent className="p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary/10 p-2 rounded-xl"><Shield className="h-6 w-6 text-primary" aria-hidden="true" /></div>
            <div>
              <h1 className="text-2xl font-black text-foreground">Ingresar</h1>
              <p className="text-sm text-tinta-2 font-medium">Ingresa con el código de cuenta que te asignaron.</p>
            </div>
          </div>

          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label htmlFor="codigoCuenta" className="block text-sm font-bold text-foreground mb-1.5">Código de cuenta</label>
              <input id="codigoCuenta" required autoComplete="username" maxLength={40} className={campo}
                value={codigoCuenta} onChange={(e) => setCodigoCuenta(e.target.value)} />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-foreground mb-1.5">Contraseña</label>
              <input id="password" required type="password" autoComplete="current-password" maxLength={72} className={campo}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta bg-danger/10 rounded-xl px-4 py-3">{error}</p>}
            <Button type="submit" disabled={enviando} className="w-full h-12 rounded-xl font-bold">
              {enviando ? "Un momento…" : "Ingresar"}
            </Button>
          </form>

          <p className="mt-6 text-xs text-center text-tinta-2 font-medium leading-relaxed">
            Las cuentas las crea el equipo del proyecto. No hay registro abierto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
