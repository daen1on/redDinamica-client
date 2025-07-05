@echo off
echo ================================================================================
echo                     CONFIGURACION DEL ENTORNO REDDINAMICA
echo ================================================================================
echo.

echo [1/3] Verificando MongoDB...
net start MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MongoDB iniciado correctamente
) else (
    echo ⚠️  MongoDB no se pudo iniciar automaticamente
    echo    Por favor, inicia MongoDB manualmente o verifica la instalacion
)
echo.

echo [2/3] Instalando dependencias del backend...
cd /d "%~dp0..\..\RedDinamica2-api"
call npm install
echo ✅ Dependencias del backend instaladas
echo.

echo [3/3] Configuracion completada!
echo.
echo ================================================================================
echo                                PROXIMOS PASOS
echo ================================================================================
echo.
echo 1. Inicia el backend:
echo    cd RedDinamica2-api
echo    npm start
echo.
echo 2. En otra terminal, inicia el frontend:
echo    cd redDinamica-client
echo    ng serve
echo.
echo 3. Abre tu navegador en: http://localhost:4200
echo.
echo ================================================================================
echo                              CONFIGURACION COMPLETA
echo ================================================================================
pause 