#!/usr/bin/env node

/**
 * Скрипт для проверки соответствия сертификата и приватного ключа
 * Используется для верификации, что загруженная пара сертификат/ключ действительно совпадают
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Функция для проверки наличия OpenSSL
function checkOpenSSLInstalled() {
  try {
    const result = execSync('openssl version', { encoding: 'utf-8' });
    console.log(`✅ OpenSSL доступен: ${result.trim()}`);
    return true;
  } catch (error) {
    console.error('❌ OpenSSL не установлен или не доступен');
    return false;
  }
}

// Функция для извлечения модуля из сертификата
function extractModulusFromCert(certPath) {
  try {
    const modulusCmd = `openssl x509 -noout -modulus -in "${certPath}"`;
    const modulus = execSync(modulusCmd, { encoding: 'utf-8' }).trim();
    return modulus;
  } catch (error) {
    console.error(`❌ Ошибка при извлечении модуля из сертификата: ${error.message}`);
    return null;
  }
}

// Функция для извлечения модуля из приватного ключа
function extractModulusFromKey(keyPath) {
  try {
    const modulusCmd = `openssl rsa -noout -modulus -in "${keyPath}"`;
    const modulus = execSync(modulusCmd, { encoding: 'utf-8' }).trim();
    return modulus;
  } catch (error) {
    console.error(`❌ Ошибка при извлечении модуля из ключа: ${error.message}`);
    return null;
  }
}

// Функция для проверки соответствия сертификата и ключа
function verifyCertKeyPair(certPath, keyPath) {
  if (!fs.existsSync(certPath)) {
    console.error(`❌ Файл сертификата не найден: ${certPath}`);
    return false;
  }

  if (!fs.existsSync(keyPath)) {
    console.error(`❌ Файл ключа не найден: ${keyPath}`);
    return false;
  }

  // Проверка с использованием OpenSSL
  if (checkOpenSSLInstalled()) {
    const certModulus = extractModulusFromCert(certPath);
    const keyModulus = extractModulusFromKey(keyPath);
    
    if (certModulus && keyModulus) {
      console.log(`📊 Модуль сертификата: ${certModulus}`);
      console.log(`📊 Модуль ключа: ${keyModulus}`);
      
      if (certModulus === keyModulus) {
        console.log('✅ Сертификат и ключ соответствуют друг другу!');
        return true;
      } else {
        console.error('❌ Сертификат и ключ НЕ соответствуют друг другу!');
        return false;
      }
    }
  }
  
  // Если OpenSSL не доступен или произошла ошибка
  console.warn('⚠️ Невозможно проверить соответствие сертификата и ключа');
  return null;
}

// Функция для просмотра информации о сертификате
function showCertificateInfo(certPath) {
  if (!fs.existsSync(certPath)) {
    console.error(`❌ Файл сертификата не найден: ${certPath}`);
    return;
  }

  try {
    console.log('📋 Информация о сертификате:');
    const certInfo = execSync(`openssl x509 -in "${certPath}" -noout -text`, { encoding: 'utf-8' });
    console.log(certInfo);
  } catch (error) {
    console.error(`❌ Ошибка при получении информации о сертификате: ${error.message}`);
  }
}

// Основная функция
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Использование: node verify-cert-key-pair.cjs <путь_к_сертификату> <путь_к_ключу>');
    process.exit(1);
  }
  
  const certPath = args[0];
  const keyPath = args[1];
  
  console.log(`🔍 Проверка сертификата: ${certPath}`);
  console.log(`🔍 Проверка ключа: ${keyPath}`);
  
  const isValid = verifyCertKeyPair(certPath, keyPath);
  
  // Показываем информацию о сертификате
  if (isValid !== false) {
    showCertificateInfo(certPath);
  }
  
  process.exit(isValid === false ? 1 : 0);
}

// Запускаем основную функцию
main();
