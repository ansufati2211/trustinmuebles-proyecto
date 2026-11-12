import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { VistaPreviaCarga } from "@/components/VistaPreviaCarga";
import CargaLotes from "@/pages/CargaLotes";
import ProyectosEquipo from "@/pages/ProyectosEquipo";
import type { FilaCarga, ResumenProyecto, VistaPreviaCarga as Vista } from "@/lib/types";

/*
 * v1.0 (etapa 3b): pruebas de pantalla de la carga masiva de lotes: el panel de proyectos, la pantalla de carga y la vista
 * previa con sus errores por fila. Se dibujan en el servidor, con datos fijos.
 */

const respuesta: { data: unknown } = { data: null };
vi.mock("@/lib/useApi", () => ({
  useApi: () => ({ data: respuesta.data, loading: false, error: null, reload: () => {} }),
}));

const PROYECTOS: ResumenProyecto[] = [
  { codigo: "horizonte-de-los-aquijes", nombre: "Horizonte de Los Aquijes", distrito: "Los Aquijes", casoMatrizCodigo: "11112004",
    autorizacionVigente: true, lotes: 0, publicados: 0, conteo: { disponibles: 0, separados: 0, vendidos: 0 } },
  { codigo: "sin-autorizacion", nombre: "Proyecto sin autorización", distrito: null, casoMatrizCodigo: null,
    autorizacionVigente: false, lotes: 3, publicados: 0, conteo: { disponibles: 3, separados: 0, vendidos: 0 } },
];

const enRuta = (ruta: string, patron: string, elemento: ReactElement) => renderToStaticMarkup(
  <MemoryRouter initialEntries={[ruta]}><Routes><Route path={patron} element={elemento} /></Routes></MemoryRouter>,
);

function fila(n: number, accion: FilaCarga["accion"], extra: Partial<FilaCarga> = {}): FilaCarga {
  return { fila: n, manzana: "A", lote: n - 1, clave: `A-${n - 1}`, accion, cambios: ["area_m2: 140.00", "estado: DISPONIBLE"], errores: [], ...extra };
}

const CON_ERRORES: Vista = {
  proyectoCodigo: "horizonte-de-los-aquijes", bytes: 900, totalFilas: 4, nuevas: 2, actualizadas: 0, sinCambios: 0, conErrores: 2,
  erroresGenerales: [], valida: false,
  filas: [
    fila(2, "NUEVO"),
    fila(3, "ERROR", { cambios: [], errores: ["area_m2: «-150.00» es negativo. Debe ser mayor que 0."] }),
    fila(4, "NUEVO"),
    fila(5, "ERROR", { cambios: [], errores: ["estado: «RESERVADO» no es válido. Usa DISPONIBLE, SEPARADO, VENDIDO."] }),
  ],
};

const SIN_ERRORES: Vista = {
  ...CON_ERRORES, nuevas: 3, conErrores: 0, valida: true, totalFilas: 3,
  filas: [fila(2, "NUEVO"), fila(3, "NUEVO"), fila(4, "NUEVO")],
};

const vistaPrevia = (v: Vista, soloErrores = false) => renderToStaticMarkup(
  <VistaPreviaCarga vista={v} soloErrores={soloErrores} cambiarSoloErrores={() => {}} alConfirmar={() => {}} alCancelar={() => {}} />,
);

beforeEach(() => {
  respuesta.data = null;
});

describe("panel de proyectos del equipo", () => {
  it("lista los proyectos con sus lotes y el enlace para cargarlos por CSV", () => {
    respuesta.data = PROYECTOS;
    const html = renderToStaticMarkup(<MemoryRouter><ProyectosEquipo /></MemoryRouter>);
    expect(html).toContain("Horizonte de Los Aquijes");
    expect(html).toContain("Los Aquijes, Ica");
    expect(html).toContain('href="/proyectos/horizonte-de-los-aquijes/carga"');
    expect(html).toContain('href="/proyectos/horizonte-de-los-aquijes"');
    expect(html).toContain("Cargar lotes (CSV)");
    // Un proyecto sin autorización de la partida matriz lo avisa: sus lotes no se ofrecen en línea.
    expect(html.match(/Sin autorización vigente de la partida matriz/g)).toHaveLength(1);
  });
});

