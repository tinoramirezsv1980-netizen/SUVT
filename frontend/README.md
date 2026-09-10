# RNPN Trazabilidad — Frontend

Sistema de trazabilidad vehicular del RNPN. Aplicación React + Vite + TypeScript + Tailwind.

## Stack

- React 19 + Vite 8 + TypeScript
- Tailwind CSS 4
- Axios (API `/api`)
- Capacitor (app Android)

## Uso en desarrollo

```powershell
npm install
npm run dev      # http://localhost:5173
```

La URL de la API se define con `VITE_API_URL` (ver `.env`). Por defecto `http://localhost:4000/api`.

## Build (web)

```powershell
npm run build    # genera dist/
```

## Fase 3 — App Android (Capacitor)

La misma SPA se empaqueta como APK con Capacitor. El frontend ya es responsive y táctil
(ver `ROADMAP_SUVT.md`, Fase 2 y Fase 3).

### Primera vez

```powershell
npm install                       # instala @capacitor/core, @capacitor/android, @capacitor/cli
npx cap add android               # ya hecho: genera la carpeta android/
```

Configuración en `capacitor.config.ts`:

| Clave | Valor |
|---|---|
| `appId` | `sv.gob.rnpn.suvt` |
| `appName` | `RNPN Trazabilidad` |
| `webDir` | `dist` |
| `server.androidScheme` | `https` (contenido local servido por HTTPS en la WebView) |
| `usesCleartextTraffic` | eliminado en manifest (HTTPS forzado; solo permitido para pruebas locales vía variable) |

### Build del APK

1. Definir a qué API apuntará la app.

   **Producción (nube):**
   ```powershell
   $env:VITE_API_URL="https://suvt-backend.onrender.com/api"
   npm run build:apk
   ```
   El CI usa la variable `APK_API_URL` de GitHub (default: `suvt-backend.onrender.com`).

   **Pruebas en la misma red local:**
   ```powershell
   $env:VITE_API_URL="http://192.168.x.x:8080/api"
   npm run build:apk
   ```
   > No usar `localhost`: el celular no lo resuelve. Usar la IP local de la PC.

2. Compilar el APK. Requiere **Android Studio** (SDK + **JDK 21+**; el JDK 17 falla con Capacitor 8/AGP 8.13):

   ```powershell
   cd android
   .\gradlew.bat assembleDebug
   # APK generado en:
   # android\app\build\outputs\apk\debug\app-debug.apk
   ```

   O abrir el proyecto en Android Studio: `npm run cap:open` → Run.

### Sincronizar la web al proyecto nativo

```powershell
npm run cap:sync    # build + cap sync android
```

### Iconos y splash (opcional)

Para generar iconos y splash a partir de una imagen origen:

```powershell
npx @capacitor/assets generate --android
```

Colocar la imagen fuente en `assets/icon-only.png` (1024×1024) y `assets/splash.png`
(2732×2732) antes de generarlos.

## Notas

- El APK usa `localStorage` para el JWT (igual que la web). Sin cookies de sesión.
- En producción se recomienda remover `usesCleartextTraffic` (o limitarlo) una vez que la API sea solo HTTPS.