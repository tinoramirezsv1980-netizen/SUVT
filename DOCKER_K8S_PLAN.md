# Plan de Implementacion — Docker + Kubernetes
## RNPN Trazabilidad Vehicular

---

## 1. Stack Actual

| Capa         | Tecnologia                   | Puerto |
|--------------|------------------------------|--------|
| Frontend     | React + Vite + TypeScript    | 5173   |
| Backend      | Express + Prisma + TypeScript| 4000   |
| Base datos   | MySQL 8 (XAMPP)             | 3306   |
| Archivos     | Disco local uploads/misiones + Cloudinary | — |

---

## 2. Estructura del Proyecto (a dockerizar)

```
C:\SUVT\
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                    (se reemplaza por .env.production)
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
├── database/
│   └── 001_schema_mysql.sql    (script inicial MySQL)
├── k8s/                        (a crear — manifests Kubernetes)
├── docker-compose.yml          (a crear)
└── DOCKER_K8S_PLAN.md          (este archivo)
```

---

## 3. Archivos a Crear

| # | Archivo                      | Descripcion                                    |
|---|------------------------------|------------------------------------------------|
| 1 | backend/.dockerignore        | Exclusiones para build del backend             |
| 2 | backend/Dockerfile           | Build multi-stage (builder + production)       |
| 3 | frontend/.dockerignore       | Exclusiones para build del frontend            |
| 4 | frontend/Dockerfile          | Build multi-stage (Vite + Nginx)               |
| 5 | frontend/nginx.conf          | Proxy reverso /api → backend                   |
| 6 | docker-compose.yml           | Orquestacion local (MySQL + Backend + Frontend)|
| 7 | backend/.env.production      | Template de variables de entorno produccion    |
| 8 | k8s/namespace.yaml           | Namespace dedicado                             |
| 9 | k8s/configmap.yaml           | Config no sensible del backend                 |
| 10| k8s/secret.yaml              | Template de secrets (credenciales)             |
| 11| k8s/mysql-statefulset.yaml   | MySQL con PVC para persistencia                |
| 12| k8s/uploads-pvc.yaml         | Volumen para archivos subidos                  |
| 13| k8s/backend-deployment.yaml  | API con replicas + HPA                         |
| 14| k8s/frontend-deployment.yaml | SPA con replicas + HPA                         |
| 15| k8s/ingress.yaml             | SSL + routing via nginx-ingress                 |

---

## 4. Variables de Entorno Requeridas

### Backend (sensibles — van en Secret de K8s)

| Variable              | Ejemplo / Descripcion                         |
|-----------------------|-----------------------------------------------|
| DATABASE_URL          | mysql://rnpn_user:PASS@mysql-svc:3306/rnpn_vehiculos_nueva |
| JWT_SECRET            | Clave secreta para firmar tokens JWT          |
| SMTP_HOST             | smtp.gmail.com                                |
| SMTP_PORT             | 587                                           |
| SMTP_USER             | notificaciones@rnpn.gob.sv                    |
| SMTP_PASS             | Contraseña de aplicacion del correo           |
| SMTP_FROM             | "RNPN Vehiculos <notificaciones@rnpn.gob.sv>" |
| EMAIL_SUPERVISORES    | supervisor@rnpn.gob.sv                        |
| EMAIL_ADMINS          | admin@rnpn.gob.sv                             |
| CLOUDINARY_CLOUD_NAME | Nombre del cloud en Cloudinary                |
| CLOUDINARY_API_KEY    | API Key de Cloudinary                         |
| CLOUDINARY_API_SECRET | API Secret de Cloudinary                      |

### Backend (config — van en ConfigMap de K8s)

| Variable               | Valor por defecto         |
|------------------------|---------------------------|
| NODE_ENV               | production                |
| PORT                   | 4000                      |
| JWT_EXPIRES_IN         | 8h                        |
| CORS_ORIGIN            | https://trazabilidad.rnpn.gob.sv |
| LOG_LEVEL              | info                      |
| UMBRAL_KM_MANTENIMIENTO| 50000                     |
| TZ                     | America/El_Salvador       |