describe("pantalla de carga", () => {
  it("explica las columnas y los límites, ofrece la plantilla y el selector de archivo", () => {
    respuesta.data = PROYECTOS;
    const html = enRuta("/proyectos/horizonte-de-los-aquijes/carga", "/proyectos/:codigo/carga", <CargaLotes />);
    expect(html).toContain("Cargar lotes · Horizonte de Los Aquijes");
    expect(html).toContain("manzana, lote, area_m2, precio, moneda, estado, independizacion, zonificacion, codigo_caso");
    expect(html).toContain("Hasta 2000 filas y 1 MB");
    expect(html).toContain("Descargar plantilla");
    expect(html).toContain('type="file"');
    expect(html).toContain('accept=".csv,text/csv"');
    expect(html).toContain('aria-label="Archivo CSV de lotes"');
    expect(html).not.toContain("data-vista-previa"); // sin archivo no hay vista previa
    expect(html).not.toContain("no se ofrecerán en línea");
  });

  it("si la partida matriz no tiene autorización vigente, avisa que los lotes no se ofrecerán en línea todavía", () => {
    respuesta.data = PROYECTOS;
    const html = enRuta("/proyectos/sin-autorizacion/carga", "/proyectos/:codigo/carga", <CargaLotes />);
    expect(html).toContain("Los lotes cargados no se ofrecerán en línea todavía");
    expect(html).toContain("Hoy tiene 3 lotes");
  });

  it("un proyecto que no existe lleva de vuelta a la lista", () => {
    respuesta.data = PROYECTOS;
    const html = enRuta("/proyectos/no-existe/carga", "/proyectos/:codigo/carga", <CargaLotes />);
    expect(html).toContain("No encontramos este proyecto");
    expect(html).toContain('href="/proyectos"');
  });
});

describe("vista previa con errores por fila", () => {
  it("marca cada fila mala con su error y no deja confirmar", () => {
    const html = vistaPrevia(CON_ERRORES);
    expect(html).toContain("data-vista-previa");
    expect(html).toContain("2 lotes nuevos · 0 por actualizar · 0 sin cambios · 2 filas con errores");
    expect(html).toContain("2 filas tienen errores");
    expect(html).toContain("No se guarda nada mientras haya errores");
    expect(html).toMatch(/<tr data-fila="3" data-accion="ERROR"/);
    expect(html).toContain("es negativo");
    expect(html).toMatch(/<tr data-fila="5" data-accion="ERROR"/);
    expect(html).toContain("RESERVADO");
    expect(html).toMatch(/<tr data-fila="2" data-accion="NUEVO"/);
    // El estado no depende solo del color: cada fila dice «Con errores» o «Nuevo» con texto.
    expect(html.match(/Con errores/g)).toHaveLength(2);
    expect(html).toContain("Ver solo las filas con errores");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Corrige el archivo para poder confirmar<\/button>/);
  });

  it("con el filtro de errores solo muestra las filas malas", () => {
    const html = vistaPrevia(CON_ERRORES, true);
    expect(html).toMatch(/data-fila="3"/);
    expect(html).toMatch(/data-fila="5"/);
    expect(html).not.toMatch(/data-fila="2"/);
    expect(html).not.toMatch(/data-fila="4"/);
  });

  it("un archivo sin errores se puede confirmar y lo dice", () => {
    const html = vistaPrevia(SIN_ERRORES);
    expect(html).toContain("Sin errores. Al confirmar se guarda todo el archivo");
    expect(html).toMatch(/<button[^>]*>Confirmar 3 lotes<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Confirmar/);
    expect(html).not.toContain("Ver solo las filas con errores");
    expect(html).toContain("area_m2: 140.00 · estado: DISPONIBLE");
  });

  it("un error general (encabezado mal hecho) se muestra como un todo y no deja confirmar", () => {
    const html = vistaPrevia({ ...CON_ERRORES, filas: [], totalFilas: 0, nuevas: 0, conErrores: 0,
      erroresGenerales: ["Falta la columna obligatoria «area_m2»."] });
    expect(html).toContain("El archivo no se puede leer");
    expect(html).toContain("Falta la columna obligatoria «area_m2».");
    expect(html).not.toContain("<table");
    expect(html).toMatch(/<button[^>]*disabled=""/);
  });

  it("si hay más de 200 filas, avisa cuántas se muestran", () => {
    const filas = Array.from({ length: 250 }, (_, i) => fila(i + 2, "NUEVO"));
    const html = vistaPrevia({ ...SIN_ERRORES, filas, totalFilas: 250, nuevas: 250 });
    expect(html.match(/data-fila=/g)).toHaveLength(200);
    expect(html).toContain("Se muestran las primeras 200 de 250 filas.");
  });
});
