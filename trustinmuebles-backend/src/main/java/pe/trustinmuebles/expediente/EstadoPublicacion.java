package pe.trustinmuebles.expediente;

/**
 * Estado comercial de un caso (etapa 5). Es independiente del color del indicador A: publicar o retirar no lo cambia
 * (I8, I10). Solo un caso PUBLICADO es visible para el comprador.
 */
public enum EstadoPublicacion {
    BORRADOR, PUBLICADO, RETIRADO
}
