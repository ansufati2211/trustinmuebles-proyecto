package pe.trustinmuebles.identidad;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/** Limita los intentos fallidos de login por correo + IP (en memoria; suficiente para una sola instancia). */
@Component
class LimiteIntentosLogin {
    static final int MAXIMO = 5;
    static final Duration VENTANA = Duration.ofMinutes(15);

    private final ConcurrentHashMap<String, Deque<Instant>> fallos = new ConcurrentHashMap<>();

    boolean bloqueado(String clave) {
        Deque<Instant> d = fallos.get(clave);
        if (d == null) return false;
        synchronized (d) {
            purgar(d);
            return d.size() >= MAXIMO;
        }
    }

    void fallo(String clave) {
        Deque<Instant> d = fallos.computeIfAbsent(clave, k -> new ArrayDeque<>());
        synchronized (d) {
            purgar(d);
            d.addLast(Instant.now());
        }
    }

    void exito(String clave) {
        fallos.remove(clave);
    }

    private static void purgar(Deque<Instant> d) {
        Instant limite = Instant.now().minus(VENTANA);
        while (!d.isEmpty() && d.peekFirst().isBefore(limite)) d.pollFirst();
    }
}
