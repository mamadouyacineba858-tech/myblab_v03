# ==========================================
# MYBlab Architect Audit Toolkit
# Version 1.0
# ==========================================

$ErrorActionPreference = "Continue"

$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root

if (!(Test-Path "audit")) {
    New-Item -ItemType Directory audit | Out-Null
}

if (!(Test-Path "audit/reports")) {
    New-Item -ItemType Directory audit/reports | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$report = "audit/reports/audit-$timestamp.txt"

Start-Transcript -Path $report

Write-Host ""
Write-Host "======================================="
Write-Host " MYBLAB ARCHITECT AUDIT v2"
Write-Host "======================================="

Write-Host ""
Write-Host "1. Git Status"
git status --short

Write-Host ""
Write-Host "2. Last Commits"
git log -5 --oneline

Write-Host ""
Write-Host "3. Last Commit"
git show --stat --summary HEAD

Write-Host ""
Write-Host "4. Frontend Tests"

Push-Location frontend
npm run test:audit
Pop-Location

Write-Host ""
Write-Host "5. Frontend Build"

Push-Location frontend
npm run build
Pop-Location

Write-Host ""
Write-Host "6. TODO"
git grep -n "TODO"

Write-Host ""
Write-Host "7. FIXME"
git grep -n "FIXME"

Write-Host ""
Write-Host "======================================="
Write-Host "AUDIT FINISHED"
Write-Host "======================================="

Stop-Transcript

Copy-Item $report "audit/latest.txt" -Force

Write-Host ""
Write-Host "Latest report : audit/latest.txt"
Write-Host "Archive       : $report"
