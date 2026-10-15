# IMPLEMENTACION_SUVT_2 — Adaptación a `rnpn_vehiculos_final`

**Fecha:** 30 de septiembre de 2026 · **actualizado:** 5 de octubre de 2026
**Estado:** Fase 0 pendiente de ejecución
**Objetivo:** Crear `C:\SUVT-2` con el backend y el frontend adaptados a la base de datos `rnpn_vehiculos_final` (misiones multi-destino, misiones de emergencia y resguardo de documentos), ejecutándose en contenedores Docker con puerto propio, sin afectar `C:\SUVT`, que sigue operando sobre `rnpn_vehiculos_nueva`. Además se monta un entorno paralelo en la nube para validar sin tocar producción.

---

## ÍNDICE

1. [Objetivo](#1-objetivo)
2. [Conceptos fundamentales](#2-conceptos-fundamentales)
3. [Arquitectura Docker](#3-arquitectura-docker)
4. [Resguardo de documentos PDF](#4-resguardo-de-documentos-pdf)
5. [Estado verificado de las bases de datos](#5-estado-verificado-de-las-bases-de-datos)
6. [Decisiones y su fundamento](#6-decisiones-y-su-fundamento)
7. [Programa general y advertencias de despliegue](#7-programa-general-y-advertencias-de-despliegue)
8. [Fase 0 — Seguridad](#8-fase-0--seguridad)
9. [Fase 1 — Poblar `rnpn_vehiculos_final` en Aiven](#9-fase-1--poblar-rnpn_vehiculos_final-en-aiven)
10. [Fase A — Crear `C:\SUVT-2`](#10-fase-a--crear-csuvt-2)
11. [Fase B — Respaldo y contraste](#11-fase-b--respaldo-y-contraste)
12. [Fase C — `schema.prisma`](#12-fase-c--schemaprisma)
13. [Fase D — Backend](#13-fase-d--backend)
14. [Fase E — Frontend](#14-fase-e--frontend)
15. [Fase F — Verificación y cierre](#15-fase-f--verificación-y-cierre)
16. [Fase 3 — Servicios Render paralelos](#16-fase-3--servicios-render-paralelos)
17. [Fase 4 — Verificación en la nube](#17-fase-4--verificación-en-la-nube)
18. [Fase 5 — Cutover](#18-fase-5--cutover)
19. [Riesgos corregidos](#19-riesgos-corregidos)
20. [Riesgos que permanecen abiertos](#20-riesgos-que-permanecen-abiertos)
21. [Docker vs `npm run dev`](#21-docker-vs-npm-run-dev)
22. [Deuda técnica](#22-deuda-técnica)
23. [Anexo — Saneamiento del repositorio](#23-anexo--saneamiento-del-repositorio)
24. [Resumen de comandos](#24-resumen-de-comandos)

---

## 1. Objetivo

Crear `C:\SUVT-2` como proyecto independiente con:

- **Misiones multi-destino** con orden de visita estricto y registro de movimientos por destino.
- **Misiones de emergencia** solicitadas por conductores.
- **Catálogo de áreas** para clasificar destinos.
- **Notificaciones por correo** no bloqueantes.
- **Resguardo de documentos** en Cloudinary con borrado efectivo.

`C:\SUVT` **no se modifica**. Sigue con `rnpn_vehiculos_nueva` en el puerto 8080. Ambos proyectos pueden ejecutarse al mismo tiempo.

### Programa de seis fases

Las letras (A–F) y los números conviven: **la Fase 2 es el desarrollo local y se desglosa en las Fases A a F**.

| Fase | Qué | Dónde | Despliega producción |
|---|---|---|---|
| **0** | Seguridad: dos fixes de código, `NODE_ENV`, rotación de credenciales | Rama → merge a `desarrollo` | **Sí, es la intención** |
| **1** | Poblar `rnpn_vehiculos_final` en Aiven | Aiven | No |
| **2** = A–F | Construir y validar `SUVT-2` localmente | Docker en `:8081` + XAMPP | No |
| **3** | Crear `suvt2-backend` y `suvt2-frontend` | Render | No, servicios nuevos |
| **4** | Verificación completa en la nube | Render + Aiven espejo | No |
| **5** | Cutover a producción | Render | Sí, futuro |

---

## 2. Conceptos fundamentales

| Concepto | Explicación |
|---|---|
| **Proyecto paralelo** | Copia independiente: su rama Git, sus contenedores, su red y su volumen de archivos. |
| **Aislamiento entre stacks** | Compose deriva el nombre del proyecto del nombre del directorio, así que `suvt` y `suvt-2` tienen redes, contenedores y volúmenes distintos sin configuración adicional. |
| **Multi-destino** | La misión deja de tener un único texto `destino`. Ahora tiene filas en `destino_mision`, cada una con su `orden_visita`. |
| **Orden de visita estricto** | No se puede registrar llegada al destino 2 sin haber registrado salida del destino 1. |
| **Gate de cierre** | La misión solo se finaliza cuando el destino de **mayor** `orden_visita` tiene `salida_destino`. |
| **Balanceador (`lb`)** | Único punto de entrada. `/` → frontend, `/api/` → backend, `/health` → backend, `/uploads/` → backend. |
| **Único puerto publicado** | Solo el balanceador publica puerto al host: 8080 para `SUVT`, 8081 para `SUVT-2`. |
| **Rama segura** | `feature/rnpn-vehiculos-final` no dispara el workflow de CI/CD. |
| **Cloudinary como único resguardo** | Los documentos se suben a Cloudinary; el disco local no participa. |
| **Build Command** | Render construye con `npm install && npm run build`, **no** con el `Dockerfile` del repo. Con `NODE_ENV=production` debe ser `npm install --include=dev && npx prisma generate && npm run build` (ver 3.9.2 y 16.5). |
| **Entorno paralelo** | Servicios de Render propios apuntando a una base en Aiven también propia, para validar sin tocar producción. Ver 3.9.1. |

---

## 3. Arquitectura Docker

### 3.1 Topología

```
C:\SUVT  (proyecto "suvt")          C:\SUVT-2  (proyecto "suvt-2")
host:8080 → lb:80                    host:8081 → lb:80
  /          → frontend:80            /          → frontend:80
  /api/      → backend:4000           /api/      → backend:4000
  /health    → backend_pool           /health    → backend_pool
  /uploads/  → backend_pool           /uploads/  → backend_pool

Ambos → XAMPP MySQL :3306 (host.docker.internal)
  rnpn_vehiculos_nueva      rnpn_vehiculos_final
```

> Este diagrama describe **solo los entornos locales**. Producción y el entorno paralelo usan Aiven, no XAMPP: ver 3.9.

### 3.2 Solo el balanceador publica puerto

`docker-compose.yml:71` declara `ports: "${HTTP_PORT:-8080}:80"` únicamente en el servicio `lb`. `backend` y `frontend` **no tienen `ports`**: viven solo dentro de la red `rnpn-net`.

Consecuencias:

- El `PORT: "4000"` del compose (línea 19) es **interno**. El balanceador lo alcanza por DNS interno de Docker (`lb/nginx.conf:10` → `server backend:4000`).
- **No se modifica ese puerto.** Cambiarlo obligaría a cambiar también el `nginx.conf` sin ganancia alguna.
- Desde el navegador se entra **siempre** por `http://localhost:8081`. Nunca por 4000 ni por 5174 en modo Docker.

### 3.3 Aislamiento por nombre de proyecto

| Recurso | `C:\SUVT` | `C:\SUVT-2` |
|---|---|---|
| Proyecto | `suvt` | `suvt-2` |
| Contenedores backend | `suvt-backend-1..3` | `suvt-2-backend-1..3` |
| Contenedores frontend | `suvt-frontend-1..2` | `suvt-2-frontend-1..2` |
| Red | `suvt_rnpn-net` | `suvt-2_rnpn-net` |
| Volumen | `suvt_uploads-data` | `suvt-2_uploads-data` |

Las redes bridge no se ven entre sí, así que ambos stacks conviven. Verificable con `docker compose ls`.

### 3.4 Frontend con ruta relativa

El compose pasa `VITE_API_URL: /api` como build-arg (línea 59), y `frontend/Dockerfile:5-6` lo fija como variable de entorno del build. Todas las peticiones van al balanceador bajo el mismo origen.

**`frontend/.env` se ignora por completo en modo Docker.** Ese archivo solo aplica a `npm run dev`.

### 3.5 Conexión a MySQL

`extra_hosts: "host.docker.internal:host-gateway"` permite alcanzar el MySQL del host:

```
DATABASE_URL=mysql://root:@host.docker.internal:3306/rnpn_vehiculos_final
```

### 3.6 Prisma se genera dentro de la imagen

`backend/Dockerfile:8-9` copia `prisma/` y ejecuta `npx prisma generate` durante el build; la etapa final copia `.prisma` y `@prisma/client` (líneas 26-27). Por eso **no hace falta `prisma generate` en el host para que funcione el contenedor**, y cualquier cambio en `schema.prisma` obliga a reconstruir.

> En Render esto **no aplica**: el `Dockerfile` no se ejecuta. Ver 3.9.2.

### 3.7 No hay hot reload

No hay bind mounts: `COPY . .` hornea el código en la imagen y el arranque es `node dist/index.js`. **Cada cambio requiere reconstruir:**

```powershell
cd C:\SUVT-2
docker compose up --build -d --scale backend=1 --scale frontend=1
```

Para iterar rápido conviene validar antes en el host, que es mucho más veloz que un build completo:

```powershell
cd C:\SUVT-2\backend  ; npx tsc --noEmit
cd C:\SUVT-2\frontend ; npm run build
```

### 3.8 Las variables salen del `.env` raíz

`backend/.env` **no entra a la imagen** (`backend/.dockerignore` lo excluye). Toda configuración llega por el bloque `environment:` del compose, que lee el **`.env` de la raíz**. Este archivo hoy solo tiene 4 variables, y por eso hay que copiar las de SMTP y Cloudinary (decisión 14).

### 3.9 Entornos: dónde corre qué

#### 3.9.1 Los cuatro entornos

| Entorno | Base de datos | Dónde corre | Quién lo usa |
|---|---|---|---|
| **Local desarrollo** | XAMPP `localhost:3306` → `rnpn_vehiculos_nueva` | `C:\SUVT`, `:8080` o `npm run dev` | Cotidiano |
| **Local `SUVT-2`** | XAMPP `localhost:3306` → `rnpn_vehiculos_final` | `C:\SUVT-2`, `:8081` | Desarrollo de la feature |
| **Producción** | **Aiven MySQL** → `rnpn_vehiculos_nueva` | Render: `suvt-backend`, `suvt-frontend` | Tráfico real |
| **Paralelo** *(nuevo)* | **Aiven MySQL** → `rnpn_vehiculos_final` | Render: `suvt2-backend`, `suvt2-frontend` | Validación en nube |

Implicaciones:

- **XAMPP es solo local.** El `extra_hosts` de 3.5 no aplica en la nube. Los parámetros de conexión son distintos: Aiven exige TLS y el CA de su certificado para los clientes de escritorio.
- **`rnpn_vehiculos_final` existe en dos sitios**: en XAMPP de esta máquina y en el servicio Aiven creado para el paralelo. Ambos necesitan la misma estructura y los mismos maestros.
- **Producción nunca se toca en las fases 0 a 4.** Su única base es `rnpn_vehiculos_nueva` en Aiven.
- El `DATABASE_URL` de producción termina en `/rnpn_vehiculos_nueva`. Ese dato sirve de regla para detectar cualquier configuración equivocada.

#### 3.9.2 Render no usa el Dockerfile

**Dato verificado:** el Build Command configurado hoy en los servicios de Render es

```
npm install && npm run build
```

Eso funciona **solo mientras `NODE_ENV` no sea `production`**: npm omite las `devDependencies` cuando `NODE_ENV=production`, y el build necesita `typescript`, `@types/node` y `prisma`. Con `NODE_ENV=production` (lo correcto para runtime) el comando debe ser:

```
npm install --include=dev && npx prisma generate && npm run build
```

El `backend/Dockerfile` **no se ejecuta**. Esa es la causa de varias anomalías aparentemente inconexas:

| Anomalía | Causa |
|---|---|
| El servicio vivo responde `env: development` | El `Dockerfile:19` pone `ENV NODE_ENV=production`, pero el Dockerfile nunca corre. La variable la pone el dashboard |
| `Dockerfile:9` ejecuta `prisma generate` | Irrelevante en la nube: allí lo dispara el postinstall de `@prisma/client` durante `npm install` |
| `npm ci --omit=dev` del Dockerfile no aplica | Render instala con `npm install`. Con `NODE_ENV` distinto de `production` incluye devDependencies, que es lo que permite que `tsc` exista en el build. Con `NODE_ENV=production` **npm las omite** y el build falla con `TS2591: Cannot find name 'process'`, salvo que se use `--include=dev` |
| Versión de Node en disputa | Dockerfile = Node 20, job `build-apk` = Node 22, Render = la que esté en el dashboard |

Consecuencias operativas:

1. **Ajustes de entorno → dashboard de Render, nunca el Dockerfile.**
2. **Local y remoto no son el mismo artefacto.** Una validación en Docker local no garantiza el comportamiento en producción.
3. Para el entorno paralelo se usa el **mismo mecanismo** que producción (Build Command, no Dockerfile), pero con `NODE_ENV=production` el comando incluye `--include=dev` y un `npx prisma generate` explícito: `npm install --include=dev && npx prisma generate && npm run build`. Ver 16.5.
4. El `prisma generate` en la nube es implícito. Si `schema.prisma` cambia en la rama, el siguiente build lo regenera solo.

---

## 4. Resguardo de documentos PDF

### 4.1 Flujo real

```
Usuario sube archivo
  → PATCH /api/misiones/:id/upload   (misiones.routes.ts:18)
  → multer memoryStorage            (upload.middleware.ts:4)   ← NUNCA toca disco
  → Buffer de máx. 5 MB
  → cloudinaryService.uploadFile(buffer, 'SUVT/Misiones')
  → se guarda SOLO la secure_url en mision.documento_respaldo
  → el public_id se devuelve en el JSON y SE DESCARTA
```

Datos reales del endpoint:

| Dato | Valor |
|---|---|
| Endpoint | `PATCH /api/misiones/:id/upload` |
| Campo | `documento` |
| Middleware | `uploadMisionDoc.single('documento')` |
| Autorización | Solo `validarJWT`. **No requiere rol admin** |
| Tamaño máximo | 5 MB (multer) |
| Extensiones backend | `.pdf`, `.doc`, `.docx`, `.jpg`, `.jpeg`, `.png` |
| Extensiones en la UI | `.pdf`, `.jpg`, `.jpeg`, `.png` (más restrictiva) |
| Carpeta en Cloudinary | `SUVT/Misiones` |
| Pantalla | `/programacion` (`App.tsx:49`) |
| Botón | Icono azul, `title="SUBIR DOCUMENTO CON MISION FINALIZADA"` |
| Éxito | Alerta `Documento subido correctamente` |

Si Cloudinary falla, el `catch` devuelve HTTP 400 y **no se guarda nada**. No existe ruta de respaldo en disco.

> El botón de subida **no tiene condición de estado**, pese a su título. Se puede subir a una misión en cualquier estado.

### 4.2 Estado híbrido detectado

| Misión | `documento_respaldo` | Tipo |
|---|---|---|
| 15 | `https://res.cloudinary.com/dyn6stlcn/.../SUVT/Misiones/wcbkqbwgcgcr1h6cumrt.pdf` | Cloudinary |
| 16 | `https://res.cloudinary.com/dyn6stlcn/.../SUVT/Misiones/anxdpyl7bvcelvfgy83y.pdf` | Cloudinary |
| 17 | `uploads\misiones\mision-1785268910250-438884572.pdf` | **Ruta local (legacy)** |

El frontend contempla ambos formatos en `GestionMisiones.tsx:260-263`: si empieza por `http` la usa tal cual; si no, le antepone la base de la API y normaliza las barras. Hay soporte de código para la ruta legacy, pero el backend ya no genera ese tipo de valor.

En `backend/uploads/misiones/` hay **7 PDFs**: 6 huérfanos de mayo y 1 referenciado por la misión 17.

### 4.3 Por qué `uploads/` no sirve en Docker ni en la nube

- `backend/.dockerignore` incluye `uploads`, así que `COPY . .` no lo copia a la imagen.
- El volumen `uploads-data` se inicializa desde `/app/uploads`, que `Dockerfile:29` crea vacío.
- El backend sí declara `app.use('/uploads', express.static('uploads'))` (`index.ts:38`), pero en esos entornos la carpeta está vacía.
- En Render no hay disco persistente: el directorio desaparece en cada despliegue.

El único entorno donde el legacy es accesible es `C:\SUVT` con `npm run dev`.

### 4.4 Local vs nube

| | `npm run dev` | **Docker local** | **Nube (Render)** |
|---|---|---|---|
| Credenciales Cloudinary | `backend/.env` las tiene | `.env` raíz **no las tiene** | Dashboard de Render, fuera del repo |
| Subir PDF | Funciona | **Falla 400** | Según el dashboard |
| ¿Dónde queda el PDF? | Cloudinary | — | Cloudinary |
| `/uploads/` sirve archivos | Sí | **Vacío** | **Efímero** |
| Misión 17 (legacy) | Accesible | **404** | **404** |

En la nube los PDF nuevos sobreviven **porque están en Cloudinary**, fuera del servidor. El legacy no sobrevive en ningún entorno salvo el local.

---

## 5. Estado verificado de las bases de datos

### 5.1 Adiciones de `rnpn_vehiculos_final`

Las 10 tablas compartidas tienen columnas, tipos, ENUMs y FKs idénticos. Todo es **aditivo**:

| Elemento | Detalle |
|---|---|
| `destino_mision` | Tabla nueva. FK a `mision` (CASCADE) y `area_destino` (SET NULL). `UNIQUE(id_mision, orden_visita)` |
| `log_movimientos_mision.id_destino_mision` | Columna + FK con `ON DELETE RESTRICT` |
| `mision.es_emergencia` | `TINYINT(1) NOT NULL DEFAULT 0` |
| Unidad 52 | `Base/Parqueo de Vehículos` |
| 7 áreas | Catálogo en `area_destino` |

### 5.2 Inventario e integridad de `final`

| Comprobación | Resultado |
|---|---|
| Registros huérfanos en FKs | 0 |
| Motoristas sin usuario | 0 |
| Usuarios inactivos | 0 |
| Vehículos distintos de `disponible` | 0 |
| Divergencias entre las 51 unidades compartidas | 0 |

15 conductores, 32 vehículos, 21 conductores habituales, 20 usuarios, 52 unidades, 7 áreas, **0 misiones**.

### 5.3 Observaciones que no se corrigen

| # | Observación | Fundamento |
|---|---|---|
| **O1** | `AUTO_INCREMENT` de `mision` = 18 | Las tablas se vaciaron con `DELETE`, no `TRUNCATE`. La primera misión de `SUVT-2` será `#M-18`. Intencional: evita colisiones si algún día se unifican datos. |
| **O2** | Las 52 unidades tienen `id_jefe_usuario = NULL` | El `defaultValue` del formulario nunca resuelve, así que jefatura selecciona la unidad manualmente. Comportamiento actual. |
| **O3** | 12 de 32 vehículos sin conductor habitual activo | En el modal de asignación no aparece la opción de habitual; el admin elige manual. Comportamiento correcto. |

---

## 6. Decisiones y su fundamento

| # | Decisión | Fundamento |
|---|---|---|
| 1 | `C:\SUVT-2` (hermana, no anidada) | Evita rutas relativas raras y mantiene los proyectos independientes. |
| 2 | Rama `feature/rnpn-vehiculos-final` | Ningún workflow de CI/CD se dispara por ella, y Render solo vigila `desarrollo`. |
| 3 | Contenedores, Opción A (MySQL XAMPP) | Es el flujo real de trabajo. Opción B exigiría restaurar maestros a mano y colisiona en el puerto 3307. |
| 4 | `HTTP_PORT=8081` | Sin esto el segundo compose falla con `port already allocated`. Permite ejecutar ambos stacks. |
| 5-6 | Puertos internos sin cambios | `PORT: 4000` solo existe en la red Docker. Los puertos 4001/5174 son exclusivos del modo `npm run dev`. |
| 7-8 | `nueva` y `final` separadas | Cero riesgo sobre los datos actuales. Las pruebas escriben solo en `final`. |
| 9 | Plan completo aprobado | Multi-destino + emergencia + notificaciones + documentos. |
| 10 | `mision.destino` = primer destino | Compatibilidad: PDF, listados y código legacy leen ese campo. |
| 11 | Notificaciones no bloqueantes | Un fallo de SMTP no debe impedir crear o asignar una misión. |
| 12 | `AUTO_INCREMENT` en 18 | Ver O1. |
| 13 | Unidad organizativa sin cambios | Ver O2. |
| 14 | SMTP y Cloudinary en el `.env` raíz | **Crítico.** El compose lee el `.env` raíz y ese archivo solo tiene 4 variables. Sin copiarlas, el correo **y la subida de PDF** fallan con 400 dentro de Docker. |
| 15 | `npm run dev` como respaldo | Iteración rápida y `configurar-prisma.bat`. |
| 16 | `public_id` derivado de la URL | Evita una columna nueva. Una columna obligaría a migrar también `rnpn_vehiculos_nueva` **antes** de mergear, o `GET /api/misiones` fallaría en producción. |
| 17 | `documento_respaldo` a TEXT solo en `final` | Ampliar es no destructivo, pero no se toca producción en esta migración. |
| 18 | Sin limpieza de huérfanos en `C:\SUVT` | Se respeta la decisión de no modificar `C:\SUVT`. |
| 19 | Entorno **paralelo** en la nube, no cutover | Validar la feature en Aiven+Render con servicios propios, sin tocar `suvt-backend`/`suvt-frontend`. Evita migrar datos: el espejo arranca vacío. |
| 20 | `Build Command`, no el Dockerfile | El Dockerfile tiene el `HEALTHCHECK` con puerto 4000 fijo (ver 22.1) y Render asigna `PORT=10000`. Además, igualar el mecanismo de producción hace la validación representativa. |
| 21 | Servicios paralelos vigilan la rama de feature | Despliegue inmediato de cada push. Contrapartida: no hay CI que valide los PR a esa rama. |
| 22 | `JWT_SECRET` distinto por entorno | Si se reutiliza el de producción, un token emitido por producción valida en el paralelo y el aislamiento no existe. |
| 23 | Cloudinary en carpeta `SUVT2/Misiones` | Evita mezclar documentos de prueba con los reales. |
| 24 | Solo dos credenciales por rotar | Verificado: `seed_users_final.ts` nunca corrió contra Aiven. |

---

## 7. Programa general y advertencias de despliegue

### 7.1 Las seis fases en orden

| Orden | Fase | Sección | Depende de |
|---|---|---|---|
| 1 | **0** Seguridad | §8 | Nada. Hacer primero |
| 2 | **1** Poblar el espejo en Aiven | §9 | Credenciales de Aiven |
| 3 | **2** Construir `SUVT-2` local (Fases A–F) | §10–§15 | Nada |
| 4 | **3** Servicios Render paralelos | §16 | Fase 1 |
| 5 | **4** Verificación en la nube | §17 | Fases 1, 2 y 3 |
| 6 | **5** Cutover | §18 | Validación de la fase 4 |

Las fases 0 y 1 son independientes entre sí y del desarrollo. La 2 es local y no toca nada externo.

### 7.2 Advertencia de despliegue: cómo funciona realmente

Aquí había una afirmación errónea que ahora se corrige. Veamos los tres gatillos y sus condiciones reales, leídas del `.github/workflows/deploy.yml`:

| Gatillo | Condición | ¿Qué despliega? |
|---|---|---|
| `push` a `main` o `desarrollo` | línea 5 | Ejecuta `build-and-push` y `build-apk` |
| `build-and-push` | `if: github.event_name != 'pull_request'` (línea 15) | Sube imágenes `:latest` y `:sha` a GHCR. **No despliega a Render** |
| `build-apk` | sin `if` | Compila el APK. Sirve de validación |
| `deploy-render` | `if: github.ref == 'refs/heads/main'` (línea 127) | Dispara los *deploy hooks* de Render. **Solo en `main`** |
| `pull_request` a `main` | línea 7 | Corre `build-apk` y nada más. El `build-and-push` se salta |

**Corrección respecto a la versión anterior de este documento:** un push a `desarrollo` **no** despliega a producción *por el CI*. El `deploy-render` solo corre en `main`.

**Pero la conclusión de peligro sí se sostiene, por otra vía:** Render tiene Auto-Deploy en **"On Commit"** y los servicios vigilan la rama **`desarrollo`**. Es decir, el despliegue ocurre por Render, no por el workflow. Igual resulta que `git push` a `desarrollo` cambia producción.

Reglas derivadas:

1. **`git push` a `desarrollo` = despliegue a producción.** Trabajar siempre en una rama de feature.
2. **Los PR solo tienen CI contra `main`.** Un PR hacia `desarrollo` no se valida en ningún sitio. La validación tiene que ser local.
3. **CI y Render apuntan a ramas distintas** (CI: `main`; Render: `desarrollo`). Un merge a `main` dispara un hook que redespliega el código de `desarrollo`. Ver 22.4.
4. Un build roto no tumba producción: si `npm run build` falla, Render conserva la versión anterior sirviendo tráfico.

---

## 8. Fase 0 — Seguridad

No depende de nada y no espera a las demás. Es la única fase con efecto directo sobre producción.

### 8.1 Auditoría del vector `password_hash`

Se revisaron los cinco puntos donde la API devuelve datos de `usuario`:

| Endpoint | ¿Devuelve `password_hash`? | Detalle |
|---|---|---|
| `usuarios.controller.ts:9` `getAll` | No ✅ | Usa `select` explícito |
| `auth.controller.ts:31` `login` | No ✅ | Devuelve objeto armado a mano |
| `usuarios.controller.ts:49` `create` | No ✅ | Objeto armado a mano |
| `misiones.controller.ts:342` `getAll` | **Sí** ❌ | `solicitante: true`. Disponible a **cualquier** autenticado |
| `usuarios.controller.ts:90` `update` | **Sí** ❌ | Devuelve la fila completa. Endpoint de administración |

Se verificó además que **ningún componente del frontend lee `password_hash`**: solo usan `solicitante?.nombre` (`GestionMisiones.tsx:204`, `pdfGenerator.ts:162`). Quitar el campo no rompe nada.

Son dos arreglos, no nueve. El primero es urgente; el segundo es de menor severidad.

### 8.2 Cambio 1 — `misiones.controller.ts:342`

```typescript
// antes
solicitante: true,

// después
solicitante: { select: { id_usuario: true, nombre: true, correo: true } },
```

Sin cambio en el frontend.

### 8.3 Cambio 2 — `usuarios.controller.ts:90`

Hoy `res.json({ ok: true, usuario })` con la fila completa que devuelve `prisma.usuario.update`. Sustituirlo por un objeto con `id_usuario`, `nombre`, `correo`, `rol`, `activo` e `id_motorista`.

### 8.4 Cambio 3 — `NODE_ENV=production` en el dashboard

**No es un cambio de código.** El ternario de `middlewares/index.ts:19` está **correcto**:

```typescript
stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
```

El problema es que el entorno corre como `development`, así que toma la rama que envía el stack completo. Con `NODE_ENV=production` se arreglan de una sola vez:

| Archivo | Efecto al poner `production` |
|---|---|
| `middlewares/index.ts:19` | Los errores dejan de llevar `err.stack` al cliente |
| `prisma/client.ts:12` | Deja de loguear **todas las consultas** |
| `utils/logger.ts:10` | Nivel `info` en vez de `debug` |
| `index.ts:35` | morgan en formato `combined` en vez de `dev` |
| `prisma/client.ts:17` | Inofensivo: solo cachea el cliente para hot reload |

`backend/Dockerfile:19` ya fija esa variable, pero como el Dockerfile no se ejecuta en Render, **hay que ponerla en el dashboard**.

Verificar antes en Render → servicio backend → *Environment* que `JWT_SECRET` esté presente. Si no lo está, confirmar su existencia es **condición previa** a quitar el fallback hardcodeado de `auth.controller.ts:6`.

### 8.5 Cambio 4 — Rotación de credenciales

Dos, y solo dos:

| Credencial | Situación | Acción |
|---|---|---|
| Contraseña de Aiven de producción | Quedó escrita en texto plano durante el análisis | **Rotar en el panel de Aiven** y actualizar `DATABASE_URL` en Render |
| `admin@rnpn.gob.sv` | Su contraseña estaba en `create_user.ts`, historial público del repo | **Rotar** |

**Sin acción:**

| Credencial | Por qué no |
|---|---|
| `jefatura@`, `seguridad@` | `seed_users_final.ts` **nunca se ejecutó contra Aiven**. Son roles establecidos con sus propias contraseñas |
| `motorista@` | No existe en ninguna base |
| `jose.ramirez@` | No existe en ninguna de las dos bases |
| `JWT_SECRET` | Dejado a propósito: confirmar primero su presencia en el dashboard (8.4). Exigiría además generar uno distinto para el entorno paralelo (decisión 22) |

Recomendación: en Aiven, crear un usuario de aplicación con privilegios mínimos sobre el esquema en lugar de seguir usando `avnadmin`, que es la cuenta administrativa del servicio.

### 8.6 Cambio 5 — Ya aplicado en el working tree

**Pendiente de commit.** Verificado con `git status`, `git ls-files` y `git check-ignore`:

```
 M .gitignore                                  ← database/_*.sql, generar_exp.py, md2pdf.py
D  backend/src/scratch/create_user.ts
D  backend/src/scratch/seed_users_final.ts
D  backend/src/scratch/verify_user.ts
```

### 8.7 Ejecución y verificación

```powershell
cd C:\SUVT
git checkout -b feature/fix-fuga-password-hash

# aplicar los cambios 8.2 y 8.3
npx tsc --noEmit --project backend/tsconfig.json   # en backend/: npm run build

git add backend/src/controllers/misiones.controller.ts `
        backend/src/controllers/usuarios.controller.ts
git commit -m "Oculta password_hash en respuestas de misiones y usuarios"
```

Luego: merge a `desarrollo`, que **despliega automáticamente**, y verificar en vivo:

```
curl https://suvt-backend.onrender.com/health
# esperado: "env":"production"

curl -H "Authorization: Bearer <token>" https://suvt-backend.onrender.com/api/misiones
# esperado: solicitante.id_usuario, .nombre, .correo  —  SIN password_hash
```

> Nota sobre la fase de saneamiento: el `.gitignore` y los tres `git rm` son cambios inertes en tiempo de ejecución. Pueden ir en este mismo commit o en uno aparte, pero no en una rama que Render vigile, salvo que se quiera el despliegue deliberadamente.

---

## 9. Fase 1 — Poblar `rnpn_vehiculos_final` en Aiven

El servicio ya está creado en Aiven con una base vacía llamada exactamente `rnpn_vehiculos_final`, que coincide con el `USE rnpn_vehiculos_final;` de la migración 003.

### 9.1 El orden importa: hay una trampa de `AUTO_INCREMENT`

La migración 003 añade la unidad 52 sin ID explícito:

```sql
INSERT INTO unidad_organizativa (nombre_unidad)
SELECT 'Base/Parqueo de Vehículos' FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM unidad_organizativa
  WHERE nombre_unidad = 'Base/Parqueo de Vehículos'
);
```

El volcado de maestros trae **51 unidades con IDs fijos del 1 al 51**. Entonces:

| Orden | Resultado |
|---|---|
| 003 primero | La unidad nueva toma el **ID 1**. Al cargar maestros, `Presidencia` también es ID 1 → **colisión de clave primaria** |
| **Maestros primero** | Las 51 ocupan 1-51 y la nueva toma el **ID 52** ✅ |

El `WHERE NOT EXISTS` evita duplicar la unidad, pero no evita el desajuste de IDs.

### 9.2 Secuencia de carga

| # | Paso | Archivo | Resultado esperado |
|---|---|---|---|
| 1 | Estructura | `database/_schema_nueva.sql` | 10 `CREATE TABLE`, cero `INSERT`. **No incluye `USE`**, hay que añadir `USE rnpn_vehiculos_final;` al inicio |
| 2 | Maestros | `database/_maestros_nueva.sql` | 15 motoristas, 32 vehículos, 20 usuarios, 21 conductores habituales, **51 unidades** |
| 3 | Migración | `database/migrations/003_rnpn_vehiculos_final.sql` | `destino_mision`, `es_emergencia`, FK de movimientos, unidad → **ID 52**, 7 áreas → IDs 1-7 |
| 4 | Migración | `database/migrations/004_documentos_respaldo_text.sql` | `documento_respaldo` pasa a `TEXT` |
| 5 | Validar | — | Ver 9.4 |

> Los archivos `001_schema_mysql.sql` y `002_multi_vehiculo_motorista.sql` **no sirven**. Ambos apuntan a `rnpn_vehiculos`, un nombre que no existe, crean 8 tablas de un esquema viejo (`semana`, `asignacion_diaria`, `novedad`) y les faltan las cinco que la app necesita. Ver 22.2.

### 9.3 Cómo conectarse

Aiven exige TLS. Para los clientes de escritorio hay que descargar el certificado CA desde el panel de Aiven y pasarlo:

```powershell
& "C:\xampp\mysql\bin\mysql.exe" `
  --ssl-ca=<ruta>\<ca.pem> `
  -h <HOST_AIVEN> -P <PUERTO> -u <USUARIO> -p `
  rnpn_vehiculos_final < database\_schema_nueva.sql
```

Los valores de `<HOST_AIVEN>`, `<PUERTO>`, `<USUARIO>` y la contraseña se toman del panel de Aiven. **No pegarlos en este documento ni en ningún chat.**

También sirve el editor SQL del panel para los pasos pequeños; para el volcado de maestros es más cómodo el cliente de línea.

### 9.4 Validación

```sql
USE rnpn_vehiculos_final;

SELECT COUNT(*) AS motoristas FROM motorista;              -- 15
SELECT COUNT(*) AS vehiculos FROM vehiculo;                -- 32
SELECT COUNT(*) AS usuarios FROM usuario;                  -- 20
SELECT COUNT(*) AS conductores FROM conductor_habitual;    -- 21
SELECT COUNT(*) AS unidades FROM unidad_organizativa;      -- 52
SELECT COUNT(*) FROM unidad_organizativa                   -- 1
 WHERE nombre_unidad = 'Base/Parqueo de Vehículos';
SELECT COUNT(*) FROM unidad_organizativa                   -- 0
 WHERE id_unitat = 1 AND nombre_unidad <> 'Presidencia';   -- no debe haber nada en ID 1 salvo Presidencia
SELECT COUNT(*) AS areas FROM area_destino;                -- 7
SELECT COUNT(*) AS destinos FROM destino_mision;           -- 0
SELECT COUNT(*) FROM usuario WHERE password_hash IS NULL;  -- 0
```

Comprobación de integridad: 0 huérfanos en las FKs de `destino_mision`, `log_movimientos_mision` y `conductor_habitual`.

---

## 10. Fase A — Crear `C:\SUVT-2`

### A.1 Clonar y crear la rama

```powershell
git clone https://github.com/tinoramirezsv1980-netizen/SUVT.git C:\SUVT-2
cd C:\SUVT-2
git checkout desarrollo
git checkout -b feature/rnpn-vehiculos-final
```

Antes de continuar, confirmar en `C:\SUVT` que no hay commits sin pushear: si los hubiera, el clon partiría de código distinto.

```powershell
cd C:\SUVT ; git rev-list --left-right --count origin/desarrollo...HEAD
# debe devolver 0 0
```

Estado verificado el 5 de octubre: `origin/main...origin/desarrollo` = `1 0`, así que `desarrollo` es ancestro estricto de `main` y un PR futuro entra limpio.

### A.2 Copiar lo que git no versiona

```powershell
$S = "C:\SUVT"; $D = "C:\SUVT-2"

# Migraciones de la feature
Copy-Item "$S\database\migrations\003_rnpn_vehiculos_final.sql" "$D\database\migrations\"
Copy-Item "$S\database\migrations\004_documentos_respaldo_text.sql" "$D\database\migrations\"

# Documentación de la feature
Copy-Item "$S\PLAN_MULTIDESTINO.md","$S\PLAN_MULTIDESTINO_01.md","$S\PLAN_MULTIDESTINO_02.md","$S\MULTIDESTINO_NOTIF_CORREO.md" "$D\"
Copy-Item "$S\IMPLEMENTACION_SUVT_2.md" "$D\"

# Configuración local (gitignorada)
Copy-Item "$S\.env"          "$D\.env"
Copy-Item "$S\backend\.env"  "$D\backend\.env"
Copy-Item "$S\frontend\.env" "$D\frontend\.env"
```

**No se copia:** `node_modules`, `dist`, `backend/uploads` (1.5 MB de PDF huérfanos que no participan en el flujo actual) ni artefactos de build de Android.

### A.3 Dependencias

```powershell
cd C:\SUVT-2\backend  ; npm ci
cd C:\SUVT-2\frontend ; npm ci
```

### A.4 Configuración del `.env` raíz

```
HTTP_PORT=8081
DATABASE_URL=mysql://root:@host.docker.internal:3306/rnpn_vehiculos_final
CORS_ORIGIN=http://localhost:8081
JWT_SECRET=<generar uno nuevo, distinto al de producción>

# No existen hoy en el .env raíz. Copiarlas de backend\.env
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
EMAIL_ADMINS=...
EMAIL_SUPERVISORES=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
MAX_UPLOAD_MB=5
```

`backend\.env` y `frontend\.env` quedan en 4001/5174, solo para el modo `npm run dev`.

### A.5 Parametrizar `docker-up.bat`

`docker-up.bat` tiene el 8080 escrito en las líneas 64, 67 y 87-88. Hay que parametrizarlo:

```bat
REM --- Leer HTTP_PORT del .env ---
set "HTTP_PORT=8080"
for /f "tokens=1,* delims==" %%a in ('findstr /B /C:"HTTP_PORT=" .env') do set "HTTP_PORT=%%b"

REM --- Avisar si el puerto ya esta ocupado (puede ser otro stack) ---
netstat -an | findstr /C:":!HTTP_PORT!" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [AVISO] El puerto !HTTP_PORT! ya esta en uso.
    echo         Puede pertenecer a otro stack. Revisa: docker compose ls
)
```

Y sustituir las cuatro URL fijas por `!HTTP_PORT!`. Al final, añadir `docker compose ls` para distinguir el stack propio del ajeno.

> Sin esto, el health check de `SUVT-2` consultaría `http://localhost:8080/health` y leería **la salud de `C:\SUVT`**, reportando falso éxito.

### A.6 Guardarraíl de conexión (obligatorio)

```powershell
cd C:\SUVT-2\backend
npx ts-node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.`$queryRawUnsafe('SELECT DATABASE() AS db').then(r=>{console.log('DB CONECTADA:',r[0].db);return p.`$disconnect()})"
```

Debe imprimir `DB CONECTADA: rnpn_vehiculos_final`. Si imprime `nueva`, detener todo.

---

## 11. Fase B — Respaldo y contraste

```powershell
& "C:\xampp\mysql\bin\mysqldump.exe" -uroot --routines --triggers `
  rnpn_vehiculos_nueva > C:\SUVT-2\database\_respaldo_rnpn_vehiculos_nueva.sql

cd C:\SUVT-2\backend
npx prisma db pull --print --schema=prisma/schema.prisma > ..\database\_esquema_antes_fase_C.sql
```

Captura lo que el contraste de columnas no cubrió: índices, `DEFAULT`, collation y versión de MySQL.

---

## 12. Fase C — `schema.prisma`

### 12.1 Multi-destino y emergencia

Cambios **100 % aditivos**. Nada se borra ni se renombra.

```prisma
model Mision {
  // ... campos actuales sin cambios
  es_emergencia  Boolean         @default(false)   // nuevo
  destinos       DestinoMision[]                     // nuevo
}

model LogMovimientoMision {
  // ... campos actuales sin cambios
  id_destino_mision Int?
  destino_mision    DestinoMision? @relation("movimientos", fields: [id_destino_mision], references: [id_destino_mision], onDelete: Restrict)
  @@index([id_destino_mision], map: "log_movimientos_id_destino_mision_fkey")
}

model DestinoMision {                              // nuevo
  id_destino_mision Int      @id @default(autoincrement())
  id_mision         Int
  id_area_destino   Int?
  nombre_destino    String   @db.VarChar(255)
  orden_visita      Int
  mision            Mision      @relation(fields: [id_mision], references: [id_mision], onDelete: Cascade)
  area_destino      AreaDestino? @relation(fields: [id_area_destino], references: [id_area], onDelete: SetNull)
  movimientos       LogMovimientoMision[] @relation("movimientos")
  @@unique([id_mision, orden_visita], map: "uq_destino_mision_orden")
  @@index([id_area_destino], map: "idx_destino_mision_area")
  @@map("destino_mision")
}

model AreaDestino {
  // ... campos actuales sin cambios
  destinos_mision DestinoMision[]   // back-relation obligatoria en Prisma
}
```

`onDelete: Restrict` debe ser explícito: el default de Prisma es `SetNull` y generaría un DDL divergente. Los nombres de índice deben coincidir con los del DDL aplicado o `db push` los renombra.

### 12.2 Documentos

```prisma
model Mision {
  // ...
  documento_respaldo String? @db.Text   // era @db.VarChar(255)
}
```

### 12.3 Orden obligatorio

Actualizar el esquema **antes** de cambiar `DATABASE_URL`. Con el esquema viejo apuntando a `final`, cualquier `prisma db push` intentaría **borrar** `destino_mision`, `es_emergencia` e `id_destino_mision`.

### 12.4 Validación

```powershell
npx prisma generate --schema=prisma/schema.prisma
npx tsc --noEmit
npx prisma db pull --print --schema=prisma/schema.prisma > ..\database\_esquema_despues_fase_C.sql
```

El resultado debe coincidir con `rnpn_vehiculos_final` en cero diferencias.

---

## 13. Fase D — Backend

### 13.1 `controllers/misiones.controller.ts`

| Función | Cambio |
|---|---|
| `create` | Destructurar `destinos` y `es_emergencia`. Exigir `id_usuario_solicitante === req.usuarioId` (lo inyecta `auth.middleware.ts:17`). Si el solicitante tiene `id_motorista` y no mandó unidad, usar la unidad 52. Crear misión + destinos en un `prisma.$transaction`. Si llega solo `destino` como string, convertirlo en destino de orden 1. `Mision.destino` ← nombre del primero. Responder con `destinos` incluidos. |
| `getAll` | Incluir `destinos` con `orderBy: { orden_visita: 'asc' }` y `area_destino`. **Añadir `orderBy: { fecha_hora: 'asc' }` a `movimientos`**: hoy el array llega sin orden y `PanelMotorista` hace `.find()`, cuyo resultado no es determinista. |
| `assign` | Usar `updateMany` filtrando `estado_mision in ['solicitada','aprobada']`, para que la máquina de estados deje de ser decorativa. Incluir `destinos`. Si queda `aprobada`, disparar `notificarMisionAsignada`. |
| `addMovement` | Destructurar `id_destino_mision`, validar que el destino pertenece a la misión, pasarlo a `tx.logMovimientoMision.create`. **No tocar** `ubicacion: 'Base (Cierre de mision)'`: el PDF lo compara por string. |
| `finalize` | Rechazar el cierre si el destino de mayor `orden_visita` no tiene `salida_destino`. Deja de depender solo del botón deshabilitado del frontend. |
| `uploadDocument` | Ver R3 y R5 en la sección 19. |
| `deleteDocument` | Nuevo. Ver R4. |
| `addDestino` | Nuevo `PATCH /misiones/:id/destinos`. Solo admin, estados `aprobada`/`en_curso`, `orden_visita = max + 1`, **sin tocar** `Mision.destino`. |

### 13.2 Catálogo de áreas

`rnpn_vehiculos_final` trae 7 áreas que hoy son inalcanzables desde la API. Crear:

- `controllers/areas.controller.ts` → `getAll` con `where: { activo: true }`, `orderBy: { nombre_area: 'asc' }`
- `routes/areas.routes.ts` → `router.get('/', areasCtrl.getAll)`
- `routes/index.ts` → `router.use('/areas', areasRoutes)`

### 13.3 Notificaciones

`services/notifications/email.service.ts`:

- `notificarNuevaSolicitud(mision)` → `EMAIL_ADMINS`, desde `create`
- `notificarMisionAsignada(mision)` → `mision.motorista.usuario.correo` (requiere `include: { motorista: { include: { usuario: true } } }`), desde `assign` con `aprobada`
- Ambas **no bloqueantes**: try/catch y solo log
- Corregir `ADMIN_EMAIL` → `EMAIL_ADMINS` en las líneas 60 y 100: esa variable no existe en `.env`, así que hoy el destinatario siempre cae al `SMTP_USER` de respaldo

### 13.4 Limpieza

- **Borrar `backend/src/prisma/schema.prisma`**: schema legacy muerto de 258 líneas con un `RolUsuario {admin, supervisor, consulta}` que contradice la base real. Prisma lee `prisma/schema.prisma`, así que este archivo es una trampa de mantenimiento.
- `clear_tables.js`: añadir `TRUNCATE TABLE destino_mision;`
- `index.ts:47`: el health check devuelve el string fijo `'mysql/xampp'` (confirmado en el servicio vivo de Render, que reporta exactamente ese valor). Debe derivarse de `DATABASE_URL`.
- `index.ts:68`: loguea `http://localhost:5173` fijo. Derivarlo de `CORS_ORIGIN`.

### 13.5 Validación

```powershell
npx tsc --noEmit
```

---

## 14. Fase E — Frontend

| Archivo | Cambio |
|---|---|
| `types/index.ts` | Añadir `AreaDestino` y `DestinoMision`; añadir `Mision.destinos`, `Mision.es_emergencia`, `LogMovimientoMision.id_destino_mision`. **Borrar** la interfaz `Asignacion` (líneas 110-131): está `@deprecated` y no la importa nadie. |
| `MisionesJefatura.tsx` | Cargar `GET /api/areas` en el `Promise.all` de las líneas 33-45. Sustituir el input único (295-304) por lista dinámica: botón "Agregar destino", filas con `orden_visita` visible, `<input list>` con autocompletado contra el catálogo más texto libre, botón de quitar, mínimo una fila. Estado en `useState`, no en `FormData`. `handleSubmit` (80-89) construye el payload y manda `destinos: [...]` más `destino: destinos[0].nombre_destino`. Checkbox de emergencia. Tabla con "N destinos" y badge EMERGENCIA. |
| `PanelMotorista.tsx` | **El más delicado.** Ruta ordenada reemplazando el bloque 205-208. `handleRegisterEvent` (101-120) recibe `id_destino_mision` y lo envía. La condición `some(mov => mov.tipo_evento === 'llegada_destino')` (249, 274) pasa a filtrar por destino. Habilitar `llegada_destino` solo si el destino de menor orden ya registró `salida_destino`. Pre-fill de km (258) filtrando por `id_destino_mision`. **Gate de cierre** (328) contra el destino de **mayor** orden: con un `some()` global se cerraría en el segundo destino de tres. Filtro (75-77) debe incluir `solicitada` para que el conductor vea sus emergencias pendientes. Formulario de emergencia → `POST /misiones` con `es_emergencia: true`. |
| `GestionMisiones.tsx` | Botón "Agregar Destino en Ruta" solo para `aprobada`/`en_curso` → `PATCH /misiones/:id/destinos`. Columna o badge de N destinos y de emergencia. Además los cambios de R1 y R4 de la sección 19. |
| `Dashboard.tsx` | Mostrar N destinos en el historial (230) y en la tarjeta de hoy (340), reemplazando el `m.destino` de texto único. Badge EMERGENCIA. De paso leer `m.estado_mision` en vez de `m.estado` en 249-256, que hoy deja el badge del historial vacío. |
| `utils/pdfGenerator.ts` | `generateMisionPDF(mision: Mision)` sin `any`. Los N destinos numerados en multi-línea dentro del recuadro y=60-73, con fallback a `mision.destino`. Sello EMERGENCIA. **No tocar** el match de la línea 54 (`'Base (Cierre de mision)'`). |
| Limpieza | **Borrar `pages/Programacion.tsx`** (633 líneas). No está enrutado (`App.tsx:7` lo tiene comentado) pero `tsc -b` lo sigue compilando, y usa estados `programado/en_desarrollo/suspendida` que **no existen** en el enum `EstadoMision`. Si alguien lo revive, corrompe datos. |

### Validación

```powershell
cd C:\SUVT-2\frontend ; npm run build
```

---

## 15. Fase F — Verificación y cierre

### 15.1 Configuración

Actualizar la referencia a `rnpn_vehiculos_final` en `.env`, `backend/.env`, ambos `.env.example`, los dos `docker-compose`, `database/limpiar_datos_misiones.sql`, `README.md` y `configurar-prisma.bat`.

> `003_rnpn_vehiculos_final.sql` **ya está aplicado**. No volver a ejecutarlo.
> `004_documentos_respaldo_text.sql` es nuevo y **solo** se aplica a `rnpn_vehiculos_final`.

### 15.2 Levantar el stack

```powershell
cd C:\SUVT-2
docker compose up --build -d --scale backend=1 --scale frontend=1
docker compose ls
```

### 15.3 Prueba manual del ciclo completo

| # | Paso | Validación |
|---|---|---|
| 1 | Jefatura crea una misión con 3 destinos (uno del catálogo, dos libres) | 3 filas en `destino_mision` con orden 1, 2, 3. `mision.destino` = nombre del primero |
| 2 | Admin aprueba y asigna vehículo | Estado `aprobada`. **Llega el correo** al motorista |
| 3 | Conductor recorre los destinos en orden | Los botones se habilitan solo en secuencia |
| 4 | Se intenta cerrar antes de la salida del destino 3 | Botón deshabilitado, y el backend también rechaza |
| 5 | Admin agrega un destino en ruta | Aparece el destino 4 y el cierre se vuelve a bloquear. `mision.destino` no cambia |
| 6 | Generar el PDF | Lista numerada de N destinos |
| 7 | Conductor solicita una emergencia | Aparece como `solicitada`, admin aprueba, el conductor la ve como `aprobada` |
| 8 | **Verificar resguardo de documentos** | Ver 15.4 |

### 15.4 Paso 8 — Verificación del resguardo de documentos

**Precondición:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` presentes en el `.env` raíz, y el contenedor reconstruido.

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Abrir `http://localhost:8081/programacion` | Tabla de misiones |
| 2 | En una fila, pulsar el icono azul de subida | Se abre el selector |
| 3 | Elegir un PDF de menos de 5 MB | Alerta `Documento subido correctamente` |
| 4 | `SELECT id_mision, documento_respaldo FROM mision ORDER BY id_mision DESC LIMIT 1;` | Empieza con `https://res.cloudinary.com/dyn6stlcn/` |
| 5 | Panel de Cloudinary | El archivo aparece en `SUVT/Misiones` |
| 6 | Pulsar el icono verde `FileCheck` | El PDF abre y se visualiza |
| 7 | `docker compose exec backend ls -la /app/uploads/misiones` | **Vacío**: confirma que el disco no participa |

**Reemplazo (R5):** subir un segundo PDF para la misma misión → en el panel de Cloudinary el primero desaparece.

**Borrado (R4):** usar el nuevo botón de eliminar → la columna queda en `NULL` y el archivo desaparece de Cloudinary.

**Pruebas negativas:**

| Prueba | Resultado |
|---|---|
| `.txt` vía API | `400` con `Formato de archivo no permitido` |
| PDF de 6 MB | `413` con mensaje en español |
| Sin `CLOUDINARY_*` en el `.env` raíz | `400` y `[Upload Document Error]` en `docker compose logs backend` |

La tercera es **el diagnóstico del hallazgo de credenciales**: si falla, el problema no es el código sino que las variables no llegaron al contenedor.

### 15.5 Comprobaciones SQL

```sql
SELECT * FROM destino_mision ORDER BY id_mision, orden_visita;
SELECT id_mision, es_emergencia, destino FROM mision;
SELECT MAX(id_mision) FROM rnpn_vehiculos_final.mision;   -- esperado: 18 en XAMPP, 1 en Aiven (arranca vacía)
SELECT COUNT(*) FROM rnpn_vehiculos_nueva.mision;          -- esperado: 16, intacto
```

### 15.6 Commit

```powershell
git add -A
git commit -m "Adapta backend y frontend a rnpn_vehiculos_final: destinos multiples, orden de visita, emergencia y documentos"
```

**No pushear a `desarrollo`.** Recordar 7.2: ese push despliega producción.

> **Mantenimiento diferido:** cuando este código se mergee a `desarrollo`, el esquema declarará `@db.Text` mientras la columna de `rnpn_vehiculos_nueva` sigue en `varchar(255)`. El código funciona igual porque ambos tipos son compatibles, pero el día que alguien ejecute `prisma db push` en producción, Prisma aplicará ese `ALTER`. Anotarlo como paso de mantenimiento en el momento del merge.

---

## 16. Fase 3 — Servicios Render paralelos

Dos Web Services nuevos en Render, independientes de `suvt-backend` y `suvt-frontend`.

### 16.1 Creación

| Campo | Valor |
|---|---|
| Tipo | Web Service (backend), Static Site o Web Service (frontend) |
| Rama | `feature/rnpn-vehiculos-final` (decisión 21) |
| Build Command | `npm install --include=dev && npx prisma generate && npm run build` (ver 16.5) |
| Auto-Deploy | **Off**. El despliegue se lanza a mano para no repetir el patrón de `desarrollo` |
| Puerto | El que asigne Render. No hardcodear 4000 |

### 16.2 Variables del backend paralelo

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Cadena del servicio Aiven nuevo, terminando en `/rnpn_vehiculos_final`. Con el CA si el cliente lo necesita |
| `JWT_SECRET` | **Generar uno nuevo.** Distinto al de producción (decisión 22) |
| `JWT_EXPIRES_IN` | Igual que producción |
| `CORS_ORIGIN` | URL del frontend paralelo |
| `SMTP_*`, `EMAIL_*` | Copiados de producción. Solo si se quieren probar las notificaciones |
| `CLOUDINARY_*` | Copiados de producción. El código apunta a `SUVT/Misiones`; para aislar por entorno, extraer la carpeta a `CLOUDINARY_FOLDER=SUVT2/Misiones` |
| `MAX_UPLOAD_MB` | `5` |

### 16.3 Variables del frontend paralelo

| Variable | Valor |
|---|---|
| `VITE_API_URL` | **URL absoluta:** `https://<suvt2-backend>.onrender.com/api` |

> En local `/api` funciona porque `nginx` hace de proxy en el mismo origen. En Render los dos servicios son orígenes distintos: si el frontend usa `/api` respecto a sí mismo, da CORS en vez de 404 y cuesta encontrarlo.

Coordinar los dos lados: `CORS_ORIGIN` del backend debe ser exactamente la URL del frontend paralelo.

### 16.4 Verificación de creación

```
https://<suvt2-backend>.onrender.com/health
# esperado: ok=true, env=production, y la base que responda es el espejo
```

El campo `db` del health check **se deriva de `DATABASE_URL`** (`index.ts:19-28`), así que sí sirve para confirmar la base: con el espejo debe responder `mysql/rnpn_vehiculos_final`.

**Verificado el 2026-10-15:** `db:"mysql/rnpn_vehiculos_final"` (espejo confirmado). El valor de `env` quedó **pendiente** de corregir a `production` en el dashboard (ver 16.5).

### 16.5 Trampa: `NODE_ENV=production` rompe el build

`NODE_ENV=production` es lo correcto para runtime (oculta el `stack` de los errores, baja el nivel de log, cambia morgan a `combined`; ver 3.9.2), pero **rompe el build** si el Build Command usa `npm install` a secas: npm omite las `devDependencies` cuando `NODE_ENV=production`, y entonces `tsc` falla con:

```
error TS2591: Cannot find name 'process'. Do you need to install type definitions for node?
```

(falta `@types/node`; también faltarían `typescript` y `prisma`).

**Solución:** mantener `NODE_ENV=production` en Environment y usar como **Build Command**:

```
npm install --include=dev && npx prisma generate && npm run build
```

`--include=dev` fuerza las devDependencies aunque `NODE_ENV=production`. Aplica igual al frontend (Static Site) si algún día se le pone `NODE_ENV`; hoy no lo lleva.

---

## 17. Fase 4 — Verificación en la nube

La Fase F completa (15.3, 15.4 y 15.5), apuntando al entorno paralelo.

Aquí los fixes de documentos se validan de verdad: en la nube no existe `uploads/` y la ruta legacy de la misión 17 es inalcanzable, que es exactamente lo que R1 a R6 resuelven.

| # | Verificación en nube | Diferencia con lo local |
|---|---|---|
| 1 | `NODE_ENV=production` en el health check | Local `npm run dev` reporta `development` |
| 2 | `password_hash` ausente de `GET /api/misiones` | Confirma el fix de la Fase 0 |
| 3 | Misión con 3 destinos, orden y cierre | — |
| 4 | Correo de asignación | Usa SMTP de Render, no el local |
| 5 | Subida de PDF a Cloudinary | Carpeta `SUVT/Misiones` o `SUVT2/Misiones` según 16.2 |
| 6 | Reemplazo y borrado del PDF | El anterior desaparece de Cloudinary |
| 7 | `GET /api/areas` responde 200 | En producción responde 404 hoy |
| 8 | Errores 5xx **sin** `stack` en la respuesta | Confirmación de `NODE_ENV=production` |
| 9 | `GET /api/misiones` sin token → 401 | El espejo no expone datos anónimos |

`GET /api/areas` → 404 es el diagnóstico de control: producción corre el código viejo y el paralelo debe responder 200.

---

## 18. Fase 5 — Cutover

**Fuera de alcance por ahora.** Queda anotado para cuando la fase 4 esté validada.

Los pasos mínimos, por orden:

1. Confirmar que `rnpn_vehiculos_final` de Aiven es la base definitiva.
2. Migrar los datos reales de `rnpn_vehiculos_nueva` a `final`: **16 misiones** con sus movimientos, controles de acceso, registros de combustible y asignaciones, más cualquier divergencia en maestros.
3. Aplicar la migración 004 sobre `nueva` si se decide ampliar producción.
4. Cambiar el `DATABASE_URL` de `suvt-backend` a `rnpn_vehiculos_final`.
5. Desplegar la feature a `suvt-backend`/`suvt-frontend`.
6. Verificar con el tráfico real y mantener la posibilidad de volver.

El paso 2 es el trabajo grande y **no existe en ningún documento todavía**. Mientras no se decida, `SUVT-2` es un experimento local y paralelo.

---

## 19. Riesgos corregidos

### R1 — Errores de multer devolvían 500 con mensaje en inglés

`middlewares/index.ts:11` fuerza `statusCode = 500` cuando `res.statusCode` sigue en 200, y devuelve el texto original de multer. El usuario solo veía `Error al subir el documento` porque el frontend ignoraba el mensaje del servidor.

```typescript
import multer from 'multer'

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const maxMb = Number(process.env.MAX_UPLOAD_MB ?? 5)
    const mapa: Record<string, [number, string]> = {
      LIMIT_FILE_SIZE:       [413, `El archivo excede el máximo permitido de ${maxMb} MB`],
      LIMIT_UNEXPECTED_FILE: [400, 'Campo de archivo inesperado'],
      LIMIT_FILE_COUNT:      [400, 'Se recibieron demasiados archivos'],
    }
    const [code, msg] = mapa[err.code] ?? [400, 'Error al procesar el archivo']
    logger.error(`${err.code} - ${req.method} ${req.originalUrl} - ${req.ip}`)
    return res.status(code).json({ ok: false, error: msg })
  }

  if (err?.message === 'Formato de archivo no permitido') {
    return res.status(400).json({ ok: false, error: err.message })
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode)
  logger.error(`${err.message} - ${req.method} ${req.originalUrl} - ${req.ip}`)
  res.json({ ok: false, error: err.message, stack: process.env.NODE_ENV === 'production' ? '' : err.stack })
}
```

Frontend, `GestionMisiones.tsx:121-140`:

```typescript
const msg = (error as any)?.response?.data?.error || 'Error al subir el documento'
alert(msg)
```

> Nota de la actualización: el `stack` de este bloque depende de `NODE_ENV`, no del ternario original. En producción hay que tener `NODE_ENV=production` (8.4) o no exponer el stack de ninguna manera.

### R2 — Límite fijo y desalineado con el balanceador

```typescript
const maxMb = Number(process.env.MAX_UPLOAD_MB ?? 5)
const storage = multer.memoryStorage()

export const uploadMisionDoc = multer({
  storage,
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'].includes(ext)) cb(null, true)
    else cb(new Error('Formato de archivo no permitido'))
  },
})
```

**`lb/nginx.conf` se mantiene en `client_max_body_size 10m` a propósito.** Así Express es el único que rechaza y devuelve el mensaje entendible, en vez de un 413 genérico del balanceador. La regla: nginx siempre **igual o mayor** que el límite de la aplicación.

### R3 — `public_id` nunca persistido

Se deriva de la propia URL, sin añadir columnas:

```
https://res.cloudinary.com/dyn6stlcn/image/upload/v1786988532/SUVT/Misiones/wcbkqbwgcgcr1h6cumrt.pdf
                                                  └───┬──┘         └────┬───┘  └──────────────┬────────────────┘
                                                cloud_name  resource_type           publicId
```

```typescript
export function extractPublicId(url: string): { publicId: string; resourceType: string } | null {
  if (!url || !url.startsWith('http')) return null
  const m = url.match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/([^/]+)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/)
  if (!m) return null
  return { resourceType: m[1], publicId: m[2] }
}
```

Devuelve `null` para rutas legacy (`uploads\...`), en cuyo caso se omite el borrado en Cloudinary sin fallar.

> Con esta decisión, `deleteFile` (`cloudinary.service.ts:51-61`) deja de ser código muerto.

### R4 — No existía forma de eliminar un documento

Ruta (`misiones.routes.ts`):

```typescript
router.delete('/:id/documento', permitirSoloAdmin, misionesCtrl.deleteDocument)
```

Controlador:

```typescript
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const mision = await prisma.mision.findUnique({ where: { id_mision: id } })

    if (!mision?.documento_respaldo) {
      return res.status(404).json({ ok: false, error: 'La misión no tiene documento asociado' })
    }

    const parsed = extractPublicId(mision.documento_respaldo)
    if (parsed) {
      try {
        await cloudinaryService.deleteFile(parsed.publicId, parsed.resourceType)
      } catch (e) {
        logger.warn(`No se pudo borrar de Cloudinary ${parsed.publicId}: ${(e as Error).message}`)
      }
    }

    await prisma.mision.update({ where: { id_mision: id }, data: { documento_respaldo: null } })
    res.json({ ok: true })
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message })
  }
}
```

Frontend: botón de eliminar junto al icono verde, con confirmación, visible solo si `m.documento_respaldo` existe y el usuario es admin.

> La ruta de subida (`misiones.routes.ts:18`) tampoco valida rol: cualquier autenticado puede subir. Ver 20.

### R5 — Cada reemplazo dejaba un huérfano en Cloudinary

En `uploadDocument`, el orden es **subir el nuevo primero** y borrar el anterior solo si la subida funcionó. El orden inverso perdería el documento vigente si Cloudinary falla:

```typescript
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    if (!req.file) return res.status(400).json({ ok: false, error: 'No se recibió ningún archivo' })

    const anterior = await prisma.mision.findUnique({
      where: { id_mision: id },
      select: { documento_respaldo: true },
    })

    // 1. Subir el nuevo. Si esto falla, se conserva el anterior.
    const resultado = await cloudinaryService.uploadFile(req.file.buffer, 'SUVT/Misiones')

    // 2. Guardar la nueva URL.
    const mision = await prisma.mision.update({
      where: { id_mision: id },
      data: { documento_respaldo: resultado.secure_url },
      include: { destinos: { orderBy: { orden_visita: 'asc' }, include: { area_destino: true } } },
    })

    // 3. Borrar el anterior en Cloudinary. No bloqueante.
    const previo = anterior?.documento_respaldo
    if (previo && previo !== resultado.secure_url) {
      const parsed = extractPublicId(previo)
      if (parsed) {
        try {
          await cloudinaryService.deleteFile(parsed.publicId, parsed.resourceType)
        } catch (e) {
          logger.warn(`No se pudo borrar el documento anterior: ${(e as Error).message}`)
        }
      }
    }

    res.json({
      ok: true,
      mision,
      cloudinary: { public_id: resultado.public_id, resource_type: resultado.resource_type },
    })
  } catch (error: any) {
    logger.error('[Upload Document Error]', error.message)
    res.status(400).json({ ok: false, error: error.message })
  }
}
```

Con esto, una misión ocupa **como máximo un archivo** en Cloudinary.

### R6 — `documento_respaldo` podía truncarse

Las URLs reales miden **100 caracteres** y el límite era 255. Ampliar a `TEXT` es no destructivo.

`database/migrations/004_documentos_respaldo_text.sql`:

```sql
-- 004_documentos_respaldo_text.sql
-- Amplia la columna de documentos a TEXT.
-- No destructivo: TEXT admite todo lo que cabia en VARCHAR(255).
-- Solo se aplica a rnpn_vehiculos_final. rnpn_vehiculos_nueva queda intacta.
USE rnpn_vehiculos_final;

ALTER TABLE mision
  MODIFY COLUMN documento_respaldo TEXT NULL;
```

En `schema.prisma`: `documento_respaldo String? @db.Text`.

---

## 20. Riesgos que permanecen abiertos

| Riesgo | Detalle | Por qué no se toca |
|---|---|---|
| **Fallback de JWT en el código** | `auth.controller.ts:6` (`'secret_rnpn_2024'`) y `auth.middleware.ts:4` llevan un secreto de respaldo hardcodeado. Si la variable falta, los tokens se firman con un secreto público | **Condicionado a 8.4**: confirmar que `JWT_SECRET` existe en el dashboard. Sin ese dato, quitar el fallback tumba el login |
| **`data: req.body` sin validar** | En `vehiculos.controller.ts:22,34` y `motoristas.controller.ts:34,46` el body entero llega a Prisma | Fuera de alcance |
| **Ruta de upload sin control de rol** | `misiones.routes.ts:18` solo valida JWT: cualquier usuario autenticado puede subir documentos. El DELETE nuevo sí usa `permitirSoloAdmin` | Fuera de alcance |
| **`error.message` devuelto en los `catch`** | Varios controladores responden `error.message` (p. ej. `usuarios.controller.ts:92`). Los errores de Prisma pueden incluir fragmentos de consulta | Inofensivo con `NODE_ENV=production`, pero conviene sustituirlo por mensajes genéricos |
| **Secretos JWT distintos por entorno** | El de producción, el del `.env` raíz (64 chars) y el de `backend/.env` (128) no coinciden entre sí | Fuera de alcance. Para el paralelo se genera uno nuevo (16.2) |
| **`k8s/secret.yaml` con valores reales** | `MYSQL_ROOT_PASSWORD`, `DB_PASSWORD`, `DATABASE_URL` y `JWT_SECRET` en texto plano, duplicados en `DOCKER_K8S_PLAN.md:494,495` | **Verificado: no son los de producción.** Su `DATABASE_URL` mide 77 caracteres y no contiene `aivencloud` ni `avnadmin`. Son valores locales de una fase de planificación. Convertirlos a placeholders |
| **5 implementaciones del mapeo estado→color** | Dispersas en el frontend | Fuera de alcance |
| **Crons sin `preventOverlap`** | Y los `ScheduledTask` no se guardan, así que `SIGTERM` corta trabajos en vuelo | Fuera de alcance |
| **`fileFilter` valida extensión, no MIME** | Un archivo renombrado pasa el filtro | Fuera de alcance |
| **6 PDFs huérfanos en `C:\SUVT`** | Sin referencia en BD. Inaccesibles desde Docker y desde la nube | Decisión 18: no tocar `C:\SUVT` |
| **Documento legacy de la misión 17** | Ruta local que solo funciona con `npm run dev` | Se salta en la nube. R1-R6 lo hacen innecesario |
| **CI y Render vigilan ramas distintas** | CI despliega desde `main`, Render vigila `desarrollo` | Requiere decidir cuál es la rama de producción. Ver 22.4 |

---

## 21. Docker vs `npm run dev`

| Aspecto | Docker | `npm run dev` |
|---|---|---|
| URL | `http://localhost:8081` (todo por el balanceador) | Backend 4001, frontend 5174 |
| Configuración | `.env` raíz | `backend/.env`, `frontend/.env` |
| `VITE_API_URL` | `/api` (relativo) | `http://localhost:4001/api` |
| `CORS_ORIGIN` | `http://localhost:8081` | `http://localhost:5174` |
| Escala | `--scale backend=3 --scale frontend=2` | 1 instancia |
| Hot reload | **No.** Exige `docker compose up --build` | Sí |
| Prisma | Se genera en el build de la imagen | Requiere `npx prisma generate` en el host |
| Fidelidad | Alta: `node dist/index.js` + nginx | Baja: TS en memoria |
| Uso | Validación previa al commit | Desarrollo diario |

> **Añadir una tercera columna: Render.** No equivale a Docker: Build Command en vez de Dockerfile, `npm install` en vez de `npm ci --omit=dev`, Aiven en vez de XAMPP, y `PORT` asignado por la plataforma. Ver 3.9.2.

---

## 22. Deuda técnica

Problemas conocidos, documentados y deliberadamente pospuestos.

### 22.1 `HEALTHCHECK` con puerto fijo

`backend/Dockerfile:34-35`:

```dockerfile
HEALTHCHECK ... CMD node -e "fetch('http://127.0.0.1:4000/health')..."
```

Render asigna `PORT=10000` y espera la app en ese puerto. Si algún día se pasa a usar el Dockerfile, el health check falla y Render marca el deploy como poco saludable en un bucle. Arreglar con el `PORT` del entorno. Hoy no afecta porque Render no usa el Dockerfile (3.9.2).

### 22.2 Las migraciones 001 y 002 son de un esquema anterior

Ambos archivos apuntan con `USE rnpn_vehiculos;`, un nombre que no existe. `001` crea 8 tablas, incluidas `semana`, `asignacion_diaria` y `novedad`, que la app no usa, y **le faltan cinco** que sí necesita: `mision`, `log_movimientos_mision`, `unidad_organizativa`, `controles_acceso` y `registro_combustible`. `002` hace un `DROP INDEX` sobre una de esas tablas inexistentes.

La carpeta `database/migrations/` mezcla dos generaciones y **no puede arrancar una base nueva**. Para eso sirve `_schema_nueva.sql` (9.2). Conviene limpiarlas o moverlas a un subdirectorio `legacy/`.

### 22.3 `ssl-mode` no es un parámetro de Prisma

`DATABASE_URL` de producción termina en `?ssl-mode=REQUIRED`. Esa es la convención del cliente `mysql` estándar, no la de Prisma, que usa `sslmode` sin guion. Está inerte: funciona porque Prisma negocia TLS por defecto. Es engañoso si alguien intenta cambiar el modo de cifrado por ahí.

### 22.4 CI y Render apuntan a ramas distintas

| | Rama | Consecuencia |
|---|---|---|
| `deploy-render` en el workflow | `main` | El hook solo se dispara al mergear a `main` |
| Auto-Deploy de Render | `desarrollo` | El despliegue real ocurre por push a `desarrollo` |
| `pull_request` en el workflow | `main` | Los PR a `desarrollo` no tienen ninguna validación |

Mergear a `main` dispara un hook que redespliega `desarrollo`, o sea que `main` no despliega nada nuevo. Hay que elegir: apuntar Render a `main` (entonces los PR tendrían CI y `main` sería la producción real) o cambiar el workflow para que apunte a `desarrollo`. **Decidir antes de la fase 5.**

### 22.5 Versión de Node en tres sitios distintos

`backend/Dockerfile` fija Node 20, el job `build-apk` fue parcheado a Node 22 (`e454245`) y la versión de Render es la que esté en el dashboard. No hay una única fuente.

### 22.6 `_schema_nueva.sql` no tiene sentencia `USE`

Se carga a ciegas. Antes de usarlo hay que añadir `USE rnpn_vehiculos_final;` o seleccionar la base en el cliente. Ver 9.2.

---

## 23. Anexo — Saneamiento del repositorio

El repositorio `tinoramirezsv1980-netizen/SUVT` es **público**.

**Estado:** las secciones S.1 y S.2 ya están aplicadas y verificadas. `.gitignore` cubre los cuatro archivos sensibles y los tres scratch con credenciales están fuera del índice. Falta el commit (S.3) y las rotaciones, que corresponden a la Fase 0 (8.5).

### S.1 `.gitignore`

Añadido y verificado con `git check-ignore -v`:

```
# Volcados de datos locales (contienen hashes bcrypt y correos reales)
database/_*.sql

# Scripts auxiliares de generacion de documentos
generar_exp.py
md2pdf.py
```

Cubre `_maestros_nueva.sql` y `_schema_nueva.sql`. Las migraciones `003` y `004` **no** coinciden con ese patrón, así que siguen versionándose.

### S.2 Quitar los scratch con credenciales

No eran dos, eran tres. El tercero apareció al revisar el directorio completo:

```powershell
git rm backend/src/scratch/create_user.ts
git rm backend/src/scratch/verify_user.ts
git rm backend/src/scratch/seed_users_final.ts
```

| Archivo | Contenido sensible |
|---|---|
| `create_user.ts` | Contraseña de administrador en texto plano. Es la base de la rotación de `admin@` |
| `verify_user.ts` | Correo corporativo y contraseña. **Ojo:** la copia local ya tenía la contraseña sustituida por un espacio, pero la versión committeada la conservaba. Sin `git rm` volvería a publicarse |
| `seed_users_final.ts` | Contraseña por defecto en texto plano (línea 8) para `jefatura@`, `seguridad@` y `motorista@`. **Verificado: nunca se ejecutó contra Aiven**, así que esas cuentas no quedaron afectadas |

Si hacen falta, se recrean leyendo de `process.env.SEED_CORREO` y `process.env.SEED_PASSWORD`, nunca con literales.

### S.2 bis Otros archivos de `scratch/`

`check_data.ts`, `check_unidades.ts`, `check_usuarios.ts`, `diag.ts.bak`, `seeds.ts.bak` y `test_asig.ts.bak` se conservan: no contienen secretos (`generar-password.bat` también es limpio, porque pide la contraseña en tiempo de ejecución). Vale la pena decidir si la carpeta debería existir en un repo público, pero no es un riesgo de credenciales.

### S.3 Commit selectivo

Nunca `git add -A`:

```powershell
git add .gitignore
git add backend/src/scratch/create_user.ts backend/src/scratch/verify_user.ts backend/src/scratch/seed_users_final.ts
git add database/migrations/003_rnpn_vehiculos_final.sql
git add database/migrations/004_documentos_respaldo_text.sql
git add MULTIDESTINO_NOTIF_CORREO.md PLAN_MULTIDESTINO.md PLAN_MULTIDESTINO_01.md PLAN_MULTIDESTINO_02.md
git add IMPLEMENTACION_SUVT_2.md
git commit -m "Saneamiento: elimina secretos de scratch, ignora volcados locales, agrega migraciones 003 y 004"
```

Las ramas `feature/saneamiento-repo` y `feature/fix-fuga-password-hash` se pueden unificar en un solo PR si se quiere una sola ronda de despliegue. **Nunca hacer push a `desarrollo` sin querer desplegar** (7.2).

### S.4 Verificación

```powershell
git ls-files | Select-String '_maestros|_schema_nueva|generar_exp|md2pdf|create_user|verify_user|seed_users_final'
# debe devolver vacío

git check-ignore -v database/_maestros_nueva.sql generar_exp.py
# debe mostrar la regla de .gitignore que los cubre
```

Ambas comprobaciones pasaron el 5 de octubre.

### S.5 Credenciales

Verificado contra `database/_maestros_nueva.sql` (20 filas en `usuario`, 20 hashes bcrypt):

| Credencial | ¿Existe? | Acción |
|---|---|---|
| Contraseña de Aiven de producción | Sí, servicio activo | **Rotar.** Quedó en texto plano en el chat |
| `admin@rnpn.gob.sv` | Sí | **Rotar.** Contraseña en el historial público |
| `jefatura@rnpn.gob.sv` | Sí | Ninguna: `seed_users_final.ts` nunca corrió contra Aiven |
| `seguridad@rnpn.gob.sv` | Sí | Ninguna: idem |
| `motorista@rnpn.gob.sv` | No | Nada que rotar. No reutilizar esa contraseña si se crea |
| `jose.ramirez@rnpn.gob.sv` | No en ninguna de las dos bases | Ninguna |
| `k8s/secret.yaml` | Valores locales obsoletos, **confirmados ajenos a producción** | Pasar a placeholders. Sin rotación |
| `JWT_SECRET` | Pendiente de confirmar en el dashboard | Confirmar antes de quitar el fallback (8.4) |

**Borrar los archivos no elimina las contraseñas del historial:** `git log -p` sigue mostrándolas. Por eso rotar es la única mitigación efectiva.

Los hashes de las 20 cuentas estuvieron en disco sin protección en `_maestros_nueva.sql`. El archivo ya está ignorado y nunca llegó a subirse, pero conviene asumir esos hashes como filtrados.

---

## 24. Resumen de comandos

```powershell
# Fase 0 — Seguridad
git checkout -b feature/fix-fuga-password-hash
# aplicar misiones.controller.ts:342 y usuarios.controller.ts:90
cd backend ; npx tsc --noEmit ; cd ..
git add backend/src .gitignore ; git commit -m "Oculta password_hash"
# dashboard: NODE_ENV=production  |  rotar password Aiven y admin@

# Fase 1 — Espejo en Aiven
mysql --ssl-ca=<ca.pem> -h <HOST> -P <PUERTO> -u <USER> -p rnpn_vehiculos_final < database\_schema_nueva.sql
mysql --ssl-ca=<ca.pem> ... rnpn_vehiculos_final < database\_maestros_nueva.sql
mysql --ssl-ca=<ca.pem> ... rnpn_vehiculos_final < database\migrations\003_rnpn_vehiculos_final.sql
mysql --ssl-ca=<ca.pem> ... rnpn_vehiculos_final < database\migrations\004_documentos_respaldo_text.sql

# Fase 2 — Local (A)
git clone https://github.com/tinoramirezsv1980-netizen/SUVT.git C:\SUVT-2
cd C:\SUVT-2 ; git checkout desarrollo ; git checkout -b feature/rnpn-vehiculos-final
# copiar .env y migraciones (A.2)
cd backend ; npm ci ; cd ../frontend ; npm ci
# configurar .env raiz (A.4) y docker-up.bat (A.5)

# Fase 2 — Local (B)
& "C:\xampp\mysql\bin\mysqldump.exe" -uroot rnpn_vehiculos_nueva > ..\database\_respaldo.sql
npx prisma db pull --print --schema=prisma/schema.prisma

# Fase 2 — Local (C, D, E)
# editar schema.prisma, backend, frontend
npx prisma generate --schema=prisma/schema.prisma
npx tsc --noEmit
cd ../frontend ; npm run build

# Fase 2 — Local (F)
cd C:\SUVT-2 ; docker compose up --build -d --scale backend=1 --scale frontend=1
# pruebas en http://localhost:8081

# Fase 3 — servicios Render paralelos (dashboard)
# Build Command: npm install --include=dev && npx prisma generate && npm run build
# rama feature/rnpn-vehiculos-final, Auto-Deploy Off
# JWT_SECRET nuevo, CORS_ORIGIN, VITE_API_URL absoluto

# Fase 4 — verificación en la nube (17)
```

**Nunca:** `git add -A` sobre ramas sensibles, ni `git push` a `desarrollo` sin querer desplegar.

---

## 25. Cambios posteriores a la Fase F (post-E2E local)

Aplicados el 2026-10-13 tras completar el flujo E2E local con cuentas reales.

### 25.1 Correcciones observadas en el flujo

1. **Seguridad — entrada en misiones `finalizada`.**
   `frontend/src/pages/ControlSeguridad.tsx` ahora incluye en el listado las misiones
   `finalizada` que aún no tienen `entrada_base` (variable `pendientesEntrada`), columna
   renombrada "Pendientes de Entrada". Antes solo se listaban `aprobada`/`en_curso`, así que
   una misión cerrada por el motorista antes de que Seguridad registrara la entrada nunca
   aparecía y la entrada se perdía.

2. **Admin — ubicación del motorista.**
   `frontend/src/pages/GestionMisiones.tsx` añade `estadoUbicacion(m)` y `destinoDe`; cuando
   la misión está `en_curso`, la columna de estado muestra un badge con `MapPin`, el último
   movimiento (llegada/salida), el destino asociado y la hora, derivados de `m.movimientos`.

3. **PDF — "Lugar de Visita".**
   `frontend/src/utils/pdfGenerator.ts` envuelve el texto con `splitTextToSize`, lo centra
   verticalmente en la caja (61–73 mm) y mueve "(+N destinos más)" dentro de la caja; se
   eliminó la línea interna en y=67 que chocaba con el texto.

Commits locales en `feature/rnpn-vehiculos-final`:
- `944694e` — las tres correcciones anteriores.
- `7a73a76` — aislamiento de Cloudinary.

### 25.2 Aislamiento de Cloudinary

- `backend/src/controllers/misiones.controller.ts` (`uploadDocument`) usa
  `process.env.CLOUDINARY_FOLDER || 'SUVT/Misiones'`.
- `docker-compose.yml` define `CLOUDINARY_FOLDER: ${CLOUDINARY_FOLDER:-SUVT/Misiones}`.
- `.env` raíz de SUVT-2 fija `CLOUDINARY_FOLDER=SUVT2/Misiones` (no versionado).

El default sigue siendo `SUVT/Misiones` para no alterar producción al mergear desde
`desarrollo`. Verificado en el E2E: el PDF de prueba quedó en
`https://res.cloudinary.com/dyn6stlcn/image/upload/SUVT2/Misiones/<id>.pdf`, mientras los de
pruebas previas permanecen en `SUVT/Misiones`.

### 25.3 Verificación y limpieza

Se recorrió el flujo completo (misión de 3 destinos): creación → asignación → salida y
**entrada** de Seguridad (2 filas en `control_acceso_seguridad`) → movimientos por destino en
orden → gate de cierre → "Agregar Destino en Ruta" → cierre → PDF en Cloudinary con
`uploads/misiones` vacío en el contenedor. Los datos de prueba (misiones 21/22/23 y sus PDF)
se eliminaron y el kilometraje de los vehículos 8/22/28 se restauró a su lectura de inicio.

### 25.4 Pendiente

Los correos reales fallan con `534-5.7.9 Application-specific password required (Gmail)`: la
clave en `SMTP_PASS` no es una *App Password*. Es no bloqueante (solo `warn` en logs);
queda diferido generar la App Password y actualizar `SMTP_PASS`.
