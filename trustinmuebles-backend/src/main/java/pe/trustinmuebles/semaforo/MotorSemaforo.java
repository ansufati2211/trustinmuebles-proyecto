package pe.trustinmuebles.semaforo;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;
import pe.trustinmuebles.registro.Asiento;
import pe.trustinmuebles.registro.CopiaLiteral;
import pe.trustinmuebles.registro.TipoAsiento;
import pe.trustinmuebles.shared.NivelRiesgo;

/**
 * Motor del Semáforo Legal (REQ-F01, RN-01). Lógica pura, sin acceso a base de datos.
 * Luz verde solo si no se dispara ninguna regla de advertencia ni de riesgo.
 */
@Component
public class MotorSemaforo {
    static final double TOLERANCIA_AREA = 0.05;

    record Resultado(CategoriaLegal categoria, NivelRiesgo nivel, String codigo, String titulo, String explicacion,
            String recomendacion, String textoRegistral) {}

    private final CatalogoExplicaciones catalogo;

    public MotorSemaforo(CatalogoExplicaciones catalogo) {
        this.catalogo = catalogo;
    }

    List<Resultado> evaluar(CopiaLiteral copia, String vendedorDeclarado, double areaDeclaradaM2) {
        List<Resultado> r = new ArrayList<>();
        boolean hayDominio = copia.asientos().stream()
                .anyMatch(a -> a.tipo() == TipoAsiento.DOMINIO && a.vigente());
        if (!hayDominio || copia.titularActual() == null || copia.titularActual().isBlank()) {
            r.add(hallazgo(CategoriaLegal.TITULO_DOMINIO, NivelRiesgo.AMARILLO, "DOM_DATOS_INCOMPLETOS", null));
        } else if (!normalizar(copia.titularActual()).equals(normalizar(vendedorDeclarado))) {
            r.add(hallazgo(CategoriaLegal.TITULO_DOMINIO, NivelRiesgo.ROJO, "DOM_TITULAR_DISTINTO",
                    "Titular registral: " + copia.titularActual()));
        }
        if (copia.areaRegistralM2() > 0
                && Math.abs(copia.areaRegistralM2() - areaDeclaradaM2) / copia.areaRegistralM2() > TOLERANCIA_AREA) {
            r.add(hallazgo(CategoriaLegal.TITULO_DOMINIO, NivelRiesgo.AMARILLO, "DOM_AREA_DISCREPANTE",
                    "Área registral: " + copia.areaRegistralM2() + " m² · Área anunciada: " + areaDeclaradaM2 + " m²"));
        }
        for (Asiento a : copia.asientos()) {
            if (!a.vigente()) continue;
            switch (a.tipo()) {
                case CARGA_TECNICA -> r.add(hallazgo(CategoriaLegal.TITULO_DOMINIO, NivelRiesgo.AMARILLO,
                        "DOM_CARGA_TECNICA", a.descripcion()));
                case HIPOTECA -> r.add(hallazgo(CategoriaLegal.GRAVAMENES, NivelRiesgo.AMARILLO,
                        "GRAV_HIPOTECA", a.descripcion()));
                case EMBARGO -> r.add(hallazgo(CategoriaLegal.GRAVAMENES, NivelRiesgo.ROJO,
                        "GRAV_EMBARGO", a.descripcion()));
                case MEDIDA_CAUTELAR -> r.add(hallazgo(CategoriaLegal.PROCESOS_JUDICIALES, NivelRiesgo.ROJO,
                        "PROC_MEDIDA_CAUTELAR", a.descripcion()));
                case DEMANDA -> r.add(hallazgo(CategoriaLegal.PROCESOS_JUDICIALES, NivelRiesgo.ROJO,
                        "PROC_DEMANDA", a.descripcion()));
                case BLOQUEO -> r.add(hallazgo(CategoriaLegal.PROCESOS_JUDICIALES, NivelRiesgo.ROJO,
                        "PROC_BLOQUEO", a.descripcion()));
                case DOMINIO -> { }
            }
        }
        return r;
    }

    private Resultado hallazgo(CategoriaLegal cat, NivelRiesgo nivel, String codigo, String textoRegistral) {
        return new Resultado(cat, nivel, codigo, catalogo.titulo(codigo), catalogo.explicacion(codigo),
                catalogo.recomendacion(codigo), textoRegistral);
    }

    static String normalizar(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
