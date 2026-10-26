-- v0.7 (F1): captación y publicación. Nuevos roles GESTOR y PROPIETARIO, la función del gestor y, por caso, el
-- propietario (por su código de cuenta, sin nombre ni DNI: I11), la fecha de su autorización y el estado de publicación.
-- No borra ni cambia datos existentes salvo para dejar publicados, con autorización, los diez casos de demostración.

alter table usuario drop constraint ck_usuario_rol;
alter table usuario add constraint ck_usuario_rol
    check (rol in ('COMPRADOR', 'REVISOR', 'ESPECIALISTA', 'GESTOR', 'PROPIETARIO'));
alter table usuario add column funcion varchar(80);

-- propietario_codigo es nulo solo en partidas transcritas registradas antes de la v0.7.
alter table caso_lote add column propietario_codigo varchar(40);
alter table caso_lote add column autorizacion_fecha timestamp;
alter table caso_lote add column estado_publicacion varchar(12) not null default 'BORRADOR';
alter table caso_lote add constraint ck_caso_publicacion
    check (estado_publicacion in ('BORRADOR', 'PUBLICADO', 'RETIRADO'));
-- I14: un caso no puede estar publicado sin autorización vigente del propietario.
alter table caso_lote add constraint ck_caso_publicado_autorizado
    check (estado_publicacion <> 'PUBLICADO' or autorizacion_fecha is not null);

-- Base existente: los diez casos de demostración siguen publicados, repartidos entre los dos propietarios.
-- En una base nueva la tabla está vacía y lo mismo lo hace la carga de contenido (CasosSeeder).
update caso_lote set propietario_codigo = 'propietario-01'
    where codigo in ('SIM-11048217', 'SIM-11061555', 'SIM-11075836', 'SIM-11087751', 'SIM-11098467');
update caso_lote set propietario_codigo = 'propietario-02'
    where codigo in ('SIM-11052690', 'SIM-11070419', 'SIM-11081204', 'SIM-11093320', 'SIM-11104029');
update caso_lote set autorizacion_fecha = current_timestamp, estado_publicacion = 'PUBLICADO'
    where sintetico = true and propietario_codigo is not null;
