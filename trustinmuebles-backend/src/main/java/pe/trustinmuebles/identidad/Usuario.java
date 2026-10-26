package pe.trustinmuebles.identidad;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/** Cuenta de prueba. No guarda nombres ni datos de participantes reales (PA2). */
@Entity
@Table(name = "usuario")
@Getter
@Setter
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo_cuenta", nullable = false, unique = true)
    private String codigoCuenta;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rol rol;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn = Instant.now();

    /** Datos profesionales. Solo los tiene la cuenta del especialista y son ficticios en la demostración. */
    @Column(name = "nombre_completo")
    private String nombreCompleto;

    private String especialidad;

    private String colegiatura;

    /** Función dentro de la inmobiliaria (por ejemplo, «Asesor comercial» del gestor). No es un dato personal. */
    private String funcion;
}
