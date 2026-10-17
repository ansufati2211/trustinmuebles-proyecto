package pe.trustinmuebles.clasificacion;

import java.util.Set;

/** Regla ya cargada, lista para el motor. {@code tiposActo} vacío significa que aplica a cualquier tipo. */
record ReglaAplicable(String codigo, Prioridad prioridad, TipoCondicion tipo, String prefijoReferencia,
        Set<TipoActo> tiposActo, String titulo, String explicacion) {}
