@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Checking git status...
git status
echo.

echo Adding all files...
git add -A
echo.

echo Committing...
git commit -m "Initial commit: Kyo.is, based on https://github.com/ryokun6/ryos"
if errorlevel 1 (
    echo Nothing to commit or commit failed.
) else (
    echo Commit done.
)
echo.

echo Pushing to GitHub...
git branch -M main
git push -u origin main
if errorlevel 1 (
    echo.
    echo Push FAILED. Check:
    echo 1. Internet connection
    echo 2. GitHub login: run "git credential-manager" or sign in at GitHub
    echo 3. Repo exists: https://github.com/hiyeshu/kyo.is
    pause
    exit /b 1
)

echo.
echo Done. Check https://github.com/hiyeshu/kyo.is
pause
exit /b 0
