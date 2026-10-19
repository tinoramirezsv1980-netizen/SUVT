# EXPLICACIÓN PASO A PASO — IMPLEMENTACION_SUVT_2

**Sistema:** RNPN — Sistema de Control de Vehículos (SUVT)
**Documento base:** `IMPLEMENTACION_SUVT_2.md` (runbook de 24 secciones)
**Fecha de generación:** 6 de octubre de 2026
**Tema:** Explicación técnica y justificación del plan de adaptación a `rnpn_vehiculos_final`
**Proyecto paralelo:** `C:\SUVT-2`

Este documento **explica el porqué** de cada decisión del runbook. Los comandos exactos,
las rutas de archivo y los valores concretos están en `IMPLEMENTACION_SUVT_2.md`; aquí se
justifican.

---

## ÍNDICE

- [1. Objetivo del plan](#1-objetivo-del-plan)
- [2. Conceptos fundamentales](#2-conceptos-fundamentales)
- [3. Arquitectura Docker explicada](#3-arquitectura-docker-explicada)
- [4. Entornos: dónde corre qué](#4-entornos-dónde-corre-qué)
- [5. Bases de datos: qué cambia y qué no](#5-bases-de-datos-qué-cambia-y-qué-no)
- [6. Decisiones tomadas y su fundamento](#6-decisiones-tomadas-y-su-fundamento)
- [7. Las seis fases explicadas](#7-las-seis-fases-explicadas)
- [8. Seguridad: qué se corrigió y por qué](#8-seguridad-qué-se-corrigió-y-por-qué)
- [9. Riesgos corregidos del resguardo de documentos](#9-riesgos-corregidos-del-resguardo-de-documentos)
- [10. Docker frente a `npm run dev`](#10-docker-frente-a-npm-run-dev)
- [11. Cómo se verifica que todo funciona](#11-cómo-se-verifica-que-todo-funciona)
- [12. Conclusión](#12-conclusión)

---

## 1. Objetivo del plan

Crear **`C:\SUVT-2`**, una copia paralela y aislada del SUVT, adaptada para trabajar con la
base de datos **`rnpn_vehiculos_final`**, que añade dos funcionalidades:

1. **Misiones multi-destino:** una misión deja de tener un solo destino de texto y pasa a
   tener una lista de destinos con orden de visita (1, 2, 3…), lo que permite registrar
   llegadas y salidas por cada punto del recorrido.
2. **Misiones de emergencia (`es_emergencia`):** el conductor puede solicitar una misión
   urgente que Jefatura o Administración aprueba después.

**Condición fundamental:** `C:\SUVT` **no se modifica en absoluto**. Sigue sirviendo
`rnpn_vehiculos_nueva` en el puerto 8080 y en producción. Ambos proyectos pueden correr al
mismo tiempo sin contaminarse.

El plan se organiza en **seis fases**, con un orden estricto porque cada una presupone la
anterior:

| Fase | Nombre | Qué resuelve | ¿Depende de algo? |
|---|---|---|---|
| **0** | Seguridad | Fuga de `password_hash`, credenciales, `NODE_ENV` | No. Se hace primero porque toca producción |
| **1** | Poblar el espejo en Aiven | Base `rnpn_vehiculos_final` vacía → operativa | No |
| **2** | Local (A-F) | Copia `C:\SUVT-2` + código multi-destino | No |
| **3** | Servicios Render paralelos | `suvt2-backend` / `suvt2-frontend` en la nube | Fase 1 y 2 |
| **4** | Verificación en la nube | Pruebas end-to-end reales | Fase 3 |
| **5** | Cutover | Cambio de puntero de producción | Fase 4 (fuera de alcance) |

Las fases 0, 1 y 2 son **independientes entre sí**: cualquiera puede empezar hoy.

---

## 2. Conceptos fundamentales

| Concepto | Explicación |
|---|---|
| **Proyecto paralelo (`C:\SUVT-2`)** | Copia independiente del código, con su propia rama Git, sus propios contenedores, su propia red y su propio volumen de archivos subidos. |
| **Aislamiento por nombre de proyecto** | Docker nombra redes, contenedores y volúmenes con el nombre del directorio (`suvt` vs `suvt-2`). Eso basta para que los dos stacks no se vean. |
| **Multi-destino** | Cada destino vive en la tabla `destino_mision` con `orden_visita`. La columna `mision.destino` se mantiene como **primer destino** por compatibilidad con el PDF y el código heredado. |
| **Orden de visita estricto** | No se puede registrar la llegada al destino 2 antes de la salida del destino 1. El orden se impone en backend y en frontend. |
| **Puerta de cierre (gate)** | La misión solo se finaliza cuando el **destino de mayor `orden_visita`** tiene `salida_destino`. Evita cerrar misiones a medias. |
| **Balanceador (`lb`)** | Nginx es la única puerta de entrada: `/` → frontend, `/api/` → backend, `/health` → backend, `/uploads/` → backend. |
| **Un solo puerto publicado** | En Docker solo `lb` publica puerto al host (8080 SUVT, 8081 SUVT-2). Backend y frontend quedan dentro de la red. |
| **Rama segura (`feature/rnpn-vehiculos-final`)** | El workflow de CI/CD solo se dispara en `main` y `desarrollo`. En `feature/*` no hay despliegue automático: la rama es un espacio de trabajo seguro. |
| **Entorno espejo** | Segunda base de datos y segundo par de servicios en la nube, idénticos en forma a producción, para probar sin arriesgar lo que ya usan los usuarios. |

---

## 3. Arquitectura Docker explicada

### 3.1 Topología

```
Host Windows (localhost)
│
├─ SUVT ("suvt"): host:8080 → lb:80
│  ├─ /          → frontend:80  (réplicas)
│  ├─ /api/      → backend:4000 (réplicas)
│  ├─ /health    → backend
│  └─ /uploads/  → backend
│
└─ SUVT-2 ("suvt-2"): host:8081 → lb:80
   ├─ /          → frontend:80
   ├─ /api/      → backend:4000
   ├─ /health    → backend
   └─ /uploads/  → backend

Ambos → MySQL de XAMPP en el host (host.docker.internal:3306)
```

### 3.2 Por qué solo se publica un puerto

En `docker-compose.yml` únicamente el servicio `lb` tiene `ports:`. El backend (4000) y el
frontend (80) **no publican nada al host**: solo existen en la red interna. Eso significa que
el puerto 4000 es 100 % privado de Docker. Ventajas: un solo punto de entrada que es donde
se aplica CORS, un solo sitio donde poner TLS si toca, y cero puertos abiertos de más.

### 3.3 Prisma se genera dentro de la imagen

El cliente de Prisma se compila durante el build (`npx prisma generate`). Por eso **cualquier
cambio en `schema.prisma` obliga a** `docker compose up --build`: sin rebuild, el contenedor
sigue usando el cliente viejo y los errores son confusos.

### 3.4 No hay hot reload en Docker

El código entra en la imagen en el build. Iterar con `docker compose up --build` a cada
cambio es lento; para desarrollo se usa `npm run dev` (ts-node-dev + Vite con HMR) en los
puertos 4001/5174. Docker se reserva para pruebas de integración, que es lo más fiel a
producción.

### 3.5 Las variables salen del `.env` raíz

En modo contenedor, el `compose` lee **`.env` de la raíz del proyecto**, no `backend/.env`
(que además queda fuera de la imagen por `.dockerignore`). Por eso el SMTP y Cloudinary se
copian al `.env` raíz: si no, en contenedor no hay correo ni subida de documentos.
`frontend/.env` se ignora en Docker porque el frontend se construye con
`VITE_API_URL=/api` (ruta relativa al mismo origen, vía balanceador).

---

## 4. Entornos: dónde corre qué

| Entorno | Base de datos | URL | Servicios |
|---|---|---|---|
| **Local SUVT** | `rnpn_vehiculos_nueva` (XAMPP `localhost:3306`) | `localhost:8080` | `docker compose` en `C:\SUVT` |
| **Local SUVT-2** | `rnpn_vehiculos_final` (XAMPP `localhost:3306`) | `localhost:8081` | `docker compose` en `C:\SUVT-2` |
| **Producción** | `rnpn_vehiculos_nueva` en **Aiven MySQL** | `suvt-backend` / `suvt-frontend` en **Render** | Vigilados en la rama `desarrollo` |
| **Espejo paralelo** | `rnpn_vehiculos_final` en **otro servicio Aiven** | `suvt2-backend` / `suvt2-frontend` en **Render** | Rama `feature/rnpn-vehiculos-final`, Auto-Deploy **Off** |

Dos hechos que explican decisiones enteras del plan:

- **Render no usa el Dockerfile.** El Build Command real es `npm install && npm run build`; con `NODE_ENV=production` debe ser `npm install --include=dev && npx prisma generate && npm run build`, porque npm omite las `devDependencies` y el `tsc` del build falla con `TS2591: Cannot find name 'process'`.
  Por eso la variable `NODE_ENV=production` del `Dockerfile` nunca llega a producción y el
  servicio responde `env: development`. Hay que ponerla en el dashboard, no en el Dockerfile.
- **Render vigila la rama `desarrollo` con Auto-Deploy "On Commit".** Un `git push` a
  `desarrollo` **es un despliegue a producción**, sin pasar por CI (el job `deploy-render`
  solo corre en `main`). De ahí la regla: nunca pushear a `desarrollo` sin querer desplegar.

---

## 5. Bases de datos: qué cambia y qué no

### 5.1 Adiciones de `rnpn_vehiculos_final`

| Elemento | Qué es |
|---|---|
| Tabla `destino_mision` | Destinos por misión con `orden_visita`, FK a `mision` con `CASCADE` y a `area_destino` con `SET NULL`, y `UNIQUE(id_mision, orden_visita)`. |
| `log_movimientos_mision.id_destino_mision` | Vincula cada llegada/salida al destino concreto. `ON DELETE RESTRICT`. |
| `mision.es_emergencia` | `TINYINT(1) NOT NULL DEFAULT 0`. |
| Unidad 52 | Base/Parqueo de Vehículos. |
| 7 áreas | Catálogo `area_destino` para el formulario multi-destino. |

### 5.2 Observaciones que **no** se corrigen

- `AUTO_INCREMENT` de `mision` arranca en **18** (el volcado se vació con `DELETE`, no
  `TRUNCATE`). La primera misión nueva será la **#M-18**. Es intencional.
- Unidades sin `id_jefe_usuario`: la selección de unidad sigue siendo manual.
- Vehículos sin conductor habitual: simplemente no aparece esa opción de atajo.

### 5.3 Orden de carga: la trampa de `AUTO_INCREMENT`

La migración 003 inserta la unidad 52 **sin ID explícito**. El volcado de maestros trae 51
unidades con IDs fijos del 1 al 51. Si 003 se ejecuta primero, la unidad nueva toma el
**ID 1** y al cargar los maestros `Presidencia` choca con esa clave primaria.

Por eso el orden es: **esquema → maestros → 003 → 004**. Con los maestros primero, las 51
ocupan 1-51 y la nueva recibe el 52.

---

## 6. Decisiones tomadas y su fundamento

| # | Decisión | Por qué |
|---|---|---|
| 1 | `C:\SUVT-2` como hermana, no dentro de `C:\SUVT` | Rutas limpias y aislamiento real de Docker (distinto nombre de proyecto). |
| 2 | Rama `feature/rnpn-vehiculos-final` | No dispara CI/CD: trabajo seguro hasta que se decide desplegar. |
| 3 | Seguir con Docker y MySQL de XAMPP | El stack ya funciona así; cambiarlo añade riesgo sin aportar a la feature. |
| 4 | Puerto 8081 para SUVT-2 | Permite tener ambos stacks vivos a la vez. |
| 5 | `mision.destino` = primer destino | Compatibilidad hacia atrás: PDF, listados y código heredado siguen leyendo esa columna. |
| 6 | Notificaciones por correo | Aviso a Administración en nueva solicitud y al motorista al asignar. No bloqueantes: si el SMTP falla, la misión se crea igual. |
| 7 | Orden de visita estricto + gate de cierre | Es la garantía de negocio: una misión no puede cerrarse sin haber completado el último destino. |
| 8 | Build Command de Render, no Dockerfile | Es lo que Render ejecuta de verdad; tocar el Dockerfile no cambiaría nada en producción. |
| 9 | Servicios espejo en otra instancia de Aiven | Separa datos: probar sobre `final` no puede tocar `nueva`. |
| 10 | `JWT_SECRET` distinto por entorno | Un secreto compartido entre entornos anula el aislamiento. |
| 11 | Auto-Deploy Off en los servicios paralelos | El espejo solo se actualiza de forma deliberada. |
| 12 | `VITE_API_URL` absoluta en Render | El frontend no está detrás de un balanceador en Render: necesita la URL completa del backend. |

---

## 7. Las seis fases explicadas

### Fase 0 — Seguridad (sin dependencias)

Es la única con efecto directo sobre producción y no espera a nada. Incluye cerrar la fuga
de `password_hash`, poner `NODE_ENV=production` en el dashboard y rotar dos credenciales.
Justificación detallada en la sección 8.

### Fase 1 — Poblar `rnpn_vehiculos_final` en Aiven

El servicio ya existe con la base vacía y el nombre exacto que espera la migración 003. Se
carga en cuatro pasos y en orden (ver 5.3). No hay código de por medio, solo SQL: por eso es
independiente del resto.

### Fase 2 — Local (subfases A a F)

- **A. Crear `C:\SUVT-2`:** clonar, crear la rama segura y copiar lo que **no está en Git**
  (`.env`, migraciones de la feature, documentación). Después de esto el proyecto es
  autónomo.
- **B. Respaldo y contraste:** volcado de seguridad de `nueva` y `prisma db pull --print`
  para comparar el esquema real contra `schema.prisma` antes de tocar nada.
- **C. `schema.prisma`:** cambios 100 % aditivos (tabla nueva, columnas nuevas). Debe ir
  **antes** que cualquier operación de Prisma; se valida con `prisma generate`,
  `tsc --noEmit` y un `db pull --print` que debe dar 0 diferencias.
- **D. Backend:** controladores multi-destino, catálogo de áreas, notificaciones y
  limpiezas. Toda operación sobre destinos va dentro de una transacción.
- **E. Frontend:** alta con N destinos, recorrido secuencial en el panel del motorista,
  botón "Agregar destino en ruta", badges y PDF actualizados.
- **F. Verificación:** pruebas del ciclo completo en `localhost:8081` y comprobaciones SQL
  de que `nueva` no cambió. Commit **sin push**; el cierre es por PR.

### Fase 3 — Servicios Render paralelos

`suvt2-backend` y `suvt2-frontend` apuntando al espejo Aiven, con su propio
`JWT_SECRET`, su propio `CORS_ORIGIN` y Auto-Deploy apagado. Se crean desde el dashboard,
porque el repositorio solo define dos servicios.

**Estado: completada el 2026-10-15.** Ambos servicios Live; `/health` responde
`env:"production"` y `db:"mysql/rnpn_vehiculos_final"`, y el frontend carga con rewrite SPA.
Detalle y gotchas en el runbook §16 (incluida la trampa de `NODE_ENV=production` con
`npm install`, §16.5).

### Fase 4 — Verificación en la nube

Misma prueba manual que en local pero contra la nube: login, alta multi-destino, aprobación,
recorrido en orden, gate de cierre, PDF y aislamiento de datos.

**Estado: 8 de 9 checks aprobados el 2026-10-16.** Verificados login/CORS, `password_hash`
ausente, multi-destino con orden, subida a `SUVT2/Misiones`, reemplazo y borrado,
`/api/areas` → 200, 5xx sin `stack` y 401 anónimo. El 9.º (correo) sigue **diferido** por la
App Password de Gmail. Resultados en el runbook §17.1.

### Fase 5 — Cutover

Cambiar el puntero de producción hacia el espejo. **Fuera de alcance** de este plan: solo se
documenta, y se ejecuta cuando la fase 4 haya pasado limpio.

---

## 8. Seguridad: qué se corrigió y por qué

### 8.1 La fuga de `password_hash`

Se auditaron los cinco puntos donde la API devuelve datos de `usuario`. Tres ya filtraban
correctamente con `select` explícito o con objetos armados a mano. Dos devolvían la fila
completa:

| Endpoint | ¿Filtraba? | Severidad |
|---|---|---|
| `usuarios.getAll` | Sí | — |
| `auth.login` | Sí | — |
| `usuarios.create` | Sí | — |
| `misiones.getAll` (`solicitante: true`) | **No** | Alta: **cualquier** autenticado ve el hash |
| `usuarios.update` | **No** | Media: endpoint de administración |

Se verificó además que **ningún componente del frontend lee `password_hash`**: solo usan
`solicitante?.nombre` y `.correo`. Quitar el campo no rompe nada, así que el arreglo es de
dos líneas, no de una refactorización.

Un hash bcrypt filtrado no es una contraseña en claro, pero sí permite ataques de fuerza
bruta fuera de línea y, si algún usuario reutiliza la contraseña, comprometer otras cuentas.
Por eso es el primer paso.

### 8.2 `NODE_ENV=production` (cambio de dashboard, no de código)

El ternario del middleware que oculta el stack trace está **bien escrito**; el problema es
que el entorno corre como `development`, así que siempre se toma la rama que envía el stack
completo al cliente. Poniendo `NODE_ENV=production` en el dashboard se arreglan de una vez
cinco efectos: sin stack traces en las respuestas, sin log de todas las consultas de Prisma,
nivel de log `info`, morgan en formato `combined` y caché del cliente Prisma (inofensiva).

### 8.3 Rotación de credenciales

Dos, y solo dos: la contraseña del servicio Aiven (quedó escrita en texto plano durante el
análisis) y `admin@rnpn.gob.sv` (su contraseña estaba en un script del historial público).
Las demás cuentas quedaron **sin acción** tras comprobar que el script de siembra nunca se
ejecutó contra Aiven.

**Borrar un archivo no borra la contraseña del historial de Git**: `git log -p` sigue
mostrándola. Por eso rotar es la única mitigación efectiva.

### 8.4 Secretos en el repositorio público

- Tres scripts en `backend/src/scratch/` contenían credenciales en texto plano y fueron
  **eliminados del índice**.
- Los volcados `database/_*.sql` contienen 20 hashes bcrypt y correos reales: ahora están
  **ignorados** por `.gitignore` y jamás se suben.
- El orden correcto de commit es **selectivo** (`git add` archivo por archivo). Nunca
  `git add -A` en un repositorio con este contenido.

---

## 9. Riesgos corregidos del resguardo de documentos

El flujo de documentos era la parte más frágil del sistema. Seis riesgos, todos corregidos
en el runbook:

| Riesgo | Problema | Solución |
|---|---|---|
| **R1** | Errores de multer devolvían 500 con mensajes en inglés | Manejo de errores en español y con el código HTTP correcto |
| **R2** | Límite de tamaño fijo y desalineado con el balanceador | Un solo valor, respetado por nginx y por multer |
| **R3** | El `public_id` de Cloudinary nunca se guardaba | Persistido, para poder borrar después |
| **R4** | No existía forma de eliminar un documento | Ruta `DELETE /:id/documento` solo para administración, con confirmación en la interfaz |
| **R5** | Cada reemplazo dejaba un huérfano en Cloudinary | **Subir primero, borrar después**: si la subida falla, se conserva el documento vigente |
| **R6** | `documento_respaldo` podía truncarse en `VARCHAR(255)` | Ampliación a `TEXT` (migración 004, no destructiva) |

El principio que ordena todo el bloque: **un documento ocupa como máximo un archivo** en
Cloudinary, y ninguna operación puede dejar al usuario sin su documento vigente.

---

## 10. Docker frente a `npm run dev`

| Aspecto | Docker (`docker-up.bat`) | `npm run dev` |
|---|---|---|
| URL | `http://localhost:8081` vía balanceador | Backend 4001, frontend 5174 |
| Origen de variables | `.env` **raíz** | `backend/.env` y `frontend/.env` |
| `VITE_API_URL` | `/api` (relativo, build-arg) | `http://localhost:4001/api` |
| Réplicas | Sí (`--scale backend=3`) | Una sola |
| Hot reload | No: rebuild | Sí (ts-node-dev + Vite) |
| Cuándo usarlo | Integración, pruebas E2E, validar con réplicas | Iteración y depuración |

---

## 11. Cómo se verifica que todo funciona

**Previas:** stacks aislados (`docker compose ls` muestra `suvt` y `suvt-2`), puerto 8081
correcto, conexión apuntando a `final`, `tsc --noEmit` limpio y `npm run build` del frontend
sin errores.

**Ciclo completo:** alta de una misión con **tres destinos** (se crean 3 filas en
`destino_mision` con orden 1, 2, 3 y `mision.destino` = primer destino), aprobación con
correo al motorista, recorrido en orden (los botones solo se habilitan en secuencia), gate
de cierre deshabilitado hasta la salida del último destino, "agregar destino en ruta" que
bloquea de nuevo el cierre, PDF con la lista numerada y sello de emergencia.

**Aislamiento:** consulta final sobre ambas bases: `final` con los datos nuevos y `nueva`
con sus conteos originales intactos.

---

## 12. Conclusión

El plan construye un **ambiente espejo completo y aislado** — código, red, volúmenes, rama
Git y base de datos — para validar `rnpn_vehiculos_final` sin exponer a los usuarios de
`rnpn_vehiculos_nueva`.

Tres características lo hacen manejable:

- **Orden explícito:** fases independientes al principio (seguridad, datos espejo, código
  local) y dependientes solo al final (servicios, verificación, cutover).
- **Advertencias basadas en hechos verificados:** Render no usa Dockerfile, `desarrollo`
  despliega con cada push, la migración 003 tiene una trampa de autoincremento y la fuga de
  `password_hash` está en exactamente dos líneas.
- **Reversibilidad:** nada se rompe en producción hasta la fase 5, y cada fase deja una
  comprobación concreta antes de pasar a la siguiente.

**Resultado:** un SUVT-2 funcional y un camino de corte documentado, con `C:\SUVT` y
`rnpn_vehiculos_nueva` intactos durante todo el proceso.

---

## 13. Cambios posteriores a la Fase F (post-E2E local)

Tras completar el flujo E2E local (2026-10-13) se corrigieron tres observaciones y se aisló
Cloudinary. Detalle completo en `IMPLEMENTACION_SUVT_2.md`, sección 25.

- **Seguridad:** `ControlSeguridad.tsx` ahora muestra las misiones `finalizada` sin
  `entrada_base` (antes quedaban fuera porque solo listaba `aprobada`/`en_curso`), de modo que
  la entrada siempre puede registrarse.
- **Admin:** `GestionMisiones.tsx` muestra, en misiones `en_curso`, el último movimiento del
  motorista (llegada/salida), su destino y la hora.
- **PDF:** "Lugar de Visita" se ajusta con `splitTextToSize` y centrado vertical dentro de su
  caja.
- **Cloudinary aislado:** producción sube a `SUVT/Misiones` (carpeta **hardcodeada** en el
  controlador, sin variable de entorno); SUVT-2 usa `CLOUDINARY_FOLDER=SUVT2/Misiones` en
  Render, en `docker-compose.yml` y en los `.env` locales, y desde 2026-10-19 el **fallback del
  propio código** también es `SUVT2/Misiones` (§17.2 del runbook).

Pendiente: los correos reales requieren una *App Password* de Gmail en `SMTP_PASS` (hoy fallan
con `534-5.7.9`; el flujo igualmente continúa).
