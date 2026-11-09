-- Actualiza los perfiles de los especialistas y los informes ya firmados en bases existentes.

update usuario
    set nombre_completo = 'Ing. Carlos Alberto Mendoza Quispe', colegiatura = 'CIP N.° 248910'
    where codigo_cuenta = 'especialista-01'
      and nombre_completo = 'Ing. Perfil Ficticio 01';

update usuario
    set nombre_completo = 'Arq. Valeria Sofía Paredes Rojas', colegiatura = 'CAP N.° 19432'
    where codigo_cuenta = 'especialista-02'
      and nombre_completo = 'Arq. Perfil Ficticio 02';

update evaluacion_tecnica
    set profesional = 'Ing. Carlos Alberto Mendoza Quispe', colegiatura = 'CIP N.° 248910'
    where profesional = 'Ing. Perfil Ficticio 01';

update evaluacion_tecnica
    set profesional = 'Arq. Valeria Sofía Paredes Rojas', colegiatura = 'CAP N.° 19432'
    where profesional = 'Arq. Perfil Ficticio 02';
