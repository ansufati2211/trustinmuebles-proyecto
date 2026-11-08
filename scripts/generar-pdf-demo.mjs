// Genera dos PDF ficticios para la demo de la v0.8 (sin datos de nadie): un plano chico y un «escaneo» de unos 5,4 MB que el
// servidor optimiza al subirlo. No se guardan en el repositorio.
// Uso: node scripts/generar-pdf-demo.mjs [carpeta]   (por defecto, la carpeta temporal del sistema)
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** Un PDF de una página con una imagen RGB sin comprimir: degradado con ruido leve, como un plano escaneado. */
function pdfConImagen(ancho, alto) {
  const px = Buffer.alloc(ancho * alto * 3);
  let semilla = 7;
  const azar = () => (semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * 3;
      px[i] = Math.min(255, (x * 255) / ancho + azar() * 18);
      px[i + 1] = Math.min(255, (y * 255) / alto + azar() * 18);
      px[i + 2] = Math.min(255, 120 + azar() * 18);
    }
  }
  const partes = [];
  const offsets = [];
  let largo = 0;
  const agregar = (b) => { partes.push(b); largo += b.length; };
  const objeto = (n, cuerpo) => { offsets[n] = largo; agregar(Buffer.from(`${n} 0 obj\n${cuerpo}\nendobj\n`, "latin1")); };
  agregar(Buffer.from("%PDF-1.4\n", "latin1"));
  objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objeto(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objeto(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>");
  offsets[4] = largo;
  agregar(Buffer.from(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${px.length} >>\nstream\n`, "latin1"));
  agregar(px);
  agregar(Buffer.from("\nendstream\nendobj\n", "latin1"));
  const contenido = "q 555 0 0 802 20 20 cm /Im1 Do Q";
  objeto(5, `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
  const xref = largo;
  let tabla = "xref\n0 6\n0000000000 65535 f \n";
  for (let n = 1; n <= 5; n++) tabla += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  agregar(Buffer.from(`${tabla}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`, "latin1"));
  return Buffer.concat(partes);
}

const carpeta = process.argv[2] ?? path.join(os.tmpdir(), "trustinmuebles-demo-v08");
mkdirSync(carpeta, { recursive: true });
const chico = path.join(carpeta, "plano-chico.pdf");
const grande = path.join(carpeta, "plano-escaneado-grande.pdf");
writeFileSync(chico, pdfConImagen(300, 200));
writeFileSync(grande, pdfConImagen(1700, 1100));
console.log(`PDF de la demo:\n  ${chico}\n  ${grande} (más de 5 MB: se optimiza al subirlo)`);
