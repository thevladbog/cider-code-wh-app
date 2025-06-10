# Generate-RSA-Certificates.ps1
# Скрипт для генерации и управления RSA-сертификатами для приложения Cider Code WH App

# Определяем цвета для вывода сообщений
$infoColor = "Cyan"
$errorColor = "Red"
$successColor = "Green"
$warningColor = "Yellow"
$highlightColor = "Magenta"

# Функция для запуска узла с аргументами и обработкой ошибок
function Invoke-NodeScript {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,
        
    [Parameter(Mandatory = $false)]
    [hashtable]$EnvironmentVars = @{},
        
    [Parameter(Mandatory = $false)]
    [string]$Arguments = ""
  )
    
  try {
    # Создаем копию текущих переменных окружения
    $currentEnv = @{}
    foreach ($key in $EnvironmentVars.Keys) {
      $currentEnv[$key] = [Environment]::GetEnvironmentVariable($key)
      [Environment]::SetEnvironmentVariable($key, $EnvironmentVars[$key])
    }
        
    # Запускаем скрипт
    $command = "node `"$ScriptPath`" $Arguments"
    Write-Host "Выполнение команды: $command" -ForegroundColor $infoColor
    Invoke-Expression $command
    $exitCode = $LASTEXITCODE
        
    # Восстанавливаем переменные окружения
    foreach ($key in $EnvironmentVars.Keys) {
      [Environment]::SetEnvironmentVariable($key, $currentEnv[$key])
    }
        
    return $exitCode -eq 0
  }
  catch {
    Write-Host "Ошибка при выполнении скрипта: $_" -ForegroundColor $errorColor
    return $false
  }
}

# Функция для анализа существующего сертификата
function Analyze-Certificate {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CertPath
  )
    
  Write-Host "`n🔍 Анализ сертификата: $CertPath" -ForegroundColor $highlightColor
    
  if (-not (Test-Path $CertPath)) {
    Write-Host "❌ Сертификат не найден: $CertPath" -ForegroundColor $errorColor
    return
  }
    
  $result = Invoke-NodeScript -ScriptPath "scripts\analyze-certificate.cjs" -Arguments "`"$CertPath`""
    
  if (-not $result) {
    Write-Host "❌ Ошибка при анализе сертификата" -ForegroundColor $errorColor
  }
}

# Функция проверки соответствия сертификата и ключа
function Verify-KeyPair {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CertPath,
        
    [Parameter(Mandatory = $true)]
    [string]$KeyPath
  )
    
  Write-Host "`n🔄 Проверка соответствия сертификата и ключа" -ForegroundColor $highlightColor
    
  if (-not (Test-Path $CertPath)) {
    Write-Host "❌ Сертификат не найден: $CertPath" -ForegroundColor $errorColor
    return $false
  }
    
  if (-not (Test-Path $KeyPath)) {
    Write-Host "❌ Ключ не найден: $KeyPath" -ForegroundColor $errorColor
    return $false
  }
    
  $result = Invoke-NodeScript -ScriptPath "scripts\verify-cert-key-pair.cjs" -Arguments "`"$CertPath`" `"$KeyPath`""
    
  return $result
}

# Проверяем наличие директории certs
$certsDir = Join-Path $PSScriptRoot "certs"
if (-not (Test-Path $certsDir)) {
  New-Item -ItemType Directory -Path $certsDir | Out-Null
  Write-Host "✅ Создана директория для сертификатов: $certsDir" -ForegroundColor $successColor
}

# Выводим меню
function Show-Menu {
  Write-Host "`n📜 Управление RSA-сертификатами для Cider Code WH App`n" -ForegroundColor $highlightColor
  Write-Host "1. Сгенерировать новые RSA-сертификаты для разработки"
  Write-Host "2. Сгенерировать новые RSA-сертификаты для продакшена"
  Write-Host "3. Анализировать существующий сертификат"
  Write-Host "4. Проверить соответствие сертификата и ключа"
  Write-Host "5. Выйти`n"
    
  $choice = Read-Host "Выберите действие (1-5)"
  return $choice
}

# Основной цикл меню
$exit = $false

