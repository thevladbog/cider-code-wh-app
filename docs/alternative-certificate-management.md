# Альтернативные способы управления TLS сертификатами

## Обзор

Данный документ описывает способы выпуска и управления TLS сертификатами без использования AWS, Cloudflare и других облачных провайдеров. Все методы являются самостоятельными и могут быть реализованы на собственной инфраструктуре.

## Способы выпуска сертификатов

### 1. Let's Encrypt с HTTP-01 Challenge

**Преимущества:**
- Бесплатные сертификаты
- Автоматическое обновление
- Доверенный CA

**Требования:**
- Домен должен быть доступен из интернета
- Порт 80 должен быть открыт
- Веб-сервер или возможность запуска временного сервера

**Установка и использование:**

```bash
# 1. Установка Certbot
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot

# CentOS/RHEL
sudo yum install certbot

# macOS
brew install certbot

# 2. Получение сертификата (standalone)
sudo certbot certonly --standalone -d yourdomain.com

# 3. Получение сертификата (webroot)
sudo certbot certonly --webroot -w /var/www/html -d yourdomain.com

# 4. Использование нашего скрипта
DOMAIN_NAME=yourdomain.com ACME_EMAIL=admin@yourdomain.com node scripts/generate-letsencrypt-http.cjs
```

### 2. Самоподписанные сертификаты

**Преимущества:**
- Полный контроль
- Работают офлайн
- Бесплатные

**Недостатки:**
- Браузеры показывают предупреждения
- Не подходят для продакшена

**Использование:**

```bash
# Генерация с помощью существующего скрипта
DOMAIN_NAME=yourdomain.com node scripts/generate-dev-certs.cjs

# Ручная генерация
openssl genrsa -out key.pem 2048
openssl req -new -x509 -key key.pem -out cert.pem -days 365
```

### 3. Корпоративный CA (Certificate Authority)

**Преимущества:**
- Полный контроль над сертификатами
- Возможность выпуска множества сертификатов
- Настройка доверия в корпоративной сети

**Создание корпоративного CA:**

```bash
# 1. Создание корневого CA
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -key ca-key.pem -out ca-cert.pem -days 3650

# 2. Создание CSR для сервера
openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server.csr

# 3. Подпись сертификата CA
openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -days 365
```

## Автоматизация обновления сертификатов

### 1. Настройка cron (Linux/macOS)

```bash
# Редактирование crontab
sudo crontab -e

# Добавить строку для проверки каждый день в 2:00
0 2 * * * /usr/bin/node /path/to/your/app/scripts/renew-certificates.cjs

# Или каждую неделю
0 2 * * 0 /usr/bin/node /path/to/your/app/scripts/renew-certificates.cjs
```

### 2. Настройка Task Scheduler (Windows)

```powershell
# Создание задачи через PowerShell
$action = New-ScheduledTaskAction -Execute "node" -Argument "C:\path\to\your\app\scripts\renew-certificates.cjs"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Certificate Renewal" -Action $action -Trigger $trigger -Settings $settings
```

### 3. Использование нашего скрипта обновления

```bash
# Настройка переменных окружения
export DOMAIN_NAME="yourdomain.com"
export ACME_EMAIL="admin@yourdomain.com"
export CERT_PATH="/path/to/certs"
export DAYS_BEFORE_EXPIRY="30"
export WEBHOOK_URL="https://hooks.slack.com/your/webhook"
export SERVICES_TO_RESTART="nginx,apache2"

# Запуск проверки и обновления
node scripts/renew-certificates.cjs
```

## Интеграция с приложением

### 1. Автоматическая загрузка новых сертификатов

Обновите `scripts/load-certificates.cjs` для поддержки локальных сертификатов:

```javascript
// Добавить новый case для локальных сертификатов
case 'local':
  await loadFromLocalPath();
  break;

async function loadFromLocalPath() {
  const localCertPath = process.env.LOCAL_CERT_PATH || '/etc/ssl/certs/app';
  // Логика копирования сертификатов из локального пути
}
```

### 2. Мониторинг состояния сертификатов

Используйте существующий `ConnectionStatus` компонент для отображения информации о сертификатах:

```typescript
// В cert-manager.ts
export function getCertificateSource(): string {
  if (process.env.SECRET_PROVIDER === 'local') {
    return 'Local Let\'s Encrypt';
  }
  return 'Self-signed (Development)';
}
```

## Безопасность и лучшие практики

### 1. Защита приватных ключей

```bash
# Установка правильных прав доступа
chmod 600 /path/to/private/key.pem
chown root:ssl-cert /path/to/private/key.pem

# Использование отдельного пользователя для сертификатов
sudo useradd -r -s /bin/false certmanager
sudo chown certmanager:certmanager /path/to/certs/
```

### 2. Бэкапы сертификатов

```bash
# Автоматическое создание бэкапов
#!/bin/bash
BACKUP_DIR="/backup/certificates/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR
cp /path/to/certs/*.pem $BACKUP_DIR/
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
```

### 3. Ротация сертификатов

- Настройте автоматическое обновление за 30 дней до истечения
- Ведите логи всех операций с сертификатами
- Уведомляйте администраторов о проблемах с обновлением

## Troubleshooting

### Проблема: Certbot не может привязаться к порту 80

**Решение:**
```bash
# Остановить веб-сервер временно
sudo systemctl stop nginx
sudo certbot certonly --standalone -d yourdomain.com
sudo systemctl start nginx
```

### Проблема: Домен недоступен для HTTP challenge

**Решение:**
- Используйте DNS-01 challenge с ручным управлением DNS
- Настройте проксирование HTTP challenge на другой сервер
- Используйте webroot challenge вместо standalone

### Проблема: Сертификаты не обновляются автоматически

**Решение:**
```bash
# Проверить статус cron
sudo systemctl status cron

# Проверить логи
tail -f /var/log/syslog | grep cron

# Тестировать обновление вручную
sudo certbot renew --dry-run
```

## Примеры конфигураций

### Nginx с Let's Encrypt

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certs/cert.pem;
    ssl_certificate_key /path/to/certs/key.pem;
    
    # Остальная конфигурация...
}
```

### Apache с Let's Encrypt

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/html
    
    # Разрешить challenge
    Alias /.well-known/acme-challenge/ /var/www/html/.well-known/acme-challenge/
    
    # Перенаправление на HTTPS
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/.well-known/acme-challenge/
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /path/to/certs/cert.pem
    SSLCertificateKeyFile /path/to/certs/key.pem
    
    # Остальная конфигурация...
</VirtualHost>
```

## Заключение

Использование альтернативных методов управления TLS сертификатами позволяет:

1. **Снизить зависимость** от облачных провайдеров
2. **Сэкономить деньги** на облачных сервисах
3. **Получить полный контроль** над процессом управления сертификатами
4. **Обеспечить безопасность** без внешних зависимостей

Выберите подходящий метод в зависимости от ваших требований к безопасности, доступности домена и инфраструктуры.
