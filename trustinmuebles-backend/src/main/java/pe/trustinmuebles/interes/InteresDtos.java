package pe.trustinmuebles.interes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import pe.trustinmuebles.interes.Opciones.CanalInteres;
import pe.trustinmuebles.interes.Opciones.EstadoCita;
import pe.trustinmuebles.interes.Opciones.FormaConsentimiento;
import pe.trustinmuebles.interes.Opciones.FormaPago;
import pe.trustinmuebles.interes.Opciones.Franja;
import pe.trustinmuebles.interes.Opciones.MedioContacto;
import pe.trustinmuebles.interes.Opciones.ModalidadCita;
import tools.jackson.databind.JsonNode;

/**
 * v1.0 (etapa 4): peticiones y respuestas del módulo de interés. Las peticiones públicas se validan a mano campo por
 * campo: un campo desconocido (por ejemplo, «dni») da 400 en lugar de ignorarse, porque la configuración global de
 * Jackson ignora los campos desconocidos.
 */
final class InteresDtos {
    private InteresDtos() {}

    /** Versión vigente del texto de consentimiento. Cambiar el texto obliga a cambiar la versión. */
    static final String CONSENTIMIENTO_VERSION = "2026-11-v1";
    static final String CONSENTIMIENTO_TEXTO = "Acepto que la inmobiliaria use mi nombre y el dato de contacto que dejo "
            + "solo para responder esta consulta y coordinar la cita, y que los conserve mientras dure el seguimiento. "
            + "Puedo pedir en cualquier momento que se eliminen.";

    static final int MAX_MENSAJE = 300;
    static final int MAX_NOTA = 1000;
    static final int MAX_MOTIVO = 300;
    /** Hasta cuántos días adelante se puede proponer o acordar una fecha. */
    static final int DIAS_MAXIMOS = 90;

    private static final Pattern NOMBRE = Pattern.compile("^\\p{L}[\\p{L}' -]{1,39}$");
    private static final Pattern CORREO = Pattern.compile("^[^\\s@]{1,64}@[^\\s@]+\\.[^\\s@]{2,}$");
    private static final Pattern CELULAR = Pattern.compile("^9\\d{8}$");
    /** Ocho dígitos seguidos: la forma de un DNI. No se aceptan en el mensaje. */
    private static final Pattern OCHO_DIGITOS = Pattern.compile("(?<!\\d)\\d{8}(?!\\d)");

    // ------------------------------------------------------------------ petición pública

    record OpcionFecha(LocalDate fecha, Franja franja) {}

    record SolicitudCita(ModalidadCita modalidad, List<OpcionFecha> opciones) {}

