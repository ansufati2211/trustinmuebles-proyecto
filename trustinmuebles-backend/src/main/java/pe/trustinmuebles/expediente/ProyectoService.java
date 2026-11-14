package pe.trustinmuebles.expediente;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.trustinmuebles.clasificacion.DocumentoLote;
import pe.trustinmuebles.clasificacion.EstadoPlano;
import pe.trustinmuebles.clasificacion.EvaluacionDto;
import pe.trustinmuebles.expediente.CasoDtos.DocumentoLoteDto;
import pe.trustinmuebles.expediente.ProyectoDtos.*;
import pe.trustinmuebles.shared.ConflictoException;
import pe.trustinmuebles.shared.NoEncontradoException;
import pe.trustinmuebles.shared.ReglaNegocioException;

/**
 * v1.0 (etapa 3a): proyectos de urbanización y sus lotes. La página pública de un proyecto muestra su plano, sus hitos
 * (informativos) y los documentos de su partida matriz. Ningún dato del proyecto ni de sus lotes interviene en el motor
 * de reglas: el indicador A de un lote sin caso propio es el de la partida matriz, que se calcula como el de cualquier
 * caso. Un lote se ofrece solo con una autorización vigente registrada.
 */
@Service
@Transactional
class ProyectoService {
    private final ProyectoRepository proyectos;
    private final LoteProyectoRepository lotes;
    private final ExpedienteRepository expedientes;
    private final CasoLoteRepository casos;
    private final ExpedienteService expediente;

    ProyectoService(ProyectoRepository proyectos, LoteProyectoRepository lotes, ExpedienteRepository expedientes,
            CasoLoteRepository casos, ExpedienteService expediente) {
        this.proyectos = proyectos;
        this.lotes = lotes;
        this.expedientes = expedientes;
        this.casos = casos;
        this.expediente = expediente;
    }

    // ------------------------------------------------------------------ portal público

    /**
     * Página pública. El proyecto se ve si ofrece algún lote o tiene algún inmueble publicado; si no, 404 (como un
     * caso en borrador). El plano muestra todos los lotes con su estado comercial; uno no publicado, sin precio.
     */
    @Transactional(readOnly = true)
    ProyectoPublico publico(String codigo) {
        Vista v = vista(codigo);
        if (!v.visible()) throw new NoEncontradoException("Proyecto", codigo);
        Proyecto p = v.proyecto();
        List<HitoDto> hitos = p.getHitos().stream().map(h -> new HitoDto(h.getOrden(), h.getNombre(), h.getEstado(),
                h.getEstado().etiqueta(), h.getFecha())).toList();
        List<DocumentoProyectoDto> documentos = v.matriz() == null ? List.of()
                : expediente.documentosLoteDe(v.matriz().getCaso().getCodigo()).stream()
                        .map(ProyectoService::documento).toList();
        return new ProyectoPublico(p.getCodigo(), p.getNombre(), p.getDistrito(), p.getDescripcion(),
                p.getRecorridoUrl(), hitos, v.lotes(), conteo(v.lotes()), indicador(v), documentos,
                v.casosPublicados(), p.getDireccion(), p.getMapaUrl(), p.getCondicionesPago());
    }

    /** Ficha pública de un lote: 404 si el lote no se ofrece. Si tiene caso propio, su ficha es la del caso. */
    @Transactional(readOnly = true)
    LotePublico lotePublico(String codigo, String clave) {
        Vista v = vista(codigo);
        LoteDto dto = v.lotes().stream().filter(l -> l.clave().equalsIgnoreCase(clave)).findFirst()
                .orElseThrow(() -> new NoEncontradoException("Lote", clave));
        if (!dto.publicado()) throw new NoEncontradoException("Lote", clave);
        LoteProyecto l = buscarLote(codigo, clave);
        return new LotePublico(dto.codigo(), ExpedienteService.denominacionDe(l), v.proyecto().getCodigo(),
                v.proyecto().getNombre(), dto, ExpedienteService.predioDeLote(l, dto.estadoComercial()), indicador(v),
                v.proyecto().getDireccion(), v.proyecto().getMapaUrl());
    }

