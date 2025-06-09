# Certificate Management PowerShell Script
# Скрипт для управления TLS сертификатами в Windows

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("dev", "letsencrypt", "renew", "setup-auto", "info", "help")]
    [string]$Action = "help",
    
    [Parameter(Mandatory = $false)]
    [string]$Domain,
    
    [Parameter(Mandatory = $false)]
    [string]$Email,
    
    [Parameter(Mandatory = $false)]
    [string]$CertPath
)

# Цвета для вывода
function Write-ColorText {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

function Write-Success {
    param([string]$Text)
    Write-ColorText "✅ $Text" -Color "Green"
}

function Write-Error {
    param([string]$Text)
    Write-ColorText "❌ $Text" -Color "Red"
}

function Write-Warning {
    param([string]$Text)
    Write-ColorText "⚠️  $Text" -Color "Yellow"
}

function Write-Info {
    param([string]$Text)
    Write-ColorText "ℹ️  $Text" -Color "Cyan"
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Проверка Node.js
    try {
        $nodeVersion = node --version
        Write-Success "Node.js is installed: $nodeVersion"
    }
    catch {
        Write-Error "Node.js is not installed or not in PATH"
        return $false
    }
    
    # Проверка OpenSSL
    try {
        $opensslVersion = openssl version
        Write-Success "OpenSSL is available: $opensslVersion"
    }
    catch {
        Write-Warning "OpenSSL not found in PATH. Some features may not work."
        Write-Info "Install OpenSSL from: https://slproweb.com/products/Win32OpenSSL.html"
    }
    
    return $true
}

function Show-CertificateInfo {
    $certFile = Join-Path $PSScriptRoot "certs" "cert.pem"
    
    if (-not (Test-Path $certFile)) {
        Write-Warning "Certificate file not found: $certFile"
        return
    }
    
    Write-Info "Certificate Information:"
    Write-Host "File: $certFile" -ForegroundColor Gray
    
    try {
        $opensslOutput = openssl x509 -in $certFile -noout -dates -subject -issuer -text | Out-String
        $lines = $opensslOutput -split "`n"
        
        foreach ($line in $lines) {
            if ($line -match "subject=") {
                Write-Host "Subject: " -NoNewline -ForegroundColor White
                Write-Host ($line -replace "subject=", "") -ForegroundColor Green
            }
            elseif ($line -match "issuer=") {
                Write-Host "Issuer: " -NoNewline -ForegroundColor White
                Write-Host ($line -replace "issuer=", "") -ForegroundColor Green
            }
            elseif ($line -match "notBefore=") {
                Write-Host "Valid From: " -NoNewline -ForegroundColor White
                Write-Host ($line -replace "notBefore=", "") -ForegroundColor Green
            }
            elseif ($line -match "notAfter=") {
                Write-Host "Valid Until: " -NoNewline -ForegroundColor White
                $expiryDate = $line -replace "notAfter=", ""
                $expiry = [DateTime]::Parse($expiryDate)
                $daysUntilExpiry = ($expiry - (Get-Date)).Days
                
                if ($daysUntilExpiry -lt 30) {
                    Write-Host $expiryDate -ForegroundColor Red
                    Write-Warning "Certificate expires in $daysUntilExpiry days!"
                }
                else {
                    Write-Host $expiryDate -ForegroundColor Green
                    Write-Info "Certificate is valid for $daysUntilExpiry more days"
                }
            }
        }
    }
    catch {
        Write-Error "Failed to read certificate information: $_"
    }
}

function Generate-DevCertificates {
    Write-Info "Generating development certificates..."
    
    $env:DOMAIN_NAME = if ($Domain) { $Domain } else { "localhost" }
    
    try {
        node scripts/generate-dev-certs.cjs
        Write-Success "Development certificates generated successfully"
        Show-CertificateInfo
    }
    catch {
        Write-Error "Failed to generate development certificates: $_"
    }
}

function Generate-LetsEncryptCertificates {
    if (-not $Domain -or -not $Email) {
        Write-Error "Domain and Email are required for Let's Encrypt certificates"
        Write-Info "Usage: .\manage-certificates.ps1 -Action letsencrypt -Domain example.com -Email admin@example.com"
        return
    }
    
    Write-Info "Generating Let's Encrypt certificates for $Domain..."
    Write-Warning "Make sure port 80 is available and $Domain points to this server"
    
    $env:DOMAIN_NAME = $Domain
    $env:ACME_EMAIL = $Email
    
    try {
        node scripts/generate-letsencrypt-http.cjs
        Write-Success "Let's Encrypt certificates generated successfully"
        Show-CertificateInfo
    }
    catch {
        Write-Error "Failed to generate Let's Encrypt certificates: $_"
        Write-Info "Falling back to development certificates..."
        Generate-DevCertificates
    }
}

function Renew-Certificates {
    Write-Info "Checking and renewing certificates..."
    
    if ($Domain) { $env:DOMAIN_NAME = $Domain }
    if ($Email) { $env:ACME_EMAIL = $Email }
    if ($CertPath) { $env:CERT_PATH = $CertPath }
    
    try {
        node scripts/renew-certificates.cjs
        Write-Success "Certificate renewal process completed"
    }
    catch {
        Write-Error "Failed to renew certificates: $_"
    }
}

function Setup-AutoRenewal {
    Write-Info "Setting up automatic certificate renewal..."
    
    try {
        node scripts/setup-auto-renewal.cjs
        Write-Success "Automatic renewal setup completed"
        Write-Info "Check Windows Task Scheduler for 'Certificate Renewal' task"
    }
    catch {
        Write-Error "Failed to setup automatic renewal: $_"
    }
}

function Show-Help {
    Write-Host @"
🔐 Certificate Management Tool for Windows

USAGE:
    .\manage-certificates.ps1 -Action <action> [options]

ACTIONS:
    dev                Generate development (self-signed) certificates
    letsencrypt        Generate Let's Encrypt certificates
    renew              Renew existing certificates
    setup-auto         Setup automatic renewal
    info               Show certificate information
    help               Show this help

OPTIONS:
    -Domain <domain>   Domain name for certificates
    -Email <email>     Email for Let's Encrypt registration
    -CertPath <path>   Custom path for certificates

EXAMPLES:
    # Generate development certificates
    .\manage-certificates.ps1 -Action dev

    # Generate Let's Encrypt certificates
    .\manage-certificates.ps1 -Action letsencrypt -Domain example.com -Email admin@example.com

    # Check certificate information
    .\manage-certificates.ps1 -Action info

    # Renew certificates
    .\manage-certificates.ps1 -Action renew -Domain example.com -Email admin@example.com

    # Setup automatic renewal
    .\manage-certificates.ps1 -Action setup-auto

ENVIRONMENT VARIABLES:
    You can also set these environment variables:
    - DOMAIN_NAME      Domain for certificates
    - ACME_EMAIL       Email for Let's Encrypt
    - CERT_PATH        Certificate directory path
    - SECRET_PROVIDER  Certificate provider (local, letsencrypt, etc.)

PREREQUISITES:
    - Node.js (required)
    - OpenSSL (recommended)
    - Administrator privileges (for Let's Encrypt)

"@ -ForegroundColor White
}

# Основная логика
function Main {
    Write-ColorText "🔐 Certificate Management Tool" -Color "Magenta"
    Write-Host "Current Directory: $PWD" -ForegroundColor Gray
    Write-Host ""
    
    if (-not (Test-Prerequisites)) {
        Write-Error "Prerequisites check failed"
        exit 1
    }
    
    switch ($Action.ToLower()) {
        "dev" {
            Generate-DevCertificates
        }
        "letsencrypt" {
            Generate-LetsEncryptCertificates
        }
        "renew" {
            Renew-Certificates
        }
        "setup-auto" {
            Setup-AutoRenewal
        }
        "info" {
            Show-CertificateInfo
        }
        "help" {
            Show-Help
        }
        default {
            Write-Error "Unknown action: $Action"
            Show-Help
            exit 1
        }
    }
}

# Запуск основной функции
Main
