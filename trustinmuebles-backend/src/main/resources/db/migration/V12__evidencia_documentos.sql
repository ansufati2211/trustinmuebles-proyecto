-- v0.8 (B1): evidencia de cada archivo subido. Se guarda solo el archivo final (optimizado o no); de él quedan su
-- tamaño, su huella SHA-256 y su fecha (columnas ya existentes), y ahora también el tamaño original que se recibió,
-- si se optimizó y la cuenta que lo subió. Los archivos generados por el sistema no llevan cuenta.
alter table archivo add column tamano_original bigint;
alter table archivo add column optimizado boolean default false not null;
alter table archivo add column subido_por varchar(40);
update archivo set tamano_original = tamano where tamano_original is null;
