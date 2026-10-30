package pe.trustinmuebles.expediente;

/**
 * De dónde sale una partida captada en «Registrar partida» (ETP-1). Una transcrita viene de una consulta pública y no admite
 * el prefijo SIM-; una simulada se inventa para la demostración y lo exige.
 */
enum OrigenCaptacion { TRANSCRITA_CONOCE_AQUI, SIMULADA_DEMOSTRACION }
