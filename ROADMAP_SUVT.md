# Roadmap de Evolución del SUVT

**Sistema Unificado de Vehículos y Transporte (SUVT)**  
**Estado del roadmap:** Fase 1-4 Win11 completadas, Fase 3 APK parcial  
**Fecha:** Septiembre 2026

---

## 1. Visión General

El objetivo estratégico del SUVT es mantener una arquitectura unificada:

- Una sola aplicación React.
- Una sola base de código frontend.
- Un solo backend.
- Una sola base de datos.
- Una experiencia adaptable a Desktop, Tablet y dispositivos móviles.
- Una futura aplicación Android (APK) reutilizando la misma solución.
- Una infraestructura escalable mediante Docker, balanceo de carga y, si la necesidad lo justifica, Kubernetes.

### Arquitectura conceptual

```text
                    SUVT
                     |
          +----------+----------+
          |          |          |
       Desktop     Tablet      Móvil
          |          |          |
          +----------+----------+
                     |
               MISMO FRONTEND
                 React/Vite
                     |
                 MISMA API
             Node.js/Express
                     |
              Prisma ORM
                     |
                Aiven MySQL
                     |
                 Cloudinary
```

---

# FASE 1 — SISTEMA WEB EN PRODUCCIÓN

## Estado: COMPLETADA

La Fase 1 corresponde a la construcción, integración y puesta en producción de la plataforma web del SUVT.

### Componentes implementados

- Frontend React + Vite.
- Backend Node.js + Express.
- Prisma ORM.
- Base de datos MySQL en Aiven.
- Autenticación mediante JWT.
- Cloudinary para almacenamiento de documentos.
- Render para despliegue del Backend.
- Render para despliegue del Frontend.
- GitHub como repositorio central.
- Pruebas locales.
- Pruebas de producción.

### Arquitectura actual

```text
React + Vite
     |
Node.js + Express
     |
Prisma
     |
Aiven MySQL
     |
Cloudinary
     |
Render
```

### Resultado

**SUVT WEB ESTABLE Y VALIDADO EN PRODUCCIÓN.**

---

# FASE 2 — RESPONSIVE Y EXPERIENCIA MÓVIL

## Estado: COMPLETADA

Esta fase adaptó la misma aplicación React para funcionar correctamente en:

- Computadoras de escritorio.
- Laptops.
- Tablets.
- Teléfonos móviles.

## Objetivo principal

Mantener:

```text
1 Frontend React
1 Backend
1 Base de Datos
```

Pero permitir:

```text
                    SUVT
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
       Desktop      Tablet      Móvil
          |           |           |
          +-----------+-----------+
                      |
                  MISMA API
                      |
                  MISMA BD
```

---

## Fase 2.1 — Auditoría Responsive

Antes de modificar código se realizará una auditoría del frontend actual.

### Elementos a revisar

- Login.
- Dashboard.
- Layout principal.
- Sidebar.
- Navegación.
- Gestión de Misiones.
- Programación.
- Vehículos.
- Motoristas.
- Usuarios.
- Unidades.
- Formularios.
- Tablas.
- Modales.
- Carga de documentos.

### Resoluciones de prueba

#### Desktop

- 1920 px.
- 1366 px.
- 1024 px.

#### Tablet

- 768 px.
- 820 px.

#### Móvil

- 360 px.
- 375 px.
- 390 px.
- 412 px.

---

## Fase 2.2 — Diseño Responsive Global

Se revisarán los componentes comunes del sistema.

### Elementos principales

- Header.
- Sidebar.
- Menú móvil.
- Área de contenido.
- Breadcrumbs.
- Botones.
- Modales.
- Alertas.
- Notificaciones.

### Objetivo de navegación móvil

El Sidebar de escritorio deberá adaptarse a una navegación adecuada para pantallas pequeñas.

```text
+---------------------------+
| ☰ SUVT                👤 |
+---------------------------+
|                           |
|         CONTENIDO         |
|                           |
+---------------------------+
```

Menú:

```text
☰
|
+-- Dashboard
+-- Misiones
+-- Vehículos
+-- Motoristas
+-- Programación
+-- Configuración
```

---

