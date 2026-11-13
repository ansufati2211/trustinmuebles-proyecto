-- v1.0 (etapa 6): realismo del contenido.
-- 1. Los especialistas quedan con nombre y especialidad, sin número de colegiatura: se registra al asignar al profesional
--    real. También se vacía en los informes ya guardados, que la copiaron de la cuenta.
update usuario set colegiatura = null where rol = 'ESPECIALISTA';
update evaluacion_tecnica set colegiatura = null;

-- 2. Ajustes de contenido aplicados una sola vez a una base existente (por ejemplo, los titulares de los casos
--    precargados y la ficha registral regenerada). Una base nueva los recibe ya aplicados desde el contenido.
create table ajuste_contenido (
    clave varchar(60) primary key,
    aplicado_en timestamp not null
);
