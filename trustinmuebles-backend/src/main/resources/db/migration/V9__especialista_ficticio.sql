-- El perfil de especialista-01 pasa a ser visiblemente ficticio: nombre sin apariencia de persona real y colegiatura con
-- el prefijo SIM-. Una base existente lo necesita porque la carga de contenido no pisa perfiles ya completos.
-- Solo cambia lo que tiene exactamente los datos anteriores; en una base nueva las tablas están vacías.

update usuario
    set nombre_completo = 'Ing. Perfil Ficticio 01', colegiatura = 'CIP N.° SIM-CIP-0001'
    where codigo_cuenta = 'especialista-01'
      and nombre_completo = 'Ing. Carlos Alberto Mendoza Quispe' and colegiatura = 'CIP N.° 248910';

-- Los informes ya firmados guardan una copia de la firma.
update evaluacion_tecnica
    set profesional = 'Ing. Perfil Ficticio 01', colegiatura = 'CIP N.° SIM-CIP-0001'
    where profesional = 'Ing. Carlos Alberto Mendoza Quispe' and colegiatura = 'CIP N.° 248910';
