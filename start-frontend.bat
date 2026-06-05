@echo off
title RNPN - Frontend React
color 2F
cls

echo ================================================
echo   RNPN - Frontend React (Vite Dev Server)
echo   Iniciando en http://localhost:5173
echo ================================================
echo.

cd /d "%~dp0frontend"

IF NOT EXIST "node_modules" (
    echo [INFO] Instalando dependencias del frontend...
    call npm install
)

echo [OK] Iniciando frontend en http://localhost:5173
echo      Abra su navegador en esa direccion
echo.
echo Presione Ctrl+C para detener
echo.

npm run dev