### Frontend (se inyecta en build-time)

| Variable       | Descripcion                                     |
|----------------|------------------------------------------------|
| VITE_API_URL   | /api (se resuelve via nginx proxy reverso)      |

---

## 5. Puertos y Networking

| Servicio   | Puerto Container | Puerto Externo | Protocolo |
|------------|-----------------|----------------|-----------|
| Frontend   | 80              | 80/443         | HTTP/HTTPS|
| Backend    | 4000            | — (interno)    | HTTP      |
| MySQL      | 3306            | — (interno)    | TCP       |

### Flujo de Red (Produccion)

```
Internet
  │
  ▼
Ingress Controller (nginx) — puerto 443 (TLS)
  │
  ├── /api/*, /uploads/*  →  backend-svc:4000  →  backend pods (2-3 replicas)
  │
  └── /*                  →  frontend-svc:80   →  frontend pods (2-3 replicas)

Backend pods  →  mysql-svc:3306  →  MySQL StatefulSet (1 replica, 10Gi PVC)
```

### Flujo de Red (Docker Compose — Desarrollo)

```
localhost:80  →  frontend:80  →  proxy /api → backend:4000
localhost:4000 →  backend:4000 →  mysql:3306
localhost:3307 →  mysql:3306   (acceso phpMyAdmin externo)
```

---

## 6. Fase 1 — Preparacion del Proyecto

### 6.1 Crear backend/.env.production

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=mysql://rnpn_user:CHANGE_ME@mysql-svc:3306/rnpn_vehiculos_nueva
JWT_SECRET=CHANGE_ME_usa_clave_larga_64_caracteres
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://trazabilidad.rnpn.gob.sv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=CHANGE_ME
SMTP_PASS=CHANGE_ME
SMTP_FROM="RNPN Vehiculos <notificaciones@rnpn.gob.sv>"
EMAIL_SUPERVISORES=CHANGE_ME
EMAIL_ADMINS=CHANGE_ME
UMBRAL_KM_MANTENIMIENTO=50000
LOG_LEVEL=info
CLOUDINARY_CLOUD_NAME=CHANGE_ME
CLOUDINARY_API_KEY=CHANGE_ME
CLOUDINARY_API_SECRET=CHANGE_ME
```

### 6.2 Crear backend/.dockerignore

```
.git
.gitignore
node_modules
dist
.env
.env.local
.env.production
uploads
*.md
.DS_Store
```

### 6.3 Crear frontend/.dockerignore

```
.git
.gitignore
node_modules
dist
.env
.env.local
*.md
.DS_Store
```

---

## 7. Fase 2 — Dockerfiles

### 7.1 backend/Dockerfile

```dockerfile
# ============================================================
#  RNPN Backend — Build Multi-Stage
# ============================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ prisma/
RUN npx prisma generate --schema=prisma/schema.prisma

COPY . .
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache tzdata
ENV TZ=America/El_Salvador

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/prisma/ prisma/
COPY --from=builder /app/dist/ dist/
RUN npx prisma generate --schema=prisma/schema.prisma

RUN mkdir -p uploads/misiones
VOLUME /app/uploads

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

ENTRYPOINT ["sh", "-c", "npx prisma db push --schema=prisma/schema.prisma 2>/dev/null; node dist/index.js"]
```

### 7.2 frontend/Dockerfile

```dockerfile
# ============================================================
#  RNPN Frontend — Build Multi-Stage con Nginx
# ============================================================

# ---- Stage 1: Build con Vite ----
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL=/api

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN VITE_API_URL=$VITE_API_URL npm run build

# ---- Stage 2: Nginx ----
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/ /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1
```

### 7.3 frontend/nginx.conf

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip para assets estaticos
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;

    # Proxy reverso → Backend API
    location /api/ {
        proxy_pass http://backend-svc:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
        client_max_body_size 10m;
    }

    # Proxy para archivos subidos
    location /uploads/ {
        proxy_pass http://backend-svc:4000;
        proxy_set_header Host $host;
    }

    # Cache de assets estaticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — todas las rutas sirven index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 8. Fase 3 — Docker Compose (Desarrollo Local)

### docker-compose.yml (en la raiz del proyecto)

```yaml
# ============================================================
#  RNPN Trazabilidad — Docker Compose (Desarrollo Local)
# ============================================================

