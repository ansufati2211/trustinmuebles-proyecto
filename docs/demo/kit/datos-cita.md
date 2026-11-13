# Kit: datos para el formulario «Solicitar cita»

Se usan en el **paso 4 del guion** ([GUION-DEMO.md](../GUION-DEMO.md)), sin sesión, desde la ficha del lote
**Mz. C Lote 12 de Altos de Ventisca** (`#/proyectos/altos-de-ventisca/lotes/C-12`) o desde el panel del plano. Si ese lote
ya no está disponible, cualquier lote disponible del mismo proyecto sirve.

El formulario no pide DNI, apellidos ni dirección: solo un nombre de pila y un medio de contacto, con consentimiento. El
correo es de un dominio reservado para documentación (`example.com`): no llega a nadie.

| Campo del formulario | Qué se escribe o se elige |
|---|---|
| ¿Qué prefieres? | **Visita al lote** |
| Primera fecha | **pasado mañana** (el calendario no deja elegir hoy ni más de 90 días) |
| Franja | **Mañana (9:00 a 13:00)** |
| Segunda fecha (opcional) | vacía |
| Nombre | `Carla` |
| Cómo te contactamos | **Correo** |
| Correo | `carla.visita@example.com` |
| Forma de pago | **Financiado** |
| Presupuesto máximo (S/, opcional) | `45000` |
| Mensaje (opcional) | `Quisiera ver el lote con mi familia un sábado por la mañana.` |
| Casilla de consentimiento | **Marcar** |
| Botón | **Enviar solicitud** |

**Debe verse:** el mensaje de recibido en verde, en lugar del botón. La cita queda **por confirmar**.

Después, en el **paso 10**, el asesor (`asesor-01`) abre **Interesados**, elige a **Carla** (etapa *Nuevo*, «Tiene una
cita por confirmar») y pulsa **Confirmar … · mañana**: Carla pasa sola a *Cita agendada*.

## Qué no escribir

- Ningún DNI ni número de documento: un número de 8 dígitos seguidos en el mensaje se rechaza.
- Ningún celular inventado: si se quiere mostrar el medio «Celular», usar el propio del presentador y borrar el registro
  al terminar (en la ficha del interesado: «Eliminar el registro a pedido»).

## Si el formulario dice que se superó el límite

El portal acepta 10 envíos por hora desde la misma conexión. En un ensayo repetido, esperar una hora o reiniciar el
backend (el límite vive en memoria).
