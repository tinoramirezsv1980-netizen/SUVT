@echo off
title RNPN - Configuracion de Prisma ORM
color 5F
cls

echo ================================================
echo   RNPN - Configuracion de Prisma ORM + MySQL
echo ================================================
echo.
echo Este script realiza la configuracion inicial de
echo Prisma ORM para conectarse a MySQL (XAMPP).
echo.
echo REQUISITOS ANTES DE EJECUTAR:
echo   [1] XAMPP debe estar abierto y MySQL iniciado
echo   [2] La base de datos rnpn_vehiculos debe existir
echo   [3] El archivo .env debe estar configurado
echo.
pause

cd /d "%~dp0backend"

:: Verificar que existe .env
IF NOT EXIST ".env" (
    color 4F
    echo.
    echo [ERROR] No se encontro el archivo .env
    echo         Copie .env.example como .env primero:
    echo         copy .env.example .env
    echo         Luego edite .env con sus valores.
    echo.
    pause
    exit /b 1
)

:: Verificar que existen node_modules
IF NOT EXIST "node_modules" (
    echo [INFO] Instalando dependencias npm...
    call npm install
    IF %ERRORLEVEL% NEQ 0 (
        color 4F
        echo [ERROR] Fallo npm install.
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas.
    echo.
)

:: Paso 1: Generar el cliente Prisma
echo ------------------------------------------------
echo  PASO 1/2 — Generando cliente Prisma...
echo ------------------------------------------------
call npx prisma generate --schema=prisma/schema.prisma
IF %ERRORLEVEL% NEQ 0 (
    color 4F
    echo.
    echo [ERROR] Fallo prisma generate.
    echo         Verifique que el archivo prisma/schema.prisma existe.
    pause
    exit /b 1
)
echo.
echo [OK] Cliente Prisma generado correctamente.
echo.

:: Paso 2: Sincronizar esquema con MySQL
echo ------------------------------------------------
echo  PASO 2/2 — Sincronizando esquema con MySQL...
echo ------------------------------------------------
echo.
echo Prisma comparara el schema.prisma con la base de
echo datos y aplicara los cambios necesarios.
echo.
call npx prisma db push --schema=prisma/schema.prisma
IF %ERRORLEVEL% NEQ 0 (
    color 4F
    echo.
    echo [ERROR] Fallo prisma db push.
    echo         Posibles causas:
    echo           * MySQL no esta corriendo en XAMPP
    echo           * La DATABASE_URL en .env es incorrecta
    echo           * La base de datos rnpn_vehiculos no existe
    echo.
    echo         Verifique que en .env tenga:
    echo         DATABASE_URL="mysql://root:@localhost:3306/rnpn_vehiculos"
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo  [OK] Prisma configurado exitosamente
echo ================================================
echo.
echo  Las tablas del sistema estan listas en MySQL.
echo  Puede verificarlas en:
echo  http://localhost/phpmyadmin
echo.
echo  Siguiente paso:
echo  Ejecute start.bat para iniciar el backend.
echo.
pause
