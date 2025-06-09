#!/usr/bin/env node

/**
 * Скрипт автоматического обновления Let's Encrypt сертификатов
 * Предназначен для запуска по расписанию (cron/Windows Task Scheduler)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Получаем переменные окружения
const DOMAIN_NAME = process.env.DOMAIN_NAME;
const ACME_EMAIL = process.env.ACME_EMAIL;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CERT_PATH = process.env.CERT_PATH || path.join(process.cwd(), 'certs');
const WEBROOT_PATH = process.env.WEBROOT_PATH || '/var/www/html';
const DAYS_BEFORE_EXPIRY = parseInt(process.env.DAYS_BEFORE_EXPIRY || '30');

// Настройки уведомлений
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Slack/Teams webhook для уведомлений
const EMAIL_NOTIFICATION = process.env.EMAIL_NOTIFICATION; // Email для уведомлений

console.log('🔄 Starting certificate renewal check...');
console.log(`📅 Check interval: ${DAYS_BEFORE_EXPIRY} days before expiry`);

function sendNotification(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${isError ? 'ERROR' : 'INFO'}: ${message}`;
  
  console.log(logMessage);
  
  // Записываем в лог-файл
  const logFile = path.join(CERT_PATH, 'cert-renewal.log');
  fs.appendFileSync(logFile, logMessage + '\n');
  
  // Отправляем уведомление в webhook (Slack/Teams)
  if (WEBHOOK_URL) {
    try {
      const payload = {
        text: `🔐 Certificate Renewal: ${message}`,
        color: isError ? '#ff0000' : '#00ff00'
      };
      
      execSync(`curl -X POST -H "Content-Type: application/json" -d '${JSON.stringify(payload)}' "${WEBHOOK_URL}"`, 
        { stdio: 'pipe' });
    } catch (webhookError) {
      console.error('Failed to send webhook notification:', webhookError.message);
    }
  }
  
  // Отправляем email уведомление
  if (EMAIL_NOTIFICATION && isError) {
    try {
      const subject = `Certificate Renewal ${isError ? 'Failed' : 'Success'}: ${DOMAIN_NAME}`;
      execSync(`echo "${message}" | mail -s "${subject}" ${EMAIL_NOTIFICATION}`, { stdio: 'pipe' });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError.message);
    }
  }
}

function checkCertificateExpiry(certFile) {
  try {
    if (!fs.existsSync(certFile)) {
      return { needsRenewal: true, reason: 'Certificate file not found' };
    }
    
    // Получаем информацию о сертификате
    const opensslOutput = execSync(`openssl x509 -in ${certFile} -noout -dates`).toString();
    const notAfterLine = opensslOutput.split('\n').find(line => line.startsWith('notAfter='));
    
    if (!notAfterLine) {
      return { needsRenewal: true, reason: 'Cannot parse certificate expiry date' };
    }
    
    const expiryDate = new Date(notAfterLine.replace('notAfter=', ''));
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Certificate expires in ${daysUntilExpiry} days (${expiryDate.toISOString()})`);
    
    if (daysUntilExpiry <= DAYS_BEFORE_EXPIRY) {
      return { 
        needsRenewal: true, 
        reason: `Certificate expires in ${daysUntilExpiry} days`,
        daysUntilExpiry 
      };
    }
    
    return { 
      needsRenewal: false, 
      reason: `Certificate valid for ${daysUntilExpiry} more days`,
      daysUntilExpiry 
    };
    
  } catch (error) {
    return { needsRenewal: true, reason: `Error checking certificate: ${error.message}` };
  }
}

function renewCertificate() {
  try {
    console.log('🔄 Renewing certificate...');
    
    // Пытаемся обновить сертификат
    if (fs.existsSync(WEBROOT_PATH)) {
      console.log('🌐 Using webroot renewal...');
      execSync(`sudo certbot renew --webroot --webroot-path ${WEBROOT_PATH} --quiet`, { stdio: 'inherit' });
    } else {
      console.log('🔗 Using standalone renewal...');
      execSync(`sudo certbot renew --standalone --quiet`, { stdio: 'inherit' });
    }
    
    // Копируем обновленные сертификаты
    const letsEncryptDir = `/etc/letsencrypt/live/${DOMAIN_NAME}`;
    
    if (process.platform === 'win32') {
      execSync(`copy "${letsEncryptDir}\\fullchain.pem" "${CERT_PATH}\\cert.pem"`, { shell: true });
      execSync(`copy "${letsEncryptDir}\\privkey.pem" "${CERT_PATH}\\key.pem"`, { shell: true });
      execSync(`copy "${letsEncryptDir}\\chain.pem" "${CERT_PATH}\\ca.pem"`, { shell: true });
    } else {
      execSync(`sudo cp ${letsEncryptDir}/fullchain.pem ${CERT_PATH}/cert.pem`);
      execSync(`sudo cp ${letsEncryptDir}/privkey.pem ${CERT_PATH}/key.pem`);
      execSync(`sudo cp ${letsEncryptDir}/chain.pem ${CERT_PATH}/ca.pem`);
      
      // Устанавливаем права доступа
      execSync(`sudo chown $(whoami):$(whoami) ${CERT_PATH}/*.pem`);
      execSync(`chmod 644 ${CERT_PATH}/cert.pem ${CERT_PATH}/ca.pem`);
      execSync(`chmod 600 ${CERT_PATH}/key.pem`);
    }
    
    sendNotification(`Certificate successfully renewed for ${DOMAIN_NAME}`);
    return true;
    
  } catch (error) {
    sendNotification(`Failed to renew certificate for ${DOMAIN_NAME}: ${error.message}`, true);
    return false;
  }
}

function restartServices() {
  // Список сервисов для перезапуска после обновления сертификатов
  const services = process.env.SERVICES_TO_RESTART?.split(',') || [];
  
  if (services.length === 0) {
    console.log('ℹ️  No services to restart specified');
    return;
  }
  
  console.log('🔄 Restarting services...');
  
  for (const service of services) {
    try {
      if (process.platform === 'win32') {
        // Windows Service restart
        execSync(`net stop "${service.trim()}" && net start "${service.trim()}"`, { stdio: 'inherit' });
      } else {
        // Linux systemd service restart
        execSync(`sudo systemctl restart ${service.trim()}`, { stdio: 'inherit' });
      }
      
      console.log(`✅ Restarted service: ${service.trim()}`);
    } catch (error) {
      sendNotification(`Failed to restart service ${service.trim()}: ${error.message}`, true);
    }
  }
}

// Основная логика
async function main() {
  try {
    if (!DOMAIN_NAME) {
      sendNotification('DOMAIN_NAME environment variable is not set', true);
      process.exit(1);
    }
    
    const certFile = path.join(CERT_PATH, 'cert.pem');
    const checkResult = checkCertificateExpiry(certFile);
    
    if (!checkResult.needsRenewal) {
      console.log(`✅ ${checkResult.reason}`);
      process.exit(0);
    }
    
    console.log(`⚠️  ${checkResult.reason}`);
    
    // Создаем бэкап текущих сертификатов
    const backupDir = path.join(CERT_PATH, 'backup', new Date().toISOString().split('T')[0]);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    ['cert.pem', 'key.pem', 'ca.pem'].forEach(file => {
      const source = path.join(CERT_PATH, file);
      const backup = path.join(backupDir, file);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, backup);
      }
    });
    
    console.log(`📦 Backup created in: ${backupDir}`);
    
    // Обновляем сертификат
    const renewed = renewCertificate();
    
    if (renewed) {
      // Перезапускаем сервисы, если необходимо
      restartServices();
      
      // Проверяем новый сертификат
      const newCheckResult = checkCertificateExpiry(certFile);
      console.log(`✅ New certificate: ${newCheckResult.reason}`);
    }
    
  } catch (error) {
    sendNotification(`Certificate renewal script failed: ${error.message}`, true);
    process.exit(1);
  }
}

main();
