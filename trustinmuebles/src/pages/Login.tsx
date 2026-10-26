import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Eye, EyeOff, FileText, HardHat, Home,
  LayoutDashboard, Loader2, Lock, Search, ShieldCheck, User, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/layout/Logo";
import { useAuth } from "@/lib/auth";

type Cuenta = { codigo: string; rol: string; desc: string; Icono: LucideIcon };

const CUENTAS_DEMO: Cuenta[] = [
  { codigo: "comprador-01", rol: "Comprador", desc: "Consulta e inspección", Icono: Search },
  { codigo: "revisor-01", rol: "Revisor", desc: "Edición y registro", Icono: ClipboardCheck },
  { codigo: "especialista-01", rol: "Especialista", desc: "Informe técnico", Icono: HardHat },
  { codigo: "especialista-02", rol: "Especialista", desc: "Informe técnico", Icono: HardHat },
  { codigo: "gestor-01", rol: "Gestor", desc: "Cartera y publicación", Icono: LayoutDashboard },
  { codigo: "propietario-01", rol: "Propietario", desc: "Mis inmuebles", Icono: Home },
  { codigo: "propietario-02", rol: "Propietario", desc: "Mis inmuebles", Icono: Home },
];

const IMAGEN_FONDO =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80";

const retraso = (ms: number): CSSProperties => ({ "--d": `${ms}ms` } as CSSProperties);

const claseInput =
  "h-14 w-full rounded-2xl border border-border bg-background text-base font-semibold text-foreground outline-none transition-all duration-300 ease-expo placeholder:font-normal placeholder:text-tinta-2/60 hover:border-primary/40 focus:border-primary focus:bg-card [&:-webkit-autofill]:[-webkit-text-fill-color:var(--foreground)] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--card)_inset]";

const claseContenedorInput =
  "group relative rounded-2xl transition-shadow duration-300 ease-expo focus-within:ring-4 focus-within:ring-primary/15";

const claseIconoInput =
  "pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-2 transition-all duration-300 ease-expo group-focus-within:scale-110 group-focus-within:text-primary";

