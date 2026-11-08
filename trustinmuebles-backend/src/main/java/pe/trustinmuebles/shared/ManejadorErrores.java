package pe.trustinmuebles.shared;

import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ManejadorErrores {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(ManejadorErrores.class);

    /**
     * v0.8 (B7): deja en el log del servidor la cadena completa de causas (clase y mensaje de cada «Caused by») de un
     * error de base de datos traducido a 409. El cliente sigue recibiendo el mismo mensaje genérico: la causa no se expone.
     */
    static String causaRaiz(Throwable e) {
        StringBuilder sb = new StringBuilder(e.getClass().getName()).append(": ").append(e.getMessage());
        java.util.Set<Throwable> vistas = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        vistas.add(e);
        for (Throwable c = e.getCause(); c != null && vistas.add(c); c = c.getCause()) {
            sb.append(System.lineSeparator()).append("Caused by: ").append(c.getClass().getName()).append(": ")
                    .append(c.getMessage());
        }
        return sb.toString();
    }

    @ExceptionHandler(NoEncontradoException.class)
    ProblemDetail noEncontrado(NoEncontradoException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(ReglaNegocioException.class)
    ProblemDetail regla(ReglaNegocioException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
    }

    @ExceptionHandler({ConflictoException.class, org.springframework.dao.OptimisticLockingFailureException.class})
    ProblemDetail conflicto(RuntimeException e) {
        if (!(e instanceof ConflictoException)) LOG.warn("409 por concurrencia en la base de datos:\n{}", causaRaiz(e));
        String detalle = e instanceof ConflictoException ? e.getMessage()
                : "El expediente cambió mientras lo editaba. Recargue e intente de nuevo.";
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detalle);
    }

    @ExceptionHandler(DemasiadosIntentosException.class)
    ProblemDetail demasiados(DemasiadosIntentosException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
    }

    @ExceptionHandler(org.springframework.security.authentication.BadCredentialsException.class)
    ProblemDetail credenciales(org.springframework.security.authentication.BadCredentialsException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    ProblemDetail integridad(org.springframework.dao.DataIntegrityViolationException e) {
        LOG.warn("409 por integridad de datos:\n{}", causaRaiz(e), e);
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Los datos enviados no son válidos o ya existen");
    }

    /** Límite de entrada de un archivo (v0.8: app.archivos.max-entrada-mb, 25 MB por defecto). */
    @org.springframework.beans.factory.annotation.Value("${app.archivos.max-entrada-mb:25}")
    private double maxEntradaMb;

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ProblemDetail demasiadoGrande(org.springframework.web.multipart.MaxUploadSizeExceededException e) {
        String mb = maxEntradaMb == Math.rint(maxEntradaMb) ? String.valueOf((long) maxEntradaMb)
                : String.valueOf(maxEntradaMb).replace('.', ',');
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONTENT_TOO_LARGE, "El archivo supera " + mb + " MB");
    }

    @ExceptionHandler(ArchivoDemasiadoGrandeException.class)
    ProblemDetail archivoGrande(ArchivoDemasiadoGrandeException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONTENT_TOO_LARGE, e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail argumento(IllegalArgumentException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    /** JSON mal formado o con un valor fuera de las enumeraciones permitidas. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ProblemDetail cuerpoIlegible(HttpMessageNotReadableException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "El cuerpo no es válido: revise el formato JSON y los valores permitidos. No se guardó ningún cambio.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail validacion(MethodArgumentNotValidException e) {
        String detalle = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detalle);
    }
}
