@echo off
echo Starting Angular 18 Client on http://localhost:4200...
cd /d "%~dp0frontend\rbac-ui"
npx ng serve --port 4200