    /**
     * Interés y, opcionalmente, cita. {@code sitioWeb} es el campo trampa: invisible para una persona, lo llenan los
     * robots. Si viene con algo, la petición se responde igual pero no se guarda.
     */
    record SolicitudInteres(String casoCodigo, String proyectoCodigo, String lote, String zona, String tipo,
            BigDecimal presupuestoMin, BigDecimal presupuestoMax, String moneda, BigDecimal areaDeseada,
            FormaPago formaPago, String mensaje, String nombre, MedioContacto medio, String contacto,
            String consentimientoVersion, boolean trampa, SolicitudCita cita) {

        static final Set<String> CAMPOS = Set.of("casoCodigo", "proyectoCodigo", "lote", "zona", "tipo",
                "presupuestoMin", "presupuestoMax", "moneda", "areaDeseada", "formaPago", "mensaje", "nombre", "medio",
                "contacto", "consentimiento", "consentimientoVersion", "sitioWeb", "cita");

        static SolicitudInteres de(JsonNode c, LocalDate hoy) {
            if (c == null || !c.isObject()) throw new IllegalArgumentException("El cuerpo debe ser un objeto JSON");
            for (String campo : c.propertyNames()) {
                if (!CAMPOS.contains(campo)) {
                    throw new IllegalArgumentException("«" + campo + "» no está permitido. No se piden documentos de "
                            + "identidad: solo un nombre de pila y un celular o un correo.");
                }
            }
            boolean trampa = !texto(c, "sitioWeb", 500).isEmpty();
            JsonNode cons = c.get("consentimiento");
            if (cons == null || !cons.isBoolean() || !cons.asBoolean()) {
                throw new IllegalArgumentException("consentimiento: debes aceptar el uso de tus datos para que te "
                        + "contactemos");
            }
            String version = texto(c, "consentimientoVersion", 20);
            if (!CONSENTIMIENTO_VERSION.equals(version)) {
                throw new IllegalArgumentException("consentimientoVersion: el texto de consentimiento cambió; recarga la "
                        + "página y vuelve a aceptarlo (versión vigente " + CONSENTIMIENTO_VERSION + ")");
            }
            String nombre = nombre(texto(c, "nombre", 60));
            MedioContacto medio = enumerado(c, "medio", MedioContacto.class, null);
            if (medio == null) throw new IllegalArgumentException("medio: indica CELULAR o CORREO");
            String contacto = contacto(medio, texto(c, "contacto", 120));
            String mensaje = texto(c, "mensaje", Integer.MAX_VALUE);
            if (mensaje.length() > MAX_MENSAJE) {
                throw new IllegalArgumentException("mensaje: máximo " + MAX_MENSAJE + " caracteres");
            }
            if (OCHO_DIGITOS.matcher(mensaje).find()) {
                throw new IllegalArgumentException("mensaje: no escribas tu DNI ni otros números de documento");
            }
            String tipo = texto(c, "tipo", 10).toUpperCase(Locale.ROOT);
            if (!tipo.isEmpty() && !tipo.equals("LOTE") && !tipo.equals("VIVIENDA")) {
                throw new IllegalArgumentException("tipo: valor no válido. Usa LOTE o VIVIENDA");
            }
            BigDecimal min = numero(c, "presupuestoMin");
            BigDecimal max = numero(c, "presupuestoMax");
            if (min != null && max != null && min.compareTo(max) > 0) {
                throw new IllegalArgumentException("presupuestoMin: no puede ser mayor que presupuestoMax");
            }
            String moneda = texto(c, "moneda", 3).toUpperCase(Locale.ROOT);
            if (!moneda.isEmpty() && !moneda.equals("PEN") && !moneda.equals("USD")) {
                throw new IllegalArgumentException("moneda: valor no válido. Usa PEN o USD");
            }
            if ((min != null || max != null) && moneda.isEmpty()) moneda = "PEN";
            BigDecimal area = numero(c, "areaDeseada");
            if (area != null && area.signum() == 0) throw new IllegalArgumentException("areaDeseada: debe ser mayor que 0");
            FormaPago pago = enumerado(c, "formaPago", FormaPago.class, FormaPago.POR_DEFINIR);
            SolicitudCita cita = cita(c.get("cita"), hoy);
            return new SolicitudInteres(vacio(texto(c, "casoCodigo", 40)), vacio(texto(c, "proyectoCodigo", 80)),
                    vacio(texto(c, "lote", 12)), vacio(texto(c, "zona", 80)), vacio(tipo), min, max, vacio(moneda),
                    area, pago, vacio(mensaje), nombre, medio, contacto, version, trampa, cita);
        }

        private static SolicitudCita cita(JsonNode n, LocalDate hoy) {
            if (n == null || n.isNull()) return null;
            if (!n.isObject()) throw new IllegalArgumentException("cita: debe ser {\"modalidad\": …, \"opciones\": […]}");
            for (String campo : n.propertyNames()) {
                if (!campo.equals("modalidad") && !campo.equals("opciones")) {
                    throw new IllegalArgumentException("cita." + campo + " no está permitido");
                }
            }
            ModalidadCita modalidad = enumerado(n, "modalidad", ModalidadCita.class, null);
            if (modalidad == null) {
                throw new IllegalArgumentException("cita.modalidad: indica uno de " + valores(ModalidadCita.class));
            }
            JsonNode ops = n.get("opciones");
            if (ops == null || !ops.isArray() || ops.isEmpty() || ops.size() > 2) {
                throw new IllegalArgumentException("cita.opciones: propone una o dos fechas");
            }
            List<OpcionFecha> opciones = new ArrayList<>();
            for (JsonNode o : ops) {
                if (!o.isObject()) throw new IllegalArgumentException("cita.opciones: cada opción lleva fecha y franja");
                OpcionFecha op = new OpcionFecha(fecha(o, "fecha", hoy.plusDays(1), hoy),
                        enumerado(o, "franja", Franja.class, null));
                if (op.franja() == null) throw new IllegalArgumentException("cita.opciones: indica la franja MANANA o TARDE");
                if (opciones.contains(op)) throw new IllegalArgumentException("cita.opciones: las dos fechas son iguales");
                opciones.add(op);
            }
            return new SolicitudCita(modalidad, opciones);
        }

        private static String nombre(String v) {
            String n = v.replaceAll("\\s+", " ");
            if (n.isEmpty()) throw new IllegalArgumentException("nombre: escribe tu nombre de pila");
            if (!NOMBRE.matcher(n).matches()) {
                throw new IllegalArgumentException("nombre: solo tu nombre de pila, con letras (2 a 40)");
            }
            return n;
        }

        private static String contacto(MedioContacto medio, String v) {
            if (medio == MedioContacto.CORREO) {
                String correo = v.toLowerCase(Locale.ROOT);
                if (!CORREO.matcher(correo).matches()) throw new IllegalArgumentException("contacto: el correo no es válido");
                return correo;
            }
            String digitos = v.replaceAll("[\\s-]", "");
            if (digitos.startsWith("+51")) digitos = digitos.substring(3);
            else if (digitos.length() == 11 && digitos.startsWith("51")) digitos = digitos.substring(2);
            if (!CELULAR.matcher(digitos).matches()) {
                throw new IllegalArgumentException("contacto: el celular debe tener 9 dígitos y empezar con 9");
            }
            return digitos;
        }
    }

