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

**Opción B1 — `prisma db push` (recomendada)** — lee `schema.prisma`, crea la tabla `destino_mision` y agrega la columna `id_destino_mision`:

```powershell
cd C:\SUVT\backend

# Local (XAMPP)
$env:DATABASE_URL="mysql://root:@localhost:3306/rnpn_vehiculos_nueva"
npx prisma db push --schema=prisma/schema.prisma

# Producción (Aiven) — misma página, URL del secret de Render
$env:DATABASE_URL="mysql://<usuario>:<contraseña>@<host-aiven>:<puerto>/rnpn_vehiculos_nueva"
npx prisma db push --schema=prisma/schema.prisma
```

**Opción B2 — Importar el SQL (alternativa con control manual)**
- Local: phpMyAdmin (XAMPP) → `rnpn_vehiculos_nueva` → Importar → `database/migrations/003_destinos_multiples.sql`.
- Producción: cliente de Aiven (consola web o CLI) → misma BD → mismo archivo.

### C. Verificar

```sql
SHOW TABLES LIKE 'destino_mision';                     -- debe aparecer
SHOW COLUMNS FROM log_movimientos_mision LIKE 'id_destino_mision';  -- debe existir
SELECT * FROM destino_mision;                          -- misión con destino → 1 fila (orden 1)
```

### D. Cuándo aplicar

| Ambiente | Cuándo |
|---|---|
| Local | Antes de abrir el PR, para probar la feature |
| Producción | Cuando el PR esté mergeado y deployado en Render (puede ser con retraso sin romper nada: campos nuevos opcionales) |

### E. Seguridad

- El esquema nuevo es **aditivo** (CREATE + ALTER): no borra ni renombra nada. Misiones existentes se mantienen y se les crea su fila con el valor actual de `destino`.
- Recomendado: respaldo (export) de la BD antes de aplicar en Aiven.