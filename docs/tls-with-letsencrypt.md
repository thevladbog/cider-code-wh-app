# Настройка TLS для обмена с бэкендом

## Общая информация

В этом проекте реализована поддержка безопасного обмена данными с бэкендом с использованием TLS (Transport Layer Security). Это обеспечивает шифрование данных при передаче и защиту от перехвата данных.

## Структура реализации

Реализация TLS состоит из следующих компонентов:

1. **tls.config.ts** - настройка TLS и работа с сертификатами
2. **secure-fetch.ts** - безопасные HTTP запросы с использованием TLS
3. **tls-status.ts** - отслеживание статуса TLS соединений
4. **ConnectionStatus.tsx** - компонент React для отображения статуса TLS

## Использование Let's Encrypt сертификатов

Приложение поддерживает использование бесплатных сертификатов Let's Encrypt. Для получения и использования сертификатов выполните следующие шаги:

### 1. Установите Certbot на сервере

```bash
sudo apt-get update
sudo apt-get install certbot
```

### 2. Получите сертификаты для вашего домена

```bash
sudo certbot certonly --standalone -d your-domain.com
```

### 3. Скопируйте сертификаты в директорию приложения

```bash
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./certs/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./certs/key.pem
```

### 4. Автоматическое обновление сертификатов

#### 4.1. Локальное автоматическое обновление (через cron)

Установите скрипт обновления в cron:

```bash
sudo crontab -e
```

Добавьте строку:

```
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /path/to/app/certs/cert.pem && cp /etc/letsencrypt/live/your-domain.com/privkey.pem /path/to/app/certs/key.pem
```

#### 4.2. Автоматическое обновление через CI/CD (GitHub Actions)

Для автоматического обновления сертификатов через GitHub Actions:

1. Настройте секрет `DOMAIN_NAME` в настройках репозитория на GitHub (Settings -> Secrets)
2. Добавьте следующие настройки доступа для Actions:
   - Разрешение на обновление содержимого репозитория
   - Доступ к секретам для получения имени домена

GitHub Actions будет автоматически запускать процесс обновления сертификатов еженедельно и при необходимости обновлять их в репозитории.

#### 4.3. Обновление с использованием скрипта

Вы также можете запустить обновление сертификатов вручную с помощью скрипта:

```bash
node scripts/cert-update.js your-domain.com
```

Этот скрипт выполняет:
- Копирование сертификатов Let's Encrypt в директорию приложения
- Проверку валидности сертификатов
- Обновление статуса TLS в приложении

## Настройка для разработки

Для локальной разработки можно использовать самоподписанные сертификаты:

```bash
openssl req -x509 -newkey rsa:2048 -keyout ./certs/key.pem -out ./certs/cert.pem -days 365 -nodes
```

## Проверка статуса TLS

Для проверки статуса TLS соединения добавьте компонент `ConnectionStatus` в ваше приложение:

```tsx
import ConnectionStatus from './components/ConnectionStatus';

function App() {
  return (
    <div className="app">
      {/* Остальные компоненты приложения */}
      <ConnectionStatus />
    </div>
  );
}
```

## Интеграция с cert-manager

Приложение включает встроенный модуль `cert-manager`, который обеспечивает:

- Валидацию сертификатов
- Проверку сроков истечения 
- Автоматическое обновление сертификатов
- Мониторинг состояния сертификатов

### Пример использования в коде

```typescript
import { 
  validateCertificate, 
  isCertificateExpiringSoon, 
  updateCertificates, 
  startCertificateMonitoring 
} from './utils/cert-manager';

// Запустить периодическую проверку сертификатов (каждые 24 часа)
// с автоматическим обновлением из указанной директории
startCertificateMonitoring(
  24 * 60 * 60 * 1000, 
  true,  // autoUpdate = true
  '/path/to/new/certs' 
);

// Ручная проверка и обновление сертификатов
async function checkAndUpdateCerts() {
  const certInfo = validateCertificate('/path/to/cert.pem');
  
  if (!certInfo.valid || isCertificateExpiringSoon(certInfo, 14)) {
    await updateCertificates('/path/to/new/certs');
    // HTTPS-агент будет автоматически перезагружен
  }
}
```

## Перезагрузка HTTPS-агента

При обновлении сертификатов HTTPS-агент автоматически перезагружается, чтобы использовать новые сертификаты без необходимости перезапуска приложения. Это делается с помощью функции `reloadHttpsAgent()`.

Вы можете также вручную перезагрузить HTTPS-агент:

```typescript
import { reloadHttpsAgent } from '../config/tls.config';

// Перезагрузить HTTPS-агент с новыми сертификатами
const newAgent = reloadHttpsAgent();
```

## Отладка TLS

Для отладки TLS соединений используйте консоль разработчика (F12) и смотрите сообщения с префиксом `[TLS]` для получения информации о состоянии TLS соединений.

Для отладки сертификатов используйте сообщения с префиксом `[CERT]`.
