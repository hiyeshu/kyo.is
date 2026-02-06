@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/5] 检查 Git 仓库...
if not exist .git (
    echo 未发现 .git，正在初始化...
    git init
    git branch -M main
)

echo [2/5] 设置远程仓库...
git remote remove origin 2>nul
git remote add origin https://github.com/hiyeshu/kyo.is.git

echo [3/5] 添加所有文件...
git add -A

echo [4/5] 提交...
git commit -m "Initial commit: Kyo.is, based on https://github.com/ryokun6/ryos"
if errorlevel 1 (
    echo 没有新改动需要提交，或已是首次提交。
) else (
    echo 提交完成。
)

echo [5/5] 推送到 GitHub...
git push -u origin main
if errorlevel 1 (
    echo.
    echo Push failed. Check: internet, GitHub login, repo exists.
    pause
    exit /b 1
)

echo.
echo Done. Open in browser: https://github.com/hiyeshu/kyo.is
pause
exit /b 0