    /** PDF de un documento del proyecto (los de su partida matriz), si el proyecto se ve sin sesión. */
    @Transactional(readOnly = true)
    ExpedienteService.DocumentoPlano documentoPublico(String codigo, DocumentoLote tipo) {
        Vista v = vista(codigo);
        if (!v.visible() || v.matriz() == null) throw new NoEncontradoException("Documento del proyecto", tipo.etiqueta());
        return expediente.documentoLoteDeMatriz(v.matriz().getCaso().getCodigo(), tipo);
    }

    // ------------------------------------------------------------------ equipo de la inmobiliaria

    @Transactional(readOnly = true)
    List<ResumenProyecto> listar() {
        List<ResumenProyecto> salida = new ArrayList<>();
        for (Proyecto p : proyectos.findAllByOrderByNombreAsc()) salida.add(resumen(p));
        return salida;
    }

    private ResumenProyecto resumen(Proyecto p) {
        Vista v = vista(p.getCodigo());
        return new ResumenProyecto(p.getCodigo(), p.getNombre(), p.getDistrito(), p.getCasoMatrizCodigo(),
                ExpedienteService.autorizaLotes(v.matriz()), v.lotes().size(),
                (int) v.lotes().stream().filter(LoteDto::publicado).count(), conteo(v.lotes()), p.getDireccion(),
                p.getMapaUrl(), p.getCondicionesPago());
    }

    static final int MAX_DIRECCION = 200;
    static final int MAX_MAPA_URL = 500;
    static final int MAX_CONDICIONES_PAGO = 500;

    /**
     * v1.0 (etapa 9): dirección, enlace de mapa y condiciones de pago del proyecto. Un campo vacío borra el dato. El enlace
     * debe ser https con un dominio (no se embebe: «Cómo llegar» lo abre en otra pestaña). Las condiciones son texto libre:
     * no se calculan cuotas ni tasas. Nada de esto toca el indicador A.
     */
    ResumenProyecto actualizarDatos(String codigo, DatosProyectoRequest req) {
        Proyecto p = proyectos.findByCodigo(codigo).orElseThrow(() -> new NoEncontradoException("Proyecto", codigo));
        if (req == null) throw new IllegalArgumentException("El cuerpo debe ser un objeto JSON");
        p.setDireccion(texto("direccion", req.direccion(), MAX_DIRECCION));
        p.setMapaUrl(enlaceMapa(req.mapaUrl()));
        p.setCondicionesPago(texto("condicionesPago", req.condicionesPago(), MAX_CONDICIONES_PAGO));
        proyectos.saveAndFlush(p);
        return resumen(p);
    }

    /** Texto sin espacios sobrantes en cada línea ni líneas vacías al inicio o al final; vacío → null. */
    static String texto(String campo, String valor, int max) {
        if (valor == null) return null;
        String t = valor.replace("\r\n", "\n").lines().map(x -> x.trim().replaceAll("[ \\t]+", " "))
                .collect(java.util.stream.Collectors.joining("\n")).trim();
        if (t.isEmpty()) return null;
        if (t.length() > max) {
            throw new IllegalArgumentException(campo + ": tiene " + t.length() + " caracteres y el máximo es " + max);
        }
        return t;
    }

    /** Enlace de mapa: vacío → null; si no, https con dominio, sin espacios y de hasta 500 caracteres. */
    static String enlaceMapa(String valor) {
        String t = texto("mapaUrl", valor, MAX_MAPA_URL);
        if (t == null) return null;
        java.net.URI uri;
        try {
            uri = new java.net.URI(t);
        } catch (java.net.URISyntaxException ex) {
            throw new IllegalArgumentException("mapaUrl: no es un enlace válido");
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || !uri.getHost().contains(".")) {
            throw new IllegalArgumentException("mapaUrl: debe ser un enlace https, por ejemplo el de Google Maps");
        }
        return t;
    }

