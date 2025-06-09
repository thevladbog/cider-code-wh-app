#!/usr/bin/env node

/**
 * Скрипт для загрузки TLS сертификатов из безопасного хранилища
 * Используется во время сборки приложения
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Получаем переменные окружения
const KEYVAULT_NAME = process.env.KEYVAULT_NAME;
const AWS_REGION = process.env.AWS_REGION;
const LOCAL_CERT_PATH = process.env.LOCAL_CERT_PATH; // Путь к локальным сертификатам
const SECRET_PROVIDER = process.env.SECRET_PROVIDER || 'none'; // 'azure', 'aws', 'vault', 'local', 'letsencrypt', 'none'

console.log('🔐 Loading TLS certificates from secure storage...');
console.log(`📦 Provider: ${SECRET_PROVIDER}`);

// Создаем директорию для сертификатов
const certsDir = path.join(process.cwd(), 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

async function loadFromAzureKeyVault() {
  if (!KEYVAULT_NAME) {
    throw new Error('KEYVAULT_NAME environment variable is required for Azure Key Vault');
  }

  console.log('☁️ Loading certificates from Azure Key Vault...');
  
  try {
    // Загружаем сертификаты из Azure Key Vault
    const cert = execSync(`az keyvault secret show --vault-name "${KEYVAULT_NAME}" --name "tls-cert" --query "value" -o tsv`).toString().trim();
    const key = execSync(`az keyvault secret show --vault-name "${KEYVAULT_NAME}" --name "tls-key" --query "value" -o tsv`).toString().trim();
    const ca = execSync(`az keyvault secret show --vault-name "${KEYVAULT_NAME}" --name "tls-ca" --query "value" -o tsv`).toString().trim();
    
    // Записываем сертификаты в файлы
    fs.writeFileSync(path.join(certsDir, 'cert.pem'), cert);
    fs.writeFileSync(path.join(certsDir, 'key.pem'), key);
    fs.writeFileSync(path.join(certsDir, 'ca.pem'), ca);
    
    console.log('✅ Certificates loaded from Azure Key Vault');
  } catch (error) {
    console.error('❌ Failed to load from Azure Key Vault:', error.message);
    throw error;
  }
}

async function loadFromAWSSecretsManager() {
  if (!AWS_REGION) {
    throw new Error('AWS_REGION environment variable is required for AWS Secrets Manager');
  }

  console.log('☁️ Loading certificates from AWS Secrets Manager...');
  
  try {
    // Загружаем сертификаты из AWS Secrets Manager
    const cert = execSync(`aws secretsmanager get-secret-value --secret-id "prod/tls/cert" --region "${AWS_REGION}" --query "SecretString" --output text`).toString().trim();
    const key = execSync(`aws secretsmanager get-secret-value --secret-id "prod/tls/key" --region "${AWS_REGION}" --query "SecretString" --output text`).toString().trim();
    const ca = execSync(`aws secretsmanager get-secret-value --secret-id "prod/tls/ca" --region "${AWS_REGION}" --query "SecretString" --output text`).toString().trim();
    
    // Записываем сертификаты в файлы
    fs.writeFileSync(path.join(certsDir, 'cert.pem'), cert);
    fs.writeFileSync(path.join(certsDir, 'key.pem'), key);
    fs.writeFileSync(path.join(certsDir, 'ca.pem'), ca);
    
    console.log('✅ Certificates loaded from AWS Secrets Manager');
  } catch (error) {
    console.error('❌ Failed to load from AWS Secrets Manager:', error.message);
    throw error;
  }
}

async function loadFromHashiCorpVault() {
  const VAULT_ADDR = process.env.VAULT_ADDR;
  const VAULT_TOKEN = process.env.VAULT_TOKEN;
  
  if (!VAULT_ADDR || !VAULT_TOKEN) {
    throw new Error('VAULT_ADDR and VAULT_TOKEN environment variables are required for HashiCorp Vault');
  }

  console.log('🏛️ Loading certificates from HashiCorp Vault...');
  
  try {
    // Загружаем сертификаты из HashiCorp Vault
    const cert = execSync(`vault kv get -field=cert secret/tls`).toString().trim();
    const key = execSync(`vault kv get -field=key secret/tls`).toString().trim();
    const ca = execSync(`vault kv get -field=ca secret/tls`).toString().trim();
    
    // Записываем сертификаты в файлы
    fs.writeFileSync(path.join(certsDir, 'cert.pem'), cert);
    fs.writeFileSync(path.join(certsDir, 'key.pem'), key);
    fs.writeFileSync(path.join(certsDir, 'ca.pem'), ca);
    
    console.log('✅ Certificates loaded from HashiCorp Vault');
  } catch (error) {
    console.error('❌ Failed to load from HashiCorp Vault:', error.message);
    throw error;
  }
}

async function loadFromLocalPath() {
  if (!LOCAL_CERT_PATH) {
    throw new Error('LOCAL_CERT_PATH environment variable is required for local certificate loading');
  }

  console.log('📁 Loading certificates from local path...');
  console.log(`📂 Source: ${LOCAL_CERT_PATH}`);

  try {
    const sourceCert = path.join(LOCAL_CERT_PATH, 'cert.pem');
    const sourceKey = path.join(LOCAL_CERT_PATH, 'key.pem');
    const sourceCa = path.join(LOCAL_CERT_PATH, 'ca.pem');

    // Проверяем наличие обязательных файлов
    if (!fs.existsSync(sourceCert)) {
      throw new Error(`Certificate file not found: ${sourceCert}`);
    }
    if (!fs.existsSync(sourceKey)) {
      throw new Error(`Key file not found: ${sourceKey}`);
    }

    // Копируем сертификаты
    fs.copyFileSync(sourceCert, path.join(certsDir, 'cert.pem'));
    fs.copyFileSync(sourceKey, path.join(certsDir, 'key.pem'));
    
    // CA файл опционально
    if (fs.existsSync(sourceCa)) {
      fs.copyFileSync(sourceCa, path.join(certsDir, 'ca.pem'));
    }

    console.log('✅ Certificates loaded from local path');
  } catch (error) {
    console.error('❌ Failed to load from local path:', error.message);
    throw error;
  }
}

async function generateLetsEncryptCertificates() {
  console.log('🔗 Generating Let\'s Encrypt certificates...');
  
  try {
    // Запускаем наш скрипт для Let's Encrypt
    execSync('node scripts/generate-letsencrypt-http.cjs', { stdio: 'inherit' });
    console.log('✅ Let\'s Encrypt certificates generated');
  } catch (error) {
    console.error('❌ Failed to generate Let\'s Encrypt certificates:', error.message);
    throw error;
  }
}

async function generateFallbackCertificates() {
  console.log('⚠️  No secure storage configured, generating fallback certificates...');
  
  try {
    // Запускаем скрипт для генерации development сертификатов
    execSync('node scripts/generate-dev-certs.cjs', { stdio: 'inherit' });
    console.log('✅ Fallback certificates generated');
  } catch (error) {
    console.error('❌ Failed to generate fallback certificates:', error.message);
    throw error;
  }
}

async function main() {
  try {
    switch (SECRET_PROVIDER) {
      case 'azure':
        await loadFromAzureKeyVault();
        break;
      case 'aws':
        await loadFromAWSSecretsManager();
        break;
      case 'vault':
        await loadFromHashiCorpVault();
        break;
      case 'local':
        await loadFromLocalPath();
        break;
      case 'letsencrypt':
        await generateLetsEncryptCertificates();
        break;
      default:
        await generateFallbackCertificates();
        break;
    }
    
    // Проверяем загруженные сертификаты
    const certFile = path.join(certsDir, 'cert.pem');
    const keyFile = path.join(certsDir, 'key.pem');
    
    if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
      console.log('📋 Certificate information:');
      const opensslOutput = execSync(`openssl x509 -in ${certFile} -noout -dates -subject -issuer`).toString();
      console.log(opensslOutput);
      
      // Устанавливаем правильные права доступа (только для Unix-подобных систем)
      if (process.platform !== 'win32') {
        execSync(`chmod 644 ${certFile}`);
        execSync(`chmod 600 ${keyFile}`);
        if (fs.existsSync(path.join(certsDir, 'ca.pem'))) {
          execSync(`chmod 644 ${path.join(certsDir, 'ca.pem')}`);
        }
      }
      
      console.log('🎉 TLS certificates ready for build!');
    } else {
      throw new Error('Certificate files were not created successfully');
    }
    
  } catch (error) {
    console.error('❌ Failed to load certificates:', error.message);
    process.exit(1);
  }
}

main();