## Fase 2.3 — Formularios Responsive

Los formularios deberán adaptarse progresivamente.

### Desktop

```text
+--------------+--------------+
| Campo 1      | Campo 2      |
+--------------+--------------+
| Campo 3      | Campo 4      |
+--------------+--------------+
```

### Móvil

```text
+--------------------------+
| Campo 1                  |
+--------------------------+
| Campo 2                  |
+--------------------------+
| Campo 3                  |
+--------------------------+
| Campo 4                  |
+--------------------------+
```

### Criterios

- Campos fáciles de tocar.
- Botones con tamaño adecuado.
- Espaciado suficiente.
- Validaciones visibles.
- Modales utilizables en móvil.
- Controles de fecha adecuados.
- Selects optimizados para pantallas táctiles.

---

## Fase 2.4 — Tablas Responsive

Las tablas son especialmente importantes para el SUVT.

No se recomienda simplemente reducir una tabla compleja hasta que resulte ilegible.

### Estrategias posibles

- Scroll horizontal controlado.
- Ocultar columnas secundarias.
- Vista resumida.
- Conversión a tarjetas en móvil.

### Ejemplo

```text
+--------------------------+
| 🚙 VEHÍCULO              |
|                          |
| Placa: P123-456          |
| Motorista: Juan Pérez    |
| Estado: Activo           |
|                          |
| [ Ver ]  [ Editar ]      |
+--------------------------+
```

Esto puede aplicarse a:

- Vehículos.
- Misiones.
- Motoristas.
- Usuarios.
- Programación.

---

## Fase 2.5 — Navegación Táctil

La aplicación debe prepararse para interacción táctil.

### Desktop

```text
Mouse
Hover
Click
```

### Mobile

```text
Touch
Tap
Scroll
Swipe
```

### Elementos a revisar

- Tamaño de botones.
- Separación entre acciones.
- Menús.
- Dropdowns.
- Modales.
- Selects.
- Tablas.
- Scroll.
- Carga de archivos.
- Visualización de documentos.

---

## Fase 2.6 — Pruebas Responsive

| Plataforma | Prueba |
|---|---|
| Desktop | Pantalla completa |
| Laptop | 1366 px |
| Android pequeño | 360–375 px |
| Android estándar | 390 px |
| Android grande | 412 px |
| Tablet | 768 px o superior |

### Resultado esperado

```text
              MISMO CÓDIGO
                   |
       +-----------+-----------+
       |           |           |
       v           v           v
    Desktop      Tablet      Móvil
       |           |           |
       +-----------+-----------+
                   |
             MISMO BACKEND
                   |
               Aiven DB
```

---

# FASE 3 — EMPAQUETADO MÓVIL Y APK ANDROID

## Estado: EN PROGRESO (Capacitor integrado, APK requiere Android Studio)

Una vez completada la adaptación responsive, la misma aplicación React será preparada para Android.

## Arquitectura

```text
React Responsive
       |
       v
   Capacitor
       |
       v
 Android Project
       |
       v
      APK
```

### Arquitectura de servicios

```text
+-------------------+
|     SUVT APK      |
|      Android      |
+---------+---------+
          |
        HTTPS
          |
          v
+-------------------+
|   SUVT Backend    |
+---------+---------+
          |
    +-----+------+
    |            |
    v            v
Aiven MySQL   Cloudinary
```

## Principio fundamental

No se crearán:

- Un segundo frontend.
- Un segundo backend.
- Una segunda base de datos.

Se mantendrá:

```text
1 Aplicación React
1 Backend
1 Base de Datos
```

---

## Actividades de la Fase 3

### 3.1 Preparación

- Verificar que la aplicación sea responsive.
- Revisar navegación móvil.
- Revisar autenticación.
- Revisar HTTPS.
- Revisar carga de archivos.

### 3.2 Capacitor

- Instalar Capacitor.
- Inicializar configuración.
- Configurar aplicación Android.
- Generar proyecto Android.

### 3.3 Experiencia móvil

- Nombre de aplicación.
- Icono.
- Splash Screen.
- Permisos necesarios.
- Navegación móvil.
- Manejo de conexión.

### 3.4 Pruebas

