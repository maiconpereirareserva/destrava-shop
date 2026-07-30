@echo off
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  start "Destrava Shop - Servidor" /min py -m http.server 8080
  timeout /t 2 /nobreak >nul
  start "" http://localhost:8080
  exit /b
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "Destrava Shop - Servidor" /min python -m http.server 8080
  timeout /t 2 /nobreak >nul
  start "" http://localhost:8080
  exit /b
)

start "" index.html
