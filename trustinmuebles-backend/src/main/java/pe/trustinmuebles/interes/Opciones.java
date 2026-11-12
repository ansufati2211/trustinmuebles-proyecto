package pe.trustinmuebles.interes;

/**
 * v1.0 (etapa 4): listas cerradas del módulo de interés. Cada valor lleva su etiqueta en español para la interfaz.
 */
final class Opciones {
    private Opciones() {}

    /** A qué se refiere el interés: un caso publicado, un lote de proyecto, un proyecto o una búsqueda general. */
    enum OrigenInteres { CASO, LOTE, PROYECTO, GENERAL }

    /** Forma de pago que el interesado tiene pensada. No hay pagos en línea. */
    enum FormaPago {
        CONTADO("Al contado"), FINANCIADO("Financiado"), POR_DEFINIR("Por definir");

        final String etiqueta;

        FormaPago(String etiqueta) {
            this.etiqueta = etiqueta;
        }
    }

    /** Un solo medio de contacto por interesado. Nunca se pide DNI. */
    enum MedioContacto {
        CELULAR("Celular"), CORREO("Correo");

        final String etiqueta;

        MedioContacto(String etiqueta) {
            this.etiqueta = etiqueta;
        }
    }

    /** Qué tipo de cita o consulta pide el visitante. */
    enum ModalidadCita {
        VISITA_AL_LOTE("Visita al lote"), REUNION_EN_OFICINA("Reunión en oficina"), LLAMADA("Llamada");

        final String etiqueta;

        ModalidadCita(String etiqueta) {
            this.etiqueta = etiqueta;
        }
    }

    /** Franja horaria de una fecha propuesta o acordada. */
    enum Franja {
        MANANA("Mañana"), TARDE("Tarde");

        final String etiqueta;

        Franja(String etiqueta) {
            this.etiqueta = etiqueta;
        }
    }

    /**
     * La cita nace SOLICITADA con una o dos fechas propuestas; el asesor confirma una (CONFIRMADA), acuerda otra
     * (REPROGRAMADA) o la rechaza con motivo (RECHAZADA).
     */
    enum EstadoCita {
        SOLICITADA("Por confirmar"), CONFIRMADA("Confirmada"), REPROGRAMADA("Reprogramada"), RECHAZADA("Rechazada");

        final String etiqueta;

        EstadoCita(String etiqueta) {
            this.etiqueta = etiqueta;
        }

        boolean agendada() {
            return this == CONFIRMADA || this == REPROGRAMADA;
        }
    }
}
