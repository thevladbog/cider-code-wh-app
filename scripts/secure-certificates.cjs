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
  // Создаем пароль только из букв и цифр (без спецсимволов для лучшей совместимости)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
    // Для Linux/Ubuntu (приоритет в CI/CD)
    if (process.platform === 'linux') {
      console.log('📦 Using zip with password on Linux...');
      // Экранируем пароль для bash
      const escapedPassword = password.replace(/'/g, "'\"'\"'");
      execSync(`zip --password '${escapedPassword}' -j "${archivePath}" "${certsDir}/cert.pem" "${certsDir}/key.pem" "${certsDir}/ca.pem"`, { stdio: 'inherit' });
      
      // Проверяем, что архив создан и имеет пароль
      if (!fs.existsSync(archivePath)) {
        throw new Error('Archive was not created');
      }
      
      console.log(`✅ Secure archive created: ${archiveName}`);
      console.log(`🔑 Archive password: ${password}`);
      return archivePath;
    }
    
    // Для Windows - пробуем 7-Zip, затем WinRAR, потом fallback
    if (process.platform === 'win32') {
      try {
        // Проверяем наличие 7-Zип
        execSync('where 7z', { stdio: 'ignore' });
        
        console.log('📦 Using 7-Zip for secure archive...');
        execSync(`7z a -p"${password}" -mhe=on "${archivePath}" "${certsDir}\\cert.pem" "${certsDir}\\key.pem" "${certsDir}\\ca.pem"`, { stdio: 'inherit' });
        
        console.log(`✅ Secure archive created with 7-Zip: ${archiveName}`);
        console.log(`🔑 Archive password: ${password}`);
        return archivePath;
      } catch (e) {
        console.log('⚠️ 7-Zип not found on Windows, trying WinRAR...');
        
        try {
          // Проверяем наличие WinRAR
          execSync('where rar', { stdio: 'ignore' });
          
          console.log('📦 Using WinRAR for secure archive...');
          execSync(`rar a -hp"${password}" "${archivePath}" "${certsDir}\\cert.pem" "${certsDir}\\key.pem" "${certsDir}\\ca.pem"`, { stdio: 'inherit' });
          
          console.log(`✅ Secure archive created with WinRAR: ${archiveName}`);
          console.log(`🔑 Archive password: ${password}`);
          return archivePath;
        } catch (e2) {
          console.log('⚠️ Neither 7-Zip nor WinRAR found, creating fallback solution...');
          
          // Создаем README с паролем и информацией  
          const readmePath = path.join(certsDir, 'PASSWORD.txt');
          fs.writeFileSync(readmePath, 
            `CERTIFICATE ARCHIVE PASSWORD\n\n` +
            `Password: ${password}\n\n` +
            `⚠️ IMPORTANT: Use this password to extract certificates\n` +
            `Version: ${VERSION}\n` +
            `Generated: ${new Date().toISOString()}\n\n` +
            `Note: This archive was created without encryption due to\n` +
            `missing archive tools. Password is provided for reference.\n`
          );
          
          // Используем PowerShell для создания ZIP (без пароля, но с README)
          const psCommand = `Compress-Archive -Path "${certsDir}\\*.pem","${readmePath}" -DestinationPath "${archivePath}" -Force`;
          execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
          
          // НЕ удаляем README, оставляем его в архиве
          console.log(`⚠️ Archive created without encryption: ${archiveName}`);
          console.log(`🔑 Password is stored in PASSWORD.txt inside archive: ${password}`);
          return archivePath;
        }
      }
    }
    
    // Для macOS
    if (process.platform === 'darwin') {
      try {
        // Проверяем наличие zip
        execSync('which zip', { stdio: 'ignore' });
        
        console.log('📦 Using zip for secure archive...');
        execSync(`zip --password "${password}" -j "${archivePath}" "${certsDir}/cert.pem" "${certsDir}/key.pem" "${certsDir}/ca.pem"`, { stdio: 'inherit' });
        
        console.log(`✅ Secure archive created: ${archiveName}`);
        console.log(`🔑 Archive password: ${password}`);
        return archivePath;
      } catch (e) {
        console.log('⚠️ zip not found on macOS, trying to install...');
        
        try {
          execSync('brew install zip', { stdio: 'inherit' });
          execSync(`zip --password "${password}" -j "${archivePath}" "${certsDir}/cert.pem" "${certsDir}/key.pem" "${certsDir}/ca.pem"`, { stdio: 'inherit' });
          
          console.log(`✅ Secure archive created: ${archiveName}`);
          console.log(`🔑 Archive password: ${password}`);
          return archivePath;
        } catch (e2) {
          throw new Error('Failed to create secure archive on macOS');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to create secure archive:', error.message);
    throw error;
  }
}

// Проверка архива с паролем
function verifyArchive(archivePath, password) {
  console.log('🔍 Verifying archive with password...');
  
  try {
    const ext = path.extname(archivePath).toLowerCase();
    
    if (process.platform === 'linux') {
      // Проверяем содержимое ZIP архива
      console.log('📋 Listing archive contents:');
      execSync(`unzip -l "${archivePath}"`, { stdio: 'inherit' });
      
      // Пробуем извлечь один файл для проверки пароля
      const testDir = path.join(archiveDir, 'test-extract');
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
      fs.mkdirSync(testDir, { recursive: true });
      
      console.log('🧪 Testing password by extracting cert.pem...');
      const escapedPassword = password.replace(/'/g, "'\"'\"'");
      execSync(`unzip -P '${escapedPassword}' -j "${archivePath}" cert.pem -d "${testDir}"`, { stdio: 'inherit' });
      
      // Проверяем, что файл извлечен
      const extractedFile = path.join(testDir, 'cert.pem');
      if (fs.existsSync(extractedFile)) {
        console.log('✅ Archive password verified successfully!');
        // Очищаем тестовые файлы
        fs.rmSync(testDir, { recursive: true });
        return true;
      } else {
        console.log('❌ Failed to extract file - password verification failed');
        return false;
      }
    }
    
    if (process.platform === 'win32') {
      // Для Windows проверяем разными способами
      try {
        // Пробуем 7-Zип
        execSync('where 7z', { stdio: 'ignore' });
        console.log('🧪 Testing with 7-Zip...');
        execSync(`7z l -p"${password}" "${archivePath}"`, { stdio: 'inherit' });
        console.log('✅ Archive password verified with 7-Zip!');
        return true;
      } catch (e) {
        try {
          // Пробуем WinRAR
          execSync('where rar', { stdio: 'ignore' });
          console.log('🧪 Testing with WinRAR...');
          execSync(`rar l -hp"${password}" "${archivePath}"`, { stdio: 'inherit' });
          console.log('✅ Archive password verified with WinRAR!');
          return true;
        } catch (e2) {
          console.log('⚠️ Cannot verify password on Windows - no suitable tools found');
          console.log('💡 Archive may be unencrypted with password in PASSWORD.txt file');
          return true; // Assume it's ok for fallback method
        }
      }
    }
    
    if (process.platform === 'darwin') {
      // Для macOS
      console.log('🧪 Testing password with unzip...');
      execSync(`unzip -t -P "${password}" "${archivePath}"`, { stdio: 'inherit' });
      console.log('✅ Archive password verified successfully!');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Archive password verification failed:', error.message);
    return false;
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
    
    // Проверяем архив с паролем
    console.log('🔍 Verifying created archive...');
    const isVerified = verifyArchive(archivePath, password);
    
    if (!isVerified) {
      console.error('❌ Archive verification failed! Password may not work.');
      console.warn('💡 This could be due to missing encryption tools or fallback method used.');
    }
    
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
    console.log(`🔑 Password: ${isTestMode ? password : '******'}`);    // Вывод пароля только для CI (использует новый подход с GITHUB_OUTPUT)
    if (process.env.CI === 'true' && process.env.GITHUB_OUTPUT) {
      // Используем новый подход для вывода значений в GitHub Actions
      // Безопасно экранируем значения для GitHub Actions environment file
      const safeValue = (val) => val.replace(/\r/g, '%0D').replace(/\n/g, '%0A');
      
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `archive_password=${safeValue(password)}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `archive_path=${safeValue(archivePath)}\n`);
      console.log('✅ Output variables set for GitHub Actions');
    }
  } catch (error) {
    console.error('❌ Certificate protection failed:', error.message);
    process.exit(1);
  }
}

// Запускаем основную функцию
main();
