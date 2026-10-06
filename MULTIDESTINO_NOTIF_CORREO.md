# Plan: Multidestino + Notificaciones por Correo (SUVT)

**Emparentado con:** `PLAN_MULTIDESTINO.md` (feature multi-destino completa).
**Estado:** Aprobado — pendiente de implementación.
**Rama de trabajo:** `desarrollo`
**Flujo de entrega:** `desarrollo` → PR a `main` (check `build-apk`) → merge → deploy hooks a Render.
**Nota:** Los cambios de esquema en BD (local y Render) los aplica el usuario (SQL / `prisma db push`).

---

## Alcance

1. **Misiones multi-destino** desde la creación (jefatura) — ver `PLAN_MULTIDESTINO.md` secciones 1–4.
2. **Agregar destino en ruta** (admin, durante la misión) — sección 6.
3. **Misión de emergencia** (motorista solicita traslado a casa) — sección 7.
4. **Notificaciones por correo** en las dos transiciones clave — sección 8 (a continuación).

---

## Sección 8: Notificaciones por correo electrónico

**Objetivo:** avisar automáticamente las dos transiciones clave del flujo; el resto de pasos los revisan los involucrados en sus sesiones.

1. **Jefatura crea misión** (`POST /misiones`) → **correo al admin** (nueva solicitud: ID misión, unidad, objetivo, destinos, solicitante, fecha/hora).
2. **Admin asigna/aprueba** (`PATCH /misiones/:id/assign` con estado `aprobada`) → **correo al motorista asignado** (misión, vehículo, destinos, fecha/hora).

**Decisiones confirmadas:**
- **Destinatario admin:** variable `EMAIL_ADMINS` (ya configurada en `backend/.env` y Render).

   > Nota verificada: `backend/.env:28` define `EMAIL_ADMINS=jose.ramirez@rnpn.gob.sv`; en Render la variable debe existir (misma convención que el resto de secrets).
- **Fallas de correo:** **no-bloqueante** → se loggea el error y la misión se crea/asigna igual (SMTP caído o correo inválido no rompen el flujo).
- **Validación local:** el usuario prueba con su SMTP real antes del PR.

### Infraestructura existente (verificada)

- `backend/src/services/notifications/email.service.ts` — transporte nodemailer ya configurado (SMTP Gmail vía env vars), con `enviarResumenDiario` y `verificarMantenimiento` (envían a `EMAIL_ADMINS`).
- `backend/src/jobs/cron.ts` — cron jobs que ya usan el transporter (resumen diario 6:00, mantenimiento lunes 7:00).
- El motorista se relaciona con un `Usuario` (`Motorista.usuario`, y `Usuario.correo`) → correo del motorista obtenible via `mision.motorista.usuario.correo`.

### Implementación

**`services/notifications/email.service.ts`** — dos funciones nuevas reutilizando el `transporter` existente:
- `notificarNuevaSolicitud(mision)` → `to: EMAIL_ADMINS`. Contenido: ID misión, unidad solicitante, objetivo, destinos (N), solicitante, fecha/hora estimada.
- `notificarMisionAsignada(mision)` → `to: mision.motorista.usuario.correo`. Contenido: ID misión, vehículo (placa/marca/modelo), destinos, fecha/hora, aviso de inicio de misión en su panel.

**`controllers/misiones.controller.ts`:**
- `create`: tras insertar la misión, disparar `notificarNuevaSolicitud` (fire-and-forget; envolver en try/catch → solo log de error).
- `assign`: si `estado_mision === 'aprobada'` y hay motorista con usuario vinculado, disparar `notificarMisionAsignada`.

### Cobertura

- Funciona automáticamente para **misiones de emergencia** (sección 7) porque usan los mismos `create`/`assign`.
- No requiere cambios de esquema, frontend ni migración BD.

### Riesgo

- SMTP es dependencia externa: si falla, el flujo de misión **no se interrumpe** (diseño no-bloqueante).
- En producción, la variable `EMAIL_ADMINS` debe existir en Render (si falta, el cliente nodemailer podría resolver al default `ADMIN_EMAIL || SMTP_USER` del código actual; se recomienda definirla explícita).