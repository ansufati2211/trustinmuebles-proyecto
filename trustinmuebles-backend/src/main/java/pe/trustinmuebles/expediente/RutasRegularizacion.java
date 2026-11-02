package pe.trustinmuebles.expediente;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.clasificacion.ClasificacionService;
import pe.trustinmuebles.clasificacion.EstadoSemaforo;
import pe.trustinmuebles.clasificacion.EvaluacionDto;
import pe.trustinmuebles.clasificacion.ResultadoClasificacion;
import pe.trustinmuebles.clasificacion.TipoActo;
import pe.trustinmuebles.shared.NoEncontradoException;
import tools.jackson.databind.ObjectMapper;

/**
 * Ruta de regularización (v0.8, feedback b y decisión 3). API pública de solo lectura: lee la evaluación vigente
 * (reglas aplicadas y faltantes) y le asocia los pasos de contenido/<versión>/rutas.json. No recalcula, no escribe en
 * la evaluación ni en el historial, y no interviene en el color (I8).
 */
@Service
@Transactional(readOnly = true)
public class RutasRegularizacion {
    /** Tipo de alerta de un caso gris: falta información o la condición no está contemplada. */
    public static final String INFORMACION_INSUFICIENTE = "INFORMACION_INSUFICIENTE";
    static final String SIN_PASOS = "Sin alertas en los campos evaluados: no hay pasos de regularización";
    static final String PLAZO_NO_CONSTA = "No consta en la partida: solicitar al propietario o al acreedor";
    static final String NO_CONSTA = "No consta";

    private final ExpedienteRepository expedientes;
    private final ClasificacionService clasificacion;
    private final ContenidoRutas contenido;

    RutasRegularizacion(ExpedienteRepository expedientes, ClasificacionService clasificacion, ObjectMapper json,
            @Value("${app.reglas.version}") String version) {
        this.expedientes = expedientes;
        this.clasificacion = clasificacion;
        try (InputStream in = new ClassPathResource("contenido/" + version + "/rutas.json").getInputStream()) {
            this.contenido = json.readValue(in, ContenidoRutas.class);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer contenido/" + version + "/rutas.json", e);
        }
    }

    /** Ruta de un expediente. Quien llama decide la visibilidad (ver ExpedienteService.ruta). */
    public RutaRegularizacion calcular(Long expedienteId) {
        Expediente e = expedientes.findById(expedienteId)
                .orElseThrow(() -> new NoEncontradoException("Expediente", expedienteId));
        return calcular(e);
    }

    RutaRegularizacion calcular(Expediente e) {
        EvaluacionDto ev = clasificacion.obtener(e.getId()).orElse(null);
        String codigo = e.getCaso().getCodigo();
        if (ev == null) {
            return new RutaRegularizacion(codigo, null, null, null, List.of(), List.of(),
                    "El caso aún no tiene evaluación.", contenido.aviso(), contenido.plazoGeneral(),
                    contenido.estadoRevision(), contenido.version());
        }
        List<RutaRegularizacion.Item> items = new ArrayList<>();
        for (ResultadoClasificacion.Alerta a : lista(ev.alertas())) {
            ContenidoRutas.Paso p = contenido.reglas().get(a.regla());
            if (p != null) items.add(item("ALERTA", a.regla(), a.referencia(), p, gravamen(e, a.referencia())));
        }
        for (String f : lista(ev.faltantes())) {
            Map.Entry<String, ContenidoRutas.Paso> p = faltante(f);
            if (p != null) items.add(item("FALTANTE", p.getKey(), referenciaDe(f, p.getValue()), p.getValue(), null));
        }
        if (lista(ev.motivos()).stream().anyMatch(m -> "CONDICION".equals(m.tipo()))) {
            ContenidoRutas.Paso p = contenido.faltantes().get("CONDICION_NO_CONTEMPLADA");
            if (p != null) items.add(item("CONDICION", "CONDICION_NO_CONTEMPLADA", null, p, null));
        }
        Esfuerzo esfuerzo = items.stream().map(RutaRegularizacion.Item::esfuerzo)
                .max(Comparator.naturalOrder()).orElse(null);
        String mensaje = items.isEmpty() && ev.estado() == EstadoSemaforo.VERDE ? SIN_PASOS : null;
        return new RutaRegularizacion(codigo, ev.estado(), esfuerzo, esfuerzo == null ? null : esfuerzo.etiqueta(),
                List.copyOf(items), tiposAlerta(ev), mensaje, contenido.aviso(), contenido.plazoGeneral(),
                contenido.estadoRevision(), contenido.version());
    }

    /** Tipos de alerta de un caso: los códigos de las reglas aplicadas y, si es gris, «información insuficiente». */
    public static List<String> tiposAlerta(EvaluacionDto ev) {
        if (ev == null) return List.of();
        List<String> tipos = new ArrayList<>(lista(ev.reglasAplicadas()));
        if (ev.estado() == EstadoSemaforo.GRIS) tipos.add(INFORMACION_INSUFICIENTE);
        return List.copyOf(tipos);
    }

    private Map.Entry<String, ContenidoRutas.Paso> faltante(String texto) {
        for (Map.Entry<String, ContenidoRutas.Paso> f : contenido.faltantes().entrySet()) {
            String esperado = f.getValue().textoFaltante();
            if (esperado == null) continue;
            if (f.getValue().esPrefijo() ? texto.startsWith(esperado) : texto.equals(esperado)) return f;
        }
        return null;
    }

    private static String referenciaDe(String texto, ContenidoRutas.Paso p) {
        return p.esPrefijo() ? texto.substring(p.textoFaltante().length()).trim() : null;
    }

    private static RutaRegularizacion.Item item(String tipo, String clave, String referencia, ContenidoRutas.Paso p,
            RutaRegularizacion.Gravamen gravamen) {
        return new RutaRegularizacion.Item(tipo, clave, referencia, p.titulo(), List.copyOf(p.pasos()), p.gestiona(),
                p.documentoRequerido(), p.esfuerzo(), p.esfuerzo().etiqueta(), p.nota(), gravamen);
    }

    /** B3: acreedor y plazo de una hipoteca, tal como constan en su asiento D; null si el asiento no es una hipoteca. */
    static RutaRegularizacion.Gravamen gravamen(Expediente e, String referencia) {
        return e.getAsientos().stream()
                .filter(a -> a.getReferencia().equals(referencia) && a.getTipoActo() == TipoActo.HIPOTECA)
                .findFirst()
                .map(a -> new RutaRegularizacion.Gravamen(a.getAcreedor() == null ? NO_CONSTA : a.getAcreedor(),
                        a.getPlazoOVencimiento(), a.getPlazoOVencimiento() == null ? PLAZO_NO_CONSTA
                                : "Plazo o vencimiento: " + a.getPlazoOVencimiento()))
                .orElse(null);
    }

    private static <T> List<T> lista(List<T> l) {
        return l == null ? List.of() : l;
    }
}
