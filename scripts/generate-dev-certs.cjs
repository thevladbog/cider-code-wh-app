#!/usr/bin/env node

/**
 * Скрипт для генерации самоподписанных TLS сертификатов для разработки
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Получаем переменные окружения
const DOMAIN_NAME = process.env.DOMAIN_NAME || 'localhost';

console.log('🔐 Generating development TLS certificates...');
console.log(`🌐 Domain: ${DOMAIN_NAME}`);

// Создаем директорию для сертификатов
const certsDir = path.join(process.cwd(), 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

try {
  console.log(`🔐 Generating self-signed certificate for ${DOMAIN_NAME}...`);
  
  // Генерируем приватный ключ
  console.log('🔑 Generating private key...');
  execSync(`openssl genrsa -out ${certsDir}/key.pem 2048`, { stdio: 'inherit' });
  
  // Создаем конфигурационный файл для сертификата
  const opensslConfig = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = RU
ST = Moscow
L = Moscow
O = Bottle Code WH Development
OU = IT Department
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
  console.log('📜 Generating certificate...');
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
  
  // Проверяем созданный сертификат
  console.log('✅ Verifying certificate...');
  const opensslOutput = execSync(`openssl x509 -in ${certsDir}/cert.pem -noout -dates -subject -issuer`).toString();
  console.log(opensslOutput);
  
  console.log('🎉 Development certificates generated successfully!');
  console.log('⚠️  Note: These are self-signed certificates for development use only');
  
} catch (error) {
  console.error('❌ Error generating development certificates:', error.message);
  process.exit(1);
}
