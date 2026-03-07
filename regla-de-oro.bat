@echo off
echo [REGLA DE ORO] Iniciando sincronizacion con la nube...
git add .
if "%~1"=="" (
    set /p msg="Descripcion del cambio: "
) else (
    set msg=%~1
)
git commit -m "%msg%"
git push origin main
echo [REGLA DE ORO] ¡Sincronizado con exito! ✅