export default function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const desde = (location.state as { from?: string } | null)?.from ?? "/casos";

  const [codigoCuenta, setCodigoCuenta] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sacudir, setSacudir] = useState(false);
  const [destello, setDestello] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const temporizadores = useRef<{ toast?: number; shake?: number }>({});

  useEffect(() => {
    if (error) {
      setMensaje(error);
      return;
    }
    const t = window.setTimeout(() => setMensaje(""), 550);
    return () => window.clearTimeout(t);
  }, [error]);

  useEffect(() => {
    const ref = temporizadores.current;
    return () => {
      window.clearTimeout(ref.toast);
      window.clearTimeout(ref.shake);
    };
  }, []);

  if (usuario) return <Navigate to={desde} replace />;

  const elegirCuenta = (codigo: string) => {
    setCodigoCuenta(codigo);
    setError(null);
    setDestello((n) => n + 1);
    setToastVisible(true);
    window.clearTimeout(temporizadores.current.toast);
    temporizadores.current.toast = window.setTimeout(() => setToastVisible(false), 3200);
    passwordRef.current?.focus();
  };

  const fallar = (texto: string) => {
    setError(texto);
    setSacudir(true);
    window.clearTimeout(temporizadores.current.shake);
    temporizadores.current.shake = window.setTimeout(() => setSacudir(false), 600);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(codigoCuenta.trim(), password);
      navigate(desde, { replace: true });
    } catch (err) {
      const status = (err as { status?: number }).status;
      fallar(
        status === 429
          ? "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
          : status === 401
            ? "Código de cuenta o contraseña incorrectos. Revisa los datos e inténtalo otra vez."
            : err instanceof Error
              ? err.message
              : "No se pudo iniciar sesión. Inténtalo de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background font-sans lg:h-screen">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 text-white lg:flex lg:w-[54%] xl:p-16">
        <img
          src={IMAGEN_FONDO}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/95 via-foreground/75 to-[#044E3A]/70" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-transparent to-foreground/40" aria-hidden="true" />
        <div className="animate-glow absolute -left-32 -top-32 size-96 rounded-full bg-primary/40 blur-[120px]" aria-hidden="true" />
        <div className="absolute bottom-0 right-0 size-[500px] rounded-full bg-emerald-400/15 blur-[130px]" aria-hidden="true" />
        <div
          className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:26px_26px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          aria-hidden="true"
        />

        <div style={retraso(0)} className="anim-fade relative z-10 flex items-center justify-between">
          <Link to="/" className="group flex items-center gap-3.5" aria-label="Trustinmuebles, ir al inicio">
            <LogoMark className="size-12 border border-white/15 transition-transform duration-500 ease-expo group-hover:-rotate-3 group-hover:scale-105" />
            <span className="text-2xl font-extrabold tracking-tight text-white">Trustinmuebles</span>
          </Link>
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-gray-100 backdrop-blur-md transition-all duration-300 ease-expo hover:bg-white/20 hover:text-white active:scale-[0.97]"
          >
            <ArrowLeft className="size-4 transition-transform duration-300 ease-expo group-hover:-translate-x-1" aria-hidden="true" /> Volver al inicio
          </Link>
        </div>

        <div className="relative z-10 my-auto py-8">
          <h2 style={retraso(150)} className="anim-enter mb-6 max-w-xl text-4xl font-black leading-[1.08] tracking-tight xl:text-5xl">
            Transparencia total antes de tomar tu decisión inmobiliaria.
          </h2>
          <p style={retraso(270)} className="anim-enter mb-10 max-w-lg text-lg leading-relaxed text-gray-200">
            Revisa partidas registrales de SUNARP, planos de 4 especialidades e informes de inspección física en un solo entorno.
          </p>

          <div style={retraso(400)} className="anim-enter perspective-1000 max-w-lg">
            <div className="tilt-3d rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-300">Expediente verificado</p>
                  <p className="mt-0.5 text-base font-bold text-white">Mz. F Lote 7 · Santa Elvira, Parcona</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" /> Verde
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-white/5 bg-black/25 p-3.5">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-gray-300">
                    <FileText className="size-4 text-emerald-400" aria-hidden="true" /> Indicador A
                  </div>
                  <p className="font-bold text-white">Partida SIM-11048217</p>
                  <p className="mt-0.5 text-gray-400">Hipoteca cancelada · 4 planos</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/25 p-3.5">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-gray-300">
                    <HardHat className="size-4 text-emerald-400" aria-hidden="true" /> Indicador B
                  </div>
                  <p className="font-bold text-white">Inspección favorable</p>
                  <p className="mt-0.5 text-gray-400">Verificado en campo (CIP)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={retraso(550)} className="anim-fade relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" />
            <span>Entorno académico demostrativo · Datos sintéticos</span>
          </div>
          <span>Ica, Perú</span>
        </div>
      </div>

      <div className="flex w-full flex-col overflow-y-auto bg-card lg:w-[46%]">
        <div className="relative isolate overflow-hidden bg-foreground lg:hidden">
          <img src={IMAGEN_FONDO} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground via-foreground/85 to-foreground/50" aria-hidden="true" />
          <div style={retraso(0)} className="anim-fade flex items-center justify-between px-6 py-6 sm:px-12">
            <Link to="/" className="flex items-center gap-2.5" aria-label="Trustinmuebles, ir al inicio">
              <LogoMark className="size-10" />
              <span className="text-xl font-extrabold tracking-tight text-white">Trustinmuebles</span>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur-md"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" /> Inicio
            </Link>
          </div>
        </div>

        <div className="mx-auto my-auto w-full max-w-lg px-6 py-10 sm:px-10 xl:px-14">
          <div style={retraso(100)} className="anim-enter mb-7">
            <h1 className="mb-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Iniciar sesión</h1>
            <p className="text-base leading-relaxed text-tinta-2">
              Ingresa con el código de cuenta que te asignó el equipo para consultar los expedientes.
            </p>
          </div>

          <div style={retraso(200)} className="anim-enter mb-7 rounded-3xl border border-border bg-superficie p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-foreground">Cuentas de demostración</p>
                <p className="mt-0.5 text-xs text-tinta-2">Toca una para completar el código de cuenta.</p>
              </div>
              <span className="cifras rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">{CUENTAS_DEMO.length}</span>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CUENTAS_DEMO.map((c) => {
                const activo = codigoCuenta === c.codigo;
                const Icono = c.Icono;
                return (
                  <li key={c.codigo}>
                    <button
                      type="button"
                      aria-pressed={activo}
                      onClick={() => elegirCuenta(c.codigo)}
                      className={`group flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all duration-300 ease-expo focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 active:scale-[0.97] ${
                        activo
                          ? "border-primary bg-primary text-white shadow-md shadow-primary/25"
                          : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-tarjeta"
                      }`}
                    >
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${
                          activo ? "bg-white/20 text-white" : "bg-secondary text-primary group-hover:bg-primary group-hover:text-white"
                        }`}
                      >
                        {activo ? <Check className="size-5" aria-hidden="true" /> : <Icono className="size-5" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold leading-tight">{c.rol}</span>
                        <span className={`block truncate font-mono text-[11px] ${activo ? "text-emerald-100" : "text-tinta-2"}`}>{c.codigo}</span>
                        <span className={`block text-[11px] leading-tight ${activo ? "text-emerald-50" : "text-tinta-2"}`}>{c.desc}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <form onSubmit={enviar}>
            <div className={sacudir ? "anim-shake" : ""}>
              <div style={retraso(300)} className="anim-enter">
                <fieldset disabled={enviando} className="mb-5 min-w-0 space-y-5 transition-opacity duration-300 disabled:opacity-70">
                  <div>
                    <label htmlFor="codigoCuenta" className="mb-2 block text-xs font-bold uppercase tracking-wider text-tinta-2">
                      Código de cuenta
                    </label>
                    <div className={claseContenedorInput}>
                      <User className={claseIconoInput} aria-hidden="true" />
                      <input
                        id="codigoCuenta"
                        required
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={40}
                        placeholder="Ej. comprador-01"
                        value={codigoCuenta}
                        onChange={(e) => {
                          setCodigoCuenta(e.target.value);
                          if (error) setError(null);
                        }}
                        className={`${claseInput} pl-12 pr-4`}
                      />
                      {destello > 0 && (
                        <span key={destello} aria-hidden="true" className="anim-flash pointer-events-none absolute inset-0 rounded-2xl" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-2 block text-xs font-bold uppercase tracking-wider text-tinta-2">
                      Contraseña
                    </label>
                    <div className={claseContenedorInput}>
                      <Lock className={claseIconoInput} aria-hidden="true" />
                      <input
                        id="password"
                        ref={passwordRef}
                        required
                        type={verPassword ? "text" : "password"}
                        autoComplete="current-password"
                        maxLength={72}
                        placeholder="Ingresa tu contraseña"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        className={`${claseInput} pl-12 pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setVerPassword((v) => !v)}
                        aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        aria-pressed={verPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-tinta-2 transition-colors duration-300 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        {verPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                </fieldset>

                <div
                  aria-live="assertive"
                  className={`grid transition-[grid-template-rows,opacity] duration-500 ease-expo ${
                    error ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    {mensaje && (
                      <div className="pb-5">
                        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-[#B91C1C]">
                          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                          <p>{mensaje}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={enviando}
                  aria-busy={enviando}
                  className={`h-14 w-full rounded-2xl text-base disabled:translate-y-0 disabled:cursor-wait disabled:opacity-90 ${enviando ? "shimmer" : "btn-glint"}`}
                >
                  {enviando ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" /> Verificando credenciales…
                    </>
                  ) : (
                    <>
                      Ingresar al sistema <ArrowRight aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          <p style={retraso(420)} className="anim-fade mt-6 flex items-center justify-center gap-2 text-center text-xs text-tinta-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Entorno académico demostrativo · Datos sintéticos
          </p>
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ease-expo ${
          toastVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2.5 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-black/30">
          <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />
          Usuario copiado: ingresa la contraseña
        </div>
      </div>
    </div>
  );
}