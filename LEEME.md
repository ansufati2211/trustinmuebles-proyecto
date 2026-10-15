# Trustinmuebles — plataforma PropTech (proyecto completo)

Dos carpetas:
- `trustinmuebles-backend/` — API Spring Boot 4 (Java 21). Ver su README.md.
- `trustinmuebles/` — front React + Vite.

## Requisitos
Java 21, Maven 3.9+, Node 20+ y pnpm 9.

## Cómo correrlo (dos terminales)
1. Backend:  `cd trustinmuebles-backend && mvn spring-boot:run`   → http://localhost:8080 (Swagger: /swagger-ui.html)
2. Front:    `cd trustinmuebles && pnpm install && pnpm dev`      → http://localhost:5173/trustinmuebles/

No hace falta instalar ninguna base de datos: el backend usa H2 (archivo en `trustinmuebles-backend/data/`)
y crea sola las tablas y los datos demo al arrancar. Para empezar de cero, borra esa carpeta `data/`.

## Usuarios demo (contraseña: demo1234)
- juan.perez@demo.pe — comprador (tiene trámites y patrimonio)
- maria.fernandez@demo.pe — gestora legal
- luis.paredes@demo.pe — inspector
- rosa.huaman@demo.pe — vendedora
- admin@demo.pe — administrador

## Pruebas
`cd trustinmuebles-backend && mvn test`  (30 pruebas)

Nota: SUNARP está simulado con datos de prueba (trustinmuebles-backend/src/main/resources/mock-sunarp/).
