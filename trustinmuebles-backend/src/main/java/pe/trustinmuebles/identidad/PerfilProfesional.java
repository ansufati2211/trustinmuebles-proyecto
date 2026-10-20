package pe.trustinmuebles.identidad;

/**
 * Datos profesionales de una cuenta (por ahora, solo la del especialista). En la demostración son ficticios.
 * Es parte de la API pública del módulo: el módulo de inspección los lee para completar el informe técnico.
 */
public record PerfilProfesional(String codigoCuenta, String nombre, String especialidad, String colegiatura) {}
