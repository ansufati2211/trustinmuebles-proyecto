package pe.trustinmuebles.interes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.expediente.InmueblesInteres;
import pe.trustinmuebles.expediente.InmueblesInteres.Referencia;
import pe.trustinmuebles.interes.Opciones.EstadoCita;
import pe.trustinmuebles.interes.Opciones.FormaPago;
import pe.trustinmuebles.interes.Opciones.Franja;
import pe.trustinmuebles.interes.Opciones.MedioContacto;
import pe.trustinmuebles.interes.Opciones.ModalidadCita;
import pe.trustinmuebles.interes.Opciones.OrigenInteres;

/**
 * v1.0 (etapa 4): precarga de 15 interesados repartidos en todas las etapas, con notas y 4 citas en los próximos 7 días.
 * Solo nombres de pila comunes y correos @example.com: ni apellidos, ni DNI, ni celulares. Se aplica una sola vez
 * ({@code interes_semilla}); en cada arranque, las fechas de lo precargado que nadie tocó se mueven respecto del día de
 * arranque, para que las citas nunca queden en el pasado. Corre después de la precarga de proyectos (orden 45).
 */
@Component
@Order(50)
class InteresSeeder implements ApplicationRunner {
    static final String VERSION = "v1.0-e4";
    static final String VENTISCA = "altos-de-ventisca";
    static final String LUCUMO = "rinconada-del-lucumo";
    static final String SAUZAL = "terrazas-de-sauzal";

    private final InteresRepository intereses;
    private final NotaInteresRepository notas;
    private final CitaRepository citas;
    private final InmueblesInteres inmuebles;
    private final JdbcTemplate jdbc;
    private final boolean habilitado;

    InteresSeeder(InteresRepository intereses, NotaInteresRepository notas, CitaRepository citas,
            InmueblesInteres inmuebles, JdbcTemplate jdbc, @Value("${app.seed.enabled}") boolean habilitado) {
        this.intereses = intereses;
        this.notas = notas;
        this.citas = citas;
        this.inmuebles = inmuebles;
        this.jdbc = jdbc;
        this.habilitado = habilitado;
    }

    /** Un interesado de la precarga. {@code accion} y {@code desfase} son la próxima acción y su día (hoy + desfase). */
    record Fila(String nombre, String correo, EtapaInteres etapa, String proyecto, int lote, boolean caso, String zona,
            String tipo, Integer min, Integer max, Integer area, FormaPago pago, String responsable, String accion,
            Integer desfase, int diasAtras, List<String> notas) {}

    /** Una cita de la precarga, sobre el interesado de la fila indicada. */
    record FilaCita(int fila, ModalidadCita modalidad, EstadoCita estado, int desfase, Franja franja, boolean dosOpciones) {}

