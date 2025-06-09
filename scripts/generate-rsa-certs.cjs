#!/usr/bin/env node

/**
 * Скрипт для генерации RSA-сертификатов, совместимых с приложением.
 * Гарантирует, что сертификаты используют алгоритм RSA вместо ECDSA или других несовместимых алгоритмов.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Получаем переменные окружения или используем значения по умолчанию
const DOMAIN_NAME = process.env.DOMAIN_NAME || 'localhost';
const COMPANY_NAME = process.env.COMPANY_NAME || 'Cider Code';

// Для продакшн-сертификатов можно переопределить
const CERT_TYPE = process.env.CERT_TYPE || 'development'; // development или production
const KEY_BITS = process.env.KEY_BITS || '2048'; // Размер RSA ключа, можно установить 2048, 3072 или 4096

console.log(`🔐 Generating ${CERT_TYPE} RSA certificates (${KEY_BITS} bits) for ${DOMAIN_NAME}...`);

// Создаем директорию для сертификатов
const certsDir = path.join(process.cwd(), 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

try {
  // Генерируем приватный ключ RSA
  console.log(`🔑 Generating RSA-${KEY_BITS} private key...`);
  execSync(`openssl genrsa -out ${certsDir}/key.pem ${KEY_BITS}`, { stdio: 'inherit' });
  
  // Создаем конфигурационный файл для сертификата
  const opensslConfig = `
[req]
default_bits = ${KEY_BITS}
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no
 
[req_distinguished_name]
C = RU
ST = Moscow
L = Moscow
O = ${COMPANY_NAME}
OU = ${CERT_TYPE === 'production' ? 'IT Production' : 'IT Development'}
CN = ${DOMAIN_NAME}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN_NAME}
DNS.2 = *.${DOMAIN_NAME}
DNS.3 = localhost
DNS.4 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
`;
  
  fs.writeFileSync(`${certsDir}/openssl.conf`, opensslConfig);
  
  // Генерируем сертификат
  console.log('📜 Generating certificate with RSA key...');
  execSync(`openssl req -new -x509 -key ${certsDir}/key.pem -out ${certsDir}/cert.pem -days 365 -config ${certsDir}/openssl.conf -extensions v3_req`, { stdio: 'inherit' });
    
  // Создаем CA файл (копия cert для самоподписанных)
  console.log('🏛️ Creating CA certificate...');
  if (process.platform === 'win32') {
    execSync(`copy "${certsDir}\\cert.pem" "${certsDir}\\ca.pem"`, { shell: true });
  } else {
    execSync(`cp ${certsDir}/cert.pem ${certsDir}/ca.pem`);
  }
  
  // Удаляем временный конфиг
  fs.unlinkSync(`${certsDir}/openssl.conf`);
  
  // Устанавливаем правильные права доступа
  if (process.platform !== 'win32') {
    execSync(`chmod 644 ${certsDir}/cert.pem ${certsDir}/ca.pem`);
    execSync(`chmod 600 ${certsDir}/key.pem`);
  }
  
  // Проверяем тип ключа для подтверждения что это RSA
  console.log('🔍 Verifying key algorithm...');
  const keyInfo = execSync(`openssl rsa -noout -text -in ${certsDir}/key.pem | head -n 1`, { encoding: 'utf-8' }).trim();
  console.log(`✓ Key algorithm: ${keyInfo}`);
  
  // Проверяем созданный сертификат
  console.log('✅ Verifying certificate...');
  const opensslOutput = execSync(`openssl x509 -in ${certsDir}/cert.pem -noout -dates -subject -issuer`, { encoding: 'utf-8' });
  console.log(opensslOutput);
  
  console.log('🎉 RSA certificates generated successfully!');
  console.log('⚠️  Note: These are self-signed certificates for development/testing only');
  console.log(`📋 Certificate files in: ${certsDir}/`);
  
} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  process.exit(1);
}
