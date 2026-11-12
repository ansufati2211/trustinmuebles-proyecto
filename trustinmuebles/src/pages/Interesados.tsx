import { BandejaContactos } from "@/pages/Cartera";

/**
 * v1.0: «Interesados» del menú del asesor (y del gestor). Por ahora reúne las solicitudes de contacto pendientes de los
 * compradores, con la acción de marcarlas como atendidas; es la misma bandeja que aparece en Cartera.
 */
export default function Interesados() {
  return (
    <div className="flex w-full flex-1 flex-col bg-superficie pb-24">
      <section className="relative isolate overflow-hidden bg-foreground">
        <div className="animate-glow pointer-events-none absolute -left-20 -top-24 -z-10 h-[340px] w-[480px] rounded-full bg-primary/30 blur-[100px]" aria-hidden="true" />
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-32 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Interesados</h1>
          <p className="mt-3 max-w-2xl text-gray-300">
            Compradores que pidieron que un asesor los contacte sobre un inmueble publicado.
          </p>
        </div>
      </section>
      <div className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-6 lg:px-8">
        <BandejaContactos alCambiar={() => undefined} />
      </div>
    </div>
  );
}
