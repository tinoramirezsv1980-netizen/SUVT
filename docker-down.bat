@echo off
REM ============================================================
REM  SUVT - Detener stack Docker
REM ============================================================
cd /d "%~dp0"

echo Deteniendo el stack Docker del SUVT...
docker compose down

echo.
echo [OK] Stack detenido.
pause