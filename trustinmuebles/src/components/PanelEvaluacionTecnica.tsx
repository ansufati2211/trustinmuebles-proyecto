import { useState } from "react";
import {
  AlertTriangle, BadgeCheck, BrickWall, CheckCircle2, Circle, CircleDashed, ClipboardCheck, Droplets, ExternalLink,
  HardHat, Info, LoaderCircle, Zap, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type TonoBadge } from "@/components/base/Badge";
import { IndicadorB } from "@/components/base/Indicadores";
import { Modal } from "@/components/base/Modal";
import { campo } from "@/components/FilasAsientos";
import { abrirPdf, api, post, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { etapasStepper, pasosInspeccion } from "@/lib/etapas";
import { soles } from "@/lib/formato";
import { puedeEmitirInforme, puedeSolicitarInspeccion, veBotonSolicitar } from "@/lib/permisos";
import { ETIQUETA_ESPECIALIDAD, ETIQUETA_RESULTADO, ETIQUETA_VERIFICACION, PROCEDIMIENTO_INSPECCION, fecha } from "@/lib/semaforo";
import type { DetalleCaso, EstadoTecnico, ResultadoTecnico, VerificacionCampo } from "@/lib/types";

/** Insignia del indicador B. Delega en IndicadorB; se conserva el nombre para quien ya la usa. */
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

/** Las tres tarjetas de estado físico que muestra el indicador B. */
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

function Stepper({ estado }: { estado: EstadoTecnico }) {
  const etapas = etapasStepper(estado);
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Etapas de la evaluación técnica">
      {etapas.map((e, i) => {
        const completada = e.estado === "completada";
        const actual = e.estado === "actual";
        return (
          <li key={e.clave} aria-current={actual ? "step" : undefined}
            className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 ${actual ? "border-primary bg-secondary" : completada ? "border-sem-verde/40 bg-sem-verde-suave" : "border-border bg-card"}`}>
            <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${completada ? "bg-sem-verde text-white" : actual ? "bg-primary text-white" : "bg-muted text-tinta-2"}`}>
              {completada ? <CheckCircle2 className="size-4" aria-hidden="true" /> : i + 1}
            </span>
            <span className="text-sm font-bold leading-tight text-foreground">
              {e.etiqueta}
              <span className="sr-only">{completada ? " (completada)" : actual ? " (etapa actual)" : " (pendiente)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Avatar dibujado (no es una foto de una persona real). */
function AvatarEspecialista() {
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0" role="img" aria-label="Avatar ilustrativo del especialista">
      <circle cx="32" cy="32" r="32" fill="#E6F2EC" />
      <path d="M12 58 C 14 44, 50 44, 52 58 Z" fill="#2B6E57" />
      <circle cx="32" cy="30" r="11" fill="#E9C9A9" />
      <path d="M19 26 C 19 15, 45 15, 45 26 Z" fill="#D99A3D" />
      <rect x="16" y="25" width="32" height="4" rx="2" fill="#C2852F" />
    </svg>
  );
}

function Credencial({ t }: { t: DetalleCaso["evaluacionTecnica"] }) {
  if (!t.profesional) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-superficie p-4">
        <HardHat className="size-6 text-tinta-2" aria-hidden="true" />
        <p className="text-sm font-semibold text-tinta-2">Especialista por asignar: la inmobiliaria coordina la visita.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-tarjeta">
      <AvatarEspecialista />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-tinta-2">Especialista a cargo</p>
        <p className="text-lg font-bold text-foreground">{t.profesional}</p>
        <p className="text-sm text-tinta-2">{t.profesionalEspecialidad ?? "Profesional colegiado"} · {t.colegiatura}</p>
      </div>
      <Badge tono="arena" icono={Info} tamano="sm">Datos ficticios de demostración</Badge>
    </div>
  );
}

function TarjetasEstadoFisico({ t }: { t: DetalleCaso["evaluacionTecnica"] }) {
  const inspeccionada = t.estado === "EN_INSPECCION" || t.estado === "EMITIDO";
  return (
    <ul className="grid gap-3 sm:grid-cols-3" aria-label="Estado físico verificado en campo">
      {ESTADO_FISICO.map(({ clave, titulo, Icono, queMira }) => {
        const v = t[clave];
        const estilo = v ? VERIF[v] : null;
        return (
          <li key={clave} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary"><Icono className="size-5" aria-hidden="true" /></span>
              <h4 className="font-bold leading-tight text-foreground">{titulo}</h4>
            </div>
            <p className="text-xs leading-relaxed text-tinta-2">{queMira}</p>
            {estilo && v ? (
              <Badge tono={estilo.tono} icono={estilo.Icono} tamano="sm" className="self-start">{ETIQUETA_VERIFICACION[v]}</Badge>
            ) : (
              <Badge tono="gris" icono={CircleDashed} tamano="sm" className="self-start">{inspeccionada ? "Aún sin verificar" : "Sin inspección"}</Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PasosInspeccion({ estado }: { estado: EstadoTecnico }) {
  const avance = pasosInspeccion(estado, PROCEDIMIENTO_INSPECCION.length);
  return (
    <ol className="space-y-3" aria-label="Procedimiento de la inspección en 6 pasos">
      {PROCEDIMIENTO_INSPECCION.map((p, i) => {
        const a = avance[i];
        const Icono = a === "hecho" ? CheckCircle2 : a === "en-curso" ? LoaderCircle : Circle;
        const color = a === "hecho" ? "text-sem-verde-tinta" : a === "en-curso" ? "text-info-tinta" : "text-sem-gris";
        return (
          <li key={p.titulo} className="flex gap-3">
            <Icono className={`mt-0.5 size-5 shrink-0 ${color}`} aria-hidden="true" />
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

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrores([]); setMensaje(null); setGuardando(true);
    try {
      // Sin nombre ni colegiatura: el servidor los toma de la cuenta del especialista (M8).
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
    <form onSubmit={guardar} noValidate className="space-y-4 rounded-2xl border border-border bg-superficie p-5" aria-label="Informe técnico del especialista">
      <h3 className="font-bold text-foreground">Informe técnico (solo el especialista lo llena)</h3>
      <p className="text-xs text-tinta-2">Tu nombre, especialidad y colegiatura se toman de tu cuenta: no se escriben aquí.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="it-estado" className="mb-1 block text-xs font-bold text-tinta-2">Estado</label>
          <select id="it-estado" className={campo} value={estado} onChange={(e) => setEstado(e.target.value as "EN_INSPECCION" | "EMITIDO")}>
            <option value="EN_INSPECCION">En inspección</option>
            <option value="EMITIDO">Informe emitido</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="it-resultado" className="mb-1 block text-xs font-bold text-tinta-2">Conclusión del informe</label>
          <select id="it-resultado" className={campo} value={resultado} onChange={(e) => setResultado(e.target.value as ResultadoTecnico | "")}>
            <option value="">Elegir (al emitir)</option>
            {(Object.keys(ETIQUETA_RESULTADO) as ResultadoTecnico[]).map((r) => <option key={r} value={r}>{ETIQUETA_RESULTADO[r]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="it-fecha" className="mb-1 block text-xs font-bold text-tinta-2">Fecha de la inspección presencial</label>
        <input id="it-fecha" type="date" className={`${campo} sm:max-w-xs`} value={fechaInspeccion} onChange={(e) => setFechaInspeccion(e.target.value)} />
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-xs font-bold text-tinta-2">Verificación en campo, por especialidad</legend>
        {VERIFICACIONES.map(({ clave, especialidad }) => (
          <div key={clave}>
            <label htmlFor={`it-${clave}`} className="mb-1 block text-xs font-bold text-tinta-2">{ETIQUETA_ESPECIALIDAD[especialidad]}</label>
            <select id={`it-${clave}`} className={campo} value={verif[clave]} onChange={(e) => setVerif({ ...verif, [clave]: e.target.value as VerificacionCampo | "" })}>
              <option value="">Elegir</option>
              {(Object.keys(ETIQUETA_VERIFICACION) as VerificacionCampo[]).map((v) => <option key={v} value={v}>{ETIQUETA_VERIFICACION[v]}</option>)}
            </select>
          </div>
        ))}
      </fieldset>
      <div>
        <label htmlFor="it-obs" className="mb-1 block text-xs font-bold text-tinta-2">Observaciones y deficiencias físicas detectadas</label>
        <textarea id="it-obs" rows={3} maxLength={1500} className={`${campo} h-auto py-2`} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>
      <div>
        <label htmlFor="it-conc" className="mb-1 block text-xs font-bold text-tinta-2">Conclusiones sustentadas por la inspección</label>
        <textarea id="it-conc" rows={3} maxLength={1500} className={`${campo} h-auto py-2`} value={conclusiones} onChange={(e) => setConclusiones(e.target.value)} />
      </div>
      <div>
        <label htmlFor="it-est" className="mb-1 block text-xs font-bold text-tinta-2">Estudios adicionales requeridos</label>
        <textarea id="it-est" rows={2} maxLength={1000} className={`${campo} h-auto py-2`} value={estudios} onChange={(e) => setEstudios(e.target.value)} />
      </div>
      {errores.length > 0 && (
        <div role="alert" className="rounded-2xl border border-sem-rojo/40 bg-sem-rojo-suave p-4">
          <p className="mb-1 font-bold text-sem-rojo-tinta">No se guardó el informe</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-sem-rojo-tinta">{errores.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}
      {mensaje && <p role="status" className="rounded-2xl border border-sem-verde/40 bg-sem-verde-suave p-4 text-sm font-semibold text-sem-verde-tinta">{mensaje}</p>}
      <Button type="submit" disabled={guardando} className="rounded-xl">{guardando ? "Guardando…" : "Guardar informe"}</Button>
    </form>
  );
}

/** Modal de solicitud: alcance de los 6 pasos, costo referencial que envía el backend y confirmación. */
function ModalSolicitud({ detalle, abierto, alCerrar, alSolicitar }: {
  detalle: DetalleCaso; abierto: boolean; alCerrar: () => void; alSolicitar: (d: DetalleCaso) => void;
}) {
  const servicio = detalle.evaluacionTecnica.servicio;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    setError(null); setEnviando(true);
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
    <Modal abierto={abierto} alCerrar={alCerrar} ancho="lg" titulo="Solicitar inspección técnica presencial"
      descripcion={`Para ${detalle.denominacion} (partida ${detalle.codigo}).`}
      pie={<>
        <Button variant="outline" className="rounded-xl" onClick={alCerrar} disabled={enviando}>Cancelar</Button>
        <Button className="rounded-xl" onClick={confirmar} disabled={enviando}>
          <HardHat aria-hidden="true" /> {enviando ? "Enviando…" : "Confirmar solicitud"}
        </Button>
      </>}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-arena/40 bg-arena-suave p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-arena-tinta">Costo referencial · dato simulado</p>
          <p className="cifras mt-1 text-3xl font-extrabold text-foreground">{servicio ? soles(servicio.costoReferencial) : "Por coordinar"}</p>
          {servicio && <p className="mt-1 text-sm text-arena-tinta">{servicio.condiciones}</p>}
        </div>
        <div>
          <p className="mb-3 font-bold text-foreground">Qué incluye: el procedimiento en 6 pasos</p>
          <PasosInspeccion estado="NO_SOLICITADA" />
        </div>
        <p className="flex gap-2 rounded-2xl border border-border bg-superficie p-4 text-sm text-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          El informe del especialista es independiente: no cambia el color del indicador A (documental). La solicitud queda a
          tu nombre de cuenta y con la fecha de hoy; la visita se coordina con la inmobiliaria.
        </p>
        {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{error}</p>}
      </div>
    </Modal>
  );
}

/** Indicador B: la verificación física que hace un profesional en el inmueble. Es independiente del semáforo documental. */
export function PanelEvaluacionTecnica({ detalle, alCambiar }: { detalle: DetalleCaso; alCambiar: (d: DetalleCaso) => void }) {
  const { usuario } = useAuth();
  const t = detalle.evaluacionTecnica;
  const [modal, setModal] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verInforme = async () => {
    setError(null);
    try { await abrirPdf(`/casos/${detalle.codigo}/inspeccion/documento`); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo abrir el informe"); }
  };

  return (
    <section id="evaluacion-tecnica" aria-labelledby="titulo-indicador-b" className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-tarjeta sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-indicador-b" className="flex items-center gap-2 text-xl font-bold text-foreground">
            <ClipboardCheck className="size-5 text-primary" aria-hidden="true" /> Evaluación técnica presencial (Indicador B)
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-tinta-2">
            Un plano no demuestra que una estructura o una instalación estén bien hoy. Eso lo comprueba un ingeniero civil o
            arquitecto colegiado en el inmueble.
          </p>
        </div>
        <IndicadorB estado={t.estado} resultado={t.resultado} tamano="lg" conPrefijo={false} />
      </div>

      <p className="flex gap-2 rounded-2xl border border-info-tinta/20 bg-info-suave p-4 text-sm font-semibold text-info-tinta">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        El indicador B es independiente y no cambia el color del indicador A (documental).
      </p>

      <Stepper estado={t.estado} />

      {t.fechaSolicitud && (
        <p className="text-sm text-foreground">
          <span className="font-bold">Solicitada</span>
          {t.solicitanteCodigo ? <> por la cuenta <span className="font-bold">{t.solicitanteCodigo}</span></> : null} el {fecha(t.fechaSolicitud)}
          {t.fechaInspeccion ? <> · inspección presencial del {fecha(t.fechaInspeccion)}</> : null}.
        </p>
      )}
      {aviso && <p role="status" className="rounded-2xl border border-sem-verde/40 bg-sem-verde-suave p-4 text-sm font-semibold text-sem-verde-tinta">{aviso}</p>}

      {t.estado === "NO_SOLICITADA" && (
        veBotonSolicitar(usuario?.rol) ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-arena/40 bg-arena-suave p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground">¿Quieres saber cómo está la obra por dentro?</p>
              <p className="text-sm text-arena-tinta">
                Costo referencial {t.servicio ? soles(t.servicio.costoReferencial) : "por coordinar"} (dato simulado). Antes de confirmar verás el alcance.
              </p>
            </div>
            <Button className="rounded-xl" onClick={() => setModal(true)} disabled={!puedeSolicitarInspeccion(usuario?.rol, t.estado)}>
              <HardHat aria-hidden="true" /> Solicitar inspección técnica
            </Button>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-superficie p-4 text-sm text-tinta-2">
            Aún no hay una solicitud. La inspección la pide el comprador desde este expediente.
          </p>
        )
      )}

      {t.estado !== "NO_SOLICITADA" && <Credencial t={t} />}

      <div>
        <h3 className="mb-3 font-bold text-foreground">Estado físico verificado en campo</h3>
        <TarjetasEstadoFisico t={t} />
      </div>

      {(t.estado === "EN_INSPECCION" || t.estado === "EMITIDO") && (
        <div className="space-y-3" aria-label="Resumen del informe técnico">
          {t.estado === "EMITIDO" && t.resultado && (
            <p className="flex items-center gap-2 text-base font-bold text-foreground">
              <BadgeCheck className="size-5 text-primary" aria-hidden="true" /> Conclusión: {ETIQUETA_RESULTADO[t.resultado]}
            </p>
          )}
          {t.verifArquitectura && (
            <p className="text-sm text-tinta-2">Arquitectura (contraste con el plano): <span className="font-bold text-foreground">{ETIQUETA_VERIFICACION[t.verifArquitectura]}</span></p>
          )}
          {t.observaciones && <p className="text-sm"><span className="font-bold">Observaciones: </span>{t.observaciones}</p>}
          {t.conclusiones && <p className="text-sm"><span className="font-bold">Conclusiones: </span>{t.conclusiones}</p>}
          {t.estudiosAdicionales && <p className="text-sm"><span className="font-bold">Estudios adicionales: </span>{t.estudiosAdicionales}</p>}
          {t.estado === "EMITIDO" && (
            <Button variant="outline" className="rounded-xl" onClick={verInforme}>
              Ver informe técnico (PDF) <ExternalLink aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{error}</p>}

      <div className="rounded-2xl border border-border bg-superficie p-5">
        <h3 className="mb-3 font-bold text-foreground">Procedimiento de la inspección (6 pasos)</h3>
        <PasosInspeccion estado={t.estado} />
        <p className="mt-4 text-xs font-semibold text-tinta-2">{t.limite}</p>
      </div>

      {puedeEmitirInforme(usuario?.rol, t.estado) && <FormularioInforme key={detalle.codigo} detalle={detalle} alCambiar={alCambiar} />}
      {usuario?.rol === "ESPECIALISTA" && t.estado === "NO_SOLICITADA" && (
        <p className="text-sm text-tinta-2">Aún no hay una solicitud: el informe se puede llenar cuando el comprador la pida.</p>
      )}

      {veBotonSolicitar(usuario?.rol) && (
        <ModalSolicitud detalle={detalle} abierto={modal} alCerrar={() => setModal(false)}
          alSolicitar={(d) => {
            setModal(false);
            alCambiar(d);
            const s = d.evaluacionTecnica;
            setAviso(`Solicitud registrada${s.solicitanteCodigo ? ` a nombre de ${s.solicitanteCodigo}` : ""}${s.fechaSolicitud ? ` el ${fecha(s.fechaSolicitud)}` : ""}.`);
          }} />
      )}
    </section>
  );
}
