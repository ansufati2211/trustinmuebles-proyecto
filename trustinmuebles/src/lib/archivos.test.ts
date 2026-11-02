import { describe, expect, it } from "vitest";
import { TEXTO_FALTA, TEXTO_GENERADO, avisoTamano, mb, origenDocumento, puedeMarcarPresentado, resumenOptimizacion } from "./archivos";

const MB = 1024 * 1024;

describe("subida de PDF (v0.8)", () => {
  it("formatea en MB con coma decimal", () => {
    expect(mb(25 * MB)).toBe("25 MB");
    expect(mb(18.2 * MB)).toBe("18,2 MB");
  });

  it("avisa antes de subir según el tamaño", () => {
    expect(avisoTamano(2 * MB).tipo).toBe("ok");
    expect(avisoTamano(6 * MB)).toMatchObject({ tipo: "optimizara" });
    expect(avisoTamano(6 * MB).mensaje).toContain("Se optimizará automáticamente");
    expect(avisoTamano(26 * MB)).toMatchObject({ tipo: "excede" });
    expect(avisoTamano(26 * MB).mensaje).toContain("supera 25 MB");
  });

  it("resume la optimización solo si ocurrió", () => {
    expect(resumenOptimizacion({ optimizado: true, tamanoOriginalBytes: 18.2 * MB, tamanoBytes: 6.4 * MB }))
      .toBe("Optimizado: 18,2 MB → 6,4 MB");
    expect(resumenOptimizacion({ optimizado: false, tamanoOriginalBytes: MB, tamanoBytes: MB })).toBeNull();
  });

  it("describe el origen del documento", () => {
    const f = (iso: string) => iso.slice(0, 10);
    expect(origenDocumento(null, f)).toBe(TEXTO_FALTA);
    expect(origenDocumento({ origen: "GENERADO", subidoPor: null, subidoEn: null, tamanoBytes: null, tamanoOriginalBytes: null, optimizado: false, sha256: null }, f))
      .toBe(TEXTO_GENERADO);
    expect(origenDocumento({ origen: "SUBIDO", subidoPor: "revisor-01", subidoEn: "2026-11-02T10:00:00Z", tamanoBytes: 2 * MB, tamanoOriginalBytes: 2 * MB, optimizado: false, sha256: "x" }, f))
      .toBe("Subido por revisor-01 el 2026-11-02, 2 MB");
  });

  it("solo permite marcar presentado un plano con archivo o ya presentado", () => {
    expect(puedeMarcarPresentado({ estado: "NO_PRESENTADO", tieneDocumentoPropio: false })).toBe(false);
    expect(puedeMarcarPresentado({ estado: "NO_PRESENTADO", tieneDocumentoPropio: true })).toBe(true);
    expect(puedeMarcarPresentado({ estado: "PRESENTADO", tieneDocumentoPropio: false })).toBe(true);
    expect(puedeMarcarPresentado(undefined)).toBe(false);
  });
});
