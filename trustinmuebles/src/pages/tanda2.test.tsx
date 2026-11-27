import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { AlertaDelDia, AvisoDelDia, FormularioCita, HistorialEtapas, PanelSeparacion } from "@/components/SeguimientoAsesor";
import Interesados from "@/pages/Interesados";
import {
  ETAPAS, cuerpoCitaPanel, etapaBloqueada, etapasDisponibles, formularioCitaVacio, mostrarAlertaDia, responsablesPermitidos,
  textoAlertaDia, textoSeguimientos, tituloBandeja, validarCitaPanel,
  type Cita, type CitaDelDia, type Interesado, type InteresadoDetalle, type MiDia, type OpcionesBandeja,
} from "@/lib/interes";

/*
 * v2.0 (tanda 2): pruebas de pantalla (dibujadas en el servidor, como las demás) y de la lógica de la vista propia del
 * asesor (RN28), la cita con dos fechas (RF35), el historial de etapas (RF36), el aviso del día (RF37) y la separación y
 * liberación del lote (RF41, RF42, RN29, RN31).
 */

const porRuta: Record<string, unknown> = {};
const sesion: { usuario: { codigo: string; rol: string } | null } = { usuario: null };
vi.mock("@/lib/useApi", () => ({
  useApi: (ruta: string | null) => ({
    data: ruta === null ? null : ruta.startsWith("/interesados?") || ruta === "/interesados" ? porRuta["/interesados"] : porRuta[ruta] ?? null,
    loading: false, error: null, reload: () => {}, setData: () => {},
  }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ usuario: sesion.usuario, logout: () => {} }) }));

const dibujar = (el: ReactElement) => renderToStaticMarkup(<MemoryRouter>{el}</MemoryRouter>);
const HOY = "2026-11-30";

const cita = (extra: Partial<Cita> = {}): Cita => ({
  id: 7, interesId: 3, nombre: "Gabriela", referencia: "A-7", inmueble: "Mz. A Lote 7", modalidad: "REUNION_EN_OFICINA",
  modalidadEtiqueta: "Reunión en oficina", opciones: [], estado: "CONFIRMADA", estadoEtiqueta: "Confirmada",
  fechaAcordada: HOY, franjaAcordada: "TARDE", franjaAcordadaEtiqueta: "Tarde", motivoRechazo: null, atendidaPor: "asesor-02",
  creadaEn: "2026-11-29T15:00:00Z", asesor: "asesor-02", ...extra,
});
const delDia = (c: Cita, fecha = HOY): CitaDelDia => ({ cita: c, fecha, franja: "TARDE", franjaEtiqueta: "Tarde", porConfirmar: false });
const dia = (extra: Partial<MiDia> = {}): MiDia => ({
  cuenta: "asesor-02", hoy: HOY, hoyCitas: [], proximas: [], seguimientosPendientes: 0, seguimientosVencidos: 0, alerta: false, ...extra,
});

const interesado = (extra: Partial<Interesado> = {}): Interesado => ({
  id: 3, creadoEn: "2026-11-20T10:00:00Z", origen: "LOTE", referencia: "altos-de-ventisca-A-7", inmueble: "Mz. A Lote 7",
  casoCodigo: null, proyectoCodigo: "altos-de-ventisca", loteClave: "A-7", zona: null, tipo: "LOTE", presupuestoMin: null,
  presupuestoMax: null, moneda: null, areaDeseada: null, formaPago: "CONTADO", formaPagoEtiqueta: "Al contado", nombre: "Gabriela",
  medio: "CORREO", contacto: "gabriela.prueba@example.com", etapa: "SEPARACION", etapaEtiqueta: "Separación",
  responsable: "asesor-02", proximaAccion: null, proximaAccionFecha: null, vencido: false, citaPorConfirmar: false, notas: 0,
  ...extra,
});
const detalle = (extra: Partial<InteresadoDetalle> = {}): InteresadoDetalle => ({
  interes: interesado(), mensaje: null, consentimientoVersion: "2026-11-v1", consentimientoEn: "2026-11-20T10:00:00Z",
  notas: [], citas: [], puedeMarcarLote: true, historialEtapas: [], separacion: null, descartes: 0, puedeLiberar: false, ...extra,
});

