#!/usr/bin/env node

/**
 * Скрипт для защиты сертификатов 
 * Архивирует сертификаты с паролем и отправляет пароль в Telegram
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const https = require('https');

// Константы
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const VERSION = process.env.VERSION || '1.0.0';

// Пути к файлам
const certsDir = path.join(process.cwd(), 'certs');
const archiveDir = path.join(process.cwd(), 'secure-certs');

// Проверка наличия сертификатов
function checkCertificates() {
  console.log('🔍 Checking for certificates...');
  
  if (!fs.existsSync(certsDir)) {
    throw new Error(`Certificates directory ${certsDir} not found!`);
  }
  
  const certFiles = ['cert.pem', 'key.pem', 'ca.pem'];
  const missingFiles = certFiles.filter(file => !fs.existsSync(path.join(certsDir, file)));
  
  if (missingFiles.length > 0) {
    throw new Error(`Missing certificate files: ${missingFiles.join(', ')}`);
  }
  
  console.log('✅ All certificate files found');
}

// Генерация случайного пароля
function generatePassword(length = 16) {
  // Создаем пароль, включающий буквы верхнего и нижнего регистра, цифры и спецсимволы
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let password = '';
  
  const randomValues = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomValues[i] % chars.length];
  }
  
  console.log(`🔑 Random password generated (${length} characters)`);
  return password;
}

// Создание тестовых сертификатов
function createTestCertificates() {
  console.log('🔧 Creating test certificates...');
  
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }
  
  // Создаем простые тестовые файлы сертификатов
  fs.writeFileSync(path.join(certsDir, 'cert.pem'), 'TEST CERTIFICATE - FOR DEMONSTRATION ONLY');
  fs.writeFileSync(path.join(certsDir, 'key.pem'), 'TEST PRIVATE KEY - FOR DEMONSTRATION ONLY');
  fs.writeFileSync(path.join(certsDir, 'ca.pem'), 'TEST CA CERTIFICATE - FOR DEMONSTRATION ONLY');
  
  console.log('✅ Test certificates created successfully');
}

// Создание защищенного архива с сертификатами
function createSecureArchive(password) {
  console.log('📦 Creating secure archive...');
  
  // Создаем директорию, если она не существует
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  
  const archiveName = `secure-certificates-v${VERSION}.zip`;
  const archivePath = path.join(archiveDir, archiveName);
  
  try {
    // Для 7-Zip (наиболее надежный метод)
    if (process.platform === 'win32') {
      try {
        // Проверяем наличие 7-Zip
        execSync('where 7z', { stdio: 'ignore' });
        
        console.log('📦 Using 7-Zip for secure archive...');
        execSync(`7z a -p"${password}" -mhe=on "${archivePath}" "${certsDir}\\cert.pem" "${certsDir}\\key.pem" "${certsDir}\\ca.pem"`, { stdio: 'inherit' });
        return archivePath;
      } catch (e) {
        console.log('⚠️ 7-Zip not found on Windows, using PowerShell ZIP (without encryption)');
        
        // Создаем README с паролем и информацией
        const readmePath = path.join(certsDir, 'README-SECURE.txt');
        fs.writeFileSync(readmePath, 
          `SECURE CERTIFICATES\n\n` +
          `Password: ${password}\n\n` +
          `⚠️ IMPORTANT: This file contains the password for the certificates.\n` +
          `Delete it after use and store the password securely.\n` +
          `Version: ${VERSION}\n` +
          `Generated: ${new Date().toISOString()}\n`
        );
        
        // Используем PowerShell для создания ZIP
        const psCommand = `Compress-Archive -Path "${certsDir}\\*.pem","${readmePath}" -DestinationPath "${archivePath}" -Force`;
        execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
        
        // Удаляем README после создания архива
        fs.unlinkSync(readmePath);
        
        return archivePath;
      }
    } else {
      // Linux/macOS
      try {
        // Проверяем наличие 7-Zip
        execSync('which 7z', { stdio: 'ignore' });
        
        console.log('📦 Using 7-Zip for secure archive...');
        execSync(`7z a -p"${password}" -mhe=on "${archivePath}" "${certsDir}/cert.pem" "${certsDir}/key.pem" "${certsDir}/ca.pem"`, { stdio: 'inherit' });
        return archivePath;
      } catch (e) {
        try {
          // Проверяем наличие zip
          execSync('which zip', { stdio: 'ignore' });
          
          console.log('📦 Using zip for secure archive...');
          execSync(`zip --password "${password}" -j "${archivePath}" "${certsDir}/cert.pem" "${certsDir}/key.pem" "${certsDir}/ca.pem"`, { stdio: 'inherit' });
          return archivePath;
        } catch (e2) {
          // Если ни zip ни 7z не доступны
          console.log('⚠️ Neither 7-Zip nor zip found, trying to install zip...');
          
          try {
            if (process.platform === 'darwin') {
              execSync('brew install zip', { stdio: 'inherit' });
            } else {
              execSync('sudo apt-get update && sudo apt-get install -y zip', { stdio: 'inherit' });
            }
            
            console.log('📦 Using zip for secure archive...');
            execSync(`zip --password "${password}" -j "${archivePath}" "${certsDir}/cert.pem" "${certsDir}/key.pem" "${certsDir}/ca.pem"`, { stdio: 'inherit' });
            return archivePath;
          } catch (e3) {
            console.log('⚠️ Failed to install or use zip, creating unsecured archive with password in file');
            
            // Создаем README с паролем и информацией
            const readmePath = path.join(certsDir, 'README-SECURE.txt');
            fs.writeFileSync(readmePath, 
              `SECURE CERTIFICATES\n\n` +
              `Password: ${password}\n\n` +
              `⚠️ IMPORTANT: This file contains the password for the certificates.\n` +
              `Delete it after use and store the password securely.\n` +
              `Version: ${VERSION}\n` +
              `Generated: ${new Date().toISOString()}\n`
            );
            
            // Используем tar
            execSync(`tar -czvf "${archivePath}" -C "${certsDir}" cert.pem key.pem ca.pem README-SECURE.txt`, { stdio: 'inherit' });
            
            // Удаляем README после создания архива
            fs.unlinkSync(readmePath);
            
            return archivePath;
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to create secure archive:', error.message);
    throw error;
  }
}

// Отправка пароля в Telegram
function sendPasswordToTelegram(password) {
  console.log('📱 Sending password to Telegram...');
  
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables are required');
  }
  
  const message = `🔐 *Пароль для защищенных сертификатов v${VERSION}*\n\n\`${password}\`\n\n⚠️ Этот пароль будет доступен только один раз. Сохраните его в безопасном месте.`;
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
          console.log('✅ Password sent to Telegram successfully');
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

// Основная функция
async function main() {
  try {
    console.log('🔒 Starting certificate protection process...');
    
    // Проверяем аргументы командной строки
    const isTestMode = process.argv.includes('-test') || process.argv.includes('--test');
    
    if (isTestMode) {
      console.log('🧪 Running in TEST mode');
      createTestCertificates();
    } else {
      // В обычном режиме проверяем наличие сертификатов
      checkCertificates();
    }
    
    // Генерируем случайный пароль
    const password = generatePassword();
    
    // Создаем защищенный архив
    const archivePath = createSecureArchive(password);
    
    // Отправляем пароль в Telegram, если это не тестовый режим
    if (!isTestMode && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        await sendPasswordToTelegram(password);
      } catch (telegramError) {
        console.error('⚠️ Failed to send password to Telegram:', telegramError.message);
        console.warn(`⚠️ Generated password: ${password}`);
      }
    } else {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not provided, or running in test mode.');
      console.warn(`⚠️ Generated password: ${password}`);
    }
    
    console.log('🎉 Certificate protection completed successfully!');
    console.log(`📦 Archive path: ${archivePath}`);
    console.log(`🔑 Password: ${isTestMode ? password : '******'}`);
    
    // Вывод пароля только для CI
    if (process.env.CI === 'true') {
      console.log(`::set-output name=archive_password::${password}`);
      console.log(`::set-output name=archive_path::${archivePath}`);
    }
  } catch (error) {
    console.error('❌ Certificate protection failed:', error.message);
    process.exit(1);
  }
}

// Запускаем основную функцию
main();
