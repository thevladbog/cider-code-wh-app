import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import * as forge from 'node-forge';
import { getCertsPaths, reloadHttpsAgent } from '../config/tls.config';
import { updateCertificateInfo } from '../config/tls-status';

/**
 * Интерфейс информации о сертификате
 */
export interface CertificateInfo {
  valid: boolean;
  expiration: Date | null;
  issuer: string | null;
  domain: string | null;
  notBefore?: Date | null;
  notAfter?: Date | null;
  serialNumber?: string | null;
  subjectAltName?: string[] | null;
  alternativeValidation?: boolean; // Флаг, указывающий, что использовался альтернативный метод проверки
}

/**
 * Проверка валидности сертификата
 * @param certPath Путь к сертификату
 * @returns Информация о сертификате
 */
export function validateCertificate(certPath: string): CertificateInfo {
  try {
    // Проверяем наличие файла сертификата
    if (!fs.existsSync(certPath)) {
      console.warn(`[CERT] Certificate file not found at path: ${certPath}`);
      return {
        valid: false,
        expiration: null,
        issuer: null,
        domain: null,
      };
    } 
    
    // Загружаем сертификат
    console.log(`[CERT] Loading certificate from: ${certPath}`);
    const certData = fs.readFileSync(certPath, 'utf-8');
    
    // Проверяем, что данные сертификата содержат правильный формат PEM
    if (!certData.includes('-----BEGIN CERTIFICATE-----')) {
      console.error('[CERT] Invalid PEM format: Missing BEGIN CERTIFICATE marker');
      return {
        valid: false,
        expiration: null,
        issuer: null,
        domain: null,
      };
    }

    // Используем библиотеку node-forge для разбора сертификата
    try {
      // Оборачиваем в try/catch специально для отлавливания ошибок с алгоритмом ключа
      let certObj;
      try {
        certObj = forge.pki.certificateFromPem(certData);
      } catch (err) {
        // Если ошибка связана с типом ключа
        if (err.message && (
            err.message.includes('Cannot read public key') ||
            err.message.includes('OID is not RSA') ||
            err.message.includes('Unsupported public key algorithm'))) {
          
          console.warn('[CERT] Certificate uses non-RSA key algorithm, trying fallback validation method');
          
          // Используем OpenSSL для базовой проверки сертификата (если доступен)
          try {
            // execSync уже импортирован выше
            
            // Создаем временный файл для анализа
            const tempCertPath = certPath;
            
            // Получаем информацию о субъекте
            const subjectOutput = execSync(`openssl x509 -in "${tempCertPath}" -noout -subject -nameopt RFC2253`, 
              { encoding: 'utf-8' }).trim();
            
            // Получаем информацию об издателе
            const issuerOutput = execSync(`openssl x509 -in "${tempCertPath}" -noout -issuer -nameopt RFC2253`, 
              { encoding: 'utf-8' }).trim();
            
            // Получаем даты
            const datesOutput = execSync(`openssl x509 -in "${tempCertPath}" -noout -dates`, 
              { encoding: 'utf-8' }).trim();
            
            console.log('[CERT] OpenSSL Subject output:', subjectOutput);
            console.log('[CERT] OpenSSL Issuer output:', issuerOutput);
            console.log('[CERT] OpenSSL Dates output:', datesOutput);
            
            // Извлекаем CN из вывода OpenSSL
            let subject = null;
            const cnMatch = subjectOutput.match(/CN=([^,]+)/i);
            if (cnMatch && cnMatch[1]) {
              subject = cnMatch[1];
              console.log(`[CERT] Found CN from OpenSSL: ${subject}`);
            }
            
            // Извлекаем информацию о издателе
            let issuer = null;
            const issuerCnMatch = issuerOutput.match(/CN=([^,]+)/i);
            if (issuerCnMatch && issuerCnMatch[1]) {
              issuer = issuerCnMatch[1];
              console.log(`[CERT] Found issuer from OpenSSL: ${issuer}`);
            }
            
            // Извлекаем даты валидности
            const notBeforeMatch = datesOutput.match(/notBefore=(.+)/i);
            const notAfterMatch = datesOutput.match(/notAfter=(.+)/i);
            
            const notBefore = notBeforeMatch ? new Date(notBeforeMatch[1]) : null;
            const notAfter = notAfterMatch ? new Date(notAfterMatch[1]) : null;
            
            // Проверяем валидность дат
            const now = new Date();
            const isExpired = notAfter ? now > notAfter : false;
            const isNotYetValid = notBefore ? now < notBefore : false;
            
            // Возвращаем информацию о сертификате, полученную через OpenSSL
            return {
              valid: !isExpired && !isNotYetValid && subject !== null,
              expiration: notAfter,
              issuer: issuer,
              domain: subject,
              notBefore: notBefore,
              notAfter: notAfter,
              serialNumber: null,
              subjectAltName: null,
              alternativeValidation: true  // Флаг, что использовался альтернативный метод проверки
            };
          } catch (opensslErr) {
            console.error('[CERT] OpenSSL validation failed:', opensslErr);
            throw new Error(`Certificate uses unsupported key algorithm. Original error: ${err.message}`);
          }
        } else {
          // Если это другая ошибка, передаем ее дальше
          throw err;
        }
      }
      
      // Получаем информацию о сертификате
      // Попытка получить домен из разных полей сертификата
      let subject = certObj.subject.getField('CN')?.value;
      
      // Если CN отсутствует, пробуем получить из SAN (Subject Alternative Name) или O (Organization)
      if (!subject) {
        // Вывод всех полей субъекта для отладки
        console.log('[CERT] All subject fields:', JSON.stringify(certObj.subject.attributes.map(attr => ({ name: attr.name, value: attr.value }))));
        
        // Пробуем использовать O (Organization)
        subject = certObj.subject.getField('O')?.value;
        
        if (subject) {
          console.log(`[CERT] Using Organization as domain: ${subject}`);
        }
      } else {
        console.log(`[CERT] Subject/Domain from CN: ${subject}`);
      }
      
      const issuer = certObj.issuer.getField('CN')?.value || certObj.issuer.getField('O')?.value;
      console.log(`[CERT] Issuer: ${issuer}`);
      
      const notBefore = new Date(certObj.validity.notBefore);
      const notAfter = new Date(certObj.validity.notAfter);
      const now = new Date();
      console.log(`[CERT] Not Before: ${notBefore.toISOString()}`);
      console.log(`[CERT] Not After: ${notAfter.toISOString()}`);
      console.log(`[CERT] Current Date: ${now.toISOString()}`);

      // Проверяем срок действия
      const isExpired = now > notAfter;
      const isNotYetValid = now < notBefore;
      
      if (isExpired) {
        console.warn('[CERT] Certificate has expired');
      }
      
      if (isNotYetValid) {
        console.warn('[CERT] Certificate is not yet valid');
      }
      
      // Получаем альтернативные имена
      let subjectAltNames: string[] | null = null;
      try {
        const altNamesExt = certObj.getExtension('subjectAltName');
        if (altNamesExt && typeof altNamesExt === 'object' && 'altNames' in altNamesExt) {
          const altNames = (altNamesExt as { altNames: Array<{ value: string }> }).altNames;
          subjectAltNames = altNames.map((an: { value: string }) => an.value);
          console.log(`[CERT] Subject Alternative Names: ${subjectAltNames.join(', ')}`);
        }
      } catch (e) {
        console.warn('[CERT] Error parsing Subject Alternative Names:', e);
      }

      // Возвращаем информацию о сертификате
      return {
        valid: !isExpired && !isNotYetValid,
        expiration: notAfter,
        issuer: issuer || null,
        domain: subject || null,
        notBefore: notBefore,
        notAfter: notAfter,
        serialNumber: certObj.serialNumber || null,
        subjectAltName: subjectAltNames,
      };
    } catch (e) {
      console.error('[CERT] Error parsing certificate with node-forge:', e);
      throw e;
    }
  } catch (error) {
    console.error('[CERT] Error validating certificate:', error);
    return {
      valid: false,
      expiration: null,
      issuer: null,
      domain: null,
    };
  }
}

