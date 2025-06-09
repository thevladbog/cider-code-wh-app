#!/usr/bin/env node

/**
 * Скрипт для генерации производственных TLS сертификатов
 * Использует Let's Encrypt для получения валидных сертификатов
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Получаем переменные окружения
const DOMAIN_NAME = process.env.DOMAIN_NAME;
const ACME_EMAIL = process.env.ACME_EMAIL;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!DOMAIN_NAME || !ACME_EMAIL) {
  console.error('❌ Missing required environment variables: DOMAIN_NAME, ACME_EMAIL');
  process.exit(1);
}

console.log('🔐 Generating production TLS certificates...');
console.log(`📧 Email: ${ACME_EMAIL}`);
console.log(`🌐 Domain: ${DOMAIN_NAME}`);

// Создаем директорию для сертификатов
const certsDir = path.join(process.cwd(), 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

try {
  // Устанавливаем certbot если его нет
  console.log('📦 Installing certbot...');
  execSync('sudo apt-get update && sudo apt-get install -y certbot python3-certbot-dns-cloudflare', { stdio: 'inherit' });

  // Если у нас есть Cloudflare API токен, используем DNS challenge
  if (CLOUDFLARE_API_TOKEN) {
    console.log('☁️ Using Cloudflare DNS challenge...');
    
    // Создаем конфиг для Cloudflare
    const cloudflareCredentials = `dns_cloudflare_api_token = ${CLOUDFLARE_API_TOKEN}`;
    fs.writeFileSync('/tmp/cloudflare.ini', cloudflareCredentials);
    execSync('chmod 600 /tmp/cloudflare.ini');
    
    // Получаем сертификат через DNS challenge
    execSync(`sudo certbot certonly \\
      --dns-cloudflare \\
      --dns-cloudflare-credentials /tmp/cloudflare.ini \\
      --email ${ACME_EMAIL} \\
      --agree-tos \\
      --non-interactive \\
      -d ${DOMAIN_NAME}`, { stdio: 'inherit' });
  } else {
    console.log('🔗 Using HTTP challenge...');
    
    // Используем HTTP challenge (требует, чтобы домен был доступен)
    execSync(`sudo certbot certonly \\
      --standalone \\
      --email ${ACME_EMAIL} \\
      --agree-tos \\
      --non-interactive \\
      -d ${DOMAIN_NAME}`, { stdio: 'inherit' });
  }

  // Копируем сертификаты в нашу директорию
  const letsEncryptDir = `/etc/letsencrypt/live/${DOMAIN_NAME}`;
  
  console.log('📋 Copying certificates...');
  execSync(`sudo cp ${letsEncryptDir}/fullchain.pem ${certsDir}/cert.pem`);
  execSync(`sudo cp ${letsEncryptDir}/privkey.pem ${certsDir}/key.pem`);
  execSync(`sudo cp ${letsEncryptDir}/chain.pem ${certsDir}/ca.pem`);
  
  // Изменяем права доступа
  execSync(`sudo chown $(whoami):$(whoami) ${certsDir}/*.pem`);
  execSync(`chmod 644 ${certsDir}/cert.pem ${certsDir}/ca.pem`);
  execSync(`chmod 600 ${certsDir}/key.pem`);

  // Проверяем валидность сертификата
  console.log('✅ Verifying certificate...');
  const opensslOutput = execSync(`openssl x509 -in ${certsDir}/cert.pem -noout -dates -subject -issuer`).toString();
  console.log(opensslOutput);

  console.log('🎉 Production certificates generated successfully!');
  
} catch (error) {
  console.error('❌ Error generating production certificates:', error.message);
  
  // В случае ошибки, создаем самоподписанные сертификаты как fallback
  console.log('🔄 Falling back to self-signed certificates...');
  generateSelfSignedCertificates(DOMAIN_NAME, certsDir);
}

function generateSelfSignedCertificates(domain, certsDir) {
  try {
    console.log(`🔐 Generating self-signed certificate for ${domain}...`);
    
    // Генерируем приватный ключ
    execSync(`openssl genrsa -out ${certsDir}/key.pem 2048`);
    
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
O = Bottle Code WH
OU = IT Department
CN = ${domain}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${domain}
DNS.2 = *.${domain}
DNS.3 = localhost
IP.1 = 127.0.0.1
`;
    
    fs.writeFileSync(`${certsDir}/openssl.conf`, opensslConfig);
    
    // Генерируем сертификат
    execSync(`openssl req -new -x509 -key ${certsDir}/key.pem -out ${certsDir}/cert.pem -days 365 -config ${certsDir}/openssl.conf -extensions v3_req`);
      // Создаем CA файл (копия cert для самоподписанных)
    if (process.platform === 'win32') {
      execSync(`copy "${certsDir}\\cert.pem" "${certsDir}\\ca.pem"`, { shell: true });
    } else {
      execSync(`cp ${certsDir}/cert.pem ${certsDir}/ca.pem`);
    }
    
    // Удаляем временный конфиг
    fs.unlinkSync(`${certsDir}/openssl.conf`);
    
    console.log('✅ Self-signed certificate generated as fallback');
    
  } catch (fallbackError) {
    console.error('❌ Failed to generate even self-signed certificates:', fallbackError.message);
    process.exit(1);
  }
}
