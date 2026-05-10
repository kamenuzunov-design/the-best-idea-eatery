@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ======================================================
echo    🚀 THE BEST IDEA EATERY - DEPLOYMENT SCRIPT
echo ======================================================
echo.

:: 1. Build стъпка (КРИТИЧНО)
echo --- 1. Компилиране на проекта (Build) ---
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ ГРЕШКА: Build-ът не премина успешно! Прекъсване...
    pause
    exit /b %errorlevel%
)
echo ✅ Build-ът е завършен успешно.
echo.

:: 2. GitHub актуализация
echo --- 2. Актуализация в GitHub ---
:: Вземаме името на текущия клон автоматично
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%i
echo Текущ клон: !BRANCH!

echo Издърпване на последни промени...
git pull origin !BRANCH!

echo Добавяне на промени...
git add .

:: Проверка дали има нещо за commit
git diff --cached --quiet
if %errorlevel% neq 0 (
    echo Създаване на нов commit...
    git commit -m "Auto-update: %date% %time%"
    echo Качване в GitHub (!BRANCH!)...
    git push origin !BRANCH!
) else (
    echo Няма нови промени за commit в GitHub.
)
echo.

:: 3. Firebase Deployment
echo --- 3. Качване в Интернет (Firebase) ---
set /p DEPLOY="Искате ли да качите сайта в Интернет сега? (y/n): "
if /i "%DEPLOY%"=="y" (
    call npx firebase deploy --only hosting
    if %errorlevel% neq 0 (
        echo ❌ ГРЕШКА при качването във Firebase!
    ) else (
        echo.
        echo 🎉 ПРИЛОЖЕНИЕТО Е ОНЛАЙН!
    )
) else (
    echo ⏭️ Deployment-ът бе прескочен.
)

echo.
echo ======================================================
echo    ✅ ПРОЦЕСЪТ ЗАВЪРШИ!
echo ======================================================
echo.
pause