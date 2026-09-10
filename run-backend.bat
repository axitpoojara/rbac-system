@echo off
echo Starting .NET 8 RBAC Web API...
set "PATH=%USERPROFILE%\.dotnet;%PATH%"
cd /d "%~dp0backend\RbacApi"
dotnet run
