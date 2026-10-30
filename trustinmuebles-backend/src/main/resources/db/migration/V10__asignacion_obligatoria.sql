-- Asignación obligatoria: sin especialista asignado por el gestor nadie registra avance ni emite el informe.
-- Esta columna deja de significar lo que decía V8 («si es nulo, cualquiera emite»): nulo es pendiente de asignación.
-- En una base existente, la inspección en curso de la demostración queda con el especialista que la lleva. SIM-11093320
-- sigue solicitada y sin asignar, para que el gestor la asigne.

update evaluacion_tecnica
    set especialista_asignado_codigo = 'especialista-01'
    where estado = 'EN_INSPECCION' and especialista_asignado_codigo is null
      and expediente_id = (select e.id from expediente e join caso_lote c on c.id = e.caso_id
                           where c.codigo = 'SIM-11098467');
