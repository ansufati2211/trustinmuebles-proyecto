-- El historial distingue el recálculo de una partida simulada captada del de una transcrita. Solo amplía la lista cerrada:
-- las filas ya guardadas no se tocan, porque el historial es de solo adición (I12).

alter table historial_evaluacion drop constraint ck_historial_origen;
alter table historial_evaluacion add constraint ck_historial_origen
    check (origen in ('EDICION', 'PLANO_ADJUNTO', 'PARTIDA_TRANSCRITA', 'PARTIDA_SIMULADA', 'CARGA_INICIAL'));
