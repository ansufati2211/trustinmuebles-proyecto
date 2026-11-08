-- v0.8 (B3): datos opcionales de los asientos del rubro D. El acreedor solo puede ser una persona jurídica o «no consta»
-- (sin personas naturales, I11) y el plazo o vencimiento se registra si consta en la partida. Ninguno de los dos
-- interviene en el color del indicador A: el motor no los lee.
alter table asiento add column acreedor varchar(120);
alter table asiento add column plazo_vencimiento varchar(120);
