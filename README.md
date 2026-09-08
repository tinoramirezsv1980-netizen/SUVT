# RNPN — Control de Vehículos (Windows 11 + XAMPP + Node.js)

## Estructura del proyecto

```
rnpn-xampp/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          ← Esquema Prisma ORM (MySQL)
│   ├── src/
│   │   ├── index.ts               ← Servidor Express
│   │   ├── prisma/
│   │   │   └── client.ts          ← Singleton Prisma Client
│   │   ├── controllers/           ← Lógica de cada endpoint
│   │   ├── routes/                ← Definición de rutas API
│   │   ├── middlewares/           ← Auth JWT, roles, errores
│   │   ├── jobs/
│   │   │   └── cron.ts            ← Tareas programadas
│   │   ├── services/
│   │   │   └── notifications/
│   │   │       └── email.service.ts
│   │   ├── types/                 ← Tipos TypeScript
│   │   └── utils/
│   │       └── logger.ts
│   ├── .env.example               ← Plantilla de configuración
│   ├── package.json
│   └── tsconfig.json
├── frontend/                      ← Aplicación React + Vite
├── database/
│   ├── migrations/
│   │   └── 001_schema_mysql.sql   ← DDL completo MySQL
│   └── seeds/
│       └── 001_datos_iniciales.sql
├── start.bat                      ← Inicia el backend
├── start-frontend.bat             ← Inicia el frontend
├── configurar-prisma.bat          ← Configura Prisma (una sola vez)
└── generar-password.bat           ← Genera hash de contraseña admin
```

---

## Orden de instalación

### Primera vez (configuración inicial)

```
1. Instalar Node.js  → https://nodejs.org (versión LTS)
2. Instalar XAMPP    → https://www.apachefriends.org
3. Instalar Git      → https://git-scm.com
4. Descargar proyecto→ git clone ... o descomprimir ZIP
5. Crear BD en phpMyAdmin → importar database/migrations/001_schema_mysql.sql
6. Cargar datos      → importar database/seeds/001_datos_iniciales.sql
7. Configurar .env   → copy backend\.env.example backend\.env → editar
8. Configurar Prisma → doble clic en configurar-prisma.bat
9. Crear contraseña  → doble clic en generar-password.bat
```

### Uso diario

```
1. Abrir XAMPP       → Start MySQL
2. start.bat         → Inicia API en http://localhost:4000
3. start-frontend.bat→ Inicia web en http://localhost:5173
```

---

## Configuración del .env

```env
# MySQL (XAMPP sin contraseña — por defecto)
DATABASE_URL="mysql://root:@localhost:3306/rnpn_vehiculos"

# Si XAMPP tiene contraseña en MySQL:
# DATABASE_URL="mysql://root:SuPassword@localhost:3306/rnpn_vehiculos"

# JWT (generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=cadena_aleatoria_larga_aqui
JWT_EXPIRES_IN=8h

# Servidor
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

---

## Modo Docker (Fase 4 — Docker + Balanceador en Windows 11)

Levanta **backend x3 + frontend x2 + balanceador Nginx** (todo por `http://localhost:8080`), apuntando al MySQL de XAMPP (Opción A).

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo (motor en ejecución).
- XAMPP con MySQL activo en el puerto 3306.
- Base de datos `rnpn_vehiculos_nueva` creada (igual que en el modo local).

### Uso

```
1. Abrir XAMPP            → Start MySQL
2. Doble clic en docker-up.bat   → Construye y levanta todo, valida /health
```

O manualmente:

```powershell
# Desde la raíz del proyecto
docker compose up --build -d --scale backend=3 --scale frontend=2
```

Al finalizar quedará disponible:

| Servicio | URL |
|---|---|
| Frontend (SPA) | http://localhost:8080 |
| API health | http://localhost:8080/health |
| API (proxy) | http://localhost:8080/api/... |

Para detener: doble clic en `docker-down.bat` o `docker compose down`.

### Opción B — MySQL en Docker (alternativa)

En lugar del XAMPP, se usa un contenedor MySQL 8 (puerto 3307):

```powershell
docker compose -f docker-compose.yml -f docker-compose.mysql.yml up --build -d --scale backend=3 --scale frontend=2
```

### Notas técnicas

- Las réplicas se balancean con Nginx (`lb/nginx.conf`) usando `least_conn`.
- El backend usa Prisma con `binaryTargets = ["native", "debian-openssl-3.0.x"]` y la imagen `node:20-slim` (compatible con MySQL 8 y el motor de Prisma en Debian).
- Config por entorno: copiar `.env.example` → `.env` (el script `docker-up.bat` crea `.env` y genera `JWT_SECRET` automáticamente).
- Acceso desde otros dispositivos: usar la IP local de la PC seguida del puerto 8080, p. ej. `http://192.168.1.50:8080`.

---

## Despliegue a la nube (GitHub → GHCR → Render)

