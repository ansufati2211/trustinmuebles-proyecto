-- Propiedades de demostración (las 6 del front + 2 de Ica). Partidas en classpath:mock-sunarp/
insert into inmueble (id, titulo, ubicacion, direccion, descripcion, precio_usd, habitaciones, banos, area_m2, numero_partida, vendedor_nombre, imagen_url, publicado_en) values
(1, 'Casa moderna en esquina', 'San Isidro, Lima', 'Calle Los Pinos 404, San Isidro, Lima', 'Casa de esquina con acabados modernos, cochera doble y terraza.', 420000, 4, 3, 280, '11000001', 'Carlos Ramos Quispe', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80', '2024-09-01 10:00:00'),
(2, 'Dúplex con terraza', 'Miraflores, Lima', 'Av. Larco 1250, Miraflores, Lima', 'Dúplex luminoso con terraza amplia a media cuadra del malecón.', 350000, 3, 2, 180, '11000002', 'Lucía Salas Medina', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', '2024-09-05 10:00:00'),
(3, 'Casa familiar con jardín', 'Surco, Lima', 'Calle Los Olivos 123, Surco, Lima', 'Casa de dos pisos con jardín, ideal para familias.', 510000, 5, 4, 350, '11000003', 'Rosa Huamán Torres', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', '2024-09-10 10:00:00'),
(4, 'Departamento Flat', 'San Borja, Lima', 'Av. San Luis 2100, San Borja, Lima', 'Departamento en piso 6 con vista al parque.', 280000, 2, 2, 120, '11000004', 'Jorge Villanueva Paz', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80', '2024-09-12 10:00:00'),
(5, 'Penthouse con vista al mar', 'Barranco, Lima', 'Malecón Souza 310, Barranco, Lima', 'Penthouse con vista panorámica al océano.', 650000, 3, 4, 220, '11000005', 'Inversiones Barranco S.A.C.', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80', '2024-09-15 10:00:00'),
(6, 'Loft Industrial', 'Magdalena, Lima', 'Jr. Castilla 560, Magdalena, Lima', 'Loft de doble altura con estilo industrial.', 195000, 1, 1, 90, '11000006', 'Miguel Ángel Ortiz', 'https://images.unsplash.com/photo-1600585154526-990dced4ea0d?auto=format&fit=crop&w=800&q=80', '2024-09-18 10:00:00'),
(7, 'Casa campestre en Subtanjalla', 'Subtanjalla, Ica', 'Fundo Los Viñedos Mz. B Lt. 4, Subtanjalla, Ica', 'Casa campestre rodeada de viñedos, a 10 minutos de la ciudad.', 95000, 3, 2, 300, '21000007', 'Constructora Valle del Sol S.R.L.', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80', '2025-11-30 10:00:00'),
(8, 'Departamento céntrico en Ica', 'Ica, Ica', 'Av. Grau 340, Ica', 'Departamento remodelado a dos cuadras de la Plaza de Armas.', 110000, 3, 2, 145, '21000008', 'Patricia Quispe Gómez', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80', '2026-01-15 10:00:00');

insert into plano2d (id, inmueble_id, nombre, imagen_url) values
(1, 1, 'Plano de planta - Casa San Isidro', 'https://images.unsplash.com/photo-1626289830584-3cd71146740b?auto=format&fit=crop&w=1200&q=80'),
(2, 2, 'Plano de planta - Dúplex Miraflores', 'https://images.unsplash.com/photo-1626289830584-3cd71146740b?auto=format&fit=crop&w=1200&q=80'),
(3, 3, 'Plano de planta - Casa Surco', 'https://images.unsplash.com/photo-1626289830584-3cd71146740b?auto=format&fit=crop&w=1200&q=80'),
(4, 4, 'Plano de planta - Depto San Borja', 'https://images.unsplash.com/photo-1626289830584-3cd71146740b?auto=format&fit=crop&w=1200&q=80'),
(5, 5, 'Plano de planta - Penthouse Barranco', 'https://images.unsplash.com/photo-1626289830584-3cd71146740b?auto=format&fit=crop&w=1200&q=80'),
(6, 6, 'Plano de planta - Loft Magdalena', 'https://images.unsplash.com/photo-1626289830584-3cd71146740b?auto=format&fit=crop&w=1200&q=80'),
(7, 7, 'Plano de planta - Casa Subtanjalla', 'https://images.unsplash.com/photo-1626289830584-3cd71146740b?auto=format&fit=crop&w=1200&q=80'),
(8, 8, 'Plano de planta - Depto Ica', 'https://images.unsplash.com/photo-1626289830584-3cd71146740b?auto=format&fit=crop&w=1200&q=80');

insert into tour3d (id, inmueble_id, titulo, url) values
(1, 1, 'Recorrido 3D - Casa San Isidro', 'https://my.matterport.com/show/?m=SxQL3iGyoDo'),
(2, 3, 'Recorrido 3D - Casa Surco', 'https://my.matterport.com/show/?m=SxQL3iGyoDo');

-- Inspecciones cerradas con sus pines (x e y son proporciones 0-1 sobre el plano)
insert into inspeccion (id, inmueble_id, plano_id, inspector_nombre, dictamen, estado, nivel_estructural, fecha) values
(1, 1, 1, 'Ing. Luis Paredes', 'Estructura en buen estado, sin fisuras ni asentamientos. Instalaciones sanitarias renovadas en 2022.', 'CERRADA', 'VERDE', '2024-10-12 09:30:00'),
(2, 2, 2, 'Ing. Luis Paredes', 'Estructura sana. Se observa humedad en un muro de la terraza que requiere tratamiento.', 'CERRADA', 'AMARILLO', '2024-10-14 11:00:00'),
(3, 3, 3, 'Ing. Luis Paredes', 'Estructura de albañilería confinada en buen estado.', 'CERRADA', 'VERDE', '2024-10-16 10:00:00'),
(4, 4, 4, 'Ing. Luis Paredes', 'Edificio con columnas y placas en buen estado.', 'CERRADA', 'VERDE', '2024-10-18 10:00:00'),
(5, 5, 5, 'Ing. Luis Paredes', 'Estructura en buen estado.', 'CERRADA', 'VERDE', '2024-10-20 10:00:00'),
(6, 6, 6, 'Ing. Luis Paredes', 'Fisura capilar en muro divisorio; se recomienda monitoreo.', 'CERRADA', 'AMARILLO', '2024-10-22 10:00:00'),
(7, 7, 7, 'Ing. Luis Paredes', 'Muros de adobe con fisuras diagonales y sin refuerzo; riesgo sísmico alto (zona afectada en 2007).', 'CERRADA', 'ROJO', '2026-02-10 10:00:00'),
(8, 8, 8, 'Ing. Luis Paredes', 'Albañilería confinada en buen estado.', 'CERRADA', 'VERDE', '2026-02-12 10:00:00');

insert into pin_falla (inspeccion_id, x, y, severidad, titulo, descripcion) values
(1, 0.35, 0.35, 'VERDE', 'Cimentación verificada (Sin fisuras)', 'Sin asentamientos ni fisuras en la cimentación.'),
(1, 0.75, 0.65, 'VERDE', 'Red sanitaria renovada (2022)', 'Tuberías de agua y desagüe reemplazadas en 2022.'),
(2, 0.30, 0.40, 'VERDE', 'Techo en buen estado', 'Losa aligerada sin filtraciones.'),
(2, 0.70, 0.60, 'AMARILLO', 'Pared con humedad', 'Humedad por capilaridad en muro de la terraza; requiere impermeabilización.'),
(3, 0.40, 0.30, 'VERDE', 'Columnas y vigas en buen estado', 'Sin fisuras estructurales.'),
(3, 0.65, 0.70, 'VERDE', 'Jardín sin asentamientos', 'Terreno estable.'),
(4, 0.50, 0.50, 'VERDE', 'Placas estructurales verificadas', 'Sin observaciones.'),
(5, 0.45, 0.35, 'VERDE', 'Terraza impermeabilizada', 'Sin filtraciones.'),
(6, 0.60, 0.45, 'AMARILLO', 'Fisura capilar en muro divisorio', 'Fisura de 0.3 mm, sin movimiento; monitorear cada 6 meses.'),
(7, 0.30, 0.40, 'ROJO', 'Fisuras diagonales en muro de adobe', 'Fisuras de más de 5 mm sin refuerzo sismorresistente.'),
(7, 0.70, 0.60, 'ROJO', 'Techo sin amarre a los muros', 'Riesgo de colapso ante un sismo.'),
(8, 0.50, 0.40, 'VERDE', 'Columnas verificadas', 'Sin observaciones.');

alter table inmueble alter column id restart with 100;
alter table plano2d alter column id restart with 100;
alter table tour3d alter column id restart with 100;
alter table inspeccion alter column id restart with 100;