    static final List<Fila> FILAS = List.of(
            new Fila("María", "maria.ventas@example.com", EtapaInteres.NUEVO, VENTISCA, 0, false, null, null, 30000,
                    45000, 140, FormaPago.FINANCIADO, null, "Confirmar la cita pedida", 0, 1, List.of()),
            new Fila("José", "jose.lotes@example.com", EtapaInteres.NUEVO, null, 0, false, "Subtanjalla", "LOTE", 25000,
                    40000, 120, FormaPago.POR_DEFINIR, null, "Primer contacto por correo", -1, 3, List.of()),
            new Fila("Rosa", "rosa.consultas@example.com", EtapaInteres.NUEVO, LUCUMO, -1, false, null, null, null, null,
                    null, FormaPago.POR_DEFINIR, null, null, null, 0, List.of()),
            new Fila("Luis", "luis.terreno@example.com", EtapaInteres.CONTACTADO, LUCUMO, 0, false, null, null, 35000,
                    50000, 150, FormaPago.CONTADO, "asesor-01", "Enviar fichas de lotes parecidos", -2, 8,
                    List.of("Respondió el correo: prefiere un lote de esquina.")),
            new Fila("Carmen", "carmen.casa@example.com", EtapaInteres.CONTACTADO, null, 0, true, null, null, null,
                    120000, null, FormaPago.FINANCIADO, "gestor-01", "Llamar para resolver dudas de documentos", 3, 6,
                    List.of("Pidió saber qué documentos tiene el inmueble.")),
            new Fila("Jorge", "jorge.inversion@example.com", EtapaInteres.CONTACTADO, SAUZAL, 0, false, null, null,
                    40000, 60000, 160, FormaPago.CONTADO, "asesor-01", "Enviar el plano del proyecto", 1, 5, List.of()),
            new Fila("Ana", "ana.familia@example.com", EtapaInteres.CITA_AGENDADA, VENTISCA, 1, false, null, null, 30000,
                    40000, 130, FormaPago.FINANCIADO, "asesor-01", "Visita al lote", 1, 9,
                    List.of("Viene con su familia; llevar el plano impreso.")),
            new Fila("Miguel", "miguel.compra@example.com", EtapaInteres.CITA_AGENDADA, SAUZAL, 1, false, null, null,
                    null, 55000, null, FormaPago.POR_DEFINIR, "asesor-01", "Llamada acordada", 4, 7,
                    List.of("No podía el día que propuso; se acordó otra fecha.")),
            new Fila("Lucía", "lucia.hogar@example.com", EtapaInteres.CITA_AGENDADA, LUCUMO, 1, false, null, null,
                    45000, 60000, 160, FormaPago.FINANCIADO, "gestor-01", "Visita al lote", 6, 10, List.of()),
            new Fila("Pedro", "pedro.decision@example.com", EtapaInteres.VISITA_REALIZADA, VENTISCA, 2, false, null,
                    null, 35000, 45000, 140, FormaPago.CONTADO, "asesor-01", "Llamar para conocer su decisión", -3, 15,
                    List.of("Visitó el lote; le gustó la ubicación.", "Comparará con otro proyecto antes de decidir.")),
            new Fila("Elena", "elena.proyecto@example.com", EtapaInteres.VISITA_REALIZADA, SAUZAL, 2, false, null, null,
                    50000, 70000, 180, FormaPago.FINANCIADO, "gestor-01", "Enviar simulación de cuotas", 2, 12,
                    List.of("Pregunta por el financiamiento directo.")),
            new Fila("Juan", "juan.separacion@example.com", EtapaInteres.SEPARACION, VENTISCA, 3, false, null, null,
                    35000, 45000, 140, FormaPago.FINANCIADO, "asesor-01", "Revisar documentos para la minuta", 5, 20,
                    List.of("Decidió separar el lote.", "Falta marcar el lote como separado en el plano.")),
            new Fila("Patricia", "patricia.lote@example.com", EtapaInteres.SEPARACION, LUCUMO, 2, false, null, null,
                    null, 50000, null, FormaPago.CONTADO, "asesor-01", "Coordinar la firma", 3, 18, List.of()),
            new Fila("Diego", "diego.cierre@example.com", EtapaInteres.VENTA, SAUZAL, 3, false, null, null, 45000,
                    60000, 170, FormaPago.CONTADO, "gestor-01", null, null, 25,
                    List.of("Venta cerrada en oficina.")),
            new Fila("Sofía", "sofia.busqueda@example.com", EtapaInteres.DESCARTADO, null, 0, false, "Ica", "VIVIENDA",
                    null, 150000, null, FormaPago.FINANCIADO, "asesor-01", null, null, 30,
                    List.of("Busca una vivienda terminada; por ahora no le interesan lotes.")));

