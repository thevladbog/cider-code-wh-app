#!/usr/bin/env node

/**
 * Скрипт для отправки уведомлений в Telegram в процессе релиза
 * Используется для оповещения о начале, ошибках и завершении процесса билда
 */

const https = require('https');

// Получаем переменные окружения
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const VERSION = process.env.VERSION || '0.0.0';
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'unknown-repo';
const GITHUB_SERVER_URL = process.env.GITHUB_SERVER_URL || 'https://github.com';
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID;
const GITHUB_RUN_NUMBER = process.env.GITHUB_RUN_NUMBER;
const BUILD_PLATFORM = process.env.BUILD_PLATFORM || 'unknown';
const RELEASE_TYPE = process.env.RELEASE_TYPE || 'unknown';
const ERROR_MESSAGE = process.env.ERROR_MESSAGE;
const ARTIFACTS_URL = process.env.ARTIFACTS_URL;

// Тип уведомления
const NOTIFICATION_TYPE = process.argv[2] || 'start';

/**
 * Отправляет сообщение в Telegram
 * @param {string} message Текст сообщения (поддерживает Markdown)
 * @returns {Promise<void>}
 */
function sendTelegramMessage(message) {
  console.log('📱 Sending notification to Telegram...');
  
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables are required');
  }
  
  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&parse_mode=Markdown&text=${encodedMessage}`;
  
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Notification sent to Telegram successfully');
          resolve();
        } else {
          reject(new Error(`Failed to send message to Telegram: HTTP ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Failed to send message to Telegram: ${error.message}`));
    });
    
    req.end();
  });
}

/**
 * Создает URL для просмотра рана GitHub Actions
 * @returns {string} URL на ран GitHub Actions
 */
function getRunUrl() {
  if (!GITHUB_RUN_ID || !GITHUB_REPOSITORY) {
    return '';
  }
  
  return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
}

/**
 * Создает сообщение о начале релизного процесса
 * @returns {string} Текст сообщения
 */
function createStartMessage() {
  const emoji = RELEASE_TYPE === 'beta' ? '🧪' : '🚀';
  const type = RELEASE_TYPE === 'beta' ? 'бета' : 'стабильный';
  const runUrl = getRunUrl();
  const runLink = runUrl ? `\n\n🔗 [Просмотреть процесс](${runUrl})` : '';
  
  return `${emoji} *Начат ${type} релиз v${VERSION}*\n\n` +
         `📋 Платформа: ${BUILD_PLATFORM}\n` +
         `🔢 Сборка: #${GITHUB_RUN_NUMBER}${runLink}`;
}

/**
 * Создает сообщение об ошибке в процессе релиза
 * @returns {string} Текст сообщения
 */
function createErrorMessage() {
  const runUrl = getRunUrl();
  const runLink = runUrl ? `\n\n🔗 [Просмотреть детали ошибки](${runUrl})` : '';
  const errorDetails = ERROR_MESSAGE ? `\n\n⚠️ Детали ошибки:\n\`\`\`\n${ERROR_MESSAGE}\n\`\`\`` : '';
  
  return `❌ *Ошибка релиза v${VERSION}*\n\n` +
         `📋 Платформа: ${BUILD_PLATFORM}\n` +
         `🔢 Сборка: #${GITHUB_RUN_NUMBER}${errorDetails}${runLink}`;
}

/**
 * Создает сообщение о завершении релизного процесса
 * @returns {string} Текст сообщения
 */
function createSuccessMessage() {
  const emoji = RELEASE_TYPE === 'beta' ? '🧪' : '✅';
  const type = RELEASE_TYPE === 'beta' ? 'бета' : 'стабильный';
  const runUrl = getRunUrl();
  const runLink = runUrl ? `\n\n🔗 [Процесс сборки](${runUrl})` : '';
  
  let artifactsSection = '';
  if (ARTIFACTS_URL) {
    artifactsSection = `\n\n📦 *Ссылки на артефакты:*\n${ARTIFACTS_URL}`;
  }
  
  return `${emoji} *Успешно завершен ${type} релиз v${VERSION}*\n\n` +
         `📋 Платформа: ${BUILD_PLATFORM}\n` +
         `🔢 Сборка: #${GITHUB_RUN_NUMBER}${artifactsSection}${runLink}`;
}

/**
 * Основная функция
 */
async function main() {
  try {
    console.log(`🔔 Preparing ${NOTIFICATION_TYPE} notification for Telegram...`);
    
    let message = '';
    
    switch (NOTIFICATION_TYPE) {
      case 'start':
        message = createStartMessage();
        break;
      case 'error':
        message = createErrorMessage();
        break;
      case 'success':
        message = createSuccessMessage();
        break;
      default:
        throw new Error(`Unknown notification type: ${NOTIFICATION_TYPE}`);
    }
    
    await sendTelegramMessage(message);
    console.log('✅ Telegram notification completed');
  } catch (error) {
    console.error('❌ Failed to send Telegram notification:', error);
    process.exit(1);
  }
}

// Запуск скрипта
main();
