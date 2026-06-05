# PLAN DE MIGRACIÓN A VERSIÓN MÓVIL — SUVT RNPN

## Estado actual

La aplicación está diseñada **solo para escritorio (~25% responsive)**. El layout usa un sidebar fijo de 256px sin adaptación para pantallas pequeñas. No se usan breakpoints `sm:` en ningún archivo.

## Enfoque

Usar Tailwind CSS (ya configurado) con sus breakpoints nativos:
- `sm:` (640px) — teléfonos landscape / tablets pequeñas
- `md:` (768px) — tablets / escritorio pequeño
- `lg:` (1024px) — escritorio

No se cambia tecnología ni se reescriben componentes. Solo se agregan clases responsive.

---

## Fase 1 — Sidebar responsive + Layout (fundacional)

**Archivos**: `src/components/Layout.tsx`, `src/components/Sidebar.tsx`

### Sidebar (`Sidebar.tsx`)
- En móvil (<768px) se oculta completamente con `-translate-x-full`
- Al hacer clic en botón hamburguesa, se desliza desde la izquierda (`translate-x-0`)
- Se agrega un backdrop oscuro (`bg-black/50`) detrás del sidebar cuando está abierto
- El sidebar mantiene `fixed left-0 top-0 h-screen w-64 z-50`

### Layout (`Layout.tsx`)
- Se agrega estado `sidebarOpen` con `useState(false)`
- Se pasa función `toggleSidebar` al Sidebar y al botón hamburguesa
- `<main>`: `ml-64` → `md:ml-64` (sin margen en móvil)
- `<main>`: `p-8` → `p-4 md:p-8`
- Se agrega un header sticky con botón hamburguesa (visible solo en móvil)
- Se agrega backdrop overlay condicional

---

## Fase 2 — Formularios: grids de 2 columnas → responsive

**Archivos**: Programacion.tsx, Vehiculos.tsx, Motoristas.tsx, Usuarios.tsx, MisionesJefatura.tsx, GestionMisiones.tsx, PanelMotorista.tsx

### Cambio
```tsx
// Antes
<div className="grid grid-cols-2 gap-4">

// Después
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

Aproximadamente **15-20 ocurrencias** en modales y formularios CRUD.

### Ejemplos por archivo
- **Programacion.tsx**: grid de motorista+estado, vehiculo+fecha, unidad+destino, misión+hora, detalle de misión
- **Vehiculos.tsx**: campos de formulario en modal
- **Motoristas.tsx**: datos personales, licencia, asignación de vehículo
- **Usuarios.tsx**: rol+estado, correo+contraseña
- **MisionesJefatura.tsx**: fecha+hora, lugar+propósito
- **GestionMisiones.tsx**: campos de filtro y asignación

---

## Fase 3 — Tablas: scroll horizontal + acciones compactas

**Archivos**: GestionMisiones.tsx, MisionesJefatura.tsx, Motoristas.tsx, Usuarios.tsx, Vehiculos.tsx

### Cambios
- Mantener `overflow-x-auto` como base para scroll horizontal
- Botones de acción: `p-3` → `p-2 sm:p-3`
- Iconos de botones: `size={18}` → `size={16} sm:size={18}`
- Botones con texto + icono: usar `hidden sm:inline` en el texto, mostrar solo icono en móvil
- Celdas: `whitespace-nowrap` para evitar saltos de línea feos
- Texto en tablas: `text-xs sm:text-sm`

---

## Fase 4 — Headers de página

**Archivos**: GestionMisiones.tsx, Dashboard.tsx, PanelMotorista.tsx, ControlSeguridad.tsx, Login.tsx

### Cambio
```tsx
// Antes (en los que no lo tienen)
<div className="flex flex-col items-start gap-4">

// Después
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
```

Inputs de búsqueda: `w-full md:max-w-md`

---

## Fase 5 — Ajustes específicos por página

### Login.tsx
- Blobs decorativos: `absolute -top-20 -right-20 w-96 h-96` → agregar `hidden md:block`
- Card: `p-10` → `p-6 sm:p-10`

### Dashboard.tsx
- Ajustar padding de tarjetas de estadísticas
- Ya tiene `md:grid-cols-2 lg:grid-cols-4` — mantener

### PanelMotorista.tsx
- Grid de acciones: `grid-cols-2 gap-4` → `grid-cols-1 sm:grid-cols-2 gap-3`
- Card: `p-8` → `p-4 sm:p-6`

### ControlSeguridad.tsx
- Botones "REGISTRAR SALIDA" / "REGISTRAR ENTRADA": texto largo → en móvil usar texto corto o icono+texto
- Ya tiene `md:grid-cols-2` en el grid principal — mantener

### Programacion.tsx (la más compleja)
- Calendario semanal `lg:grid-cols-7`:
  - En móvil: usar `overflow-x-auto` para scroll horizontal entre días
  - O mostrar solo el día actual con navegación día a día
- Formularios: todos los `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`

### Reportes.tsx
- Ya tiene `lg:grid-cols-3` — ok
- Cards responsive por defecto

---

## Fase 6 — Sidebar desktop refinements

**Archivo**: `Sidebar.tsx`

- Ajustar tamaños de íconos en móvil (`size={20}` → `size={18} sm:size={20}`)
- Reducir padding en móvil si es necesario
- Asegurar z-index correcto para el overlay backdrop

---

## Resumen de esfuerzo

| Fase | Archivos | Cambios aprox. | Dependencias |
|------|----------|---------------|--------------|
| 1 — Sidebar + Layout | 2 | ~40 líneas | Ninguna |
| 2 — Form grids | ~7 | ~25 ediciones | Ninguna |
| 3 — Tablas | ~5 | ~40 líneas | Ninguna |
| 4 — Headers | ~5 | ~15 líneas | Ninguna |
| 5 — Login | 1 | ~4 líneas | Ninguna |
| 5 — PanelMotorista | 1 | ~6 líneas | Ninguna |
| 5 — ControlSeguridad | 1 | ~3 líneas | Ninguna |
| 5 — Programacion | 1 | ~25 líneas | Ninguna |
| 6 — Sidebar refinements | 1 | ~8 líneas | Fase 1 |

**Total**: ~12 archivos, ~170 líneas modificadas

## Orden de implementación sugerido

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 (Login, PanelMotorista, ControlSeguridad, Programacion) → Fase 6
```

Cada fase es independiente y se puede probar por separado.
