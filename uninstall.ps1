# ═══════════════════════════════════════════════════════════════
#   ██████╗ ██████╗██████╗ 
#  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
#  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
#  ██║     ██║     ██╔═══╝ 
#  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
#   ╚═════╝ ╚═════╝╚═╝ 
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"

Write-Host "🗑 Uninstalling Claude Code Proxy (CCP)..." -ForegroundColor Yellow

# Remove built files
if (Test-Path "admin\dist") {
    Remove-Item "admin\dist" -Recurse -Force
    Write-Host "✔ Cleaned admin production builds." -ForegroundColor Green
}

# Remove node_modules
if (Test-Path "server\node_modules") {
    Remove-Item "server\node_modules" -Recurse -Force
    Write-Host "✔ Cleaned server dependencies." -ForegroundColor Green
}
if (Test-Path "admin\node_modules") {
    Remove-Item "admin\node_modules" -Recurse -Force
    Write-Host "✔ Cleaned admin dependencies." -ForegroundColor Green
}

# Ask before deleting user database and secrets
$confirm = Read-Host "Do you want to delete the configuration and logs database (ccp.db)? [y/N]"
if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    if (Test-Path "server\data") {
        Remove-Item "server\data" -Recurse -Force
        Write-Host "✔ Removed database and configuration settings." -ForegroundColor Green
    }
    if (Test-Path "server\.env") {
        Remove-Item "server\.env" -Force
        Write-Host "✔ Removed secrets environment configuration." -ForegroundColor Green
    }
}

if (Test-Path "ccp.cmd") {
    Remove-Item "ccp.cmd" -Force
    Write-Host "✔ Removed ccp launcher script." -ForegroundColor Green
}

Write-Host "`n🎉 CCP uninstallation complete!" -ForegroundColor Green
