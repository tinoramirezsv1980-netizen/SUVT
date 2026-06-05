@echo off
title RNPN - Generador de contrasena admin
color 3F
cls

echo ================================================
echo   RNPN - Generador de hash de contrasena
echo ================================================
echo.

set /p PASS=Escriba la nueva contrasena para admin: 

cd /d "%~dp0backend"

echo.
echo Generando hash...
echo.

node -e "const b=require('bcryptjs'); b.hash('%PASS%',12).then(h=>{console.log('\n=== COPIE ESTE HASH ==='); console.log(h); console.log('======================\n');})"

echo.
echo Copie el hash de arriba y ejecute este comando en phpMyAdmin:
echo UPDATE usuario SET password_hash='EL_HASH' WHERE correo='admin@rnpn.gob.sv';
echo.
pause