services:

  # ── MySQL 8 ──────────────────────────────────────────────
  mysql:
    image: mysql:8.0
    container_name: rnpn-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-rnpn2026}
      MYSQL_DATABASE: rnpn_vehiculos_nueva
      MYSQL_USER: rnpn_user
      MYSQL_PASSWORD: ${DB_PASSWORD:-rnpn2026}
    ports:
      - "3307:3306"
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - rnpn-net

  # ── Backend API ──────────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: rnpn-backend
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: "4000"
      DATABASE_URL: mysql://rnpn_user:${DB_PASSWORD:-rnpn2026}@mysql:3306/rnpn_vehiculos_nueva
      JWT_SECRET: ${JWT_SECRET:-jwt_secret_rnpn_2026_cambiar_en_produccion}
      JWT_EXPIRES_IN: "8h"
      CORS_ORIGIN: "*"
      SMTP_HOST: ${SMTP_HOST:-smtp.gmail.com}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_SECURE: "false"
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASS: ${SMTP_PASS:-}
      SMTP_FROM: ${SMTP_FROM:-"RNPN Vehiculos <notificaciones@rnpn.gob.sv>"}
      EMAIL_SUPERVISORES: ${EMAIL_SUPERVISORES:-supervisor@rnpn.gob.sv}
      EMAIL_ADMINS: ${EMAIL_ADMINS:-admin@rnpn.gob.sv}
      UMBRAL_KM_MANTENIMIENTO: "50000"
      LOG_LEVEL: info
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME:-}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY:-}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET:-}
    ports:
      - "4000:4000"
    volumes:
      - uploads-data:/app/uploads
    networks:
      - rnpn-net

  # ── Frontend (Nginx) ────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: /api
    container_name: rnpn-frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"
    networks:
      - rnpn-net

networks:
  rnpn-net:
    driver: bridge

volumes:
  mysql-data:
    driver: local
  uploads-data:
    driver: local
```

### Archivo .env en la raiz (para Docker Compose)

```
# Copiar como .env en la raiz del proyecto
DB_ROOT_PASSWORD=rnpn2026
DB_PASSWORD=rnpn2026
JWT_SECRET=jwt_secret_rnpn_2026_cambiar_en_produccion
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jose.ramirez@rnpn.gob.sv
SMTP_PASS=TU_PASSWORD_AQUI
SMTP_FROM="RNPN Vehiculos <notificaciones@rnpn.gob.sv>"
EMAIL_SUPERVISORES=supervisor@rnpn.gob.sv
EMAIL_ADMINS=jose.ramirez@rnpn.gob.sv
CLOUDINARY_CLOUD_NAME=dyn6stlcn
CLOUDINARY_API_KEY=698314454478443
CLOUDINARY_API_SECRET=0sk-VIr2wuOUAfOuwbauK2w0o80
```

### Comandos de Desarrollo

```bash
# Construir y levantar todo
docker compose up --build -d

# Ver logs
docker compose logs -f backend
docker compose logs -f frontend

# Detener
docker compose down

# Detener y eliminar volumes (reiniciar la BD desde cero)
docker compose down -v
```

---

## 9. Fase 4 — Kubernetes: Namespace y Config

### 9.1 k8s/namespace.yaml

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rnpn-trazabilidad
  labels:
    app.kubernetes.io/part-of: rnpn-trazabilidad
```

### 9.2 k8s/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: rnpn-trazabilidad
data:
  NODE_ENV: "production"
  PORT: "4000"
  JWT_EXPIRES_IN: "8h"
  CORS_ORIGIN: "https://trazabilidad.rnpn.gob.sv"
  LOG_LEVEL: "info"
  UMBRAL_KM_MANTENIMIENTO: "50000"
  TZ: "America/El_Salvador"
