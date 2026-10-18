-- Partidas transcritas de una consulta pública (Conoce Aquí, SUNARP), sin datos de personas naturales.
-- Las partidas sintéticas siguen igual. Una transcrita exige fuente, fecha de consulta y la confirmación de que
-- se omitieron los datos personales.

alter table caso_lote drop constraint ck_caso_sintetico;

alter table caso_lote add column origen varchar(12) not null default 'SINTETICO';
alter table caso_lote add column fuente varchar(120);
alter table caso_lote add column fecha_consulta date;
alter table caso_lote add column sin_datos_personales boolean not null default false;

alter table caso_lote add constraint ck_caso_origen check (
    (origen = 'SINTETICO' and sintetico = true)
    or (origen = 'TRANSCRITA' and sintetico = false and fuente is not null and fecha_consulta is not null
        and sin_datos_personales = true));
