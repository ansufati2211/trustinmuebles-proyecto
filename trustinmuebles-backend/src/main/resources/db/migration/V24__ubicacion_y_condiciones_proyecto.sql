-- v1.0 (etapa 9): ubicación y condiciones de pago del proyecto. Aditiva: las tres columnas son opcionales y no tocan
-- ningún otro dato. Ninguna interviene en el motor de reglas ni en el indicador A.

-- Dirección del proyecto como la escribiría la inmobiliaria («Prolongación Ayabaca s/n, a 400 m del óvalo...»).
alter table proyecto add column direccion varchar(200);
-- Enlace de mapa (por ejemplo, el de Google Maps del lugar). Solo https; la página no embebe ningún mapa: el botón
-- «Cómo llegar» lo abre en otra pestaña. Sin enlace, el botón no se muestra.
alter table proyecto add column mapa_url varchar(500);
alter table proyecto add constraint ck_proyecto_mapa_url check (mapa_url is null or mapa_url like 'https://%');
-- Condiciones de pago en texto libre («Inicial desde S/ 5,000 y cuotas...»). Sin simulador ni tasas calculadas.
alter table proyecto add column condiciones_pago varchar(500);
