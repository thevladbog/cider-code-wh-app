# Настройка производственных сертификатов в CI/CD

## 📋 Обзор

CI/CD pipeline теперь автоматически генерирует производственные TLS сертификаты при релизе стабильной версии. Сертификаты создаются через Let's Encrypt с использованием Cloudflare DNS challenge.

## 🔧 Необходимые GitHub Secrets

Для автоматической генерации производственных сертификатов нужно добавить следующие секреты в настройки репозитория:

### 1. PRODUCTION_DOMAIN_NAME
```
Описание: Домен для которого генерировать сертификат
Пример: myapp.example.com
Тип: Repository secret (обязательно secret, не variable)
```

### 2. ACME_EMAIL  
```
Описание: Email для регистрации в Let's Encrypt
Пример: admin@example.com
Тип: Repository secret (обязательно secret, не variable)
```

### 3. CLOUDFLARE_API_TOKEN
```
Описание: API токен Cloudflare для DNS challenge
Получение: https://dash.cloudflare.com/profile/api-tokens
Права: Zone:Zone:Read, Zone:DNS:Edit, Zone:Zone Settings:Read
Тип: Repository secret (обязательно secret)
```

> ⚠️ **Важно**: Все значения должны быть добавлены как **Repository secrets**, не как переменные репозитория, так как они содержат конфиденциальную информацию.

## 🚀 Как добавить секреты

1. Перейдите в настройки репозитория: **Settings** → **Secrets and variables** → **Actions**
2. Нажмите **"New repository secret"**
3. Добавьте каждый секрет:

### PRODUCTION_DOMAIN_NAME
- **Name**: `PRODUCTION_DOMAIN_NAME`
- **Value**: `ваш-домен.com`

### ACME_EMAIL
- **Name**: `ACME_EMAIL` 
- **Value**: `admin@example.com`

### CLOUDFLARE_API_TOKEN
- **Name**: `CLOUDFLARE_API_TOKEN`
- **Value**: `ваш_cloudflare_api_токен`

## 🔄 Как работает процесс

### Для beta релизов:
- Генерируются самоподписанные сертификаты для localhost
- Используется для разработки и тестирования

### Для stable релизов:
1. **Установка зависимостей**: certbot и python3-certbot-dns-cloudflare
2. **Генерация сертификатов**: запуск `scripts/generate-production-certs.cjs`
3. **DNS Challenge**: использование Cloudflare API для подтверждения домена
4. **Загрузка артефактов**: сертификаты сохраняются как отдельный артефакт
5. **Включение в релиз**: сертификаты добавляются к файлам релиза

## 📦 Получение сертификатов

После успешного релиза вы можете:

1. **Скачать из GitHub Release**: 
   - Перейдите в Releases
   - Найдите файл `production-certificates-v*.zip`
   - Скачайте и разархивируйте

2. **Использовать в CI/CD других проектов**:
   ```yaml
   - name: Download certificates
     uses: actions/download-artifact@v4
     with:
       name: production-certificates-${{ needs.version.outputs.new_version }}
   ```

## 🔒 Безопасность

### ✅ Что обеспечивается:
- Сертификаты генерируются только в защищенной среде CI
- API токены хранятся в GitHub Secrets
- Сертификаты имеют ограниченное время жизни (7 дней в артефактах)
- Используются минимальные права доступа для API токенов

### ⚠️ Важные замечания:
- Сертификаты НЕ коммитятся в репозиторий
- Private ключи передаются только через защищенные артефакты
- Регулярно ротируйте API токены
- Мониторьте логи CI/CD на предмет ошибок

## 🛠️ Устранение неполадок

### Проблема: Cloudflare API ошибка
```bash
# Проверьте токен
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json"
```

### Проблема: Домен недоступен
- Убедитесь, что домен добавлен в Cloudflare
- Проверьте, что домен активен (не в паузе)
- Убедитесь, что DNS записи настроены

### Проблема: Let's Encrypt лимиты
- Let's Encrypt имеет лимиты на количество сертификатов
- Для тестирования используйте staging окружение
- Подробнее: https://letsencrypt.org/docs/rate-limits/

### Проблема: Fallback к самоподписанным
Если генерация Let's Encrypt не удается, скрипт автоматически создает самоподписанные сертификаты:
- Проверьте логи CI/CD для выяснения причины
- Самоподписанные сертификаты подходят для разработки
- Для production нужны валидные сертификаты

## 📋 Пример использования

После скачивания сертификатов на production сервер:

```bash
# Разархивировать сертификаты
unzip production-certificates-v1.0.0.zip -d /path/to/app/certs/

# Установить права доступа
chmod 644 /path/to/app/certs/cert.pem
chmod 644 /path/to/app/certs/ca.pem  
chmod 600 /path/to/app/certs/key.pem

# Запустить приложение
./your-app
```

## 🔄 Автоматическое обновление

Для автоматического обновления сертификатов создайте cron задачу на production сервере:

```bash
# Добавить в crontab
0 2 * * 1 /path/to/app/scripts/renew-certificates.cjs
```

Это будет проверять и обновлять сертификаты каждый понедельник в 2:00.
