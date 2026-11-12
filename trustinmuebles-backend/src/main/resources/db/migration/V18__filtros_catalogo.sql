-- v1.0 (etapa 2): campos del caso que usan los filtros del catálogo. Aditiva: no borra datos. Los valores de los casos
-- existentes los completa la carga de contenido (CasosSeeder) a partir de su denominación y de su antecedente dominial.

-- Proyecto o urbanización a la que pertenece el lote; null si el inmueble no es de un proyecto.
alter table caso_lote add column proyecto varchar(120);

-- Estado comercial: lo que el comprador ve sobre la disponibilidad. No interviene en el semáforo.
alter table caso_lote add column estado_comercial varchar(10) not null default 'DISPONIBLE';
alter table caso_lote add constraint ck_caso_estado_comercial
    check (estado_comercial in ('DISPONIBLE', 'SEPARADO', 'VENDIDO'));

-- Independización del lote: si ya tiene partida propia, si sigue dentro de la partida matriz o si no consta.
alter table caso_lote add column independizacion varchar(17) not null default 'NO_CONSTA';
alter table caso_lote add constraint ck_caso_independizacion
    check (independizacion in ('PARTIDA_PROPIA', 'EN_PARTIDA_MATRIZ', 'NO_CONSTA'));

create index ix_caso_lote_proyecto on caso_lote (proyecto);
create index ix_caso_lote_distrito on caso_lote (distrito);