- Emulador Android.
- Dispositivo físico.
- Login.
- Misiones.
- Vehículos.
- Formularios.
- Documentos Cloudinary.
- Comunicación con API.
- Pruebas contra producción.

### Resultado

```text
Web Responsive
      +
Android APK
      |
      v
Mismo Backend
      |
      v
Misma Base de Datos
```

---

# FASE 4 — DOCKER, CONTENEDORES Y BALANCEO DE CARGA

## Estado: COMPLETADA (Windows 11 + CI/CD GitHub Actions)

La Fase 4 busca preparar la infraestructura para una operación más portable y escalable.

## Objetivos

- Dockerizar Backend.
- Dockerizar Frontend.
- Crear Docker Compose.
- Gestionar variables de entorno.
- Agregar Health Checks.
- Implementar Reverse Proxy.
- Preparar múltiples instancias.
- Implementar balanceo de carga.

---

## Fase 4.1 — Dockerizar Backend

Crear una imagen para:

```text
Node.js
Express
Prisma
SUVT API
```

Incluir:

- Dockerfile.
- Variables de entorno.
- Health Check.
- Build de TypeScript.
- Prisma Client.
- Manejo seguro de secretos.

---

## Fase 4.2 — Dockerizar Frontend

Crear imagen para:

```text
React
Vite Build
Servidor Web
```

El frontend será construido y servido desde un contenedor adecuado.

---

## Fase 4.3 — Docker Compose

Ejecutar localmente:

```text
+--------------------+
| Frontend Container |
+---------+----------+
          |
          v
+--------------------+
| Backend Container  |
+---------+----------+
          |
          v
      Aiven MySQL
          |
       Cloudinary
```

Objetivo:

Probar toda la arquitectura desde Windows 11 antes de desplegarla.

---

## Fase 4.4 — Reverse Proxy

Agregar un componente como:

```text
Nginx
```

Arquitectura:

```text
Internet
   |
   v
Reverse Proxy
   |
   +--------+
   |        |
   v        v
Frontend  Backend
```

---

## Fase 4.5 — Múltiples Instancias Backend

```text
                    Reverse Proxy
                         |
              +----------+----------+
              |                     |
              v                     v
        Backend API #1        Backend API #2
           Docker                Docker
              |                     |
              +----------+----------+
                         |
                         v
                    Aiven MySQL
                         |
                     Cloudinary
```

---

## Fase 4.6 — Balanceador de Carga

Implementar balanceo entre múltiples instancias.

### Pruebas

- Concurrencia.
- JWT.
- Sesiones.
- Archivos.
- Cloudinary.
- Base de datos.
- Health Checks.
- Caída de una instancia.
- Logs.
- Recuperación.

---

# FASE 5 — KUBERNETES Y ALTA DISPONIBILIDAD

## Estado: OPCIONAL / FUTURA

Kubernetes se evaluará cuando exista una necesidad real de:

- Escalabilidad automática.
- Múltiples servicios.
- Alta disponibilidad.
- Rolling Updates.
- Orquestación avanzada.

## Arquitectura conceptual

```text
                    INTERNET
                       |
                       v
                 Load Balancer
                       |
                       v
              +-----------------+
              | Kubernetes      |
              | Cluster         |
              |                 |
              | +-------------+ |
              | | SUVT API    | |
              | | Pod         | |
              | +-------------+ |
              | +-------------+ |
              | | SUVT API    | |
              | | Pod         | |
              | +-------------+ |
              | +-------------+ |
              | | SUVT API    | |
              | | Pod         | |
              | +-------------+ |
              +--------+--------+
                       |
              +--------+--------+
              |                 |
              v                 v
          Aiven MySQL       Cloudinary
```

## Componentes posibles

- Deployments.
- Services.
- Ingress.
- ConfigMaps.
- Secrets.
- Replicas.
- Health Checks.
- Autoscaling.
- Rolling Updates.
- Observabilidad.

---

# ESTRATEGIA DE GIT Y DESPLIEGUE

## Desarrollo Local

```text
Windows 11
    |
  C:\SUVT
    |
+---+----------------+
|                    |
v                    v
Frontend           Backend
```

## Flujo

