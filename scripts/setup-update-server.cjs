#!/usr/bin/env node
/**
 * Скрипт для настройки простого сервера обновлений для Electron-приложения.
 * Требует установки Node.js и npm-пакетов express и cors.
 * 
 * Использование:
 * 1. Создайте директорию updates/
 * 2. Разместите в ней файлы обновлений (.exe, .dmg, .AppImage и т.д.)
 * 3. Создайте файл latest.json с информацией о последней версии
 * 4. Запустите скрипт: node setup-update-server.cjs
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Настройки сервера
const PORT = process.env.PORT || 3001;
const UPDATES_DIR = path.join(__dirname, '../updates');
const LATEST_JSON = path.join(UPDATES_DIR, 'latest.json');

// Создаем директорию для обновлений, если она не существует
if (!fs.existsSync(UPDATES_DIR)) {
  fs.mkdirSync(UPDATES_DIR, { recursive: true });
  console.log(`✓ Создана директория для обновлений: ${UPDATES_DIR}`);
}

// Проверяем наличие файла с информацией о последней версии
if (!fs.existsSync(LATEST_JSON)) {
  const defaultLatest = {
    version: '1.0.0',
    notes: 'Первоначальная версия',
    releaseDate: new Date().toISOString(),
    platforms: {
      win32: {
        url: 'https://your-update-server.com/updates/bottle-code-wh-app-setup.exe',
        signature: '', // Подпись файла для проверки целостности
        size: 0 // Размер файла в байтах
      },
      darwin: {
        url: 'https://your-update-server.com/updates/bottle-code-wh-app.dmg',
        signature: '',
        size: 0
      },
      linux: {
        url: 'https://your-update-server.com/updates/bottle-code-wh-app.AppImage',
        signature: '',
        size: 0
      }
    }
  };

  fs.writeFileSync(LATEST_JSON, JSON.stringify(defaultLatest, null, 2));
  console.log(`✓ Создан шаблон файла с информацией о версии: ${LATEST_JSON}`);
}

// Создаем сервер Express
const app = express();

// Настройки CORS для безопасности
app.use(cors({
  origin: function(origin, callback) {
    // Можно настроить список разрешенных источников
    const allowedOrigins = ['http://localhost:3000', 'https://your-app-domain.com'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Доступ запрещен политикой CORS'));
    }
  }
}));

// Статические файлы
app.use('/updates', express.static(UPDATES_DIR, {
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.exe') {
      // Правильные заголовки для exe файлов
      res.set('Content-Type', 'application/octet-stream');
      res.set('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    }
  }
}));

// Информация о последней версии
app.get('/latest', (req, res) => {
  try {
    if (fs.existsSync(LATEST_JSON)) {
      const latestInfo = JSON.parse(fs.readFileSync(LATEST_JSON, 'utf8'));
      res.json(latestInfo);
    } else {
      res.status(404).json({ error: 'Информация о версии не найдена' });
    }
  } catch (error) {
    console.error('Ошибка при чтении файла версии:', error);
    res.status(500).json({ error: 'Не удалось получить информацию о версии' });
  }
});

// Эндпоинт для проверки обновлений
app.get('/check-update', (req, res) => {
  try {
    // Получаем текущую версию клиента
    const { version, platform } = req.query;
    
    if (!version || !platform) {
      return res.status(400).json({ error: 'Не указана версия или платформа' });
    }
    
    if (fs.existsSync(LATEST_JSON)) {
      const latestInfo = JSON.parse(fs.readFileSync(LATEST_JSON, 'utf8'));
      
      // Простое сравнение версий
      const currentParts = version.split('.').map(Number);
      const latestParts = latestInfo.version.split('.').map(Number);
      
      let hasUpdate = false;
      
      // Сравниваем версии
      for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const latestPart = latestParts[i] || 0;
        
        if (latestPart > currentPart) {
          hasUpdate = true;
          break;
        } else if (latestPart < currentPart) {
          break;
        }
      }
      
      if (hasUpdate && latestInfo.platforms[platform]) {
        // Если доступно обновление и есть информация для этой платформы
        res.json({
          updateAvailable: true,
          ...latestInfo,
          updateInfo: latestInfo.platforms[platform]
        });
      } else {
        res.json({
          updateAvailable: false,
          currentVersion: version,
          latestVersion: latestInfo.version
        });
      }
    } else {
      res.status(404).json({ error: 'Информация о версии не найдена' });
    }
  } catch (error) {
    console.error('Ошибка при проверке обновлений:', error);
    res.status(500).json({ error: 'Ошибка при проверке обновлений' });
  }
});

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`✅ Сервер обновлений запущен на порту ${PORT}`);
  console.log(`📁 Папка с обновлениями: ${UPDATES_DIR}`);
  console.log(`🌐 Для доступа к серверу используйте: http://localhost:${PORT}`);
  console.log(`ℹ️  Для проверки информации о версии: http://localhost:${PORT}/latest`);
  console.log(`📋 Для проверки наличия обновлений: http://localhost:${PORT}/check-update?version=1.0.0&platform=win32`);
});

// Функция для изящного завершения работы
process.on('SIGINT', () => {
  console.log('\n👋 Сервер обновлений остановлен');
  process.exit(0);
});
