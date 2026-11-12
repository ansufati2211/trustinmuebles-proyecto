package pe.trustinmuebles.expediente;

import org.springframework.stereotype.Component;

/**
 * v1.0 (etapa 3a): mantiene juntos el texto «proyecto» de un caso (V18) y su referencia al proyecto por código (V19).
 * Un nombre lleva siempre al mismo proyecto (CodigoProyecto); si todavía no existe, se crea con ese nombre y el distrito
 * del caso, para que ningún caso quede con un proyecto sin ficha.
 */
@Component
class VinculoProyecto {
    private final ProyectoRepository proyectos;

    VinculoProyecto(ProyectoRepository proyectos) {
        this.proyectos = proyectos;
    }

    void vincular(CasoLote caso) {
        String nombre = caso.getProyecto() == null ? null : caso.getProyecto().trim();
        String codigo = CodigoProyecto.de(nombre);
        if (nombre == null || codigo.isEmpty()) {
            caso.setProyectoCodigo(null);
            return;
        }
        Proyecto p = proyectos.findByCodigo(codigo).orElseGet(() -> {
            Proyecto nuevo = new Proyecto();
            nuevo.setCodigo(codigo);
            nuevo.setNombre(nombre);
            nuevo.setDistrito(caso.getDistrito());
            return proyectos.saveAndFlush(nuevo);
        });
        caso.setProyectoCodigo(p.getCodigo());
    }
}