```text
Desarrollo Local
       |
       v
    Pruebas
       |
       v
git add
       |
       v
git commit
       |
       v
git push
       |
       v
    GitHub
       |
       v
    Render
```

## Importante

GitHub almacena:

- Código.
- Configuración versionada.
- package.json.
- Dockerfiles.
- docker-compose.yml.
- Código fuente.

GitHub NO debe almacenar:

- Credenciales.
- JWT_SECRET.
- DATABASE_URL con credenciales.
- CLOUDINARY_API_SECRET.
- Contraseñas SMTP.

Estos valores se gestionarán mediante:

```text
Variables de Entorno
Secrets
Servicios de Infraestructura
```

---

# ROADMAP GENERAL

```text
+--------------------------------------+
| FASE 1                               |
| WEB + PRODUCCIÓN                     |
| COMPLETADA                           |
+--------------------+-----------------+
                     |
                     v
+--------------------------------------+
| FASE 2                               |
| RESPONSIVE                           |
| Desktop / Tablet / Mobile            |
+--------------------+-----------------+
                     |
                     v
+--------------------------------------+
| FASE 3                               |
| APK ANDROID                          |
| React + Capacitor                    |
+--------------------+-----------------+
                     |
                     v
+--------------------------------------+
| FASE 4                               |
| DOCKER + LOAD BALANCER               |
+--------------------+-----------------+
                     |
                     v
+--------------------------------------+
| FASE 5                               |
| KUBERNETES                           |
| OPCIONAL / SEGÚN NECESIDAD           |
+--------------------------------------+
```

---

# PRINCIPIOS ARQUITECTÓNICOS DEL SUVT

## 1. Una sola aplicación

La misma aplicación React debe servir como base para Web y Mobile.

## 2. Un solo backend

Node.js + Express continuará siendo la API central.

## 3. Una sola fuente de datos

Aiven MySQL será la fuente central de información.

## 4. Archivos centralizados

Cloudinary continuará gestionando documentos y archivos.

## 5. API Stateless

El backend debe mantenerse preparado para múltiples instancias utilizando JWT.

## 6. Separación de responsabilidades

```text
Frontend
   |
API
   |
Base de Datos

Cloudinary
   |
Archivos
```

## 7. Escalabilidad progresiva

No incorporar infraestructura compleja antes de necesitarla.

```text
Render
   |
Docker
   |
Docker Compose
   |
Load Balancer
   |
Kubernetes
```

---

# ESTADO ACTUAL DEL PROYECTO

| Fase | Objetivo | Estado |
|---|---|---|
| Fase 1 | Sistema Web + Producción | COMPLETADA |
| Fase 2 | Responsive Desktop / Tablet / Mobile | COMPLETADA |
| Fase 3 | Capacitor + Android APK | EN PROGRESO (integración lista, APK pendiente) |
| Fase 4 | Docker + Load Balancer | COMPLETADA (Win11 + CI/CD) |
| Fase 5 | Kubernetes + Alta Disponibilidad | OPCIONAL |

---

# PRÓXIMO PASO

## Completar Fase 3 — Generación del APK Android

La integración con Capacitor ya está lista (proyecto `frontend/android/` generado, `cap sync` funcional). Para generar el APK se necesita:

1. Instalar Android Studio (o Command Line Tools + SDK) en la máquina.
2. Configurar `ANDROID_HOME`.
3. Establecer `VITE_API_URL` (ver `frontend/.env.apk.example`).
4. Ejecutar `npm run build` y `npx cap sync android` en `frontend/`.
5. Generar el APK depurable con `npx cap open android` (Build > Build App Bundle(s) / APK(s)) o Gradle.

## Desplegar en la nube (Fase 4 nube)

1. Configurar Render Deploy Hooks (Backend y Frontend).
2. Agregar `RENDER_BACKEND_DEPLOY_HOOK` y `RENDER_FRONTEND_DEPLOY_HOOK` como secrets en GitHub.
3. Hacer merge de `desarrollo` a `main` para disparar disponibilidad en Producción.

**Regla de trabajo:** primero auditar y planificar; después modificar, probar localmente, validar y finalmente hacer commit y despliegue.
