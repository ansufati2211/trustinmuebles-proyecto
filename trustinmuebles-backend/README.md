# Trustinmuebles — Backend

Backend (Spring Boot 4, Java 21) de la plataforma PropTech del informe de Arquitectura Empresarial:
**Semáforo Legal**, inspección estructural con pines sobre planos 2D, trazabilidad del trámite y postventa.

SUNARP/SPRL se **simula** con copias literales de prueba (`src/main/resources/mock-sunarp/`), según la Limitación 1.8.

## Arquitectura
Monolito modular (Spring Modulith). Cada módulo es un paquete con su API, sus entidades y sus tablas; los módulos solo se
comunican por sus APIs públicas o por eventos, y `ModularityTests` lo verifica en cada build (REQ-NF02).

| Módulo | Responsabilidad | Requisito |
|---|---|---|
| `identidad` | Usuarios, roles, JWT, CORS | NF03 |
| `almacenamiento` | Archivos cifrados (AES-256-GCM) en disco | NF03 |
| `registro` | Puerto `RegistroPublicoPort` + adaptador mock de SUNARP | NF02 |
| `semaforo` | Motor de reglas Verde/Amarillo/Rojo + explicaciones en lenguaje llano | F01, NF01, RN-01 |
| `inspeccion` | Inspecciones y pines sobre plano 2D | F02 |
| `inmueble` | Catálogo, planos, tour 3D y ficha de auditoría | F05 |
| `tramite` | Etapas, línea de tiempo con hash encadenado, documentos y firmas | F03, NF03 |
| `postventa` | Propiedad adquirida, mantenimientos y tickets de garantía | F04, RN-02 |
| `metricas` | KPIs del Capítulo III | — |

Para cambiar el mock por el registro real basta con otra implementación de `RegistroPublicoPort`.
Si el registro no responde, el semáforo devuelve la última evaluación marcada `desactualizada: true` (plan de contingencia).

## Ejecutar
Requisitos: Java 21 y Maven (o Docker).

```bash
mvn spring-boot:run          # H2 en ./data/h2, API en http://localhost:8080
docker compose up --build    # PostgreSQL + app
mvn test                     # 18 tests: reglas del semáforo, límites de módulos y flujo completo
```

Swagger: http://localhost:8080/swagger-ui.html · Documentación de módulos: `target/spring-modulith-docs/` tras `mvn test`.

## Usuarios demo (contraseña `demo1234`)
`juan.perez@demo.pe` (comprador) · `maria.fernandez@demo.pe` (gestora legal) · `luis.paredes@demo.pe` (inspector) ·
`rosa.huaman@demo.pe` (vendedora) · `admin@demo.pe`

Propiedades 1–8 cubren: verde (1, 2, 3, 8), amarillo por hipoteca (4), amarillo por área (6), rojo por embargo (5) y rojo por bloqueo (7).

## Reglas de negocio
- **RN-01**: luz verde solo sin embargos, bloqueos, medidas judiciales ni cargas; hipoteca vigente, carga técnica o área
  distinta en más de 5 % dan amarillo; embargo, bloqueo, demanda, medida cautelar o titular distinto dan rojo.
- **RN-02**: un ticket exige una transacción finalizada, ser el comprador y un plano 2D de la vivienda.
- La auditoría de un trámite no se aprueba mientras el Semáforo Legal esté en rojo.
- `GET /api/v1/transacciones/{id}/integridad` recalcula la cadena `hash = SHA256(evento + hashPrevio)`.

## Variables de entorno
`DB_URL`, `DB_USER`, `DB_PASSWORD` (perfil `postgres`), `APP_JWT_SECRET`, `APP_STORAGE_KEY`, `APP_CORS_ALLOWED_ORIGINS`,
`APP_SEED_ENABLED=false` para no crear datos demo.
