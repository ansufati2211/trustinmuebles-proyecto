package pe.trustinmuebles.postventa;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Datos demo de postventa para la propiedad finalizada de Juan Pérez. */
@Component
@Order(40)
class PostventaSeeder implements ApplicationRunner {
    private final PropiedadRepository propiedades;
    private final MantenimientoRepository mantenimientos;
    private final TicketRepository tickets;
    private final boolean habilitado;

    PostventaSeeder(PropiedadRepository propiedades, MantenimientoRepository mantenimientos,
            TicketRepository tickets, @Value("${app.seed.enabled}") boolean habilitado) {
        this.propiedades = propiedades;
        this.mantenimientos = mantenimientos;
        this.tickets = tickets;
        this.habilitado = habilitado;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!habilitado || mantenimientos.count() > 0) return;
        for (PropiedadAdquirida p : propiedades.findAll()) {
            p.setFechaCompra(Instant.parse("2024-11-15T15:00:00Z"));
            mantenimiento(p, LocalDate.of(2025, 10, 8), "Impermeabilización de techos", "1200");
            mantenimiento(p, LocalDate.of(2025, 9, 14), "Pintura general interior", "450");

            TicketGarantia t = new TicketGarantia();
            t.setPropiedadId(p.getId());
            t.setTransaccionId(p.getTransaccionId());
            t.setPlanoId(1L);
            t.setPinX(0.75);
            t.setPinY(0.65);
            t.setTitulo("Revisión de tubería principal");
            t.setDescripcion("Se percibe baja presión de agua en el baño principal.");
            t.setProveedor("Constructora ABC");
            t.setEstado(EstadoTicket.INSPECCION_PROGRAMADA);
            t.setPrioridad(PrioridadTicket.MEDIA);
            t.setCreadoEn(Instant.parse("2025-11-02T15:00:00Z"));
            t.setActualizadoEn(Instant.parse("2025-11-04T15:00:00Z"));
            tickets.save(t);
        }
    }

    private void mantenimiento(PropiedadAdquirida p, LocalDate fecha, String servicio, String monto) {
        Mantenimiento m = new Mantenimiento();
        m.setPropiedadId(p.getId());
        m.setFecha(fecha);
        m.setServicio(servicio);
        m.setInversionUsd(new BigDecimal(monto));
        mantenimientos.save(m);
    }
}