while (-not $exit) {
  $choice = Show-Menu
    
  switch ($choice) {
    "1" {
      Write-Host "`n🔐 Генерация RSA-сертификатов для разработки" -ForegroundColor $highlightColor
            
      $domain = Read-Host "Введите домен (по умолчанию: localhost)"
      if (-not $domain) { $domain = "localhost" }
            
      $company = Read-Host "Введите название компании (по умолчанию: Cider Code)"
      if (-not $company) { $company = "Cider Code" }
            
      $keyBits = Read-Host "Введите размер ключа RSA (2048, 3072, 4096) (по умолчанию: 2048)"
      if (-not $keyBits) { $keyBits = "2048" }
            
      $envVars = @{
        "DOMAIN_NAME"  = $domain
        "COMPANY_NAME" = $company
        "CERT_TYPE"    = "development"
        "KEY_BITS"     = $keyBits
      }
            
      $result = Invoke-NodeScript -ScriptPath "scripts\generate-rsa-certs.cjs" -EnvironmentVars $envVars
            
      if ($result) {
        Write-Host "`n✅ RSA-сертификаты для разработки успешно созданы!" -ForegroundColor $successColor
      }
      else {
        Write-Host "`n❌ Ошибка при создании сертификатов" -ForegroundColor $errorColor
      }
            
      Write-Host "Нажмите любую клавишу для продолжения..." -ForegroundColor $infoColor
      [void][System.Console]::ReadKey($true)
    }
    "2" {
      Write-Host "`n🔐 Генерация RSA-сертификатов для продакшена" -ForegroundColor $highlightColor
            
      $domain = Read-Host "Введите домен (обязательно)"
      if (-not $domain) {
        Write-Host "❌ Домен обязателен для продакшн-сертификатов" -ForegroundColor $errorColor
        continue
      }
            
      $company = Read-Host "Введите название компании (по умолчанию: Cider Code)"
      if (-not $company) { $company = "Cider Code" }
            
      $keyBits = Read-Host "Введите размер ключа RSA (2048, 3072, 4096) (по умолчанию: 2048)"
      if (-not $keyBits) { $keyBits = "2048" }
            
      $envVars = @{
        "DOMAIN_NAME"  = $domain
        "COMPANY_NAME" = $company
        "CERT_TYPE"    = "production"
        "KEY_BITS"     = $keyBits
      }
            
      $result = Invoke-NodeScript -ScriptPath "scripts\generate-rsa-certs.cjs" -EnvironmentVars $envVars
            
      if ($result) {
        Write-Host "`n✅ RSA-сертификаты для продакшена успешно созданы!" -ForegroundColor $successColor
        Write-Host "⚠️ Обратите внимание: эти сертификаты самоподписанные и не подходят для публичных веб-серверов." -ForegroundColor $warningColor
        Write-Host "   Для публичных серверов используйте Let's Encrypt или коммерческий центр сертификации." -ForegroundColor $warningColor
      }
      else {
        Write-Host "`n❌ Ошибка при создании сертификатов" -ForegroundColor $errorColor
      }
            
      Write-Host "Нажмите любую клавишу для продолжения..." -ForegroundColor $infoColor
      [void][System.Console]::ReadKey($true)
    }
    "3" {
      Write-Host "`n🔍 Анализ существующего сертификата" -ForegroundColor $highlightColor
            
      $defaultPath = Join-Path $certsDir "cert.pem"
      $certPath = Read-Host "Введите путь к сертификату (по умолчанию: $defaultPath)"
            
      if (-not $certPath) { $certPath = $defaultPath }
            
      Analyze-Certificate -CertPath $certPath
            
      Write-Host "Нажмите любую клавишу для продолжения..." -ForegroundColor $infoColor
      [void][System.Console]::ReadKey($true)
    }
    "4" {
      Write-Host "`n🔄 Проверка соответствия сертификата и ключа" -ForegroundColor $highlightColor
            
      $defaultCertPath = Join-Path $certsDir "cert.pem"
      $defaultKeyPath = Join-Path $certsDir "key.pem"
            
      $certPath = Read-Host "Введите путь к сертификату (по умолчанию: $defaultCertPath)"
      if (-not $certPath) { $certPath = $defaultCertPath }
            
      $keyPath = Read-Host "Введите путь к ключу (по умолчанию: $defaultKeyPath)"
      if (-not $keyPath) { $keyPath = $defaultKeyPath }
            
      $result = Verify-KeyPair -CertPath $certPath -KeyPath $keyPath
            
      if ($result) {
        Write-Host "`n✅ Сертификат и ключ соответствуют друг другу" -ForegroundColor $successColor
      }
      else {
        Write-Host "`n⚠️ Возможно, сертификат и ключ не соответствуют друг другу" -ForegroundColor $warningColor
      }
            
      Write-Host "Нажмите любую клавишу для продолжения..." -ForegroundColor $infoColor
      [void][System.Console]::ReadKey($true)
    }
    "5" {
      $exit = $true
    }
    default {
      Write-Host "❌ Неверный выбор. Пожалуйста, выберите число от 1 до 5." -ForegroundColor $errorColor
      Start-Sleep -Seconds 2
    }
  }
}