    /**
     * Ofrece un lote en el catálogo. Exige una autorización vigente registrada en la partida matriz (I14); un lote con
     * caso propio se publica desde su caso. No recalcula ni cambia el indicador A.
     */
    LoteDto publicar(String codigo, String clave) {
        LoteProyecto l = buscarLote(codigo, clave);
        if (l.getCasoCodigo() != null) {
            throw new ReglaNegocioException("Este lote tiene caso propio: se publica desde el caso " + l.getCasoCodigo());
        }
        if (!ExpedienteService.autorizaLotes(matrizDe(l.getProyecto()))) {
            throw new ReglaNegocioException(
                    "No se puede publicar: la partida matriz del proyecto no tiene una autorización vigente registrada");
        }
        if (l.isPublicado()) throw new ConflictoException("El lote ya está publicado");
        l.setPublicado(true);
        lotes.saveAndFlush(l);
        return loteDe(codigo, clave);
    }

    LoteDto retirar(String codigo, String clave) {
        LoteProyecto l = buscarLote(codigo, clave);
        if (!l.isPublicado()) throw new ConflictoException("El lote no está publicado");
        l.setPublicado(false);
        lotes.saveAndFlush(l);
        return loteDe(codigo, clave);
    }

    /**
     * Cambia el estado comercial. Si el lote tiene caso propio, el estado vive en el caso (no se duplica): se cambia ahí.
     * Es informativo y no cambia el indicador A.
     */
    LoteDto cambiarEstado(String codigo, String clave, EstadoComercial estado) {
        LoteProyecto l = buscarLote(codigo, clave);
        Optional<CasoLote> caso = l.getCasoCodigo() == null ? Optional.empty() : casos.findByCodigo(l.getCasoCodigo());
        if (caso.isPresent()) {
            caso.get().setEstadoComercial(estado);
            casos.saveAndFlush(caso.get());
        } else {
            l.setEstadoComercial(estado);
            lotes.saveAndFlush(l);
        }
        return loteDe(codigo, clave);
    }

    /**
     * v1.0 (etapa 8): cifras de la portada: proyectos de urbanización que ofrecen lotes en el portal (con al menos un lote
     * publicado; no cuenta los que solo agrupan casos sueltos) y lotes disponibles que se ofrecen en ellos.
     */
    record CifrasProyectos(int proyectos, int lotesDisponibles) {}

    @Transactional(readOnly = true)
    CifrasProyectos cifrasPublicas() {
        int visibles = 0;
        int disponibles = 0;
        for (Proyecto p : proyectos.findAll()) {
            Vista v = vista(p.getCodigo());
            if (v.lotes().stream().noneMatch(LoteDto::publicado)) continue;
            visibles++;
            disponibles += (int) v.lotes().stream()
                    .filter(l -> l.publicado() && l.estadoComercial() == EstadoComercial.DISPONIBLE).count();
        }
        return new CifrasProyectos(visibles, disponibles);
    }

    // ------------------------------------------------------------------ cálculo

    /** Lo que se necesita para mostrar un proyecto: sus lotes ya resueltos y su partida matriz. */
    private record Vista(Proyecto proyecto, Expediente matriz, List<LoteDto> lotes, int casosPublicados) {
        boolean visible() {
            return casosPublicados > 0 || lotes.stream().anyMatch(LoteDto::publicado);
        }
    }

    private Vista vista(String codigo) {
        Proyecto p = proyectos.findByCodigo(codigo).orElseThrow(() -> new NoEncontradoException("Proyecto", codigo));
        Expediente matriz = matrizDe(p);
        boolean autoriza = ExpedienteService.autorizaLotes(matriz);
        List<LoteDto> lista = new ArrayList<>();
        for (LoteProyecto l : lotes.findDelProyecto(p.getCodigo())) lista.add(dto(l, autoriza));
        lista.sort(java.util.Comparator.comparing(LoteDto::manzana).thenComparingInt(LoteDto::numero));
        int publicados = (int) expedientes.findPublicados().stream()
                .filter(e -> p.getCodigo().equals(e.getCaso().getProyectoCodigo())).count();
        return new Vista(p, matriz, lista, publicados);
    }

