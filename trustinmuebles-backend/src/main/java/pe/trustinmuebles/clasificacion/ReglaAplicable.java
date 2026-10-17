package pe.trustinmuebles.clasificacion;

/** Regla ya cargada, lista para el motor. */
record ReglaAplicable(String codigo, Prioridad prioridad, TipoCondicion tipo, String prefijoReferencia, String titulo,
        String explicacion) {}
