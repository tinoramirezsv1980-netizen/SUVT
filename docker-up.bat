@echo off
REM ============================================================
REM  SUVT - Arranque Docker en Windows 11 (Opcion A: XAMPP)
REM  Levanta backend x3 + frontend x2 + balanceador (puerto 8080)
REM ============================================================
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ============================================
echo  SUVT - Docker Compose (Windows 11)
echo ============================================
echo.

REM --- 1. Verificar Docker Desktop ---
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop no esta corriendo.
    echo         Inicialo y vuelve a ejecutar este script.
    pause
    exit /b 1
)
echo [OK] Docker Desktop activo.

REM --- 2. Verificar MySQL de XAMPP (Opcion A) ---
netstat -an | findstr /C:":3306" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [AVISO] MySQL de XAMPP no esta escuchando en el puerto 3306.
    echo         La Opcion A requiere XAMPP MySQL activo.
    echo         Tienes dos opciones:
    echo           a^) Inicia MySQL desde el panel de XAMPP y repite.
    echo           b^) Usa la Opcion B (MySQL en Docker^):
    echo              docker compose -f docker-compose.yml -f docker-compose.mysql.yml up --build -d
    pause
    exit /b 1
)
echo [OK] MySQL XAMPP escuchando en el puerto 3306.

REM --- 3. Crear .env si no existe (con JWT_SECRET generado) ---
if not exist ".env" (
    echo [INFO] Creando .env desde .env.example...
    copy ".env.example" ".env" >nul

    REM Reemplazar el placeholder del JWT_SECRET por uno aleatorio (64 hex)
    powershell -NoProfile -Command "$f='.env'; (Get-Content $f -Raw) -replace 'cambiar_por_cadena_aleatoria_larga_minimo_64_caracteres', ( -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })) | Set-Content $f -NoNewline"
    echo [OK] .env creado con JWT_SECRET generado.
) else (
    echo [OK] .env detectado.
)

REM --- 4. Levantar el stack con replicas ---
echo.
echo [INFO] Construyendo y levantando backend x3 + frontend x2 + lb...
docker compose up --build -d --scale backend=3 --scale frontend=2
if errorlevel 1 (
    echo [ERROR] Fallo al levantar el stack. Corrige el error de arriba.
    pause
    exit /b 1
)

REM --- 5. Esperar health del balanceador ---
echo.
echo [INFO] Esperando health check en http://localhost:8080/health ...
set "ready="
for /L %%i in (1,1,24) do (
    for /f "delims=" %%r in ('powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri http://localhost:8080/health -UseBasicParsing -TimeoutSec 5).Content } catch { '' }"') do set "resp=%%r"
    echo "!resp!" | findstr /C:"ok" >nul 2>&1
    if not errorlevel 1 (
        set "ready=1"
        goto ready
    )
    timeout /t 5 /nobreak >nul
)
:ready
if defined ready (
    echo [OK] API saludable: !resp!
) else (
    echo [AVISO] No se confirmo el health en 2 minutos. Revisa:
    echo         docker compose ps
    echo         docker compose logs backend
)

echo.
echo ============================================
echo  Aplicacion lista!
echo   Frontend  : http://localhost:8080
echo   API health: http://localhost:8080/health
echo ============================================
echo.
echo  Para detener:  docker compose down
echo.
pause