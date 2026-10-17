-- Casos con forma de partida registral (copia literal simulada). Todos los datos son ficticios (RN-01).
-- Los rubros A y B se representan con campos del predio; los rubros C a F, con asientos.

alter table caso_lote add column denominacion varchar(255);
update caso_lote set denominacion = codigo;
alter table caso_lote alter column denominacion set not null;

alter table expediente add column zona_registral varchar(120);
alter table expediente add column oficina_registral varchar(120);
alter table expediente add column ubicacion varchar(255);
alter table expediente add column area_m2 numeric(10,2);
alter table expediente add column linderos varchar(1000);
alter table expediente add column antecedente_dominial varchar(500);
-- true: el sistema genera el PDF desde los datos; false: el revisor subió uno propio.
alter table expediente add column documento_generado boolean not null default false;

-- La anotación pasa a ser un asiento de la partida. "referencia" guarda el número (C00001, D00001, E00001...).
alter table anotacion rename to asiento;
alter table asiento drop column descripcion;
alter table asiento alter column estado drop not null;
alter table asiento add column tipo_acto varchar(30) not null default 'OTRO';
alter table asiento add column fecha_inscripcion date;
alter table asiento add column titulo_numero varchar(40);
alter table asiento add column fecha_presentacion date;
alter table asiento add column texto varchar(1500);
alter table asiento add column cancela_numero varchar(10);
alter table asiento add column titulares varchar(500);

-- Una regla puede aplicar solo a ciertos tipos de acto (lista separada por comas). Vacío: a cualquiera.
alter table regla add column tipos_acto varchar(300);
