import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/base/Modal";
import { ApiError, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cuerpoContacto, etiquetaMotivo, mensajeErrorContacto, MOTIVOS_CONTACTO } from "@/lib/contacto";
import { puedeSolicitarContacto } from "@/lib/permisos";
import { fecha } from "@/lib/semaforo";
import type { Contacto, EstadoPublicacion, MotivoContacto } from "@/lib/types";

/**
 * «Solicitar contacto» del comprador sobre un caso publicado (v0.7). Solo un motivo de la lista cerrada: sin texto libre
 * ni datos personales (I11). El comprador sale de la sesión. Un 409 dice que ya hay una pendiente y no agrega nada.
 */
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
    setError(null); setEnviando(true);
    try {
      setRegistrada(await post<Contacto>(`/casos/${codigo}/contactos`, cuerpoContacto(motivo)));
      setDuplicada(false);
      setAbierto(false);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 409) { setDuplicada(true); setAbierto(false); }
      else setError(mensajeErrorContacto(status, e instanceof Error ? e.message : undefined));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section aria-labelledby="titulo-contacto" className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-tarjeta sm:p-8">
      <h2 id="titulo-contacto" className="flex items-center gap-2 text-xl font-bold text-foreground">
        <MessageSquare className="size-5 text-primary" aria-hidden="true" /> Contacto con la inmobiliaria
      </h2>
      {registrada ? (
        <p role="status" className="rounded-2xl border border-sem-verde/40 bg-sem-verde-suave p-4 text-sm font-semibold text-sem-verde-tinta">
          Solicitud registrada el {fecha(registrada.creadaEn)} · {etiquetaMotivo(registrada.motivo)} · Estado: pendiente.
        </p>
      ) : duplicada ? (
        <p role="status" className="rounded-2xl border border-info-tinta/20 bg-info-suave p-4 text-sm font-semibold text-info-tinta">
          {mensajeErrorContacto(409)}
        </p>
      ) : (
        <>
          <p className="text-sm text-tinta-2">Elige un motivo y un asesor de la inmobiliaria se pondrá en contacto contigo.</p>
          <Button className="rounded-xl" onClick={() => setAbierto(true)}>
            <MessageSquare aria-hidden="true" /> Solicitar contacto
          </Button>
        </>
      )}

      <Modal abierto={abierto} alCerrar={() => setAbierto(false)} titulo="Solicitar contacto"
        descripcion={`Para ${denominacion} (partida ${codigo}).`}
        pie={<>
          <Button variant="outline" className="rounded-xl" onClick={() => setAbierto(false)} disabled={enviando}>Cancelar</Button>
          <Button className="rounded-xl" onClick={enviar} disabled={enviando}>{enviando ? "Enviando…" : "Enviar solicitud"}</Button>
        </>}>
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-bold text-foreground">Motivo</legend>
          {MOTIVOS_CONTACTO.map((m) => (
            <label key={m.valor} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-superficie p-4 has-[:checked]:border-primary has-[:checked]:bg-secondary">
              <input type="radio" name="motivo-contacto" value={m.valor} checked={motivo === m.valor}
                onChange={() => setMotivo(m.valor)} className="size-4 accent-primary" />
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
