import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { app } from 'electron';
import { getEnvironment } from './environment';

// Интерфейс для сертификатов
export interface TlsConfig {
  certPath: string;
  keyPath: string;
  caPath: string;
  isValid: boolean;
  useDefault: boolean;
}

// Пути к директориям для сертификатов
export function getCertsPaths() {
  // В режиме разработки используем корневую директорию проекта
  if (process.env.NODE_ENV === 'development') {
    return {
      certsDir: path.join(process.cwd(), 'certs'),
      caFile: path.join(process.cwd(), 'certs', 'ca.pem'),
      certFile: path.join(process.cwd(), 'certs', 'cert.pem'),
      keyFile: path.join(process.cwd(), 'certs', 'key.pem'),
    };
  }
  
  // В режиме продакшена используем директорию данных приложения
  return {
    certsDir: path.join(app.getPath('userData'), 'certs'),
    caFile: path.join(app.getPath('userData'), 'certs', 'ca.pem'),
    certFile: path.join(app.getPath('userData'), 'certs', 'cert.pem'),
    keyFile: path.join(app.getPath('userData'), 'certs', 'key.pem'),
  };
}

// Получение конфигурации TLS
export function getTlsConfig(): TlsConfig {
  const { certsDir, caFile, certFile, keyFile } = getCertsPaths();
  
  // Проверяем наличие директории для сертификатов и создаем, если нет
  if (!fs.existsSync(certsDir)) {
    try {
      fs.mkdirSync(certsDir, { recursive: true });
    } catch (error) {
      console.error('[TLS] Error creating certs directory:', error);
    }
  }

  // Проверяем наличие сертификатов
  const hasCert = fs.existsSync(certFile);
  const hasKey = fs.existsSync(keyFile);
  const hasCa = fs.existsSync(caFile);
  
  // Если все сертификаты на месте, возвращаем валидную конфигурацию
  if (hasCert && hasKey) {
    return {
      certPath: certFile,
      keyPath: keyFile,
      caPath: hasCa ? caFile : '',
      isValid: true,
      useDefault: false,
    };
  }
  
  // В противном случае используем системные сертификаты
  console.log('[TLS] Custom certificates not found. Using system certificates');
  return {
    certPath: '',
    keyPath: '',
    caPath: '',
    isValid: false,
    useDefault: true,
  };
}

// Храним глобальную ссылку на HTTPS агент для возможности его перезагрузки
let httpsAgent: https.Agent | null = null;

// Создаем HTTPS агент для запросов
export function createHttpsAgent() {
  // Если агент уже создан, возвращаем его
  if (httpsAgent) {
    return httpsAgent;
  }
  
  const tlsConfig = getTlsConfig();
  
  // Если у нас есть свои сертификаты
  if (tlsConfig.isValid && !tlsConfig.useDefault) {
    const options: https.AgentOptions = {
      rejectUnauthorized: true, // Всегда проверять сертификаты
    };
    
    // Добавляем наши сертификаты
    try {
      if (fs.existsSync(tlsConfig.certPath)) {
        options.cert = fs.readFileSync(tlsConfig.certPath);
      }
      
      if (fs.existsSync(tlsConfig.keyPath)) {
        options.key = fs.readFileSync(tlsConfig.keyPath);
      }
      
      if (tlsConfig.caPath && fs.existsSync(tlsConfig.caPath)) {
        options.ca = fs.readFileSync(tlsConfig.caPath);
      }
      
      httpsAgent = new https.Agent(options);
      return httpsAgent;
    } catch (error) {
      console.error('[TLS] Error loading certificates:', error);
    }
  }
  
  // По умолчанию используем стандартный агент
  httpsAgent = new https.Agent({
    rejectUnauthorized: true,
  });
  return httpsAgent;
};

// Функция для перезагрузки HTTPS агента после обновления сертификатов
export function reloadHttpsAgent(): https.Agent {
  // Уничтожаем старый агент и его соединения
  if (httpsAgent) {
    console.log('[TLS] Reloading HTTPS agent with new certificates');
    httpsAgent.destroy();
    httpsAgent = null;
  }
  
  // Создаем новый агент с обновленными сертификатами
  return createHttpsAgent();
}

// Помощник для проверки домена в сертификате
export function isCertValidForDomain(targetDomain: string): boolean {
  const tlsConfig = getTlsConfig();
  
  if (!tlsConfig.isValid || !fs.existsSync(tlsConfig.certPath)) {
    return false;
  }
  
  try {
    // Здесь нужна будет библиотека для проверки сертификата
    // Это упрощенная проверка даты
    const certContent = fs.readFileSync(tlsConfig.certPath, 'utf-8');
    const dateMatches = certContent.match(/Not After\s*:\s*([^\n]+)/);
    
    if (dateMatches && dateMatches[1]) {
      const expiryDate = new Date(dateMatches[1]);
      const now = new Date();
      
      return expiryDate > now;
    }
    
    return false;
  } catch (error) {
    console.error('[TLS] Error checking certificate validity:', error);
    return false;
  }
}

// Настройка обработки ошибок сертификатов
export function setupCertificateVerification() {
  const env = getEnvironment();
  const apiDomain = new URL(env.apiBaseUrl).hostname;
  
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    const urlDomain = new URL(url).hostname;
    
    // Если это домен нашего API или другой доверенный домен
    if (urlDomain === apiDomain) {
      // В режиме разработки можно позволить самоподписанные сертификаты
      if (env.mode === 'development') {
        event.preventDefault();
        callback(true);
        console.log(`[TLS] Accepted certificate for ${urlDomain} in development mode`);
        return;
      }
      
      // В продакшене нужно быть осторожнее
      // Здесь можно добавить дополнительные проверки сертификата
    }
    
    // Для остальных случаев - стандартное поведение
    callback(false);
  });
}

// Функция для загрузки Let's Encrypt сертификатов из ACME сервера
// Это упрощенная реализация, для полноценной работы потребуется ACME клиент
export async function fetchLetsEncryptCertificates(domain: string): Promise<boolean> {
  console.log(`[TLS] Attempting to fetch Let's Encrypt certificates for ${domain}`);
  
  // Для реальной реализации нужно использовать ACME клиент, например 'acme-client'
  // Здесь мы только имитируем успешное получение сертификатов
  const { certFile, keyFile } = getCertsPaths();
  
  // В реальном приложении здесь будет код для получения сертификатов через ACME протокол
  // Для полной реализации рекомендуется использовать библиотеку acme-client
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Это просто заглушка для примера
      resolve(fs.existsSync(certFile) && fs.existsSync(keyFile));
    }, 1000);
  });
}
