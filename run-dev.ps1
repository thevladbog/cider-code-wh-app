# Остановить все процессы vite и electron
Get-Process -Name "vite", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Очистить временные файлы
if (Test-Path ".vite") {
  Remove-Item -Recurse -Force ".vite"
}

# Используем npm для запуска Vite и Electron
Write-Host "Запуск Vite и Electron в режиме разработки..."
$env:NODE_ENV = "development"

# Запускаем приложение через скрипт в package.json
npm run dev:all
