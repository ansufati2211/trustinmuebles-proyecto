/*
 * v1.0 (etapa 6): créditos de las imágenes que usa el sitio. Solo se muestran fotos con licencia libre (las de
 * public/img/casas/CREDITOS.md con licencia Creative Commons o CC0, y las de Unsplash con su licencia). Las fichas cuya
 * foto no tenía una licencia libre («Referencial académico») usan una ilustración propia del sitio hasta que se agreguen
 * fotos de Unsplash.
 */

export interface CreditoImagen {
  archivo: string;
  /** Dónde se usa en el sitio. */
  uso: string;
  descripcion: string;
  obra: string;
  enlace: string;
  licencia: string;
  enlaceLicencia: string;
}

const CC: Record<string, string> = {
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "Licencia de Unsplash": "https://unsplash.com/license",
};

const commons = (archivo: string, uso: string, descripcion: string, obra: string, licencia: string): CreditoImagen => ({
  archivo, uso, descripcion, obra, enlace: `https://commons.wikimedia.org/wiki/${obra.replace(/ /g, "_")}`, licencia,
  enlaceLicencia: CC[licencia],
});

const unsplash = (archivo: string, uso: string, descripcion: string, foto: string): CreditoImagen => ({
  archivo, uso, descripcion, obra: `Foto de Unsplash (${foto})`, enlace: `https://unsplash.com/photos/${foto}`,
  licencia: "Licencia de Unsplash", enlaceLicencia: CC["Licencia de Unsplash"],
});

/** Fotos de las fichas de inmuebles, por código de caso. Todas con licencia libre (CREDITOS.md). */
export const FOTOS_LIBRES: Record<string, CreditoImagen> = {
  "11048217": commons("casas/casa-1.jpg", "Ficha del inmueble 11048217 (Parcona)", "Vivienda de un piso con reja y cochera", "File:383 La Retama, Surquillo.jpg", "CC0 1.0"),
  "11052690": commons("casas/casa-2.jpg", "Ficha del inmueble 11052690 (La Tinguiña)", "Vivienda urbana de ladrillo con reja y cochera", "File:Urbanizacion Zamacola - panoramio.jpg", "CC BY 3.0"),
  "11070419": commons("casas/casa-4.jpg", "Ficha del inmueble 11070419 (Los Aquijes)", "Vivienda de un piso con portones de cochera", "File:CASA EN SAN MIGUEL.jpg", "CC BY-SA 4.0"),
  "11075836": commons("casas/casa-5.jpg", "Ficha del inmueble 11075836 (Pueblo Nuevo)", "Vivienda residencial urbana con cochera", "File:Lima, Peru - modern home.jpg", "CC BY 2.0"),
  "11098467": commons("casas/casa-8.jpg", "Ficha del inmueble 11098467 (Pachacútec)", "Vivienda con segundo piso en construcción", "File:AvUniversitaria.20220409 084831 HDR.jpg", "CC BY-SA 4.0"),
  "11081204": commons("casas/lote-santiago.jpg", "Ficha del lote 11081204 (Santiago)", "Lote urbano cercado en suelo costero", "File:Huanchaco Peru- new buildings being built near Cerro La Virgen on outskirts.jpg", "CC BY 4.0"),
  "80194645": commons("casas/lote-supe.jpg", "Ficha del lote 80194645 (Supe)", "Terreno eriazo en el valle de Supe", "File:Valle del supe.jpg", "CC BY-SA 4.0"),
};

/** Fotos de las páginas del sitio (antes enlazadas desde Unsplash, hoy guardadas en public/img). */
export const FOTOS_DEL_SITIO: CreditoImagen[] = [
  unsplash("vivienda-moderna-piscina.jpg", "Inicio", "Vivienda moderna con piscina", "photo-1600596542815-ffad4c1539a9"),
  unsplash("vivienda-fachada-nocturna.jpg", "Ingreso del personal", "Fachada de vivienda de noche", "photo-1600585154340-be6161a56a0c"),
  unsplash("maqueta-casa-llaves.jpg", "Expedientes", "Maqueta de casa con llaves", "photo-1560518883-ce09059eeffa"),
  unsplash("firma-documentos.jpg", "Registrar partida", "Firma de documentos", "photo-1450101499163-c8848c66ca85"),
];

/** Todas, para la página «Créditos de imágenes». */
export const CREDITOS_IMAGENES: CreditoImagen[] = [...Object.values(FOTOS_LIBRES), ...FOTOS_DEL_SITIO];

/** ¿La licencia es libre? (Creative Commons, CC0 o la de Unsplash; nunca «Referencial académico»). */
export const licenciaLibre = (licencia: string) => licencia in CC;
