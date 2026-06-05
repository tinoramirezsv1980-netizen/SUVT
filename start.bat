@echo off
title RNPN - Sistema de Control de Vehiculos
color 1F
cls

echo ================================================
echo   RNPN - Sistema de Control de Vehiculos
echo   Iniciando servidor...
echo ================================================
echo.

REM Verificar que Node.js esta instalado
where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    color 4F
    echo [ERROR] Node.js no esta instalado.
    echo         Descargue Node.js desde: https://nodejs.org
    pause
    exit /b 1
)

REM Ir a la carpeta del backend
cd /d "%~dp0backend"

REM Verificar que existe el .env
IF NOT EXIST ".env" (
    color 4F
    echo [ERROR] No se encontro el archivo .env
    echo         Copie .env.example como .env y configure las variables.
    pause
    exit /b 1
)

REM Verificar que existen las dependencias
IF NOT EXIST "node_modules" (
    echo [INFO] Instalando dependencias (primera vez)...
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        color 4F
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
)

echo [OK] Dependencias verificadas
echo [OK] Iniciando API en http://localhost:4000
echo.
echo Presione Ctrl+C para detener el servidor
echo.

npm run dev