// ------------------------------------------------------------------------------------------------- RF37

describe("RF37: alerta prominente del día", () => {
  it("con una cita para hoy, se ve el aviso grande con la cita y el contador de seguimientos", () => {
    const d = dia({ alerta: true, hoyCitas: [delDia(cita())], seguimientosPendientes: 3, seguimientosVencidos: 1 });
    expect(mostrarAlertaDia(d)).toBe(true);
    const html = dibujar(<AlertaDelDia dia={d} />);
    expect(html).toContain("data-alerta-dia");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Hoy tienes 1 cita.");
    expect(html).toContain("Reunión en oficina · tarde · Gabriela");
    expect(html).toContain("3 seguimientos pendientes (1 vencido)");
  });

  it("sin citas próximas, no aparece", () => {
    const d = dia({ seguimientosPendientes: 4 });
    expect(mostrarAlertaDia(d)).toBe(false);
    expect(dibujar(<AlertaDelDia dia={d} />)).toBe("");
    // Ni con alerta en falso aunque viniera una lista (el servidor decide).
    expect(mostrarAlertaDia(dia({ alerta: false, hoyCitas: [delDia(cita())] }))).toBe(false);
    expect(mostrarAlertaDia(null)).toBe(false);
  });

  it("cuenta citas y llamadas de hoy y de mañana", () => {
    const llamada = cita({ id: 8, modalidad: "LLAMADA", modalidadEtiqueta: "Llamada" });
    expect(textoAlertaDia(dia({ alerta: true, hoyCitas: [delDia(cita()), delDia(cita({ id: 9 })), delDia(llamada)] })))
      .toBe("Hoy tienes 2 citas y 1 llamada.");
    expect(textoAlertaDia(dia({ alerta: true, proximas: [delDia(llamada, "2026-12-01")] }))).toBe("Mañana tienes 1 llamada.");
    expect(textoAlertaDia(dia({ alerta: true, hoyCitas: [delDia(cita())], proximas: [delDia(llamada, "2026-12-01")] })))
      .toBe("Hoy tienes 1 cita y mañana 1 llamada.");
    expect(textoSeguimientos({ seguimientosPendientes: 0, seguimientosVencidos: 0 })).toBe("Sin seguimientos pendientes");
    expect(textoSeguimientos({ seguimientosPendientes: 1, seguimientosVencidos: 0 })).toBe("1 seguimiento pendiente");
  });

  it("el aviso al entrar solo lo pide el equipo comercial y se dibuja con la cita de hoy", () => {
    porRuta["/interesados/mi-dia"] = dia({ alerta: true, hoyCitas: [delDia(cita())] });
    try {
      sesion.usuario = { codigo: "asesor-02", rol: "ASESOR" };
      expect(dibujar(<AvisoDelDia />)).toContain("data-alerta-dia");
      sesion.usuario = { codigo: "comprador-01", rol: "COMPRADOR" };
      expect(dibujar(<AvisoDelDia />)).toBe("");
      sesion.usuario = null;
      expect(dibujar(<AvisoDelDia />)).toBe("");
    } finally {
      sesion.usuario = null;
      delete porRuta["/interesados/mi-dia"];
    }
  });
});

// ------------------------------------------------------------------------------------------------- RF35