    // ------------------------------------------------------------------ peticiones del equipo

    /**
     * v1.0 (etapa 8): interesado que el asesor o el gestor registra desde el panel porque llegó por llamada, oficina,
     * WhatsApp o referido. Los mismos campos del formulario público (y sus mismas validaciones: nombre de pila, un solo
     * medio de contacto, nada de DNI), más el canal y la constancia de que el interesado aceptó de palabra. Sin campo
     * trampa ni casilla del formulario: el consentimiento verbal lo registra la cuenta que llama.
     */
    record RegistroPanel(CanalInteres canal, SolicitudInteres solicitud) {
        static final Set<String> PROPIOS = Set.of("canal", "consentimientoVerbal");
        /** Del formulario público no se aceptan la casilla, su versión ni el campo trampa: no aplican al panel. */
        static final Set<String> SOLO_FORMULARIO = Set.of("consentimiento", "consentimientoVersion", "sitioWeb");

        static RegistroPanel de(JsonNode c, LocalDate hoy) {
            if (c == null || !c.isObject()) throw new IllegalArgumentException("El cuerpo debe ser un objeto JSON");
            for (String campo : c.propertyNames()) {
                if (SOLO_FORMULARIO.contains(campo)) {
                    throw new IllegalArgumentException("«" + campo + "» no aplica al registro desde el panel: indica "
                            + "consentimientoVerbal");
                }
                if (!PROPIOS.contains(campo) && !SolicitudInteres.CAMPOS.contains(campo)) {
                    throw new IllegalArgumentException("«" + campo + "» no está permitido. No se piden documentos de "
                            + "identidad: solo un nombre de pila y un celular o un correo.");
                }
            }
            CanalInteres canal = enumerado(c, "canal", CanalInteres.class, null);
            if (canal == null || canal == CanalInteres.WEB) {
                throw new IllegalArgumentException("canal: indica LLAMADA, OFICINA, WHATSAPP o REFERIDO");
            }
            JsonNode verbal = c.get("consentimientoVerbal");
            if (verbal == null || !verbal.isBoolean() || !verbal.asBoolean()) {
                throw new IllegalArgumentException("consentimientoVerbal: confirma que el interesado aceptó de palabra "
                        + "que la inmobiliaria use su nombre y su contacto para responderle");
            }
            tools.jackson.databind.node.ObjectNode copia = ((tools.jackson.databind.node.ObjectNode) c).deepCopy();
            copia.remove("canal");
            copia.remove("consentimientoVerbal");
            copia.put("consentimiento", true);
            copia.put("consentimientoVersion", CONSENTIMIENTO_VERSION);
            return new RegistroPanel(canal, SolicitudInteres.de(copia, hoy));
        }
    }