La primera aplicación (local) alimenta a la segunda (nube) mediante GitHub. El repositorio
contiene un pipeline de CI/CD (``.github/workflows/deploy.yml`) que:

1. **Construye** las imágenes Docker del backend y frontend.
2. **Publica** ambas en **GitHub Container Registry (GHCR)** con tags `latest` y el SHA del commit.
3. **Compila el APK Android** en un runner Linux con SDK y lo sube como artefacto descargable.
4. **Dispara el despliegue en Render** (backend + frontend) vía **Deploy Hooks** (solo en `main`).

### Eventos que disparan el pipeline

| Evento | Jobs que corren |
|---|---|
| Push a `main` | build-and-push + build-apk + deploy-render |
| Push a `desarrollo` | build-and-push + build-apk |
| Pull request hacia `main` | build-apk (check de validación) |
| `workflow_dispatch` (manual) | Todos los que apliquen según la rama |

### Protección de rama recomendada (Settings → Branches → Add rule → `main`)

- Require a status check: **build-apk** (y `build-and-push` si se desea).
- Manejar el merge por **Pull Request** (no push directo a `main`).

### Secretos requeridos (Settings → Secrets and variables → Actions)

| Secreto | Para qué |
|---|---|
| `RENDER_BACKEND_DEPLOY_HOOK` | Deploy Hook de Render del servicio Backend |
| `RENDER_FRONTEND_DEPLOY_HOOK` | Deploy Hook de Render del servicio Frontend |

Variable de repositorio opcional (Settings → Secrets and variables → Actions → Variables):

| Variable | Para qué |
|---|---|
| `APK_API_URL` | URL de la API usada al compilar el APK en CI. Default: `https://trazabilidad.rnpn.gob.sv/api` |

No se requieren credenciales de contenedor: el pipeline usa `GITHUB_TOKEN` para publicar en GHCR.

### Cómo obtener los Deploy Hooks en Render

1. Iniciar sesión en [Render](https://dashboard.render.com).
2. Ir al servicio **Backend** (`suvt-backend`) → pestaña **Settings**.
3. Sección **Deploy Hooks** → **Create Deploy Hook** → darle un nombre (p. ej. `github-ci-backend`).
4. Copiar la URL generada.
5. Repetir igual con el servicio **Frontend**.
6. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   - `RENDER_BACKEND_DEPLOY_HOOK` = URL del hook de Backend.
   - `RENDER_FRONTEND_DEPLOY_HOOK` = URL del hook de Frontend.
7. Opcional: en Render, desmarcar **Auto-Deploy** si se quiere que Render espere el hook
   (así sólo despliega cuando lo dispara el CI, tras publicar la imagen en GHCR).

### Descargar el APK compilado por el CI

1. Abrir la pestaña **Actions** del repositorio.
2. Seleccionar el run más reciente del workflow `build-and-deploy`.
3. Al final de la página, en **Artifacts**, descargar `suvt-app-debug`.
4. El APK está en esa carpeta: `app-debug.apk`.

### Cómo usar una imagen de GHCR en un servicio de Render

Para que Render use la imagen publicada (en lugar de build desde el código):

- Crear un servicio tipo **Web Service / Docker**.
- Como fuente de imagen usar (en minúsculas):
  - Backend: `ghcr.io/<usuario>/<repo>/suvt-backend:latest`
  - Frontend: `ghcr.io/<usuario>/<repo>/suvt-frontend:latest`
- En el proveedor de contenedores, autorizar que Render acceda al GHCR (Tokens GHCR o conexión a GitHub con permiso de `packages: read`).

> Nota: mientras tanto, la nube ya funciona con el pipeline nativo de Render desde GitHub
> (build del repo). Este workflow agrega la variante de imágenes Docker y el disparo de
> despliegue, según el `ROADMAP_SUVT.md` (Fase 4).

---

## App Android (Fase 3 — Capacitor + APK)

El frontend empaqueta la misma SPA en Android mediante Capacitor.

### Requisitos

- **Android Studio** instalado (incluye el JDK interno `jbr`, versión 25, compatible con AGP 8.13).
- **Java 21 o superior** disponible. Si tu JDK es 17, el build fallará con
  `invalid source release: 21`; usa el JBR de Android Studio:
  `C:\Program Files\Android\Android Studio\jbr`.

### Compilar el APK localmente (Windows)

```powershell
# Desde frontend/
# 1. Definir a qué API apuntará el APK (producción por defecto)
$env:VITE_API_URL = "https://trazabilidad.rnpn.gob.sv/api"

# 2. Construir la SPA y sincronizar con el proyecto Android
npm run build
npx cap sync android

# 3. Compilar el APK depurable
#    (el JBR de Android Studio es JDK 25: compatible)
cd android
.\gradlew.bat assembleDebug
```

El APK queda en `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

> En el CI, el job `build-apk` hace exactamente este proceso en un runner Linux
> y sube el APK como artefacto (ver sección de despliegue a la nube).

### Variables para el APK

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL base de la API embebida en el APK. Ver `frontend/.env.apk.example`. |

---

## Comandos útiles de Prisma

```powershell
# Desde la carpeta backend/

# Generar el cliente (obligatorio tras cambios al schema)
npx prisma generate --schema=prisma/schema.prisma

# Sincronizar schema con MySQL (crea/modifica tablas)
npx prisma db push --schema=prisma/schema.prisma

# Abrir Prisma Studio (explorador visual de la BD)
npx prisma studio --schema=prisma/schema.prisma

# Ver el estado del schema vs la BD
npx prisma db pull --schema=prisma/schema.prisma
```

---

## Verificar que todo funciona

```powershell
# La API debe responder en:
# http://localhost:4000/health
# Respuesta: {"ok":true,"status":"running","db":"mysql/xampp"}

# El frontend en:
# http://localhost:5173

# phpMyAdmin en:
# http://localhost/phpmyadmin
```
