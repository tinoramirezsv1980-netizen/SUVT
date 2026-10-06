# Plan: Misiones con Múltiples Destinos (SUVT)

**Estado:** Aprobado por el usuario.
**Rama de trabajo:** `desarrollo`
**Flujo de entrega:** `desarrollo` → PR a `main` (check `build-apk`) → merge → deploy hooks a Render.
**Nota:** Los cambios de esquema en BD (local y Render) los aplica el usuario (SQL / `prisma db push`).

---

## Decisiones confirmadas

1. **Esquema en producción:** se entrega migración SQL `003_destinos_multiples.sql` + comando `prisma db push` listo; el usuario lo ejecuta en la BD local y de Render tras el merge.
2. **Selector de destinos:** autocompletado desde catálogo `area_destino` con opción de texto libre (`id_area_destino` nullable).
3. **Cerrar misión:** se habilita tras registrar `salida_destino` del último destino (`orden_visita` máximo).

---

## 1. Modelo de datos (Option A)

Nueva tabla `destino_mision`. `Mision.destino` se mantiene = nombre del **primer** destino (compatibilidad con listados/dashboard).

```prisma
model DestinoMision {
  id_destino_mision Int           @id @default(autoincrement())
  id_mision         Int
  id_area_destino   Int?
  nombre_destino    String        @db.VarChar(255)
  orden_visita      Int
  mision            Mision        @relation(fields: [id_mision], references: [id_mision], onDelete: Cascade)
  area_destino      AreaDestino?  @relation(fields: [id_area_destino], references: [id_area])
  movimientos       LogMovimientoMision[]

  @@unique([id_mision, orden_visita])
  @@map("destino_mision")
}
```

Cambios relacionados:
- `AreaDestino` gana collection `destinos_mision DestinoMision[]`.
- `LogMovimientoMision` gana `id_destino_mision Int?` + relación → cada `llegada_destino`/`salida_destino` queda ligado al destino concreto (registro paso a paso por destino).
- `Mision` gana collection `destinos DestinoMision[]`.

## 2. Migración SQL (`database/migrations/003_destinos_multiples.sql`)

- `CREATE TABLE destino_mision` con FK `id_mision` (cascade), `id_area_destino` nullable y `UNIQUE(id_mision, orden_visita)`.
- `ALTER TABLE log_movimientos_mision ADD id_destino_mision` + FK.
- Backfill: cada misión existente con `destino` → fila orden 1 con `id_area_destino` NULL.

## 3. Backend

- **`prisma/schema.prisma`**: modelos/relaciones nuevas + `npx prisma generate`.
- **`controllers/misiones.controller.ts`**:
  - `create`: acepta `destinos: [{ id_area_destino?, nombre_destino }]` (ordenado). Mantiene compatibilidad si llega solo `destino` (string, se convierte en un solo destino). `Mision.destino` ← primer elemento.
  - `getAll`: `include destinos` ordenado por `orden_visita`.
  - `addMovement`: acepta `id_destino_mision` opcional y lo persiste en el log.
- **Nuevo endpoint catálogo** `routes/areas.routes.ts` + controller → `GET /areas` (listado activo de `AreaDestino`), montado en `routes/index.ts`.

## 4. Frontend

- **`types/index.ts`**: `AreaDestino`, `DestinoMision`, `Mision.destinos: DestinoMision[]`, `LogMovimientoMision.id_destino_mision`.
- **`pages/MisionesJefatura.tsx`**:
  - Formulario dinámico "Destinos de la Misión": agregar/quitar filas, autocompletado desde catálogo con opción de texto libre, mínimo 1 destino.
  - Submit envía `destinos[]`; `destino` ← primer destino.
  - Tabla muestra "N destinos" cuando hay más de uno.
- **`pages/PanelMotorista.tsx`**:
  - Tarjeta muestra la ruta ordenada (lista de destinos).
  - Botones Llegada/Salida **por destino**, habilitados en secuencia según movimientos ligados por `id_destino_mision`.
  - **Cerrar Misión** habilitado tras `salida_destino` del último `orden_visita`.
  - `handleRegisterEvent` envía `id_destino_mision`.
- **`utils/pdfGenerator.ts`**: sección "Lugar de Visita" lista los N destinos numerados (multi-línea dentro del recuadro y=60–73).
- **`pages/GestionMisiones.tsx`** y **`pages/Dashboard.tsx`**: reflejan N destinos en listados/detalles.

## 5. Despliegue

- Pipeline: `desarrollo` → PR a `main` → check `build-apk` → merge → hooks deploy a Render.
- El Dockerfile backend actual **no** ejecuta `prisma db push` (solo `prisma generate`); el esquema se aplica a producción por el usuario.

## 6. Agregar destino en ruta (admin, durante la misión)

**Escenario:** misión solicitada a un solo destino; durante el curso de la misión surge la necesidad de ir a otro destino (aprovechamiento del mismo recurso). El **admin** lo agrega sin interrumpir la operación.

