# PowerShell script to install mkcert and generate trusted SSL certificates for Backend
# Run this script as Administrator on Windows

Write-Host "Setting up mkcert for Backend (Node.js/Express)" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "   Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

# Step 1: Install mkcert using Chocolatey (if available) or download directly
Write-Host "`nStep 1: Installing mkcert..." -ForegroundColor Yellow

$mkcertInstalled = $false
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "   Using Chocolatey to install mkcert..." -ForegroundColor Gray
    choco install mkcert -y
    if ($LASTEXITCODE -eq 0) {
        $mkcertInstalled = $true
    }
}

if (-not $mkcertInstalled) {
    Write-Host "   Chocolatey not found. Downloading mkcert manually..." -ForegroundColor Gray
    $mkcertUrl = "https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-windows-amd64.exe"
    $mkcertPath = "$env:TEMP\mkcert.exe"
    
    try {
        Invoke-WebRequest -Uri $mkcertUrl -OutFile $mkcertPath -UseBasicParsing
        Move-Item -Path $mkcertPath -Destination "$env:ProgramFiles\mkcert\mkcert.exe" -Force -ErrorAction SilentlyContinue
        if (-not (Test-Path "$env:ProgramFiles\mkcert\mkcert.exe")) {
            New-Item -ItemType Directory -Path "$env:ProgramFiles\mkcert" -Force | Out-Null
            Move-Item -Path $mkcertPath -Destination "$env:ProgramFiles\mkcert\mkcert.exe" -Force
        }
        $env:Path += ";$env:ProgramFiles\mkcert"
        [Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::Machine)
        $mkcertInstalled = $true
        Write-Host "   SUCCESS: mkcert installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: Failed to download mkcert: $_" -ForegroundColor Red
        Write-Host "   Please install mkcert manually from: https://github.com/FiloSottile/mkcert" -ForegroundColor Yellow
        exit 1
    }
}

# Step 2: Install local CA (only if not already installed)
Write-Host "`nStep 2: Installing mkcert root CA..." -ForegroundColor Yellow
& mkcert -install
if ($LASTEXITCODE -ne 0) {
    Write-Host "   WARNING: Root CA may already be installed (this is OK)" -ForegroundColor Yellow
}
Write-Host "   SUCCESS: Root CA ready" -ForegroundColor Green

# Step 3: Create ssl directory if it doesn't exist
Write-Host "`nStep 3: Creating SSL directory..." -ForegroundColor Yellow
$sslDir = Join-Path $PSScriptRoot "ssl"
if (-not (Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir -Force | Out-Null
}
Write-Host "   SUCCESS: SSL directory ready" -ForegroundColor Green

# Step 4: Generate certificates for localhost
Write-Host "`nStep 4: Generating SSL certificates for localhost..." -ForegroundColor Yellow
$certPath = Join-Path $sslDir "localhost+1.pem"
$keyPath = Join-Path $sslDir "localhost+1-key.pem"

& mkcert -cert-file $certPath -key-file $keyPath localhost 127.0.0.1 ::1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ERROR: Failed to generate certificates" -ForegroundColor Red
    exit 1
}

# Rename to match expected filenames
Copy-Item $certPath (Join-Path $sslDir "cert.pem") -Force
Copy-Item $keyPath (Join-Path $sslDir "key.pem") -Force

Write-Host "   SUCCESS: Certificates generated successfully" -ForegroundColor Green
Write-Host "   Certificate: $sslDir\cert.pem" -ForegroundColor Gray
Write-Host "   Private Key: $sslDir\key.pem" -ForegroundColor Gray

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "Your backend will now use trusted SSL certificates" -ForegroundColor Cyan
Write-Host "   Access at: https://localhost:5443 (no browser warnings!)" -ForegroundColor Cyan
Write-Host "=========================================================`n" -ForegroundColor Cyan
