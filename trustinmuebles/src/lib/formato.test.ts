import { describe, expect, it } from "vitest";
import { m2, precio, soles } from "./formato";

describe("formato de precios (v0.9)", () => {
  it("en soles, igual que soles()", () => {
    expect(precio(185000, "PEN", true)).toBe(soles(185000, true));
    expect(precio(185000, null, true)).toBe(soles(185000, true));
  });

  it("en dólares, con el prefijo US$ y separador de miles", () => {
    expect(precio(90096.39, "USD", true)).toBe("US$ 90,096");
    expect(precio(90096.39, "USD")).toBe("US$ 90,096.39");
  });

  it("sin monto, vacío", () => {
    expect(precio(null, "USD")).toBe("");
    expect(m2(null)).toBe("");
  });
});