**Decisiones confirmadas:**
- **Permiso:** solo rol `admin` (mismo middleware `permitirSoloAdmin`, `misiones.routes.ts:14`).
- **Orden:** el nuevo destino se agrega **al final de la ruta** (`orden_visita = max + 1`).
- **Estado permitido:** `aprobada` **y** `en_curso` (rechazar si la misión está `finalizada`).

### Implementación

**Backend:**
- Nuevo endpoint `PATCH /misiones/:id/destinos`, body `{ id_area_destino?, nombre_destino }`.
- Controller: valida estado (`aprobada`/`en_curso`), inserta `DestinoMision` con `orden_visita = max + 1`, **no** modifica `Mision.destino` (sigue = primer destino).

**Frontend:**
- `GestionMisiones.tsx` (ruta `/programacion`, visible solo admin): botón **"Agregar Destino en Ruta"** para misiones `aprobada`/`en_curso`, con el mismo selector/autocompletado del catálogo del formulario de jefatura.

**Flujo automático (sin cambios extra):**
- `PanelMotorista` refleja la ruta actualizada al recargar; el destino nuevo queda pendiente y se integra a la secuencia por `id_destino_mision`.
- **Cerrar Misión** se re-bloquea correctamente: exige `salida_destino` del nuevo último `orden_visita`.
- El PDF lista los N destinos incluido el agregado.

## 7. Misión de emergencia — motorista solicita traslado (vehículo a casa)

**Escenario normativo:** por incidente en la base de vehículos, fuera de horario, el motorista necesita llevarse un vehículo institucional a su domicilio y regresarlo al día siguiente. **Política institucional:** la misión se **finaliza el siguiente día** cuando el vehículo vuelve a la base (el evento `finalizacion` ya soporta `fecha_hora` del día posterior — sin cambios).

**Decisiones confirmadas:**
1. **Unidad fija "Base/Parqueo de Vehículos"**: se crea y se usa por defecto en misiones de motorista (se referencia por su `id_unidad`; no requiere tocar esquema de otras tablas).
2. **Asignación del vehículo**: solo el admin lo asigna al aprobar la solicitud (`assign` existente); el motorista no elige vehículo.
3. **Estado visible**: el panel del motorista muestra sus solicitudes con estado (pendiente/aprobada/rechazada) para verificar si fue aprobado.
4. **Señal de emergencia**: campo nuevo `es_emergencia Boolean @default(false)` en `Mision`, visible/diferenciable en reportes.

### Implementación

**Backend**
- `schema.prisma`: `Mision.es_emergencia Boolean @default(false)` (aditivo, opcional para el resto del flujo).
- `misiones.controller.ts`:
  - `create`: acepta `es_emergencia`. Si el solicitante es motorista (usuario con `id_motorista`), usa por defecto la unidad "Base/Parqueo de Vehículos" y asocia `id_motorista` = solicitante.
  - Validar `id_usuario_solicitante` = usuario logueado (evitar suplantación).
  - `getAll` incluye el campo nuevo (ya viaja en el objeto `Mision`).
- `database/migrations/003_destinos_multiples.sql` (o un `004`): `INSERT` de la unidad fija "Base/Parqueo de Vehículos" + `ALTER TABLE mision ADD es_emergencia TINYINT(1) NOT NULL DEFAULT 0`.

**Frontend**
- `PanelMotorista.tsx`:
  - Nueva sección **"Solicitar Vehículo (Emergencia/Traslado)"**: formulario (objetivo, destino=domicilio, fecha, observaciones) → `POST /misiones` con `es_emergencia: true`.
  - Lista de **mis solicitudes** con estado (badge pendiente/aprobada/rechazada), cargo de las misiones `solicitada` del motorista (hoy el filtro solo trae `aprobada`/`en_curso`).
- `Dashboard.tsx` y `pdfGenerator.ts` (opcional): etiqueta/insignia "EMERGENCIA" cuando `es_emergencia`.
- `GestionMisiones.tsx` (admin): la solicitud aparece con normalidad; el admin selecciona motorista + vehículo y aprueba (sin cambios estructurales).

**Flujo final (sin tocar el ciclo existente):**
```
Motorista solicita (es_emergencia, unidad Base/Parqueo, estado solicitada)
  → Admin aprueba y asigna vehículo (aprobada, id_motorista = solicitante)
    → salida_base (hoy) → llegada_destino (domicilio)
      → siguiente día: salida_destino → retorno_base → finalización
```

## 8. Notificaciones por correo electrónico

**Objetivo:** avisar automáticamente las dos transiciones clave del flujo; el resto de pasos los revisan los involucrados en sus sesiones.

1. **Jefatura crea misión** (`POST /misiones`) → **correo al admin** (nueva solicitud: ID misión, unidad, objetivo, destinos, solicitante, fecha/hora).
2. **Admin asigna/aprueba** (`PATCH /misiones/:id/assign` con estado `aprobada`) → **correo al motorista asignado** (misión, vehículo, destinos, fecha/hora).

