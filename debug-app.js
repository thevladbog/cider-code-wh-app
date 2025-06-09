// Скрипт для отладки запуска приложения
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting debug session...');
console.log('Working directory:', process.cwd());

// Найти exe файл
const exePath = path.join(__dirname, 'out', 'bottle-code-wh-app-win32-x64', 'bottle-code-wh-app.exe');
console.log('Looking for exe at:', exePath);

// Запуск с логированием
const child = spawn(exePath, [], {
  stdio: ['pipe', 'pipe', 'pipe'],
  detached: false
});

child.stdout.on('data', (data) => {
  console.log(`STDOUT: ${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`STDERR: ${data}`);
});

child.on('close', (code) => {
  console.log(`Process exited with code: ${code}`);
});

child.on('error', (error) => {
  console.error(`Failed to start process: ${error.message}`);
});

// Таймаут для принудительного завершения
setTimeout(() => {
  console.log('Timeout reached, killing process...');
  child.kill('SIGTERM');
}, 30000);