    /** María pide una cita por confirmar; Ana, Miguel y Lucía tienen la suya agendada. Todas en los próximos 7 días. */
    static final List<FilaCita> CITAS = List.of(
            new FilaCita(0, ModalidadCita.VISITA_AL_LOTE, EstadoCita.SOLICITADA, 2, Franja.MANANA, true),
            new FilaCita(6, ModalidadCita.VISITA_AL_LOTE, EstadoCita.CONFIRMADA, 1, Franja.MANANA, false),
            new FilaCita(7, ModalidadCita.LLAMADA, EstadoCita.REPROGRAMADA, 4, Franja.TARDE, false),
            new FilaCita(8, ModalidadCita.REUNION_EN_OFICINA, EstadoCita.CONFIRMADA, 6, Franja.TARDE, true));

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!habilitado) return;
        Integer aplicada = jdbc.queryForObject("select count(*) from interes_semilla where version = ?", Integer.class,
                VERSION);
        if (aplicada == null || aplicada == 0) {
            sembrar();
            jdbc.update("insert into interes_semilla (version, aplicada_en) values (?, ?)", VERSION,
                    java.sql.Timestamp.from(Instant.now()));
        }
        realinear(InteresService.hoy());
    }

    private void sembrar() {
        Instant ahora = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        List<Referencia> casos = inmuebles.casosPublicados();
        Interes[] creados = new Interes[FILAS.size()];
        for (int n = 0; n < FILAS.size(); n++) {
            Fila f = FILAS.get(n);
            Referencia ref = referencia(f, casos);
            Instant creado = ahora.minus(f.diasAtras(), ChronoUnit.DAYS);
            Interes i = new Interes();
            i.setCreadoEn(creado);
            i.setActualizadoEn(creado);
            i.setOrigen(ref == null ? OrigenInteres.GENERAL : OrigenInteres.valueOf(ref.clase().name()));
            if (ref != null) {
                i.setCasoCodigo(ref.casoCodigo());
                i.setProyectoCodigo(ref.proyectoCodigo());
                i.setLoteClave(ref.loteClave());
                i.setReferencia(ref.referencia());
                i.setInmueble(ref.nombre().length() > 250 ? ref.nombre().substring(0, 250) : ref.nombre());
            }
            i.setZona(f.zona() != null ? f.zona() : ref == null ? null : ref.distrito());
            i.setTipo(f.tipo() != null ? f.tipo() : ref == null ? null : ref.tipo());
            i.setPresupuestoMin(f.min() == null ? null : BigDecimal.valueOf(f.min()));
            i.setPresupuestoMax(f.max() == null ? null : BigDecimal.valueOf(f.max()));
            i.setMoneda(f.min() == null && f.max() == null ? null : "PEN");
            i.setAreaDeseada(f.area() == null ? null : BigDecimal.valueOf(f.area()));
            i.setFormaPago(f.pago());
            i.setNombre(f.nombre());
            i.setMedio(MedioContacto.CORREO);
            i.setContacto(f.correo());
            i.setConsentimiento(true);
            i.setConsentimientoVersion(InteresDtos.CONSENTIMIENTO_VERSION);
            i.setConsentimientoEn(creado);
            i.setEtapa(f.etapa());
            i.setResponsable(f.responsable());
            i.setProximaAccion(f.accion());
            i.setSemillaDesfase(f.accion() == null ? null : f.desfase());
            creados[n] = intereses.save(i);
            for (String texto : f.notas()) {
                NotaInteres nota = new NotaInteres();
                nota.setInteresId(creados[n].getId());
                nota.setTexto(texto);
                nota.setCuentaCodigo(f.responsable() == null ? "asesor-01" : f.responsable());
                nota.setCreadaEn(creado.plus(1, ChronoUnit.DAYS));
                notas.save(nota);
            }
        }
        for (FilaCita fc : CITAS) {
            Interes i = creados[fc.fila()];
            Cita c = new Cita();
            c.setInteresId(i.getId());
            c.setModalidad(fc.modalidad());
            c.setFranja1(fc.franja());
            if (fc.dosOpciones()) c.setFranja2(fc.franja() == Franja.MANANA ? Franja.TARDE : Franja.MANANA);
            c.setEstado(fc.estado());
            if (fc.estado().agendada()) {
                c.setFranjaAcordada(fc.franja());
                c.setAtendidaPor(i.getResponsable());
            }
            c.setCreadaEn(i.getCreadoEn());
            c.setActualizadaEn(i.getCreadoEn());
            c.setSemillaDesfase(fc.desfase());
            fechas(c, InteresService.hoy());
            citas.save(c);
        }
        intereses.flush();
    }

    /** El lote n-ésimo disponible del proyecto, el primer caso publicado, el proyecto (lote -1) o una búsqueda general. */
    private Referencia referencia(Fila f, List<Referencia> casos) {
        if (f.caso()) return casos.isEmpty() ? null : casos.get(0);
        if (f.proyecto() == null) return null;
        if (f.lote() < 0) return inmuebles.proyectoVisible(f.proyecto()).orElse(null);
        List<Referencia> lotes = inmuebles.lotesDisponibles(f.proyecto());
        if (lotes.isEmpty()) return inmuebles.proyectoVisible(f.proyecto()).orElse(null);
        return lotes.get(Math.min(f.lote(), lotes.size() - 1));
    }

    /** Mueve las fechas de lo precargado que nadie tocó respecto de {@code hoy}. */
    void realinear(LocalDate hoy) {
        for (Interes i : intereses.findBySemillaDesfaseIsNotNull()) {
            i.setProximaAccionFecha(hoy.plusDays(i.getSemillaDesfase()));
            intereses.save(i);
        }
        for (Cita c : citas.findBySemillaDesfaseIsNotNull()) {
            fechas(c, hoy);
            citas.save(c);
        }
    }

    /**
     * Fechas de una cita precargada: la propuesta cae en hoy + desfase (la segunda opción, dos días después). Una
     * reprogramada se acordó un día antes de lo que se propuso.
     */
    static void fechas(Cita c, LocalDate hoy) {
        LocalDate base = hoy.plusDays(c.getSemillaDesfase());
        c.setFecha1(c.getEstado() == EstadoCita.REPROGRAMADA ? base.plusDays(1) : base);
        c.setFecha2(c.getFranja2() == null ? null : base.plusDays(2));
        c.setFechaAcordada(c.getEstado().agendada() ? base : null);
    }
}
