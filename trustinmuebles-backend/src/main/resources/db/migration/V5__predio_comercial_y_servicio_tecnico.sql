-- v0.6: datos comerciales del predio, perfil profesional del especialista y quién solicita la inspección.
-- Solo agrega columnas. Los valores los completa la carga de contenido (CasosSeeder y DemoUsuariosSeeder), que es
-- idempotente: rellena lo que falte en una base ya creada sin pisar lo que editó el revisor.

-- Distrito y precio referencial (en soles) del predio. El precio es informativo: no es una oferta.
alter table caso_lote add column distrito varchar(80);
alter table caso_lote add column precio_referencial numeric(12,2);

-- Datos profesionales de la cuenta del especialista. Son ficticios en la demostración.
alter table usuario add column nombre_completo varchar(120);
alter table usuario add column especialidad varchar(80);
alter table usuario add column colegiatura varchar(40);

-- Quién pidió la inspección (código de cuenta tomado de la sesión) y la especialidad del profesional que la atiende.
alter table evaluacion_tecnica add column solicitante_codigo varchar(40);
alter table evaluacion_tecnica add column profesional_especialidad varchar(80);
