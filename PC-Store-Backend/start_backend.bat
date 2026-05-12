@echo off
echo =======================================
echo KHOI DONG BACKEND SERVER - AERO TECH
echo =======================================
cd /d "%~dp0\PC-Store-Backend"
echo Dang cai dat thu vien (neu chua co)...
call npm install
echo.
echo Dang chay Server tai Port 5000...
node server.js
pause