/**
 * Проверка срока действия сертификата
 * @returns true если сертификат скоро истекает (менее 30 дней)
 */
export function isCertificateExpiringSoon(certInfo: CertificateInfo, daysThreshold = 30): boolean {
  if (!certInfo.valid || !certInfo.expiration) {
    return false;
  }

  const now = new Date();
  const expiration = new Date(certInfo.expiration);
  const diffDays = Math.floor((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return diffDays <= daysThreshold;
}

/**
 * Обновление сертификатов из указанного источника
 * @param sourcePath Путь к директории с сертификатами
 * @param reloadAgent Перезагрузить HTTPS агент после обновления
 * @returns true если обновление прошло успешно
 */
export async function updateCertificates(sourcePath: string, reloadAgent = true): Promise<boolean> {
  try {
    const { certsDir, certFile, keyFile, caFile } = getCertsPaths();

    // Проверяем наличие директории для сертификатов и создаем, если нет
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }

    // Проверяем наличие исходных сертификатов
    const sourceCertFile = path.join(sourcePath, 'cert.pem');
    const sourceKeyFile = path.join(sourcePath, 'key.pem');
    const sourceCaFile = path.join(sourcePath, 'ca.pem');

    if (!fs.existsSync(sourceCertFile) || !fs.existsSync(sourceKeyFile)) {
      console.error('[CERT] Source certificate files not found.');
      return false;
    }

    // Копируем сертификаты
    fs.copyFileSync(sourceCertFile, certFile);
    fs.copyFileSync(sourceKeyFile, keyFile);

    // Копируем CA-сертификат, если он существует
    if (fs.existsSync(sourceCaFile)) {
      fs.copyFileSync(sourceCaFile, caFile);
    }

    // Проверяем и обновляем информацию о сертификате
    const certInfo = validateCertificate(certFile);
    updateCertificateInfo(certInfo.valid, certInfo.expiration, certInfo.issuer, certInfo.domain);

    console.log('[CERT] Certificates successfully updated.');
    // Перезагружаем HTTPS агент, если требуется
    if (reloadAgent) {
      try {
        reloadHttpsAgent();
        console.log('[CERT] HTTPS agent reloaded with new certificates.');
      } catch (reloadError) {
        console.warn('[CERT] Failed to reload HTTPS agent:', reloadError);
        // Продолжаем выполнение, так как сертификаты были обновлены успешно
      }
    }

    return true;
  } catch (error) {
    console.error('[CERT] Error updating certificates:', error);
    return false;
  }
}

/**
 * Проверка и обновление сертификатов при необходимости
 * @param autoUpdate Автоматически обновлять сертификаты, если они скоро истекают
 * @param updateSource Путь к директории с новыми сертификатами
 */
export async function checkAndUpdateCertificates(
  autoUpdate = false,
  updateSource?: string
): Promise<CertificateInfo> {
  const { certFile } = getCertsPaths();

  // Проверяем текущий сертификат
  const certInfo = validateCertificate(certFile);

  // Обновляем информацию о сертификате в статусе TLS
  updateCertificateInfo(certInfo.valid, certInfo.expiration, certInfo.issuer, certInfo.domain);

  // Если сертификат скоро истекает и указан источник для обновления
  if (autoUpdate && updateSource && isCertificateExpiringSoon(certInfo)) {
    console.log('[CERT] Certificate is expiring soon, attempting auto-update...');
    const updated = await updateCertificates(updateSource);

    if (updated) {
      // Повторная проверка после обновления
      const updatedCertInfo = validateCertificate(certFile);
      updateCertificateInfo(
        updatedCertInfo.valid,
        updatedCertInfo.expiration,
        updatedCertInfo.issuer,
        updatedCertInfo.domain
      );
      return updatedCertInfo;
    }
  }

  return certInfo;
}

/**
 * Запуск периодической проверки сертификатов
 * @param intervalMs Интервал проверки в миллисекундах (по умолчанию 1 день)
 * @param autoUpdate Автоматически обновлять сертификаты, если они скоро истекают
 * @param updateSource Путь к директории с новыми сертификатами
 */
export function startCertificateMonitoring(
  intervalMs: number = 24 * 60 * 60 * 1000,
  autoUpdate = false,
  updateSource?: string
): NodeJS.Timeout {
  // Выполняем первую проверку
  checkAndUpdateCertificates(autoUpdate, updateSource);

  // Настраиваем периодическую проверку
  return setInterval(() => {
    checkAndUpdateCertificates(autoUpdate, updateSource);
  }, intervalMs);
}

/**
 * Получить источник сертификата
 */
export function getCertificateSource(): string {
  const provider = process.env.SECRET_PROVIDER || 'self-signed';

  switch (provider) {
    case 'azure':
      return 'Azure Key Vault';
    case 'aws':
      return 'AWS Secrets Manager';
    case 'vault':
      return 'HashiCorp Vault';
    case 'local':
      return 'Local Certificate Store';
    case 'letsencrypt':
      return "Let's Encrypt";
    default:
      return 'Self-signed (Development)';
  }
}

/**
 * Проверить, является ли сертификат продакшн-готовым
 */
export function isProductionReadyCertificate(certInfo: CertificateInfo): boolean {
  if (!certInfo.valid) return false;

  // Проверяем, что это не самоподписанный сертификат
  const isSelfSigned = certInfo.issuer === certInfo.domain;
  if (isSelfSigned) return false;

  // Проверяем известные продакшн CA
  const productionCAs = [
    "Let's Encrypt",
    'DigiCert',
    'GlobalSign',
    'Comodo',
    'GeoTrust',
    'Symantec',
    'Thawte',
  ];

  return productionCAs.some(ca => certInfo.issuer?.toLowerCase().includes(ca.toLowerCase()));
}