    record CambioEtapa(EtapaInteres etapa) {
        static CambioEtapa de(JsonNode c) {
            soloCampos(c, "etapa");
            EtapaInteres e = enumerado(c, "etapa", EtapaInteres.class, null);
            if (e == null) throw new IllegalArgumentException("etapa: indica uno de " + valores(EtapaInteres.class));
            return new CambioEtapa(e);
        }
    }

    /** Responsable y próxima acción con fecha. Un campo vacío lo deja sin valor. */
    record Seguimiento(String responsable, String proximaAccion, LocalDate proximaAccionFecha) {
        static Seguimiento de(JsonNode c) {
            soloCampos(c, "responsable", "proximaAccion", "proximaAccionFecha");
            String accion = vacio(texto(c, "proximaAccion", 160));
            LocalDate fecha = null;
            String f = texto(c, "proximaAccionFecha", 10);
            if (!f.isEmpty()) {
                try {
                    fecha = LocalDate.parse(f);
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException("proximaAccionFecha: usa el formato AAAA-MM-DD");
                }
            }
            if (fecha != null && accion == null) {
                throw new IllegalArgumentException("proximaAccion: indica qué hay que hacer en esa fecha");
            }
            return new Seguimiento(vacio(texto(c, "responsable", 40)), accion, fecha);
        }
    }

    record NuevaNota(String texto) {
        static NuevaNota de(JsonNode c) {
            soloCampos(c, "texto");
            String t = InteresDtos.texto(c, "texto", Integer.MAX_VALUE);
            if (t.isEmpty()) throw new IllegalArgumentException("texto: la nota está vacía");
            if (t.length() > MAX_NOTA) throw new IllegalArgumentException("texto: máximo " + MAX_NOTA + " caracteres");
            return new NuevaNota(t);
        }
    }

    record MarcaLote(pe.trustinmuebles.expediente.EstadoComercial estado) {
        static MarcaLote de(JsonNode c) {
            soloCampos(c, "estado");
            String v = texto(c, "estado", 12).toUpperCase(Locale.ROOT);
            if (!v.equals("SEPARADO") && !v.equals("VENDIDO")) {
                throw new IllegalArgumentException("estado: indica SEPARADO o VENDIDO");
            }
            return new MarcaLote(pe.trustinmuebles.expediente.EstadoComercial.valueOf(v));
        }
    }

    record Confirmacion(int opcion) {
        static Confirmacion de(JsonNode c) {
            soloCampos(c, "opcion");
            JsonNode o = c.get("opcion");
            if (o == null || !o.isIntegralNumber() || (o.asInt() != 1 && o.asInt() != 2)) {
                throw new IllegalArgumentException("opcion: indica 1 o 2 (la fecha propuesta que se confirma)");
            }
            return new Confirmacion(o.asInt());
        }
    }