```

### 9.3 k8s/secret.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
  namespace: rnpn-trazabilidad
type: Opaque
stringData:
  # Base de datos
  MYSQL_ROOT_PASSWORD: "CHANGE_ME_ROOT_PASSWORD"
  DB_PASSWORD: "CHANGE_ME_DB_PASSWORD"
  DATABASE_URL: "mysql://rnpn_user:CHANGE_ME_DB_PASSWORD@mysql-svc:3306/rnpn_vehiculos_nueva"

  # JWT
  JWT_SECRET: "CHANGE_ME_JWT_SECRET_MINIMO_64_CARACTERES"

  # Correo
  SMTP_HOST: "smtp.gmail.com"
  SMTP_PORT: "587"
  SMTP_USER: "CHANGE_ME"
  SMTP_PASS: "CHANGE_ME"
  SMTP_FROM: "RNPN Vehiculos <notificaciones@rnpn.gob.sv>"
  EMAIL_SUPERVISORES: "CHANGE_ME"
  EMAIL_ADMINS: "CHANGE_ME"

  # Cloudinary
  CLOUDINARY_CLOUD_NAME: "CHANGE_ME"
  CLOUDINARY_API_KEY: "CHANGE_ME"
  CLOUDINARY_API_SECRET: "CHANGE_ME"
```

---

## 10. Fase 5 — Kubernetes: MySQL StatefulSet

### k8s/mysql-statefulset.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-svc
  namespace: rnpn-trazabilidad
spec:
  clusterIP: None
  selector:
    app: mysql
  ports:
    - port: 3306
      name: mysql
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
  namespace: rnpn-trazabilidad
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: rnpn-trazabilidad
spec:
  serviceName: mysql-svc
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: backend-secrets
                  key: MYSQL_ROOT_PASSWORD
            - name: MYSQL_DATABASE
              value: rnpn_vehiculos_nueva
            - name: MYSQL_USER
              value: rnpn_user
            - name: MYSQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: backend-secrets
                  key: DB_PASSWORD
          volumeMounts:
            - name: mysql-data
              mountPath: /var/lib/mysql
          livenessProbe:
            exec:
              command: ["mysqladmin", "ping", "-h", "localhost"]
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command: ["mysqladmin", "ping", "-h", "localhost"]
            initialDelaySeconds: 10
            periodSeconds: 5
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1"
  volumeClaimTemplates:
    - metadata:
        name: mysql-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

---

## 11. Fase 6 — Kubernetes: Backend Deployment

### k8s/backend-deployment.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-svc
  namespace: rnpn-trazabilidad
spec:
  selector:
    app: backend
  ports:
    - port: 4000
      targetPort: 4000
      name: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: rnpn-trazabilidad
  labels:
    app: backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: REGISTRY/rnpn-backend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 4000
          envFrom:
            - configMapRef:
                name: backend-config
            - secretRef:
                name: backend-secrets
          volumeMounts:
            - name: uploads
              mountPath: /app/uploads
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 15
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 5"]
      volumes:
        - name: uploads
          persistentVolumeClaim:
            claimName: uploads-pvc
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: rnpn-trazabilidad
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### k8s/uploads-pvc.yaml

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: uploads-pvc
  namespace: rnpn-trazabilidad
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 5Gi
  storageClassName: nfs-client
```

> **Nota**: Si se migran los uploads a Cloudinary (recomendado), eliminar el volumen uploads-pvc y el volumeMount. El backend queda stateless y escala sin restricciones.

---

## 12. Fase 7 — Kubernetes: Frontend Deployment

### k8s/frontend-deployment.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
  namespace: rnpn-trazabilidad
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 80
      name: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: rnpn-trazabilidad
  labels:
    app: frontend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: REGISTRY/rnpn-frontend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 80
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 15
            timeoutSeconds: 5
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "250m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: rnpn-trazabilidad
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## 13. Fase 8 — Kubernetes: Ingress (SSL + Routing)

### k8s/ingress.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rnpn-ingress
  namespace: rnpn-trazabilidad
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
spec:
  tls:
    - hosts:
        - trazabilidad.rnpn.gob.sv
      secretName: rnpn-tls
  rules:
    - host: trazabilidad.rnpn.gob.sv
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-svc
                port:
                  number: 4000
          - path: /uploads
            pathType: Prefix
            backend:
              service:
                name: backend-svc
                port:
                  number: 4000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80
```

