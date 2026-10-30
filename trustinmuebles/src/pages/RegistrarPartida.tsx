import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Check, ClipboardPaste, ExternalLink, EyeOff, FilePlus2, Lock, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Campo, claseAreaTexto, claseCampo } from "@/components/base/Campo";
import { Desplegable } from "@/components/base/Desplegable";
import { Mensaje } from "@/components/base/Mensaje";
import { SelectorFecha } from "@/components/base/SelectorFecha";
import { FilasAsientos, filasAPeticion, type Fila } from "@/components/FilasAsientos";
import { BloqueTecnico, TECNICO_VACIO, tecnicoAPeticion } from "@/components/BloqueTecnico";
import { post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { disociar } from "@/lib/disociar";
import { abrirExterno, CONOCE_AQUI, normalizarNumero, pareceNumeroDePartida, VISOR_BGR } from "@/lib/fuentes";
import { leerPartida } from "@/lib/leerPartida";
import { ETIQUETA_COMPLETITUD } from "@/lib/semaforo";
import type { Completitud, DetalleCaso } from "@/lib/types";

const CONDICIONES = [
  "Lote urbano inscrito en el Registro de Predios.",
  "Lote urbano inscrito, según declara el vendedor.",
];

const OPCIONES_CONDICION = CONDICIONES.map((c) => ({ valor: c, etiqueta: c }));
const OPCIONES_COMPLETITUD = (Object.keys(ETIQUETA_COMPLETITUD) as Completitud[]).map((c) => ({ valor: c, etiqueta: ETIQUETA_COMPLETITUD[c] }));

const PROPIETARIOS_DEMO = ["propietario-01", "propietario-02"];

const hoy = () => new Date().toISOString().slice(0, 10);

const PASOS: { n: number; etiqueta: string }[] = [
  { n: 1, etiqueta: "Datos" },
  { n: 2, etiqueta: "Pegar texto" },
  { n: 3, etiqueta: "Corregir" },
  { n: 4, etiqueta: "Confirmar" },
];

function Paso({ n, titulo, Icono, descripcion, children, destacado = false }: {
  n: number; titulo: string; Icono?: LucideIcon; descripcion?: string; children: React.ReactNode; destacado?: boolean;
}) {
  return (
    <Card className={`rounded-[2rem] shadow-tarjeta ${destacado ? "border-2 border-primary/20" : "border-border"}`}>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-black text-white shadow-md shadow-primary/25">
            {Icono ? <Icono className="size-5" aria-hidden="true" /> : n}
          </span>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-foreground">
              <span className="sr-only">Paso {n}: </span>{titulo}
            </h2>
            {descripcion && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-tinta-2">{descripcion}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function RegistrarPartida() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [numero, setNumero] = useState(normalizarNumero(params.get("numero") ?? ""));
  const [denominacion, setDenominacion] = useState("");
  const [contexto, setContexto] = useState("");
  const [propietario, setPropietario] = useState("");
  const [fechaConsulta, setFechaConsulta] = useState(hoy());
  const [condicion, setCondicion] = useState(CONDICIONES[0]);
  const [completitud, setCompletitud] = useState<Completitud>("COMPLETA");
  const [zona, setZona] = useState("Zona Registral N.° XI - Sede Ica");
  const [oficina, setOficina] = useState("Oficina Registral de Ica");
  const [ubicacion, setUbicacion] = useState("");
  const [area, setArea] = useState("");
  const [linderos, setLinderos] = useState("");
  const [antecedente, setAntecedente] = useState("");
  const [nota, setNota] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [tecnico, setTecnico] = useState(TECNICO_VACIO);

  const [pegado, setPegado] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [nuevoExtra, setNuevoExtra] = useState("");
  const [ignorar, setIgnorar] = useState<string[]>([]);
  const [confirmo, setConfirmo] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const textosOriginales = useMemo(
    () => [...filas.flatMap((f) => [f.texto, f.titulares]), linderos, antecedente, nota],
    [filas, linderos, antecedente, nota],
  );
  const limpieza = useMemo(() => disociar(textosOriginales, { extras, ignorar }), [textosOriginales, extras, ignorar]);

  if (usuario?.rol !== "REVISOR") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-32 text-center">
        <span className="grid size-16 place-items-center rounded-3xl bg-sem-rojo-suave text-sem-rojo-tinta">
          <Lock className="size-8" aria-hidden="true" />
        </span>
        <p role="alert" className="text-lg font-bold text-sem-rojo-tinta">Solo el revisor puede registrar partidas.</p>
        <Button asChild><Link to="/casos">Volver a los expedientes</Link></Button>
      </div>
    );
  }

  const leer = () => {
    const r = leerPartida(pegado);
    setFilas(r.asientos.map<Fila>((a) => ({
      referencia: a.referencia, tipoActo: a.tipoActo, estado: "VIGENTE", fechaInscripcion: a.fechaInscripcion,
      tituloNumero: a.tituloNumero, fechaPresentacion: a.fechaPresentacion, texto: a.texto,
      canceloNumero: a.canceloNumero, titulares: a.titulares,
    })));
    if (r.areaM2) setArea(r.areaM2);
    if (r.linderos) setLinderos(r.linderos);
    if (r.antecedenteDominial) setAntecedente(r.antecedenteDominial);
    setAvisos(r.avisos);
    setConfirmo(false);
  };

  const limpio = () => {
    const t = limpieza.textos;
    const filasLimpias = filas.map<Fila>((f, i) => ({ ...f, texto: t[2 * i], titulares: t[2 * i + 1] }));
    const base = 2 * filas.length;
    return { filas: filasLimpias, linderos: t[base], antecedente: t[base + 1], nota: t[base + 2] };
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setErrores([]);
    setGuardando(true);
    const l = limpio();
    const cuerpo = {
      numero: normalizarNumero(numero),
      denominacion: denominacion.trim(),
      contexto: contexto.trim(),
      fechaConsulta,
      condicionRepresentada: condicion,
      completitud,
      nota: l.nota.trim() || null,
      zonaRegistral: zona.trim() || null,
      oficinaRegistral: oficina.trim() || null,
      ubicacion: ubicacion.trim() || null,
      areaM2: area.trim() === "" ? null : Number(area),
      linderos: l.linderos.trim() || null,
      antecedenteDominial: l.antecedente.trim() || null,
      asientos: filasAPeticion(l.filas),
      ...tecnicoAPeticion(tecnico),
      confirmaSinDatosPersonales: confirmo,
      propietarioCodigo: propietario.trim(),
    };
    try {
      const nuevo = await post<DetalleCaso>("/casos", cuerpo);
      navigate(`/casos/${nuevo.codigo}`);
    } catch (err) {
      const texto = err instanceof Error ? err.message : "No se pudo registrar la partida";
      setErrores(texto.split("; "));
    } finally {
      setGuardando(false);
    }
  };

  const vista = limpio();
  const hayTexto = filas.length > 0;
  const numeroValido = pareceNumeroDePartida(numero);
  const completados = [
    numeroValido && denominacion.trim() !== "" && propietario.trim() !== "",
    pegado.trim() !== "" || hayTexto,
    hayTexto,
    confirmo,
  ];

  return (
    <div className="flex-1 bg-superficie pb-24">
      <section className="relative isolate overflow-hidden bg-foreground">
        <img
          src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=2000&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60" aria-hidden="true" />
        <div className="animate-glow pointer-events-none absolute -right-20 -top-24 -z-10 h-[340px] w-[480px] rounded-full bg-primary/30 blur-[100px]" aria-hidden="true" />

        <div className="mx-auto max-w-4xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
          <span className="anim-enter inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
            <FilePlus2 className="size-4" aria-hidden="true" /> Gestión del revisor
          </span>
          <h1 style={{ "--d": "100ms" } as React.CSSProperties} className="anim-enter mt-5 text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
            Registrar partida
          </h1>
          <p style={{ "--d": "200ms" } as React.CSSProperties} className="anim-enter mt-3 max-w-2xl leading-relaxed text-gray-200 md:text-lg">
            Consulta la partida en Conoce Aquí (gratis, con tu DNI), pega su texto aquí y revisa la vista previa. Se guarda
            sin nombres, DNI, estado civil ni domicilios de personas naturales.
          </p>
          <div style={{ "--d": "300ms" } as React.CSSProperties} className="anim-enter mt-6 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => abrirExterno(CONOCE_AQUI)}>
              Abrir Conoce Aquí <ExternalLink aria-hidden="true" />
            </Button>
            <Button variant="outline" onClick={() => abrirExterno(VISOR_BGR)}>
              Abrir el Visor BGR <ExternalLink aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <ol className="relative z-10 -mt-7 mb-8 grid grid-cols-2 gap-2 rounded-3xl border border-border bg-card p-3 shadow-[0_24px_60px_-20px_rgba(2,44,34,0.3)] sm:grid-cols-4" aria-label="Progreso del registro">
          {PASOS.map((p, i) => (
            <li
              key={p.n}
              className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors duration-300 ${
                completados[i] ? "bg-secondary text-secondary-foreground" : "text-tinta-2"
              }`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                  completados[i] ? "bg-primary text-white" : "bg-muted text-tinta-2"
                }`}
              >
                {completados[i] ? <Check className="size-4" aria-hidden="true" /> : p.n}
              </span>
              {p.etiqueta}
              <span className="sr-only">{completados[i] ? " (completado)" : " (pendiente)"}</span>
            </li>
          ))}
        </ol>

        <form onSubmit={guardar} noValidate className="space-y-8">
          <Paso n={1} titulo="Datos de la partida">
            <div className="grid gap-5 sm:grid-cols-3">
              <Campo
                etiqueta="Número de partida"
                error={numero !== "" && !numeroValido ? "Ocho dígitos, con una letra inicial opcional (P07044600)." : undefined}
              >
                {(p) => <input {...p} className={claseCampo} maxLength={9} value={numero} onChange={(e) => setNumero(normalizarNumero(e.target.value))} />}
              </Campo>
              <Campo etiqueta="Denominación del predio" className="sm:col-span-2">
                {(p) => (
                  <input {...p} className={claseCampo} maxLength={255} placeholder="Mz. D Lote 5 · Hab. Urb. Los Sauces · Ica"
                    value={denominacion} onChange={(e) => setDenominacion(e.target.value)} />
                )}
              </Campo>
            </div>

            <Campo
              etiqueta="Código de cuenta del propietario"
              ayuda="Solo el código de la cuenta: sin nombres, DNI ni teléfonos. El expediente queda en borrador: el indicador A se calcula ahora y el gestor solo podrá publicarlo con la autorización del propietario."
            >
              {(p) => (
                <>
                  <input {...p} className={claseCampo} maxLength={40} list="rp-propietarios" placeholder="propietario-01"
                    autoComplete="off" value={propietario} onChange={(e) => setPropietario(e.target.value)} />
                  <datalist id="rp-propietarios">
                    {PROPIETARIOS_DEMO.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </>
              )}
            </Campo>

            <div className="grid gap-5 sm:grid-cols-3">
              <Campo etiqueta="Distrito">
                {(p) => <input {...p} className={claseCampo} maxLength={255} placeholder="Ica, Ica" value={contexto} onChange={(e) => setContexto(e.target.value)} />}
              </Campo>
              <SelectorFecha
                etiqueta="Fecha de la consulta"
                valor={fechaConsulta}
                alCambiar={setFechaConsulta}
                max={hoy()}
                permitirVacio={false}
              />
              <Desplegable
                etiqueta="Completitud"
                valor={completitud}
                opciones={OPCIONES_COMPLETITUD}
                alCambiar={(v) => setCompletitud(v as Completitud)}
              />
            </div>

            <Desplegable etiqueta="Condición representada" valor={condicion} opciones={OPCIONES_CONDICION} alCambiar={setCondicion} />

            <div className="grid gap-5 sm:grid-cols-2">
              <Campo etiqueta="Zona registral">
                {(p) => <input {...p} className={claseCampo} maxLength={120} value={zona} onChange={(e) => setZona(e.target.value)} />}
              </Campo>
              <Campo etiqueta="Oficina registral">
                {(p) => <input {...p} className={claseCampo} maxLength={120} value={oficina} onChange={(e) => setOficina(e.target.value)} />}
              </Campo>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Campo etiqueta="Ubicación" className="sm:col-span-2">
                {(p) => <input {...p} className={claseCampo} maxLength={255} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />}
              </Campo>
              <Campo etiqueta="Área (m²)">
                {(p) => <input {...p} type="number" step="0.01" min="0" className={claseCampo} value={area} onChange={(e) => setArea(e.target.value)} />}
              </Campo>
            </div>
          </Paso>

          <Paso
            n={2}
            titulo="Pega el texto de la partida"
            descripcion="Copia los asientos desde Conoce Aquí (C00001, D00001, E00001…). El texto original no se envía: solo se guarda la versión limpia que ves en el paso 4. Si el sitio muestra imágenes, escribe los asientos a mano en el paso 3."
          >
            <Campo etiqueta="Texto de la partida">
              {(p) => (
                <textarea {...p} rows={8} className={`${claseAreaTexto} font-mono text-xs`} value={pegado}
                  onChange={(e) => setPegado(e.target.value)} placeholder={"C00001\nCOMPRAVENTA\n…"} />
              )}
            </Campo>
            <Button type="button" variant="outline" size="lg" onClick={leer} disabled={pegado.trim() === ""}>
              <ClipboardPaste aria-hidden="true" /> Leer asientos
            </Button>
            {avisos.length > 0 && (
              <Mensaje tono="info" titulo="Avisos de la lectura">
                <ul className="list-disc space-y-1 pl-5">{avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </Mensaje>
            )}
          </Paso>

          <Paso n={3} titulo="Corrige los asientos y la descripción">
            <BloqueTecnico tecnico={tecnico} setTecnico={setTecnico} />
            <FilasAsientos filas={filas} setFilas={setFilas} />
            <Campo etiqueta="Linderos y medidas perimétricas">
              {(p) => <textarea {...p} rows={3} maxLength={1000} className={claseAreaTexto} value={linderos} onChange={(e) => setLinderos(e.target.value)} />}
            </Campo>
            <Campo etiqueta="Antecedente dominial">
              {(p) => <textarea {...p} rows={2} maxLength={500} className={claseAreaTexto} value={antecedente} onChange={(e) => setAntecedente(e.target.value)} />}
            </Campo>
            <Campo etiqueta="Nota (opcional)">
              {(p) => <textarea {...p} rows={2} maxLength={500} className={claseAreaTexto} value={nota} onChange={(e) => setNota(e.target.value)} />}
            </Campo>
          </Paso>

          <Paso
            n={4}
            titulo="Vista previa sin datos personales"
            Icono={EyeOff}
            destacado
            descripcion="Los nombres de personas naturales se reemplazan por «Persona natural N»; los DNI, el estado civil y los domicilios se omiten. Las empresas y el Estado se conservan. Esto es una ayuda: revisa el texto antes de confirmar."
          >
            <div className="space-y-3">
              <p className="text-sm font-extrabold text-foreground">Nombres detectados ({limpieza.personas.length})</p>
              {limpieza.personas.length === 0 && <p className="text-sm text-tinta-2">No se detectó ningún nombre de persona.</p>}
              <ul className="space-y-2">
                {limpieza.personas.map((p) => (
                  <li key={p.etiqueta} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-superficie px-4 py-3 text-sm">
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{p.etiqueta}</span>
                    <span className="min-w-0 flex-1 text-tinta-2">«{p.nombre}» (solo se ve aquí)</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIgnorar([...ignorar, p.nombre])}>
                      No es una persona
                    </Button>
                  </li>
                ))}
              </ul>
              {ignorar.length > 0 && (
                <p className="text-sm text-tinta-2">
                  Conservados por indicación tuya: {ignorar.join(", ")}.{" "}
                  <button type="button" className="font-bold text-primary underline underline-offset-4" onClick={() => setIgnorar([])}>Deshacer</button>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="rp-extra" className="block text-xs font-bold uppercase tracking-wider text-tinta-2">
                ¿Quedó un nombre sin ocultar? Escríbelo para ocultarlo
              </label>
              <div className="flex gap-2">
                <input id="rp-extra" className={claseCampo} maxLength={80} value={nuevoExtra} onChange={(e) => setNuevoExtra(e.target.value)} />
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12"
                  disabled={nuevoExtra.trim().length < 3}
                  onClick={() => {
                    setExtras([...extras, nuevoExtra.trim()]);
                    setNuevoExtra("");
                  }}
                >
                  Ocultar
                </Button>
              </div>
              {extras.length > 0 && (
                <p className="text-sm text-tinta-2">
                  Ocultados a mano: {extras.join(", ")}.{" "}
                  <button type="button" className="font-bold text-primary underline underline-offset-4" onClick={() => setExtras([])}>Deshacer</button>
                </p>
              )}
            </div>

            <div className="space-y-4 rounded-3xl border border-border bg-superficie p-5" aria-live="polite">
              <p className="text-sm font-extrabold text-foreground">Lo que se guardará</p>
              {!hayTexto && <p className="text-sm text-tinta-2">Aún no hay asientos.</p>}
              {vista.filas.map((f, i) => (
                <div key={`${f.referencia}-${i}`} className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">
                  <p className="font-black text-foreground">
                    {f.referencia || "(sin número)"}
                    {f.titulares ? <span className="font-bold text-tinta-2"> · Titulares: {f.titulares}</span> : null}
                  </p>
                  <p className="mt-1 text-foreground">{f.texto || "Sin texto."}</p>
                </div>
              ))}
              {vista.linderos && <p className="text-sm leading-relaxed"><span className="font-bold">Linderos: </span>{vista.linderos}</p>}
              {vista.antecedente && <p className="text-sm leading-relaxed"><span className="font-bold">Antecedente: </span>{vista.antecedente}</p>}
            </div>

            <label className="flex cursor-pointer items-start gap-3.5 rounded-2xl border border-border bg-background p-4 text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20">
              <input type="checkbox" className="peer sr-only" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} />
              <span
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 border-border text-white transition-colors peer-checked:border-primary peer-checked:bg-primary"
                aria-hidden="true"
              >
                <Check className={`size-3.5 transition-opacity ${confirmo ? "opacity-100" : "opacity-0"}`} />
              </span>
              <span>Revisé la vista previa y confirmo que no contiene nombres, DNI ni domicilios de personas naturales.</span>
            </label>

            {errores.length > 0 && (
              <Mensaje tono="error" titulo="No se registró la partida">
                <ul className="list-disc space-y-1 pl-5">{errores.map((m, i) => <li key={i}>{m}</li>)}</ul>
              </Mensaje>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg" disabled={guardando || !confirmo || !hayTexto || !numeroValido || !propietario.trim()}>
                {guardando ? "Registrando…" : "Registrar partida"}
              </Button>
              <Button type="button" variant="outline" size="lg" asChild>
                <Link to="/casos"><X aria-hidden="true" /> Cancelar</Link>
              </Button>
            </div>
          </Paso>
        </form>
      </div>
    </div>
  );
}