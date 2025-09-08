@echo off
echo Iniciando servidor de email...
cd /d "C:\projects\email-server"
npm install
echo.
echo Servidor iniciando en puerto 3000...
node server.js
pause