---

## 14. Fase 9 — CI/CD Pipeline (GitHub Actions)

### .github/workflows/deploy.yml

```yaml
name: Build and Deploy RNPN

on:
  push:
    branches: [main]

env:
  REGISTRY: docker.io/tu-usuario

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and Push Backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ env.REGISTRY }}/rnpn-backend:${{ github.sha }},${{ env.REGISTRY }}/rnpn-backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and Push Frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          build-args: VITE_API_URL=/api
          tags: ${{ env.REGISTRY }}/rnpn-frontend:${{ github.sha }},${{ env.REGISTRY }}/rnpn-frontend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v4
        with:
          namespace: rnpn-trazabilidad
          manifests: k8s/
          images: |
            ${{ env.REGISTRY }}/rnpn-backend:${{ github.sha }}
            ${{ env.REGISTRY }}/rnpn-frontend:${{ github.sha }}
```

---

## 15. Fase 10 — Backup de MySQL (Kubernetes CronJob)

### k8s/mysql-backup-cronjob.yaml

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-backup
  namespace: rnpn-trazabilidad
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: mysql-backup
              image: mysql:8.0
              command:
                - sh
                - -c
                - |
                  mysqldump -h mysql-svc -u rnpn_user -p$DB_PASSWORD \
                    --single-transaction --routines --triggers \
                    rnpn_vehiculos_nueva > /backup/dump-$(date +\%Y\%m\%d).sql
                  echo "Backup completado: dump-$(date +\%Y\%m\%d).sql"
              envFrom:
                - secretRef:
                    name: backend-secrets
              volumeMounts:
                - name: backup-volume
                  mountPath: /backup
          restartPolicy: OnFailure
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: backup-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-pvc
  namespace: rnpn-trazabilidad
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
```

---

## 16. Fase 11 — Opcional: Migrar Uploads a Cloudinary

El backend ya tiene Cloudinary configurado. Para eliminar la dependencia del volumen compartido:

### Cambio en misiones.controller.ts (uploadDocument)

```typescript
// Actual (disco local):
data: { documento_respaldo: req.file.path }

// Propuesto (Cloudinary):
import cloudinary from '../config/cloudinary'

const result = await new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder: 'rnpn/misiones', resource_type: 'auto' },
    (error, result) => error ? reject(error) : resolve(result)
  );
  stream.end(req.file.buffer);
});

data: { documento_respaldo: (result as any).secure_url }
```

### Beneficios:
- Backend queda **stateless** (sin volumenes compartidos)
- Escalado horizontal sin restricciones
- Se elimina uploads-pvc.yaml y el volumeMount del Deployment
- Los archivos se sirven directamente desde Cloudinary (CDN global)

---

## 17. Comandos de Ejecucion

### Docker Compose (Desarrollo)

```bash
# Levantar todo
docker compose up --build -d

# Ver estado
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Acceder a la BD
docker exec -it rnpn-mysql mysql -u root -p

# Detener
docker compose down

# Limpiar todo (incluyendo datos)
docker compose down -v
```

### Kubernetes (Produccion)

```bash
# Crear namespace
kubectl apply -f k8s/namespace.yaml

# Config y secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# MySQL
kubectl apply -f k8s/mysql-statefulset.yaml
kubectl apply -f k8s/uploads-pvc.yaml

# Backend y Frontend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Ingress
kubectl apply -f k8s/ingress.yaml

# Backup
kubectl apply -f k8s/mysql-backup-cronjob.yaml

# Verificar estado
kubectl get all -n rnpn-trazabilidad

# Ver logs
kubectl logs -f deployment/backend -n rnpn-trazabilidad

# Verificar pods
kubectl get pods -n rnpn-trazabilidad -o wide

