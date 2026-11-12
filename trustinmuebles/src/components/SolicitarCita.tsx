import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/base/Modal";
import { Campo, claseAreaTexto, claseCampo } from "@/components/base/Campo";
import { api, ApiError, post } from "@/lib/api";
import {
  FORMAS_PAGO, FRANJAS, MAX_MENSAJE, MODALIDADES, cuerpoInteres, enlaceWhatsapp, formularioVacio, hoyLima, sumarDias,
  validarFormulario, type ConfigContacto, type DestinoInteres, type FormularioInteres, type Recibido,
} from "@/lib/interes";

/** Configuración pública (WhatsApp y texto de consentimiento). Se pide una vez por página. */
function useConfigContacto() {
  const [config, setConfig] = useState<ConfigContacto | null>(null);
  useEffect(() => {
    let vivo = true;
    api<ConfigContacto>("/publico/contacto").then((c) => { if (vivo) setConfig(c); }).catch(() => undefined);
    return () => { vivo = false; };
  }, []);
  return config;
}

/**
 * v1.0 (etapa 4): «Solicitar cita» desde la ficha de un inmueble, la de un lote o el plano. El visitante elige visita al
 * lote, reunión en oficina o llamada, propone hasta dos fechas con franja y deja un nombre de pila y un celular o un
 * correo, con su consentimiento. No exige cuenta ni pide DNI. Si la inmobiliaria configuró WhatsApp, ofrece también
 * escribir por ahí con el mensaje ya armado.
 */
export function SolicitarCita({ destino, compacto = false }: { destino: DestinoInteres; compacto?: boolean }) {
  const config = useConfigContacto();
  const [abierto, setAbierto] = useState(false);
  const [enviado, setEnviado] = useState<Recibido | null>(null);
  const whatsapp = enlaceWhatsapp(config?.whatsapp, destino.nombre, destino.referencia);

  return (
    <div className="space-y-3" data-solicitar-cita>
      {enviado ? (
        <p role="status" className="flex items-start gap-2 rounded-2xl border border-sem-verde/40 bg-sem-verde-suave p-4 text-sm font-semibold text-sem-verde-tinta">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {enviado.mensaje}
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button size={compacto ? "default" : "lg"} onClick={() => setAbierto(true)}>
            <CalendarCheck aria-hidden="true" /> Solicitar cita
          </Button>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground hover:border-primary/40">
              <MessageCircle className="size-4 text-primary" aria-hidden="true" /> Escribir por WhatsApp
            </a>
          )}
        </div>
      )}
      {abierto && (
        <FormularioCita destino={destino} config={config} alCerrar={() => setAbierto(false)}
          alEnviar={(r) => { setEnviado(r); setAbierto(false); }} />
      )}
    </div>
  );
}

