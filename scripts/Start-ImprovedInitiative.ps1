<#
.SYNOPSIS
    Starts Improved Initiative in development mode and opens it in the browser.
#>

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path (Join-Path $repoRoot "node_modules"))) {
    Write-Host "node_modules not found, running npm install..." -ForegroundColor Cyan
    npm install
    if (-not $?) {
        Write-Error "npm install failed."
        exit 1
    }
}

$baseUrl = "http://localhost:3000"
if (Test-Path (Join-Path $repoRoot ".env")) {
    $envLine = Get-Content (Join-Path $repoRoot ".env") | Where-Object { $_ -match "^\s*BASE_URL\s*=" } | Select-Object -Last 1
    if ($envLine) {
        $baseUrl = ($envLine -split "=", 2)[1].Trim()
    }
}

# Open the browser once the server responds, without blocking the dev process.
Start-Job -ScriptBlock {
    param($url)
    for ($i = 0; $i -lt 60; $i++) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
            Start-Process $url
            return
        } catch {
            Start-Sleep -Seconds 2
        }
    }
} -ArgumentList $baseUrl | Out-Null

Write-Host "Starting Improved Initiative (npm run dev)..." -ForegroundColor Cyan
Write-Host "It will be available at $baseUrl" -ForegroundColor Cyan

npm run dev
