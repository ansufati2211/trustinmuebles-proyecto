import { useState } from "react";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/base/Modal";
import { ApiError, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cuerpoContacto, etiquetaMotivo, mensajeErrorContacto, MOTIVOS_CONTACTO } from "@/lib/contacto";
import { puedeSolicitarContacto } from "@/lib/permisos";
import { fecha } from "@/lib/semaforo";
import type { Contacto, EstadoPublicacion, MotivoContacto } from "@/lib/types";

export function SolicitudContacto({ codigo, denominacion, estadoPublicacion }: {
  codigo: string; denominacion: string; estadoPublicacion: EstadoPublicacion | undefined;
}) {
  const { usuario } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoContacto>(MOTIVOS_CONTACTO[0].valor);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrada, setRegistrada] = useState<Contacto | null>(null);
  const [duplicada, setDuplicada] = useState(false);

  if (!puedeSolicitarContacto(usuario?.rol, estadoPublicacion)) return null;

  const enviar = async () => {
    setError(null);
    setEnviando(true);
    try {
      setRegistrada(await post<Contacto>(`/casos/${codigo}/contactos`, cuerpoContacto(motivo)));
      setDuplicada(false);
      setAbierto(false);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 409) {
        setDuplicada(true);
        setAbierto(false);
      } else {
        setError(mensajeErrorContacto(status, e instanceof Error ? e.message : undefined));
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section
      aria-labelledby="titulo-contacto"
      className="relative isolate overflow-hidden rounded-[2rem] bg-foreground p-6 text-white shadow-[0_30px_70px_-24px_rgba(2,44,34,0.45)] sm:p-8"
    >
      <div className="animate-glow pointer-events-none absolute -right-16 -top-16 -z-10 size-72 rounded-full bg-primary/40 blur-[90px]" aria-hidden="true" />
      <div
        className="absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:22px_22px]"
        aria-hidden="true"
      />

      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/30 text-emerald-300">
            <MessageSquare className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 id="titulo-contacto" className="text-xl font-extrabold tracking-tight">Contacto con la inmobiliaria</h2>
            {registrada ? (
              <p role="status" className="mt-2 inline-flex items-start gap-2 text-sm font-semibold text-emerald-200">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Solicitud registrada el {fecha(registrada.creadaEn)} · {etiquetaMotivo(registrada.motivo)} · Estado: pendiente.
              </p>
            ) : duplicada ? (
              <p role="status" className="mt-2 text-sm font-semibold text-gray-200">{mensajeErrorContacto(409)}</p>
            ) : (
              <p className="mt-1 max-w-md text-sm leading-relaxed text-gray-300">
                Elige un motivo y un asesor de la inmobiliaria se pondrá en contacto contigo.
              </p>
            )}
          </div>
        </div>
        {!registrada && !duplicada && (
          <Button size="lg" onClick={() => setAbierto(true)}>
            <MessageSquare aria-hidden="true" /> Solicitar contacto
          </Button>
        )}
      </div>

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo="Solicitar contacto"
        descripcion={`Para ${denominacion} (partida ${codigo}).`}
        pie={
          <>
            <Button variant="outline" onClick={() => setAbierto(false)} disabled={enviando}>Cancelar</Button>
            <Button onClick={enviar} disabled={enviando}>{enviando ? "Enviando…" : "Enviar solicitud"}</Button>
          </>
        }
      >
        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-bold text-foreground">Motivo</legend>
          {MOTIVOS_CONTACTO.map((m) => (
            <label
              key={m.valor}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-superficie p-4 transition-all duration-300 ease-expo hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:checked]:shadow-md has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20"
            >
              <input
                type="radio"
                name="motivo-contacto"
                value={m.valor}
                checked={motivo === m.valor}
                onChange={() => setMotivo(m.valor)}
                className="peer sr-only"
              />
              <span
                className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-border transition-colors peer-checked:border-primary peer-checked:bg-primary"
                aria-hidden="true"
              >
                <span className="size-1.5 rounded-full bg-white" />
              </span>
              <span className="font-bold text-foreground">{m.etiqueta}</span>
            </label>
          ))}
        </fieldset>
        <p className="mt-4 text-xs text-tinta-2">
          La solicitud queda asociada a tu código de cuenta. No se piden nombres, DNI ni teléfonos.
        </p>
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-sem-rojo-tinta">{error}</p>}
      </Modal>
    </section>
  );
}