    record Reprogramacion(LocalDate fecha, Franja franja) {
        static Reprogramacion de(JsonNode c, LocalDate hoy) {
            soloCampos(c, "fecha", "franja");
            Franja f = enumerado(c, "franja", Franja.class, null);
            if (f == null) throw new IllegalArgumentException("franja: indica MANANA o TARDE");
            return new Reprogramacion(InteresDtos.fecha(c, "fecha", hoy, hoy), f);
        }
    }

    record Rechazo(String motivo) {
        static Rechazo de(JsonNode c) {
            soloCampos(c, "motivo");
            String m = texto(c, "motivo", Integer.MAX_VALUE);
            if (m.length() < 3) throw new IllegalArgumentException("motivo: explica brevemente por qué se rechaza");
            if (m.length() > MAX_MOTIVO) throw new IllegalArgumentException("motivo: máximo " + MAX_MOTIVO + " caracteres");
            return new Rechazo(m);
        }
    }

    // ------------------------------------------------------------------ respuestas

    record ConfigPublica(String whatsapp, String consentimientoVersion, String consentimientoTexto) {}

    record Recibido(boolean recibido, boolean conCita, String mensaje) {}

    record InteresDto(Long id, Instant creadoEn, String origen, String referencia, String inmueble, String casoCodigo,
            String proyectoCodigo, String loteClave, String zona, String tipo, BigDecimal presupuestoMin,
            BigDecimal presupuestoMax, String moneda, BigDecimal areaDeseada, FormaPago formaPago,
            String formaPagoEtiqueta, String nombre, MedioContacto medio, String contacto, EtapaInteres etapa,
            String etapaEtiqueta, String responsable, String proximaAccion, LocalDate proximaAccionFecha,
            boolean vencido, boolean citaPorConfirmar, long notas, CanalInteres canal, String canalEtiqueta) {}

    record NotaDto(Long id, String texto, String cuentaCodigo, Instant creadaEn) {
        static NotaDto de(NotaInteres n) {
            return new NotaDto(n.getId(), n.getTexto(), n.getCuentaCodigo(), n.getCreadaEn());
        }
    }

    record OpcionDto(int opcion, LocalDate fecha, Franja franja, String franjaEtiqueta) {}

    record CitaDto(Long id, Long interesId, String nombre, String referencia, String inmueble, ModalidadCita modalidad,
            String modalidadEtiqueta, List<OpcionDto> opciones, EstadoCita estado, String estadoEtiqueta,
            LocalDate fechaAcordada, Franja franjaAcordada, String franjaAcordadaEtiqueta, String motivoRechazo,
            String atendidaPor, Instant creadaEn) {

        static CitaDto de(Cita c, Interes i) {
            List<OpcionDto> ops = new ArrayList<>();
            ops.add(new OpcionDto(1, c.getFecha1(), c.getFranja1(), c.getFranja1().etiqueta));
            if (c.getFecha2() != null) ops.add(new OpcionDto(2, c.getFecha2(), c.getFranja2(), c.getFranja2().etiqueta));
            return new CitaDto(c.getId(), c.getInteresId(), i == null ? null : i.getNombre(),
                    i == null ? null : i.getReferencia(), i == null ? null : i.getInmueble(), c.getModalidad(),
                    c.getModalidad().etiqueta, ops, c.getEstado(), c.getEstado().etiqueta, c.getFechaAcordada(),
                    c.getFranjaAcordada(), c.getFranjaAcordada() == null ? null : c.getFranjaAcordada().etiqueta,
                    c.getMotivoRechazo(), c.getAtendidaPor(), c.getCreadaEn());
        }
    }

    record InteresDetalle(InteresDto interes, String mensaje, String consentimientoVersion, Instant consentimientoEn,
            List<NotaDto> notas, List<CitaDto> citas, boolean puedeMarcarLote, FormaConsentimiento consentimientoForma,
            String consentimientoFormaEtiqueta, String consentimientoRegistradoPor) {}

    /** Una cita en un día de la agenda. Si está por confirmar, {@code opcion} dice cuál de las propuestas cae ese día. */
    record CitaEnAgenda(CitaDto cita, boolean porConfirmar, Integer opcion, Franja franja, String franjaEtiqueta) {}

