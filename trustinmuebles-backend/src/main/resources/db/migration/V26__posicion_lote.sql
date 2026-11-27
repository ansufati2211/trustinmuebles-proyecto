-- v2.0 (tanda 1, RF49): posición del lote (esquina, frente al parque, frente a avenida). Aditiva y opcional: los lotes
-- existentes quedan sin dato (null). Guarda los códigos separados por «+», por ejemplo «ESQUINA+PARQUE».
alter table lote_proyecto add column posicion varchar(40);