# Verificar HPA
kubectl get hpa -n rnpn-trazabilidad
```

---

## 18. Load Balancing — Flujo Completo

```
Usuario (navegador)
  │
  ▼
DNS (trazabilidad.rnpn.gob.sv) → IP del Ingress Controller
  │
  ▼
Ingress Controller (nginx-ingress)
  │
  ├── /api/* ──────────────────────┐
  │   Round-robin                   │
  │   ├── backend-pod-1 (replica 1) │
  │   ├── backend-pod-2 (replica 2) │
  │   └── backend-pod-3 (replica 3) │
  │                                 │
  └── /* ──────────────────────────┐
      Round-robin                   │
      ├── frontend-pod-1 (replica 1)│
      ├── frontend-pod-2 (replica 2)│
      └── frontend-pod-3 (replica 3)│
                                    │
Backend pods ──────────────────────┘
  │
  ▼
mysql-svc (ClusterIP None) → mysql-pod (StatefulSet)
  │
  ▼
PVC mysql-data (10Gi, ReadWriteOnce)
```

**No se necesitan sticky sessions** porque el backend usa JWT stateless (sin sesiones en servidor).

---

## 19. Decisiones Pendientes

| # | Decision | Opcion A | Opcion B |
|---|----------|----------|----------|
| 1 | Archivos subidos | Cloudinary (stateless) | PVC compartido (ReadWriteMany) |
| 2 | Cluster | On-premise | Cloud-managed (EKS/GKE/AKS) |
| 3 | Registry de imagenes | Docker Hub | GitLab / ECR |
| 4 | Certificados SSL | cert-manager + Let's Encrypt | Certificado institucional |
| 5 | Entorno staging | Si (namespace separado) | No (solo produccion) |

---

## 20. Resumen Visual del Sistema Dockerizado

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                         │
│                   Namespace: rnpn-trazabilidad                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Ingress (nginx-ingress)                  │    │
│  │         SSL termination + load balancing              │    │
│  │         trazabilidad.rnpn.gob.sv                      │    │
│  └────────────┬─────────────────────────┬───────────────┘    │
│               │ /api, /uploads          │ /*                   │
│               ▼                         ▼                     │
│  ┌────────────────────┐  ┌────────────────────────┐         │
│  │   backend-svc      │  │    frontend-svc         │         │
│  │   ClusterIP:4000   │  │    ClusterIP:80         │         │
│  └────────┬───────────┘  └────────┬───────────────┘         │
│           │                       │                          │
│           ▼                       ▼                          │
│  ┌────────────────┐     ┌──────────────────┐                │
│  │  Deployment     │     │  Deployment       │                │
│  │  backend        │     │  frontend          │                │
│  │  replicas: 2-3  │     │  replicas: 2-3    │                │
│  │  ┌──┐ ┌──┐ ┌──┐│     │  ┌──┐ ┌──┐ ┌──┐  │                │
│  │  │P1│ │P2│ │P3││     │  │P1│ │P2│ │P3│  │                │
│  │  └──┘ └──┘ └──┘│     │  └──┘ └──┘ └──┘  │                │
│  └────────┬───────┘     └──────────────────┘                │
│           │                                                   │
│           ▼                                                   │
│  ┌────────────────┐                                          │
│  │  mysql-svc      │                                          │
│  │  Headless       │                                          │
│  └────────┬───────┘                                          │
│           │                                                   │
│           ▼                                                   │
│  ┌────────────────────────┐                                  │
│  │  StatefulSet: mysql     │                                  │
│  │  replicas: 1            │                                  │
│  │  ┌──────────────────┐  │                                  │
│  │  │ mysql:8.0        │  │                                  │
│  │  │ PVC: 10Gi        │  │                                  │
│  │  └──────────────────┘  │                                  │
│  └────────────────────────┘                                  │
│                                                               │
│  ┌────────────────────────┐                                  │
│  │  HPA (autoscaling)      │                                  │
│  │  backend: 2-5 replicas  │                                  │
│  │  frontend: 2-5 replicas │                                  │
│  └────────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```
