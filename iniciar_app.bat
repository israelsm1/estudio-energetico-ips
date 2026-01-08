@echo off
title Iniciando Estudio Energetico IPS
echo ==========================================
echo    ESTUDIO ENERGETICO IPS - LANZADOR
echo ==========================================
echo.

:: Comprobar si Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se ha encontrado Node.js.
    echo Por favor, instala Node.js desde https://nodejs.org/ antes de continuar.
    echo.
    pause
    exit
)

echo 1. Verificando librerias necesarias...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Hubo un problema instalando las librerias.
    pause
    exit
)

echo.
echo 2. Iniciando la aplicacion...
echo    Una vez iniciada, abre tu navegador en: http://localhost:5173
echo.
echo    (No cierres esta ventana negra mientras uses la app)
echo.

call npm run dev
