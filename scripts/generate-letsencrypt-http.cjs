#!/usr/bin/env node

/**
 * Скрипт для генерации Let's Encrypt сертификатов через HTTP-01 challenge
 * Не требует AWS, Cloudflare или других облачных провайдеров
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Получаем переменные окружения
const DOMAIN_NAME = process.env.DOMAIN_NAME;
const ACME_EMAIL = process.env.ACME_EMAIL;
const WEBROOT_PATH = process.env.WEBROOT_PATH || '/var/www/html';

if (!DOMAIN_NAME || !ACME_EMAIL) {
  console.error('❌ Missing required environment variables: DOMAIN_NAME, ACME_EMAIL');
  console.log('Example: DOMAIN_NAME=example.com ACME_EMAIL=admin@example.com node scripts/generate-letsencrypt-http.cjs');
  process.exit(1);
}

console.log('🔐 Generating Let\'s Encrypt certificates via HTTP-01 challenge...');
console.log(`📧 Email: ${ACME_EMAIL}`);
console.log(`🌐 Domain: ${DOMAIN_NAME}`);
console.log(`📁 Webroot: ${WEBROOT_PATH}`);

// Создаем директорию для сертификатов
const certsDir = path.join(process.cwd(), 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

try {
  // Проверяем наличие Certbot
  try {
    execSync('certbot --version', { stdio: 'pipe' });
  } catch (error) {
    console.log('📦 Installing Certbot...');
    if (process.platform === 'win32') {
      console.error('❌ Certbot installation on Windows requires manual setup.');
      console.log('Please install Certbot from: https://certbot.eff.org/instructions?ws=other&os=windows');
      process.exit(1);
    } else {
      // Попытка установки для Linux/macOS
      try {
        execSync('sudo apt-get update && sudo apt-get install -y certbot', { stdio: 'inherit' });
      } catch (installError) {
        try {
          execSync('sudo yum install -y certbot', { stdio: 'inherit' });
        } catch (yumError) {
          try {
            execSync('brew install certbot', { stdio: 'inherit' });
          } catch (brewError) {
            console.error('❌ Failed to install Certbot automatically.');
            console.log('Please install Certbot manually: https://certbot.eff.org/');
            process.exit(1);
          }
        }
      }
    }
  }

  console.log('🔍 Checking domain accessibility...');
  
  // Способ 1: Webroot challenge (если у вас есть веб-сервер)
  if (fs.existsSync(WEBROOT_PATH)) {
    console.log('🌐 Using webroot challenge...');
    execSync(`sudo certbot certonly \\
      --webroot \\
      --webroot-path ${WEBROOT_PATH} \\
      --email ${ACME_EMAIL} \\
      --agree-tos \\
      --non-interactive \\
      --expand \\
      -d ${DOMAIN_NAME}`, { stdio: 'inherit' });
  } else {
    // Способ 2: Standalone challenge (временно запускает веб-сервер на порту 80)
    console.log('🔗 Using standalone challenge...');
    console.log('⚠️  Warning: This will temporarily bind to port 80. Make sure no web server is running.');
    
    execSync(`sudo certbot certonly \\
      --standalone \\
      --email ${ACME_EMAIL} \\
      --agree-tos \\
      --non-interactive \\
      --expand \\
      -d ${DOMAIN_NAME}`, { stdio: 'inherit' });
  }

  // Копируем сертификаты в нашу директорию
  const letsEncryptDir = `/etc/letsencrypt/live/${DOMAIN_NAME}`;
  
  console.log('📋 Copying certificates...');
  
  if (process.platform === 'win32') {
    // Windows команды
    execSync(`copy "${letsEncryptDir}\\fullchain.pem" "${certsDir}\\cert.pem"`, { shell: true, stdio: 'inherit' });
    execSync(`copy "${letsEncryptDir}\\privkey.pem" "${certsDir}\\key.pem"`, { shell: true, stdio: 'inherit' });
    execSync(`copy "${letsEncryptDir}\\chain.pem" "${certsDir}\\ca.pem"`, { shell: true, stdio: 'inherit' });
  } else {
    // Unix команды
    execSync(`sudo cp ${letsEncryptDir}/fullchain.pem ${certsDir}/cert.pem`);
    execSync(`sudo cp ${letsEncryptDir}/privkey.pem ${certsDir}/key.pem`);
    execSync(`sudo cp ${letsEncryptDir}/chain.pem ${certsDir}/ca.pem`);
    
    // Изменяем права доступа
    execSync(`sudo chown $(whoami):$(whoami) ${certsDir}/*.pem`);
    execSync(`chmod 644 ${certsDir}/cert.pem ${certsDir}/ca.pem`);
    execSync(`chmod 600 ${certsDir}/key.pem`);
  }

  // Проверяем валидность сертификата
  console.log('✅ Verifying certificate...');
  const opensslOutput = execSync(`openssl x509 -in ${certsDir}/cert.pem -noout -dates -subject -issuer`).toString();
  console.log(opensslOutput);

  console.log('🎉 Let\'s Encrypt certificates generated successfully!');
  console.log('📋 Certificate files:');
  console.log(`   - ${certsDir}/cert.pem (Certificate)`);
  console.log(`   - ${certsDir}/key.pem (Private Key)`);
  console.log(`   - ${certsDir}/ca.pem (Certificate Chain)`);

} catch (error) {
  console.error('❌ Error generating Let\'s Encrypt certificates:', error.message);
  
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
O = Your Organization
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