function FormularioCita({ destino, config, alCerrar, alEnviar }: {
  destino: DestinoInteres; config: ConfigContacto | null; alCerrar: () => void; alEnviar: (r: Recibido) => void;
}) {
  const [f, setF] = useState<FormularioInteres>(() => formularioVacio(true));
  const [errores, setErrores] = useState<ReturnType<typeof validarFormulario>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hoy = hoyLima();
  const cambiar = <K extends keyof FormularioInteres>(k: K, v: FormularioInteres[K]) => setF((x) => ({ ...x, [k]: v }));

  const enviar = async () => {
    const e = validarFormulario(f, hoy);
    setErrores(e);
    setError(null);
    if (Object.keys(e).length > 0) return;
    if (!config) { setError("No se pudo cargar el texto de consentimiento. Recarga la página."); return; }
    setEnviando(true);
    try {
      alEnviar(await post<Recibido>("/publico/interes", cuerpoInteres(destino, f, config.consentimientoVersion)));
    } catch (ex) {
      const status = ex instanceof ApiError ? ex.status : 0;
      setError(status === 429 ? "Hiciste muchos envíos seguidos. Intenta de nuevo dentro de una hora."
        : status === 404 ? "Este inmueble ya no se ofrece en línea."
        : ex instanceof Error ? ex.message : "No se pudo enviar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const minimo = sumarDias(hoy, 1);
  const maximo = sumarDias(hoy, 90);

  return (
    <Modal abierto alCerrar={alCerrar} ancho="lg" titulo="Solicitar cita"
      descripcion={`${destino.nombre} · ref. ${destino.referencia}`}
      pie={
        <>
          <Button variant="outline" onClick={alCerrar} disabled={enviando}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando}>{enviando ? "Enviando…" : f.quiereCita ? "Enviar solicitud" : "Enviar consulta"}</Button>
        </>
      }>
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void enviar(); }} noValidate>
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-bold text-foreground">¿Qué prefieres?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {MODALIDADES.map((m) => (
              <label key={m.valor} className="flex cursor-pointer flex-col gap-1 rounded-2xl border border-border bg-superficie p-4 has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20">
                <span className="flex items-center gap-2 font-bold text-foreground">
                  <input type="radio" name="modalidad" value={m.valor} className="accent-primary"
                    checked={f.quiereCita && f.modalidad === m.valor}
                    onChange={() => setF((x) => ({ ...x, quiereCita: true, modalidad: m.valor }))} />
                  {m.etiqueta}
                </span>
                <span className="text-xs text-tinta-2">{m.ayuda}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-tinta-2">
            <input type="radio" name="modalidad" className="accent-primary" checked={!f.quiereCita}
              onChange={() => cambiar("quiereCita", false)} />
            Solo quiero que me escriban, sin cita por ahora
          </label>
        </fieldset>

        {f.quiereCita && (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-bold text-foreground">Propón hasta dos fechas</legend>
            <Campo etiqueta="Primera fecha" error={errores.fecha1}>
              {(p) => <input {...p} type="date" min={minimo} max={maximo} value={f.fecha1} className={claseCampo}
                onChange={(e) => cambiar("fecha1", e.target.value)} />}
            </Campo>
            <Campo etiqueta="Franja">
              {(p) => <select {...p} value={f.franja1} className={claseCampo}
                onChange={(e) => cambiar("franja1", e.target.value as FormularioInteres["franja1"])}>
                {FRANJAS.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
              </select>}
            </Campo>
            <Campo etiqueta="Segunda fecha (opcional)" error={errores.fecha2}>
              {(p) => <input {...p} type="date" min={minimo} max={maximo} value={f.fecha2} className={claseCampo}
                onChange={(e) => cambiar("fecha2", e.target.value)} />}
            </Campo>
            <Campo etiqueta="Franja">
              {(p) => <select {...p} value={f.franja2} className={claseCampo} disabled={!f.fecha2}
                onChange={(e) => cambiar("franja2", e.target.value as FormularioInteres["franja2"])}>
                {FRANJAS.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
              </select>}
            </Campo>
          </fieldset>
        )}

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-bold text-foreground">Tus datos</legend>
          <Campo etiqueta="Nombre" ayuda="Solo tu nombre de pila." error={errores.nombre} className="sm:col-span-2">
            {(p) => <input {...p} autoComplete="given-name" maxLength={40} value={f.nombre} className={claseCampo}
              onChange={(e) => cambiar("nombre", e.target.value)} />}
          </Campo>
          <div className="sm:col-span-2 flex flex-wrap gap-4 text-sm font-semibold text-foreground" role="radiogroup" aria-label="Cómo te contactamos">
            {(["CELULAR", "CORREO"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2">
                <input type="radio" name="medio" className="accent-primary" checked={f.medio === m}
                  onChange={() => setF((x) => ({ ...x, medio: m, contacto: "" }))} />
                {m === "CELULAR" ? "Celular" : "Correo"}
              </label>
            ))}
          </div>
          <Campo etiqueta={f.medio === "CELULAR" ? "Celular" : "Correo"} error={errores.contacto} className="sm:col-span-2">
            {(p) => <input {...p} type={f.medio === "CELULAR" ? "tel" : "email"}
              autoComplete={f.medio === "CELULAR" ? "tel-national" : "email"} inputMode={f.medio === "CELULAR" ? "tel" : "email"}
              maxLength={120} value={f.contacto} className={claseCampo} onChange={(e) => cambiar("contacto", e.target.value)} />}
          </Campo>
          <Campo etiqueta="Forma de pago">
            {(p) => <select {...p} value={f.formaPago} className={claseCampo}
              onChange={(e) => cambiar("formaPago", e.target.value as FormularioInteres["formaPago"])}>
              {FORMAS_PAGO.map((x) => <option key={x.valor} value={x.valor}>{x.etiqueta}</option>)}
            </select>}
          </Campo>
          <Campo etiqueta="Presupuesto máximo (S/, opcional)" error={errores.presupuestoMax}>
            {(p) => <input {...p} inputMode="numeric" value={f.presupuestoMax} className={claseCampo}
              onChange={(e) => cambiar("presupuestoMax", e.target.value)} />}
          </Campo>
          <Campo etiqueta="Mensaje (opcional)" error={errores.mensaje} className="sm:col-span-2"
            ayuda={`${f.mensaje.length}/${MAX_MENSAJE}. No escribas tu DNI ni datos de documentos.`}>
            {(p) => <textarea {...p} maxLength={MAX_MENSAJE} value={f.mensaje} className={claseAreaTexto}
              onChange={(e) => cambiar("mensaje", e.target.value)} />}
          </Campo>
        </fieldset>

        {/* Campo trampa: fuera de la vista y del orden de tabulación. Una persona no lo ve ni lo llena. */}
        <div aria-hidden="true" className="sr-only">
          <label>Sitio web<input tabIndex={-1} autoComplete="off" value={f.sitioWeb}
            onChange={(e) => cambiar("sitioWeb", e.target.value)} /></label>
        </div>

        <div>
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input type="checkbox" className="mt-1 size-4 accent-primary" checked={f.consentimiento}
              aria-invalid={errores.consentimiento ? true : undefined}
              onChange={(e) => cambiar("consentimiento", e.target.checked)} />
            <span>{config?.consentimientoTexto ?? "Cargando el texto de consentimiento…"}</span>
          </label>
          {errores.consentimiento && <p className="mt-1.5 text-xs font-semibold text-sem-rojo-tinta">{errores.consentimiento}</p>}
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-sem-rojo-tinta">{error}</p>}
        <p className="text-xs text-tinta-2">Sin pagos en línea. La cita queda por confirmar hasta que un asesor te escriba.</p>
      </form>
    </Modal>
  );
}