    record DiaAgenda(LocalDate fecha, List<CitaEnAgenda> citas) {}

    record Agenda(LocalDate desde, LocalDate hasta, List<DiaAgenda> dias) {}

    record Conteo(String clave, String etiqueta, long interesados) {}

    /** Demanda de los interesados activos (sin los descartados). Informativa; no califica inmuebles. */
    record ResumenDemanda(long activos, Map<EtapaInteres, Long> porEtapa, List<Conteo> porZona, List<Conteo> porTipo,
            List<Conteo> porPresupuesto, List<Conteo> porProyecto) {}

    record OpcionesBandeja(List<pe.trustinmuebles.expediente.InmueblesInteres.ProyectoOpcion> proyectos,
            List<String> responsables) {}

    // ------------------------------------------------------------------ utilidades de lectura

    static void soloCampos(JsonNode c, String... permitidos) {
        if (c == null || !c.isObject()) throw new IllegalArgumentException("El cuerpo debe ser un objeto JSON");
        List<String> lista = Arrays.asList(permitidos);
        for (String campo : c.propertyNames()) {
            if (!lista.contains(campo)) throw new IllegalArgumentException("«" + campo + "» no está permitido");
        }
    }

    /** Texto recortado; vacío si falta o es null. Más largo que {@code max}: 400. */
    static String texto(JsonNode c, String campo, int max) {
        JsonNode v = c.get(campo);
        if (v == null || v.isNull()) return "";
        if (!v.isString()) throw new IllegalArgumentException(campo + ": debe ser texto");
        String s = v.asString().trim();
        if (s.length() > max) throw new IllegalArgumentException(campo + ": máximo " + max + " caracteres");
        return s;
    }

    static String vacio(String s) {
        return s == null || s.isEmpty() ? null : s;
    }

    static BigDecimal numero(JsonNode c, String campo) {
        JsonNode v = c.get(campo);
        if (v == null || v.isNull() || (v.isString() && v.asString().isBlank())) return null;
        BigDecimal n;
        try {
            n = v.isNumber() ? v.decimalValue() : new BigDecimal(v.asString().trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(campo + ": debe ser un número");
        }
        if (n.signum() < 0) throw new IllegalArgumentException(campo + ": no puede ser negativo");
        if (n.compareTo(new BigDecimal("999999999999")) > 0) throw new IllegalArgumentException(campo + ": es demasiado grande");
        return n.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    static <E extends Enum<E>> E enumerado(JsonNode c, String campo, Class<E> tipo, E porDefecto) {
        String v = texto(c, campo, 40);
        if (v.isEmpty()) return porDefecto;
        try {
            return Enum.valueOf(tipo, v.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(campo + ": valor no válido. Usa uno de: " + valores(tipo));
        }
    }

    static <E extends Enum<E>> String valores(Class<E> tipo) {
        return Arrays.stream(tipo.getEnumConstants()).map(Enum::name).collect(Collectors.joining(", "));
    }

    /** Fecha AAAA-MM-DD entre {@code desde} y {@code hoy + DIAS_MAXIMOS}. */
    static LocalDate fecha(JsonNode c, String campo, LocalDate desde, LocalDate hoy) {
        String v = texto(c, campo, 10);
        if (v.isEmpty()) throw new IllegalArgumentException(campo + ": indica la fecha (AAAA-MM-DD)");
        LocalDate f;
        try {
            f = LocalDate.parse(v);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(campo + ": usa el formato AAAA-MM-DD");
        }
        if (f.isBefore(desde)) {
            throw new IllegalArgumentException(campo + ": la fecha debe ser desde el " + desde);
        }
        if (f.isAfter(hoy.plusDays(DIAS_MAXIMOS))) {
            throw new IllegalArgumentException(campo + ": la fecha no puede pasar de " + DIAS_MAXIMOS + " días");
        }
        return f;
    }
}
