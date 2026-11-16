-- v1.0 (etapa 10): lotes con letra (10A, 15C). Aditiva: el número sigue siendo entero y la letra va aparte, de modo que
-- los lotes existentes (sin letra) no cambian: su sufijo queda vacío y su clave sigue siendo «A-7».
alter table lote_proyecto add column sufijo varchar(2) default '' not null;
alter table lote_proyecto drop constraint uq_lote_proyecto;
alter table lote_proyecto add constraint uq_lote_proyecto unique (proyecto_id, manzana, numero, sufijo);