    private LoteDto dto(LoteProyecto l, boolean matrizAutoriza) {
        EstadoComercial estado = l.getEstadoComercial();
        boolean publicado;
        String casoPublicado = null;
        if (l.getCasoCodigo() != null) {
            // El caso propio manda: su estado comercial y su publicación (con su propia autorización).
            CasoLote c = casos.findByCodigo(l.getCasoCodigo()).orElse(null);
            if (c != null) estado = c.getEstadoComercial();
            publicado = l.isPublicado() && c != null && c.getEstadoPublicacion() == EstadoPublicacion.PUBLICADO;
            if (publicado) casoPublicado = c.getCodigo();
        } else {
            publicado = l.isPublicado() && matrizAutoriza;
        }
        boolean conPrecio = publicado && l.getPrecio() != null;
        return new LoteDto(l.codigo(), l.clave(), l.getManzana(), l.getNumero(), l.getAreaM2(),
                conPrecio ? l.getPrecio() : null, conPrecio ? l.getMoneda() : null,
                conPrecio ? FiltroPublico.precioPorM2(l.getPrecio(), l.getAreaM2()) : null, estado, estado.etiqueta(),
                l.getIndependizacion(), l.getIndependizacion().etiqueta(), l.getZonificacion(), publicado,
                casoPublicado);
    }

    private LoteDto loteDe(String codigo, String clave) {
        return vista(codigo).lotes().stream().filter(x -> x.clave().equalsIgnoreCase(clave)).findFirst().orElseThrow();
    }

    private Expediente matrizDe(Proyecto p) {
        return expediente.matricesDe(List.of(p)).get(p.getCasoMatrizCodigo());
    }

    private IndicadorADto indicador(Vista v) {
        EvaluacionDto ev = expediente.evaluacionDe(v.matriz());
        if (ev == null) {
            FuenteIndicadorA f = FuenteIndicadorA.SIN_EVALUACION;
            return new IndicadorADto(f, f.rotulo(), null, null);
        }
        FuenteIndicadorA f = FuenteIndicadorA.PARTIDA_MATRIZ;
        return new IndicadorADto(f, f.rotulo(), v.matriz().getCaso().getCodigo(), ev);
    }

    private static DocumentoProyectoDto documento(DocumentoLoteDto d) {
        boolean disponible = d.documento() != null && !"FALTA".equals(d.documento().origen())
                && (d.estado() == EstadoPlano.PRESENTADO || d.estado() == EstadoPlano.OBSERVADO);
        return new DocumentoProyectoDto(d.tipo(), d.tipoEtiqueta(), d.estado(), d.resumen(), disponible);
    }

    static ConteoEstados conteo(List<LoteDto> lista) {
        Map<EstadoComercial, Integer> n = new EnumMap<>(EstadoComercial.class);
        for (LoteDto l : lista) n.merge(l.estadoComercial(), 1, Integer::sum);
        return new ConteoEstados(n.getOrDefault(EstadoComercial.DISPONIBLE, 0),
                n.getOrDefault(EstadoComercial.SEPARADO, 0), n.getOrDefault(EstadoComercial.VENDIDO, 0));
    }

    /** Clave «A-7» (sin distinguir mayúsculas en la manzana). Una clave mal formada es un lote que no existe. */
    private LoteProyecto buscarLote(String codigo, String clave) {
        int guion = clave == null ? -1 : clave.lastIndexOf('-');
        if (guion <= 0) throw new NoEncontradoException("Lote", String.valueOf(clave));
        String manzana = clave.substring(0, guion).trim().toUpperCase(java.util.Locale.ROOT);
        int numero;
        try {
            numero = Integer.parseInt(clave.substring(guion + 1).trim());
        } catch (NumberFormatException ex) {
            throw new NoEncontradoException("Lote", clave);
        }
        return lotes.findLote(codigo, manzana, numero).orElseThrow(() -> new NoEncontradoException("Lote", clave));
    }
}