**Decisiones confirmadas:**
- **Destinatario admin:** variable `EMAIL_ADMINS` (ya configurada en `backend/.env` y Render).

   > Nota verificada: `backend/.env:28` define `EMAIL_ADMINS=jose.ramirez@rnpn.gob.sv`; en Render la variable debe existir (misma convención que el resto de secrets).
- **Fallas de correo:** **no-bloqueante** → se loggea el error y la misión se crea/asigna igual (SMTP caído o correo inválido no rompen el flujo).
- **Validación local:** el usuario prueba con su SMTP real antes del PR.

**Implementación:**
- `services/notifications/email.service.ts`: dos funciones nuevas reutilizando el `transporter` existente:
  - `notificarNuevaSolicitud(mision)` → `to: EMAIL_ADMINS`.
  - `notificarMisionAsignada(mision)` → `to: mision.motorista.usuario.correo`.
- `controllers/misiones.controller.ts`:
  - `create`: tras insertar la misión, disparar `notificarNuevaSolicitud` (fire-and-forget, envolver en try/catch).
  - `assign`: si `estado_mision === 'aprobada'` y hay motorista con usuario, disparar `notificarMisionAsignada`.
- Cubre automáticamente las **misiones de emergencia** (Sección 7) porque usan los mismos `create`/`assign`.
- Sin cambios de esquema ni de frontend; no requiere migración BD.

---

## Apéndice: Cómo aplicar los cambios en la BD

> La BD **no** se actualiza sola con el deploy. Estos pasos los ejecuta el usuario (por la separación código/datos).

### A. Determinar a qué BD apunta el backend

```
# Local → XAMPP
mysql://root:@localhost:3306/rnpn_vehiculos_nueva

# Producción → Aiven (desde Render → suvt-backend → Environment → DATABASE_URL)
mysql://<usuario>:<contraseña>@<host-aiven>:<puerto>/rnpn_vehiculos_nueva
```

### B. Aplicar (1 ejecución por ambiente)

**Opción B1 — `prisma db push` (recomendada)** — lee `schema.prisma`, crea la tabla `destino_mision` y agrega las columnas `id_destino_mision` y `es_emergencia`:

```powershell
cd C:\SUVT\backend

# Local (XAMPP)
$env:DATABASE_URL="mysql://root:@localhost:3306/rnpn_vehiculos_nueva"
npx prisma db push --schema=prisma/schema.prisma

# Producción (Aiven) — misma página, URL del secret de Render
$env:DATABASE_URL="mysql://<usuario>:<contraseña>@<host-aiven>:<puerto>/rnpn_vehiculos_nueva"
npx prisma db push --schema=prisma/schema.prisma

# Insertar unidad fija (una vez por ambiente)
mysql -u root -p rnpn_vehiculos_nueva -e "INSERT INTO unidad_organizativa (nombre_unidad) VALUES ('Base/Parqueo de Vehículos');"
# En Aiven: ejecutar el mismo INSERT en la consola del servicio.
```

**Opción B2 — Importar el SQL (alternativa con control manual)**
- Local: phpMyAdmin (XAMPP) → `rnpn_vehiculos_nueva` → Importar → `database/migrations/003_destinos_multiples.sql`.
- Producción: cliente de Aiven (consola web o CLI) → misma BD → mismo archivo.
- El archivo SQL incluye: `CREATE TABLE destino_mision`, `ALTER log_movimientos_mision ADD id_destino_mision`, `ALTER mision ADD es_emergencia TINYINT(1) NOT NULL DEFAULT 0`, y el `INSERT` de la unidad "Base/Parqueo de Vehículos".

### C. Verificar

```sql
SHOW TABLES LIKE 'destino_mision';                     -- debe aparecer
SHOW COLUMNS FROM log_movimientos_mision LIKE 'id_destino_mision';  -- debe existir
SHOW COLUMNS FROM mision LIKE 'es_emergencia';         -- debe existir (0/1)
SELECT * FROM destino_mision;                          -- misión con destino → 1 fila (orden 1)
SELECT * FROM unidad_organizativa WHERE nombre_unidad = 'Base/Parqueo de Vehículos';  -- clave de emergencia
```

### D. Cuándo aplicar

| Ambiente | Cuándo |
|---|---|
| Local | Antes de abrir el PR, para probar la feature |
| Producción | Cuando el PR esté mergeado y deployado en Render (puede ser con retraso sin romper nada: campos nuevos opcionales) |

### E. Seguridad

- El esquema nuevo es **aditivo** (CREATE + ALTER): no borra ni renombra nada. Misiones existentes se mantienen y se les crea su fila con el valor actual de `destino`.
- Recomendado: respaldo (export) de la BD antes de aplicar en Aiven.