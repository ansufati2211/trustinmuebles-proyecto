# Lista de revisión para la demo del lunes 16/11/2026

Una página. Marca cada casilla. Guion: [GUION-DEMO.md](GUION-DEMO.md) · kit: [kit/LEEME-KIT.md](kit/LEEME-KIT.md).

## Domingo 15/11 (en casa, con calma)

- [ ] `main` tiene la etapa 8 fusionada y GitHub Actions publicó las imágenes nuevas (`ghcr.io/…-backend` y `…-frontend`, `latest`).
- [ ] **Reinicio de la base de la nube** (Portainer → Stacks → `trustinmuebles`): detener el stack, borrar el volumen
      `trustinmuebles_backend-data`, volver a desplegar con «Pull latest image». La base nace con los 4 proyectos, los precios
      nuevos, los 15 interesados y las 4 citas de los próximos 7 días (las fechas se mueven con el día de arranque).
- [ ] Contraseñas del stack: `APP_SEED_PASSWORD` (la de las 9 cuentas), `APP_JWT_SECRET` (32+ caracteres) y
      `APP_STORAGE_KEY`, anotadas fuera del repositorio. `APP_CONTACTO_WHATSAPP` vacía (usa el de LEDCONS) o con el número correcto.
- [ ] **En la nube, `APP_SEED_PASSWORD` es una contraseña propia del despliegue**, larga y distinta de la que se usa en las
      pruebas, en el recorrido o en la laptop de ensayo (la «de demo»). Es la contraseña con la que nacen **todas** las
      cuentas, también las de los asesores: quien la conozca entra como asesor y ve datos de contacto de los interesados.
      Nunca la dictes ni la escribas en el chat del curso.
- [ ] **Cuentas de asesor (etapa 9):** `APP_ASESORES` lista los códigos que el arranque crea si faltan, con
      `APP_SEED_PASSWORD` (por omisión, solo `asesor-01`; por ejemplo `asesor-01,asesor-02` para dos asesores). No cambia la
      contraseña ni el rol de una cuenta que ya existe: para cambiarla hay que reiniciar la base. Con un asesor más, la
      demo tiene 10 cuentas en lugar de 9.
- [ ] `node scripts/verificar-sitio.mjs https://<dominio-de-la-demo>` → **6 de 6 OK** (sitio, lista, detalle, plano,
      `robots.txt` con `Disallow`, partida oculta).
- [ ] `API_URL=https://<dominio-de-la-demo>/api/v1 APP_SEED_PASSWORD=<clave> node scripts/preparar-demo.mjs --solo-verificar`
      → todo OK; si algo falta, correrlo sin `--solo-verificar` (repone interesados y lotes; si falta un proyecto, reiniciar la base).
- [ ] Ensayo completo del guion de 15 minutos **en la nube**, en la laptop y en la tableta, cronometrado.
- [ ] Después del ensayo, volver a reiniciar la base (el ensayo carga el CSV, registra `INT-99000611` y crea a Carla).

## Lunes 16/11 (antes de presentar)

- [ ] Wi-Fi o datos del celular probados en el aula; cargador y adaptador HDMI.
- [ ] `verificar-sitio` otra vez → 6 de 6 OK. `preparar-demo --solo-verificar` → todo OK.
- [ ] Dos ventanas abiertas: una **sin sesión** (visitante) y otra **privada** para las cuentas `asesor-01` y `propietario-02`.
- [ ] Portada: barra con el logo y «LEDCONS»; cifras reales (inmuebles publicados, proyectos, lotes disponibles); pie con
      razón social, RUC, dirección, teléfonos, WhatsApp, Facebook y «con tecnología Trustinmuebles · versión 1.0.0».
- [ ] **CSV del kit en vivo:** `docs/demo/kit/proyecto-nuevo-80-lotes.csv` a mano (Horizonte de Los Aquijes debe tener 0
      lotes antes del paso 6). Vista previa sin errores → confirmar → 80 lotes. `proyecto-con-errores.csv` por si piden ver errores.
- [ ] Textos del kit a mano: `kit/partidas/INT-99000611-vivienda-sin-cargas.txt`, las 4 láminas de `kit/pdf/INT-99000611/`
      y `kit/datos-cita.md` (Carla, correo `@example.com`). Frase del asistente: `lote en Subtanjalla de menos de 80 mil soles`.
- [ ] Registrar un interesado **desde el panel** (canal Llamada, consentimiento verbal) si preguntan por clientes que llaman.
- [ ] **Etapa 9, si preguntan por Excel o por la ubicación:** el número junto a «Interesados» (interesados nuevos);
      «Exportar a CSV» en la bandeja (lleva datos de contacto: no abrirlo en pantalla compartida con datos reales) y
      «Exportar lotes (CSV)» en Proyectos (abre en Excel y se puede volver a cargar); «Ubicación y pago» en Proyectos para
      pegar el enlace de Google Maps del lugar real (sin enlace no aparece «Cómo llegar»). Pestaña «Embudo» en Interesados.
- [ ] No mostrar ni dictar contraseñas en pantalla.

## Plan B (si la nube falla)

1. **Local:** `powershell -ExecutionPolicy Bypass -File scripts\reiniciar-demo.ps1`, arrancar el backend
   (`cd trustinmuebles-backend && APP_SEED_PASSWORD=<clave> ./mvnw spring-boot:run`) y la interfaz
   (`cd trustinmuebles && npm run dev`), luego `APP_SEED_PASSWORD=<clave> node scripts/preparar-demo.mjs` y
   `node scripts/verificar-sitio.mjs http://localhost:5173`.
2. **Sin red ni servidor:** las capturas del recorrido en `docs/pruebas/uso-v10/capturas/` (laptop) y
   `docs/pruebas/uso-v10/capturas-tableta/` (tableta), en orden, con el guion al lado.
3. **Algo se rompió a mitad:** `preparar-demo.mjs` repone interesados y lotes sin borrar nada; un proyecto que falta solo
   vuelve reiniciando la base.

Lo que no se promete en la demo: compra segura, saneamiento, pagos en línea ni documentos emitidos por SUNARP, una
municipalidad o un colegio profesional. La autorización escrita de LedCons para usar su marca sigue pendiente (D72).
