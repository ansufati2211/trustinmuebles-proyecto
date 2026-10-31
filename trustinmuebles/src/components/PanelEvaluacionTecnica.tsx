import { useState, type FormEvent } from "react";
import {
  AlertTriangle, BadgeCheck, BrickWall, CheckCircle2, Circle, CircleDashed, ClipboardCheck, Droplets, ExternalLink,
  HardHat, Info, LoaderCircle, ShieldCheck, Zap, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type TonoBadge } from "@/components/base/Badge";
import { Campo, claseAreaTexto } from "@/components/base/Campo";
import { Desplegable } from "@/components/base/Desplegable";
import { IndicadorB } from "@/components/base/Indicadores";
import { Mensaje } from "@/components/base/Mensaje";
import { Modal } from "@/components/base/Modal";
import { SelectorFecha } from "@/components/base/SelectorFecha";
import { TituloSeccion } from "@/components/base/TituloSeccion";
import { abrirPdf, api, post, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { etapasStepper, pasosInspeccion } from "@/lib/etapas";
import { soles } from "@/lib/formato";
import { puedeAsignarEspecialista, puedeEmitirInforme, puedeSolicitarInspeccion, veBotonSolicitar } from "@/lib/permisos";
import { ETIQUETA_ESPECIALIDAD, ETIQUETA_RESULTADO, ETIQUETA_VERIFICACION, PROCEDIMIENTO_INSPECCION, fecha } from "@/lib/semaforo";
import type { DetalleCaso, EstadoTecnico, ResultadoTecnico, VerificacionCampo } from "@/lib/types";

export function InsigniaTecnica({ estado, resultado, className = "" }: { estado: EstadoTecnico; resultado?: ResultadoTecnico | null; className?: string }) {
  return <IndicadorB estado={estado} resultado={resultado} className={className} />;
}

type ClaveVerif = "verifArquitectura" | "verifEstructuras" | "verifElectricas" | "verifSanitarias";

const VERIFICACIONES: { clave: ClaveVerif; especialidad: keyof typeof ETIQUETA_ESPECIALIDAD }[] = [
  { clave: "verifArquitectura", especialidad: "ARQUITECTURA" },
  { clave: "verifEstructuras", especialidad: "ESTRUCTURAS" },
  { clave: "verifElectricas", especialidad: "ELECTRICAS" },
  { clave: "verifSanitarias", especialidad: "SANITARIAS" },
];

const ESTADO_FISICO: { clave: ClaveVerif; titulo: string; Icono: LucideIcon; queMira: string }[] = [
  { clave: "verifEstructuras", titulo: "Estructuras", Icono: BrickWall, queMira: "Cimentación, columnas, vigas y muros: fisuras y humedad." },
  { clave: "verifElectricas", titulo: "Instalaciones eléctricas", Icono: Zap, queMira: "Tablero, llave diferencial, cableado y pozo a tierra." },
  { clave: "verifSanitarias", titulo: "Instalaciones sanitarias", Icono: Droplets, queMira: "Redes de agua y desagüe, filtraciones y caja de registro." },
];

const VERIF: Record<VerificacionCampo, { tono: TonoBadge; Icono: LucideIcon }> = {
  CONFORME: { tono: "verde", Icono: CheckCircle2 },
  OBSERVADO: { tono: "amarillo", Icono: AlertTriangle },
  NO_VERIFICADO: { tono: "gris", Icono: CircleDashed },
};

const OPCIONES_RESULTADO = (Object.keys(ETIQUETA_RESULTADO) as ResultadoTecnico[]).map((r) => ({ valor: r, etiqueta: ETIQUETA_RESULTADO[r] }));
const OPCIONES_VERIF = (Object.keys(ETIQUETA_VERIFICACION) as VerificacionCampo[]).map((v) => ({ valor: v, etiqueta: ETIQUETA_VERIFICACION[v] }));
const OPCIONES_ESTADO_INFORME = [
  { valor: "EN_INSPECCION", etiqueta: "En inspección" },
  { valor: "EMITIDO", etiqueta: "Informe emitido" },
];

export const ESPECIALISTAS_DEMO = ["especialista-01", "especialista-02"];

const iniciales = (nombre: string) =>
  nombre.split(/\s+/).filter((p) => !/^(ing|arq|dr|dra)\.?$/i.test(p)).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");

function Stepper({ estado }: { estado: EstadoTecnico }) {
  const etapas = etapasStepper(estado);
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Etapas de la evaluación técnica">
      {etapas.map((e, i) => {
        const completada = e.estado === "completada";
        const actual = e.estado === "actual";
        return (
          <li
            key={e.clave}
            aria-current={actual ? "step" : undefined}
            className={`relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border p-4 transition-all duration-500 ease-expo ${
              actual
                ? "border-primary bg-secondary shadow-md shadow-primary/15"
                : completada
                  ? "border-sem-verde/40 bg-sem-verde-suave"
                  : "border-border bg-background"
            }`}
          >
            {actual && <span className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />}
            <span
              className={`grid size-9 place-items-center rounded-full text-sm font-black ${
                completada ? "bg-sem-verde text-white" : actual ? "bg-primary text-white" : "bg-muted text-tinta-2"
              }`}
            >
              {completada ? <CheckCircle2 className="size-5" aria-hidden="true" /> : i + 1}
            </span>
            <span className="text-sm font-bold leading-tight text-foreground">{e.etiqueta}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-tinta-2">
              {completada ? "Completada" : actual ? "Etapa actual" : "Pendiente"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function AvatarEspecialista({ nombre }: { nombre: string }) {
  return (
    <span
      className="grid size-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-primary to-emerald-700 text-2xl font-black text-white"
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  );
}

function Credencial({ t }: { t: DetalleCaso["evaluacionTecnica"] }) {
  if (!t.profesional) {
    return (
      <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-superficie p-5">
        <span className="grid size-14 place-items-center rounded-2xl bg-muted text-tinta-2">
          <HardHat className="size-7" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold leading-relaxed text-tinta-2">
          {t.especialistaAsignadoCodigo ? "Especialista asignado: la inmobiliaria coordina la visita." : "Pendiente de asignación por el gestor"}
        </p>
      </div>
    );
  }
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-tarjeta sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 -z-10 size-48 rounded-full bg-primary/10 blur-[60px]" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-5">
        <AvatarEspecialista nombre={t.profesional} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Especialista a cargo</p>
          <p className="mt-0.5 text-xl font-extrabold tracking-tight text-foreground">{t.profesional}</p>
          <p className="mt-1 text-sm font-medium text-tinta-2">{t.profesionalEspecialidad ?? "Especialista de la inmobiliaria"}</p>
          <p className="mt-1 text-xs font-bold text-arena-tinta">Perfil ficticio de demostración</p>
        </div>
        {t.colegiatura && (
          <span className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            <span className="cifras">{t.colegiatura}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function TarjetasEstadoFisico({ t }: { t: DetalleCaso["evaluacionTecnica"] }) {
  const inspeccionada = t.estado === "EN_INSPECCION" || t.estado === "EMITIDO";
  return (
    <ul className="grid gap-4 sm:grid-cols-3" aria-label="Estado físico verificado en campo">
      {ESTADO_FISICO.map(({ clave, titulo, Icono, queMira }) => {
        const v = t[clave];
        const estilo = v ? VERIF[v] : null;
        return (
          <li
            key={clave}
            className="group flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 transition-all duration-500 ease-expo hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevada"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary transition-transform duration-500 ease-expo group-hover:scale-110 group-hover:-rotate-3">
              <Icono className="size-6" aria-hidden="true" />
            </span>
            <h4 className="font-extrabold leading-tight text-foreground">{titulo}</h4>
            <p className="text-xs leading-relaxed text-tinta-2">{queMira}</p>
            <div className="mt-auto pt-1">
              {estilo && v ? (
                <Badge tono={estilo.tono} icono={estilo.Icono} tamano="sm">{ETIQUETA_VERIFICACION[v]}</Badge>
              ) : (
                <Badge tono="gris" icono={CircleDashed} tamano="sm">{inspeccionada ? "Aún sin verificar" : "Sin inspección"}</Badge>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PasosInspeccion({ estado }: { estado: EstadoTecnico }) {
  const avance = pasosInspeccion(estado, PROCEDIMIENTO_INSPECCION.length);
  return (
    <ol className="relative space-y-4" aria-label="Procedimiento de la inspección en 6 pasos">
      <span className="absolute bottom-3 left-[0.6rem] top-3 w-px bg-border" aria-hidden="true" />
      {PROCEDIMIENTO_INSPECCION.map((p, i) => {
        const a = avance[i];
        const Icono = a === "hecho" ? CheckCircle2 : a === "en-curso" ? LoaderCircle : Circle;
        const color = a === "hecho" ? "text-sem-verde-tinta" : a === "en-curso" ? "text-info-tinta" : "text-sem-gris";
        return (
          <li key={p.titulo} className="relative flex gap-3.5">
            <span className="relative z-10 grid size-5 shrink-0 place-items-center rounded-full bg-card">
              <Icono className={`size-5 ${color} ${a === "en-curso" ? "animate-spin" : ""}`} aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed">
              <span className="font-bold text-foreground">{i + 1}. {p.titulo}. </span>
              <span className="text-tinta-2">{p.texto}</span>
              <span className="sr-only">{a === "hecho" ? " Hecho." : a === "en-curso" ? " En curso." : " Pendiente."}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function FormularioInforme({ detalle, alCambiar }: { detalle: DetalleCaso; alCambiar: (d: DetalleCaso) => void }) {
  const t = detalle.evaluacionTecnica;
  const [estado, setEstado] = useState<"EN_INSPECCION" | "EMITIDO">(t.estado === "EMITIDO" ? "EMITIDO" : "EN_INSPECCION");
  const [resultado, setResultado] = useState<ResultadoTecnico | "">(t.resultado ?? "");
  const [fechaInspeccion, setFechaInspeccion] = useState(t.fechaInspeccion ?? "");
  const [verif, setVerif] = useState<Record<ClaveVerif, VerificacionCampo | "">>({
    verifArquitectura: t.verifArquitectura ?? "", verifEstructuras: t.verifEstructuras ?? "",
    verifElectricas: t.verifElectricas ?? "", verifSanitarias: t.verifSanitarias ?? "",
  });
  const [observaciones, setObservaciones] = useState(t.observaciones ?? "");
  const [conclusiones, setConclusiones] = useState(t.conclusiones ?? "");
  const [estudios, setEstudios] = useState(t.estudiosAdicionales ?? "");
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setErrores([]);
    setMensaje(null);
    setGuardando(true);
    try {
      const nuevo = await put<DetalleCaso>(`/casos/${detalle.codigo}/inspeccion`, {
        estado, resultado: resultado || null, fechaInspeccion: fechaInspeccion || null,
        verifArquitectura: verif.verifArquitectura || null, verifEstructuras: verif.verifEstructuras || null,
        verifElectricas: verif.verifElectricas || null, verifSanitarias: verif.verifSanitarias || null,
        observaciones: observaciones.trim() || null, conclusiones: conclusiones.trim() || null,
        estudiosAdicionales: estudios.trim() || null,
      });
      alCambiar(nuevo);
      setMensaje(estado === "EMITIDO" ? "Informe emitido. El indicador A (documental) no cambió." : "Inspección en curso guardada.");
    } catch (err) {
      setErrores((err instanceof Error ? err.message : "No se pudo guardar el informe").split("; "));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      onSubmit={guardar}
      noValidate
      className="space-y-6 rounded-3xl border-2 border-primary/20 bg-superficie p-5 sm:p-7"
      aria-label="Informe técnico del especialista"
    >
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
          <ClipboardCheck className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-foreground">Informe técnico</h3>
          <p className="mt-0.5 text-sm text-tinta-2">Solo el especialista lo llena. Tu nombre, especialidad y colegiatura se toman de tu cuenta.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Desplegable etiqueta="Estado" valor={estado} opciones={OPCIONES_ESTADO_INFORME} alCambiar={(v) => setEstado(v as "EN_INSPECCION" | "EMITIDO")} />
        <Desplegable
          className="sm:col-span-2"
          etiqueta="Conclusión del informe"
          valor={resultado}
          opciones={OPCIONES_RESULTADO}
          textoTodos="Elegir (al emitir)"
          alCambiar={(v) => setResultado(v as ResultadoTecnico | "")}
        />
      </div>

      <SelectorFecha
        etiqueta="Fecha de la inspección presencial"
        className="sm:max-w-xs"
        valor={fechaInspeccion}
        alCambiar={setFechaInspeccion}
      />

      <fieldset>
        <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-tinta-2">Verificación en campo, por especialidad</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {VERIFICACIONES.map(({ clave, especialidad }) => (
            <Desplegable
              key={clave}
              etiqueta={ETIQUETA_ESPECIALIDAD[especialidad]}
              valor={verif[clave]}
              opciones={OPCIONES_VERIF}
              textoTodos="Elegir"
              alCambiar={(v) => setVerif({ ...verif, [clave]: v as VerificacionCampo | "" })}
            />
          ))}
        </div>
      </fieldset>

      <Campo etiqueta="Observaciones y deficiencias físicas detectadas">
        {(p) => <textarea {...p} rows={3} maxLength={1500} className={claseAreaTexto} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />}
      </Campo>
      <Campo etiqueta="Conclusiones sustentadas por la inspección">
        {(p) => <textarea {...p} rows={3} maxLength={1500} className={claseAreaTexto} value={conclusiones} onChange={(e) => setConclusiones(e.target.value)} />}
      </Campo>
      <Campo etiqueta="Estudios adicionales requeridos">
        {(p) => <textarea {...p} rows={2} maxLength={1000} className={claseAreaTexto} value={estudios} onChange={(e) => setEstudios(e.target.value)} />}
      </Campo>

      {errores.length > 0 && (
        <Mensaje tono="error" titulo="No se guardó el informe">
          <ul className="list-disc space-y-1 pl-5">{errores.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </Mensaje>
      )}
      {mensaje && <Mensaje tono="ok">{mensaje}</Mensaje>}

      <Button type="submit" size="lg" disabled={guardando}>{guardando ? "Guardando…" : "Guardar informe"}</Button>
    </form>
  );
}

function AsignacionEspecialista({ detalle, alCambiar }: { detalle: DetalleCaso; alCambiar: (d: DetalleCaso) => void }) {
  const actual = detalle.evaluacionTecnica.especialistaAsignadoCodigo ?? "";
  const [codigo, setCodigo] = useState(actual || ESPECIALISTAS_DEMO[0]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const asignar = async () => {
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      await put(`/casos/${detalle.codigo}/inspeccion/asignacion`, { especialistaCodigo: codigo });
      alCambiar(await api<DetalleCaso>(`/casos/${detalle.codigo}`));
      setAviso(`Inspección asignada a ${codigo}. El indicador A no cambió.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo asignar la inspección");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-superficie p-5 sm:p-6">
      <h3 className="font-extrabold text-foreground">Asignar especialista</h3>
      <div className="flex flex-wrap items-end gap-3">
        <Desplegable
          className="min-w-60 flex-1"
          etiqueta="Cuenta del especialista"
          valor={codigo}
          opciones={ESPECIALISTAS_DEMO.map((c) => ({ valor: c, etiqueta: c }))}
          alCambiar={setCodigo}
        />
        <Button size="lg" className="h-12" onClick={asignar} disabled={enviando || codigo === actual}>
          {enviando ? "Asignando…" : actual ? "Reasignar" : "Asignar"}
        </Button>
      </div>
      {aviso && <Mensaje tono="ok">{aviso}</Mensaje>}
      {error && <Mensaje tono="error">{error}</Mensaje>}
    </div>
  );
}

function ModalSolicitud({ detalle, abierto, alCerrar, alSolicitar }: {
  detalle: DetalleCaso; abierto: boolean; alCerrar: () => void; alSolicitar: (d: DetalleCaso) => void;
}) {
  const servicio = detalle.evaluacionTecnica.servicio;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    setError(null);
    setEnviando(true);
    try {
      await post(`/casos/${detalle.codigo}/inspeccion/solicitud`);
      alSolicitar(await api<DetalleCaso>(`/casos/${detalle.codigo}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo solicitar la inspección");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      ancho="lg"
      titulo="Solicitar inspección técnica presencial"
      descripcion={`Para ${detalle.denominacion} (partida ${detalle.codigo}).`}
      pie={
        <>
          <Button variant="outline" onClick={alCerrar} disabled={enviando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={enviando}>
            <HardHat aria-hidden="true" /> {enviando ? "Enviando…" : "Confirmar solicitud"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-arena/40 bg-arena-suave p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-arena-tinta">Costo del servicio</p>
          <p className="cifras mt-1 text-4xl font-black tracking-tight text-foreground">{servicio ? soles(servicio.costoReferencial) : "Por coordinar"}</p>
          {servicio && <p className="mt-1 text-sm text-arena-tinta">{servicio.condiciones}</p>}
        </div>
        <div>
          <p className="mb-4 font-extrabold text-foreground">Qué incluye: el procedimiento en 6 pasos</p>
          <PasosInspeccion estado="NO_SOLICITADA" />
        </div>
        <Mensaje tono="info">
          El informe del especialista es independiente: no cambia el color del indicador A (documental). La solicitud queda a
          tu nombre de cuenta y con la fecha de hoy; la visita se coordina con la inmobiliaria.
        </Mensaje>
        {error && <Mensaje tono="error">{error}</Mensaje>}
      </div>
    </Modal>
  );
}

export function PanelEvaluacionTecnica({ detalle, alCambiar }: { detalle: DetalleCaso; alCambiar: (d: DetalleCaso) => void }) {
  const { usuario } = useAuth();
  const t = detalle.evaluacionTecnica;
  const [modal, setModal] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verInforme = async () => {
    setError(null);
    try {
      await abrirPdf(`/casos/${detalle.codigo}/inspeccion/documento`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el informe");
    }
  };

  return (
    <section
      id="evaluacion-tecnica"
      aria-labelledby="titulo-indicador-b"
      className="scroll-mt-28 space-y-7 rounded-[2rem] border border-border bg-card p-6 shadow-tarjeta sm:p-8"
    >
      <TituloSeccion
        icono={ClipboardCheck}
        id="titulo-indicador-b"
        descripcion="Un plano no demuestra que una estructura o una instalación estén bien hoy. Eso lo comprueba en el inmueble un especialista de la inmobiliaria. Los perfiles de esta demostración son ficticios."
        derecha={<IndicadorB estado={t.estado} resultado={t.resultado} tamano="lg" conPrefijo={false} />}
      >
        Evaluación técnica presencial (Indicador B)
      </TituloSeccion>

      <Mensaje tono="info">El indicador B es independiente y no cambia el color del indicador A (documental).</Mensaje>

      <Stepper estado={t.estado} />

      {t.fechaSolicitud && (
        <p className="rounded-2xl bg-superficie px-4 py-3 text-sm text-foreground">
          <span className="font-bold">Solicitada</span>
          {t.solicitanteCodigo ? <> por la cuenta <span className="font-bold">{t.solicitanteCodigo}</span></> : null} el {fecha(t.fechaSolicitud)}
          {t.fechaInspeccion ? <> · inspección presencial del {fecha(t.fechaInspeccion)}</> : null}.
        </p>
      )}
      {aviso && <Mensaje tono="ok">{aviso}</Mensaje>}

      {t.estado === "NO_SOLICITADA" && (
        veBotonSolicitar(usuario?.rol) ? (
          <div className="relative isolate flex flex-wrap items-center gap-5 overflow-hidden rounded-3xl border border-arena/40 bg-arena-suave p-6">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-card text-arena-tinta shadow-sm">
              <HardHat className="size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold text-foreground">¿Quieres saber cómo está la obra por dentro?</p>
              <p className="mt-0.5 text-sm text-arena-tinta">
                Costo del servicio: {t.servicio ? soles(t.servicio.costoReferencial) : "por coordinar"}. Antes de confirmar verás el alcance.
              </p>
            </div>
            <Button size="lg" onClick={() => setModal(true)} disabled={!puedeSolicitarInspeccion(usuario?.rol, t.estado)}>
              <HardHat aria-hidden="true" /> Solicitar inspección técnica
            </Button>
          </div>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-border bg-superficie p-5 text-sm text-tinta-2">
            Aún no hay una solicitud. La inspección la pide el comprador desde este expediente.
          </p>
        )
      )}

      {t.estado !== "NO_SOLICITADA" && <Credencial t={t} />}

      {usuario?.rol !== "COMPRADOR" && t.estado !== "NO_SOLICITADA" && (
        <p className="text-sm text-foreground">
          {t.especialistaAsignadoCodigo
            ? <>Especialista asignado: <span className="font-bold">{t.especialistaAsignadoCodigo}</span>. Solo esa cuenta emite el informe.</>
            : <span className="text-tinta-2">Pendiente de asignación por el gestor. Sin asignación nadie puede emitir el informe.</span>}
        </p>
      )}
      {puedeAsignarEspecialista(usuario?.rol, t.estado) && <AsignacionEspecialista detalle={detalle} alCambiar={alCambiar} />}

      <div className="space-y-4">
        <h3 className="text-lg font-extrabold tracking-tight text-foreground">Estado físico verificado en campo</h3>
        <TarjetasEstadoFisico t={t} />
      </div>

      {(t.estado === "EN_INSPECCION" || t.estado === "EMITIDO") && (
        <div className="space-y-3 rounded-3xl border border-border bg-superficie p-5 sm:p-6" aria-label="Resumen del informe técnico">
          {t.estado === "EMITIDO" && t.resultado && (
            <p className="flex items-center gap-2 text-lg font-extrabold text-foreground">
              <BadgeCheck className="size-6 text-primary" aria-hidden="true" /> Conclusión: {ETIQUETA_RESULTADO[t.resultado]}
            </p>
          )}
          {t.verifArquitectura && (
            <p className="text-sm text-tinta-2">
              Arquitectura (contraste con el plano): <span className="font-bold text-foreground">{ETIQUETA_VERIFICACION[t.verifArquitectura]}</span>
            </p>
          )}
          {t.observaciones && <p className="text-sm leading-relaxed"><span className="font-bold">Observaciones: </span>{t.observaciones}</p>}
          {t.conclusiones && <p className="text-sm leading-relaxed"><span className="font-bold">Conclusiones: </span>{t.conclusiones}</p>}
          {t.estudiosAdicionales && <p className="text-sm leading-relaxed"><span className="font-bold">Estudios adicionales: </span>{t.estudiosAdicionales}</p>}
          {t.estado === "EMITIDO" && (
            <Button variant="outline" onClick={verInforme}>
              Ver informe técnico (PDF) <ExternalLink aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
      {error && <Mensaje tono="error">{error}</Mensaje>}

      <div className="rounded-3xl border border-border bg-superficie p-5 sm:p-6">
        <h3 className="mb-5 text-lg font-extrabold tracking-tight text-foreground">Procedimiento de la inspección (6 pasos)</h3>
        <PasosInspeccion estado={t.estado} />
        <p className="mt-6 flex gap-2 border-t border-border pt-4 text-xs font-semibold leading-relaxed text-tinta-2">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t.limite}
        </p>
      </div>

      {puedeEmitirInforme(usuario?.rol, t.estado, t.especialistaAsignadoCodigo, usuario?.codigoCuenta)
        && <FormularioInforme key={detalle.codigo} detalle={detalle} alCambiar={alCambiar} />}
      {usuario?.rol === "ESPECIALISTA" && t.estado !== "NO_SOLICITADA"
        && !puedeEmitirInforme(usuario.rol, t.estado, t.especialistaAsignadoCodigo, usuario.codigoCuenta) && (
        <p className="text-sm text-tinta-2">
          {t.especialistaAsignadoCodigo
            ? "Esta inspección está asignada a otro especialista: solo esa cuenta puede emitir el informe."
            : "Pendiente de asignación por el gestor: aún no puedes registrar el avance ni emitir el informe."}
        </p>
      )}
      {usuario?.rol === "ESPECIALISTA" && t.estado === "NO_SOLICITADA" && (
        <p className="text-sm text-tinta-2">Aún no hay una solicitud: el informe se puede llenar cuando el comprador la pida.</p>
      )}

      {veBotonSolicitar(usuario?.rol) && (
        <ModalSolicitud
          detalle={detalle}
          abierto={modal}
          alCerrar={() => setModal(false)}
          alSolicitar={(d) => {
            setModal(false);
            alCambiar(d);
            const s = d.evaluacionTecnica;
            setAviso(`Solicitud registrada${s.solicitanteCodigo ? ` a nombre de ${s.solicitanteCodigo}` : ""}${s.fechaSolicitud ? ` el ${fecha(s.fechaSolicitud)}` : ""}.`);
          }}
        />
      )}
    </section>
  );
}