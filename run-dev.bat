@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Checking dependencies...
if not exist node_modules (
    echo Installing dependencies (skip native build to avoid Python/node-gyp)...
    call npm install --legacy-peer-deps --ignore-scripts
    if errorlevel 1 (
        echo Install failed. Try: npm install --legacy-peer-deps --ignore-scripts
        pause
        exit /b 1
    )
)

echo.
echo Starting dev server at http://localhost:5173
echo Press Ctrl+C to stop.
echo.
npx vite --port 5173
pause
