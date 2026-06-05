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