describe("RF35: cita con tipo, fecha principal y fecha opcional", () => {
  it("el formulario tiene el tipo (visita, reunión o llamada), la fecha principal y la opcional", () => {
    const html = dibujar(<FormularioCita ocupado={false} alAgendar={async () => true} hoy={HOY} />);
    expect(html).toContain("data-formulario-cita");
    for (const t of ["Visita al lote", "Reunión en oficina", "Llamada"]) expect(html).toContain(`>${t}</option>`);
    expect(html).toContain('name="fecha"');
    expect(html).toContain('name="fechaOpcional"');
    expect(html).toContain("Fecha opcional");
    expect(html).toContain(`min="${HOY}"`);
  });

  it("valida antes de enviar y arma el cuerpo con las dos fechas", () => {
    const f = { ...formularioCitaVacio(), tipo: "REUNION_EN_OFICINA" as const, fecha: "2026-12-02", franja: "TARDE" as const };
    expect(validarCitaPanel({ ...f, tipo: "" }, HOY)).toMatch(/tipo de cita/);
    expect(validarCitaPanel({ ...f, fecha: "" }, HOY)).toMatch(/fecha principal/);
    expect(validarCitaPanel({ ...f, fecha: "2026-11-01" }, HOY)).toMatch(/anterior a hoy/);
    expect(validarCitaPanel({ ...f, fechaOpcional: "2026-12-02", franjaOpcional: "TARDE" }, HOY)).toMatch(/distinta/);
    expect(validarCitaPanel(f, HOY)).toBeNull();
    expect(cuerpoCitaPanel(f)).toEqual({ tipo: "REUNION_EN_OFICINA", fecha: "2026-12-02", franja: "TARDE" });
    const conOpcional = { ...f, fechaOpcional: "2026-12-03", franjaOpcional: "MANANA" as const };
    expect(validarCitaPanel(conOpcional, HOY)).toBeNull();
    expect(cuerpoCitaPanel(conOpcional)).toEqual({ tipo: "REUNION_EN_OFICINA", fecha: "2026-12-02", franja: "TARDE",
      fechaOpcional: "2026-12-03", franjaOpcional: "MANANA" });
  });
});

// ------------------------------------------------------------------------------------------------- RF36

describe("RF36: seguimiento por etapas", () => {
  it("las etapas van contactado → revisado → cita agendada → visita realizada → acuerdo → separación → venta", () => {
    expect(ETAPAS.map((e) => e.valor)).toEqual(["NUEVO", "CONTACTADO", "REVISADO", "CITA_AGENDADA", "VISITA_REALIZADA",
      "ACUERDO", "SEPARACION", "VENTA", "DESCARTADO"]);
  });

  it("el historial muestra cada cambio con responsable, fecha y el motivo de una liberación", () => {
    const html = dibujar(<HistorialEtapas historial={[
      { desde: "CONTACTADO", desdeEtiqueta: "Contactado", hacia: "REVISADO", haciaEtiqueta: "Revisado", cuentaCodigo: "asesor-02",
        registradoEn: "2026-11-28T14:00:00Z", motivo: null },
      { desde: "SEPARACION", desdeEtiqueta: "Separación", hacia: "ACUERDO", haciaEtiqueta: "Acuerdo", cuentaCodigo: "asesor-01",
        registradoEn: "2026-11-29T14:00:00Z", motivo: "No consiguió el crédito" },
    ]} />);
    expect(html).toContain("data-historial-etapas");
    expect(html).toContain("Contactado → Revisado");
    expect(html).toContain("asesor-02");
    expect(html).toContain("Motivo: No consiguió el crédito");
    expect(dibujar(<HistorialEtapas historial={[]} />)).toBe("");
  });
});

// ------------------------------------------------------------------------------------------------- RF41, RF42, RN29, RN31

