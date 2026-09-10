Write-Host "Starting Angular 18 Client on http://localhost:4200..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\frontend\rbac-ui"
npx ng serve --port 4200
