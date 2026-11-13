-- v1.0 (etapa 8): el asesor o el gestor registra desde el panel a un interesado que llegó por llamada, oficina, WhatsApp
-- o referido. Aditiva: los registros que ya existen quedan como llegados por el formulario web, con la casilla aceptada.
-- Nunca un DNI: el registro del panel pide los mismos datos que el formulario público.

-- Por dónde llegó el interesado.
alter table interes add column canal varchar(10) default 'WEB' not null;
-- Cómo dio su consentimiento: la casilla del formulario o de palabra ante el asesor (con quién lo registró y cuándo, que es
-- consentimiento_en).
alter table interes add column consentimiento_forma varchar(10) default 'FORMULARIO' not null;
alter table interes add column consentimiento_registrado_por varchar(40);

alter table interes add constraint ck_interes_canal
    check (canal in ('WEB', 'LLAMADA', 'OFICINA', 'WHATSAPP', 'REFERIDO'));
alter table interes add constraint ck_interes_consentimiento_forma
    check (consentimiento_forma in ('FORMULARIO', 'VERBAL'));
-- El consentimiento verbal siempre dice quién lo registró y nunca viene del formulario web.
alter table interes add constraint ck_interes_consentimiento_verbal
    check (consentimiento_forma = 'FORMULARIO' or (consentimiento_registrado_por is not null and canal <> 'WEB'));
