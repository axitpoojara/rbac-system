Write-Host "Starting .NET 8 RBAC Web API on http://localhost:5000..." -ForegroundColor Cyan
$env:PATH = "$env:USERPROFILE\.dotnet;" + $env:PATH
Set-Location "$PSScriptRoot\backend\RbacApi"
dotnet run
