import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import {
  ShieldCheck, ArrowRight, ArrowLeft, Lock, User, Loader2,
  Eye, EyeOff, CheckCircle2, FileText, HardHat, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/layout/Logo";
import { useAuth } from "@/lib/auth";

const CUENTAS_DEMO = [
  { codigo: "comprador-01", rol: "Comprador", desc: "Consulta e inspección" },
  { codigo: "revisor-01", rol: "Revisor", desc: "Edición y registro" },
  { codigo: "especialista-01", rol: "Especialista", desc: "Informe técnico" },
  { codigo: "gestor-01", rol: "Gestor", desc: "Cartera y publicación" },
  { codigo: "propietario-01", rol: "Propietario", desc: "Mis inmuebles" },
  { codigo: "propietario-02", rol: "Propietario", desc: "Mis inmuebles" },
  { codigo: "especialista-02", rol: "Especialista", desc: "Informe técnico" },
];

/** Retraso escalonado para .anim-enter / .anim-fade (lee la variable --d del CSS). */
const retraso = (ms: number): CSSProperties => ({ "--d": `${ms}ms` } as CSSProperties);

/** El anillo luminoso va en el contenedor (focus-within); el input solo cambia de borde. */
const claseInput =
  "w-full h-14 rounded-2xl border border-gray-200 bg-gray-50/60 outline-none transition-all duration-300 ease-expo text-base font-semibold text-foreground placeholder:font-normal placeholder:text-gray-400 focus:bg-white focus:border-primary";

const claseContenedorInput =
  "group relative rounded-2xl transition-shadow duration-300 ease-expo focus-within:ring-4 focus-within:ring-primary/15";

const claseIconoInput =
  "w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ease-expo group-focus-within:text-primary group-focus-within:scale-110";

export default function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const desde = (location.state as { from?: string } | null)?.from ?? "/casos";

  const [codigoCuenta, setCodigoCuenta] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState(""); // conserva el texto mientras la alerta se pliega
  const [enviando, setEnviando] = useState(false);
  const [sacudir, setSacudir] = useState(false);

  // Feedback al elegir una cuenta demo
  const [destello, setDestello] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const temporizadores = useRef<{ toast?: number; shake?: number }>({});

  // El texto de la alerta se mantiene hasta que termina la animación de salida
  useEffect(() => {
    if (error) {
      setMensaje(error);
      return;
    }
    const t = window.setTimeout(() => setMensaje(""), 550);
    return () => window.clearTimeout(t);
  }, [error]);

  // Limpieza de temporizadores al desmontar
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

  const enviar = async (e: React.FormEvent) => {
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
          : "No se pudo iniciar sesión. Inténtalo de nuevo."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full flex bg-white font-sans">
      {/* PANEL IZQUIERDO · propuesta de valor + única pieza 3D */}
      <div className="hidden lg:flex lg:w-[54%] bg-foreground relative overflow-hidden flex-col justify-between p-12 xl:p-16 text-white">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-luminosity scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-[#044E3A]/80" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-glow" aria-hidden="true" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[130px]" aria-hidden="true" />

        <div style={retraso(0)} className="anim-fade relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3.5 group" aria-label="Trustinmuebles, ir al inicio">
            <LogoMark className="w-12 h-12 border border-white/15 transition-transform duration-500 ease-expo group-hover:scale-105 group-hover:-rotate-3" />
            <span className="text-2xl font-extrabold tracking-tight text-white">Trustinmuebles</span>
          </Link>

          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md transition-all duration-300 ease-expo active:scale-[0.97]"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-300 ease-expo group-hover:-translate-x-1" /> Volver al inicio
          </Link>
        </div>

        <div className="relative z-10 my-auto py-8">
          <h2 style={retraso(150)} className="anim-enter text-4xl xl:text-5xl font-black tracking-tight leading-[1.1] mb-6 max-w-xl">
            Transparencia total antes de tomar tu decisión inmobiliaria.
          </h2>
          <p style={retraso(270)} className="anim-enter text-gray-300 text-lg leading-relaxed max-w-lg mb-10">
            Revisa partidas registrales de SUNARP, planos de 4 especialidades e informes de inspección física en un solo entorno.
          </p>

          <div style={retraso(400)} className="anim-enter perspective-1000 max-w-lg">
            <div className="tilt-3d rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 p-6 shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
                <div>
                  <p className="text-xs font-semibold text-emerald-300">Expediente verificado</p>
                  <p className="text-base font-bold text-white mt-0.5">
                    Mz. F Lote 7 · Santa Elvira, Parcona
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verde
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-black/20 p-3.5 border border-white/5">
                  <div className="flex items-center gap-2 text-gray-300 font-semibold mb-1">
                    <FileText className="w-4 h-4 text-emerald-400" /> Indicador A
                  </div>
                  <p className="text-white font-bold">Partida SIM-11048217</p>
                  <p className="text-gray-400 mt-0.5">Hipoteca cancelada · 4 planos</p>
                </div>
                <div className="rounded-2xl bg-black/20 p-3.5 border border-white/5">
                  <div className="flex items-center gap-2 text-gray-300 font-semibold mb-1">
                    <HardHat className="w-4 h-4 text-emerald-400" /> Indicador B
                  </div>
                  <p className="text-white font-bold">Inspección favorable</p>
                  <p className="text-gray-400 mt-0.5">Verificado en campo (CIP)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={retraso(550)} className="anim-fade relative z-10 flex items-center justify-between text-xs text-gray-400 border-t border-white/10 pt-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Entorno académico demostrativo · Datos sintéticos</span>
          </div>
          <span>Ica, Perú</span>
        </div>
      </div>

      {/* PANEL DERECHO · formulario */}
      <div className="w-full lg:w-[46%] flex flex-col justify-between p-6 sm:p-12 xl:p-16 bg-white overflow-y-auto">
        <div style={retraso(0)} className="anim-fade flex lg:hidden items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Trustinmuebles, ir al inicio">
            <LogoMark className="w-10 h-10" />
            <span className="text-xl font-extrabold tracking-tight text-foreground">Trustinmuebles</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground bg-gray-100 px-3.5 py-2 rounded-full transition-colors duration-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Inicio
          </Link>
        </div>

        <div className="w-full max-w-md mx-auto my-auto">
          <div style={retraso(100)} className="anim-enter mb-8">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-2">
              Iniciar sesión
            </h1>
            <p className="text-muted-foreground text-base">
              Ingresa con el código de cuenta que te asignó el equipo para consultar los expedientes.
            </p>
          </div>

          {/* Selector rápido de cuentas de prueba */}
          <div style={retraso(200)} className="anim-enter mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <p className="text-sm font-semibold text-foreground mb-1">Cuentas de demostración</p>
            <p className="text-xs text-muted-foreground mb-3">Toca una para completar el código de cuenta.</p>
            <div className="grid grid-cols-3 gap-2">
              {CUENTAS_DEMO.map((c) => {
                const activo = codigoCuenta === c.codigo;
                return (
                  <button
                    key={c.codigo}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => elegirCuenta(c.codigo)}
                    className={`text-left p-2.5 rounded-xl border transition-all duration-300 ease-expo cursor-pointer hover:-translate-y-0.5 active:scale-[0.97] ${
                      activo
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                        : "bg-white text-foreground border-gray-200 hover:border-primary/50"
                    }`}
                  >
                    <p className="text-sm font-extrabold leading-tight">{c.rol}</p>
                    <p className={`text-[11px] font-mono mt-0.5 truncate ${activo ? "text-emerald-100" : "text-muted-foreground"}`}>
                      {c.codigo}
                    </p>
                    <p className={`text-[11px] mt-0.5 leading-tight ${activo ? "text-emerald-50" : "text-muted-foreground"}`}>
                      {c.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={enviar} noValidate={false}>
            {/* El shake se aplica a este contenedor para no chocar con las animaciones de entrada de los hijos */}
            <div className={sacudir ? "anim-shake" : ""}>
              <div style={retraso(300)} className="anim-enter">
                <fieldset
                  disabled={enviando}
                  className="min-w-0 space-y-5 mb-5 transition-opacity duration-300 disabled:opacity-70"
                >
                  <div>
                    <label htmlFor="codigoCuenta" className="block text-sm font-bold text-foreground mb-2">
                      Código de cuenta
                    </label>
                    <div className={claseContenedorInput}>
                      <User className={claseIconoInput} />
                      <input
                        id="codigoCuenta"
                        required
                        autoComplete="username"
                        maxLength={40}
                        placeholder="Ej. comprador-01"
                        value={codigoCuenta}
                        onChange={(e) => {
                          setCodigoCuenta(e.target.value);
                          if (error) setError(null);
                        }}
                        className={`${claseInput} pl-12 pr-4`}
                      />
                      {/* Destello al elegir una cuenta demo: la `key` reinicia la animación en cada clic */}
                      {destello > 0 && (
                        <span
                          key={destello}
                          aria-hidden="true"
                          className="anim-flash pointer-events-none absolute inset-0 rounded-2xl"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-bold text-foreground mb-2">
                      Contraseña
                    </label>
                    <div className={claseContenedorInput}>
                      <Lock className={claseIconoInput} />
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-foreground transition-colors duration-300 cursor-pointer"
                      >
                        {verPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </fieldset>

                {/* Alerta de error: entra y sale con altura animada (grid-template-rows) */}
                <div
                  aria-live="assertive"
                  className={`grid transition-[grid-template-rows,opacity] duration-500 ease-expo ${
                    error ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    {mensaje && (
                      <div className="pb-5">
                        <div
                          role="alert"
                          className="flex items-start gap-3 bg-danger/10 border border-danger/25 text-[#B91C1C] rounded-2xl p-4 text-sm font-semibold"
                        >
                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p>{mensaje}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={enviando}
                  aria-busy={enviando}
                  className={`w-full h-14 rounded-2xl font-bold text-base shadow-xl shadow-primary/25 transition-all duration-300 ease-expo hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/35 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-90 cursor-pointer ${
                    enviando ? "shimmer" : "btn-glint"
                  }`}
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                      Verificando credenciales...
                    </>
                  ) : (
                    <>
                      Ingresar al sistema <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          <p
            style={retraso(500)}
            className="anim-fade mt-8 pt-6 border-t border-gray-100 text-center text-xs text-muted-foreground leading-relaxed"
          >
            Las cuentas las asigna el equipo del proyecto. No existe registro abierto al público.
          </p>
        </div>

        <p style={retraso(600)} className="anim-fade hidden lg:block text-center text-xs text-gray-400 mt-6">
          Sesión protegida con Bearer Token · Se mantiene solo en esta pestaña
        </p>
      </div>

      {/* Toast sutil al elegir una cuenta demo */}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ease-expo ${
          toastVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2.5 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-black/30">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Usuario copiado: ingresa la contraseña
        </div>
      </div>
    </div>
  );
}