describe("RF41, RF42 y RN29: separación y liberación del lote", () => {
  const separado = detalle({ separacion: { id: 1, estado: "ACTIVA", conDeposito: false, creadaEn: "2026-11-28T10:00:00Z",
    creadaPor: "asesor-02" }, puedeLiberar: true });

  it("con el lote separado, se ve el panel con el motivo para liberarlo y la etapa solo avanza a Venta", () => {
    const html = dibujar(<PanelSeparacion d={separado} ocupado={false} alLiberar={async () => true} />);
    expect(html).toContain('data-panel-separacion="ACTIVA"');
    expect(html).toContain("está separado para este interesado");
    expect(html).toContain("Motivo de la liberación");
    expect(html).toContain("Liberar la separación");
    // Sin motivo todavía, el botón está desactivado.
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Liberar la separación/);
    // Al liberar, el interesado no puede quedar en Separación ni en Venta.
    expect(html).not.toContain('<option value="SEPARACION">');
    expect(html).not.toContain('<option value="VENTA">');
    expect(etapasDisponibles(separado).map((e) => e.valor)).toEqual(["SEPARACION", "VENTA"]);
  });

  it("una venta con depósito no se retrotrae: sin liberar y con la etapa fija", () => {
    const firme = detalle({ interes: interesado({ etapa: "VENTA", etapaEtiqueta: "Venta" }), separacion: { id: 2,
      estado: "VENDIDA", conDeposito: true, creadaEn: "2026-11-28T10:00:00Z", creadaPor: "asesor-02" }, puedeLiberar: false });
    expect(etapaBloqueada(firme)).toBe(true);
    expect(etapasDisponibles(firme).map((e) => e.valor)).toEqual(["VENTA"]);
    const html = dibujar(<PanelSeparacion d={firme} ocupado={false} alLiberar={async () => true} />);
    expect(html).toContain("vendido con depósito");
    expect(html).toContain("data-venta-firme");
    expect(html).not.toContain("Motivo de la liberación");
  });

  it("sin separación no hay panel y todas las etapas están disponibles", () => {
    const libre = detalle({ interes: interesado({ etapa: "ACUERDO", etapaEtiqueta: "Acuerdo" }) });
    expect(dibujar(<PanelSeparacion d={libre} ocupado={false} alLiberar={async () => true} />)).toBe("");
    expect(etapasDisponibles(libre)).toHaveLength(9);
  });

  it("RN31: muestra cuántas separaciones se liberaron antes", () => {
    const html = dibujar(<PanelSeparacion d={{ ...separado, descartes: 2 }} ocupado={false} alLiberar={async () => true} />);
    expect(html).toContain("Separaciones liberadas antes: 2.");
  });
});

// ------------------------------------------------------------------------------------------------- RN28

describe("RN28: vista propia del asesor", () => {
  const coordinacion: OpcionesBandeja = { proyectos: [], responsables: ["asesor-01", "asesor-02", "gestor-01"], cuenta: "asesor-01", veTodo: true };
  const propia: OpcionesBandeja = { ...coordinacion, cuenta: "asesor-02", veTodo: false };

  it("un asesor solo se asigna a sí mismo; quien coordina asigna a cualquiera", () => {
    expect(responsablesPermitidos(propia)).toEqual(["asesor-02"]);
    expect(responsablesPermitidos(coordinacion)).toEqual(["asesor-01", "asesor-02", "gestor-01"]);
    expect(responsablesPermitidos(null)).toEqual([]);
    expect(tituloBandeja(propia)).toBe("Mis interesados");
    expect(tituloBandeja(coordinacion)).toBe("Interesados");
  });

  it("la bandeja del asesor se titula «Mis interesados» y explica qué ve", () => {
    porRuta["/interesados/opciones"] = propia;
    porRuta["/interesados"] = [interesado({ etapa: "NUEVO", etapaEtiqueta: "Nuevo" })];
    try {
      const html = dibujar(<Interesados />);
      expect(html).toContain("Mis interesados");
      expect(html).toContain("Ves a los interesados a tu cargo (asesor-02)");
      // En el filtro de responsable solo se ofrece su propia cuenta.
      expect(html).toContain('<option value="asesor-02">asesor-02</option>');
      expect(html).not.toContain('<option value="gestor-01">gestor-01</option>');
      porRuta["/interesados/opciones"] = coordinacion;
      const coord = dibujar(<Interesados />);
      expect(coord).toContain("Coordinas la bandeja");
      expect(coord).toContain('<option value="gestor-01">gestor-01</option>');
    } finally {
      delete porRuta["/interesados/opciones"];
      delete porRuta["/interesados"];
    }
  });
});
