# 🔑 Настройка GitHub Secrets для CI/CD

Перед запуском релиза необходимо настроить следующие секреты в репозитории:

## 📝 Список обязательных секретов:

### 1. PRODUCTION_DOMAIN_NAME
- **Назначение**: Домен для генерации SSL сертификата
- **Пример**: `myapp.example.com`
- **Путь настройки**: Settings → Secrets and variables → Actions → New repository secret

### 2. ACME_EMAIL
- **Назначение**: Email для регистрации в Let's Encrypt
- **Пример**: `admin@example.com`
- **Путь настройки**: Settings → Secrets and variables → Actions → New repository secret

### 3. CLOUDFLARE_API_TOKEN
- **Назначение**: API токен для DNS challenge через Cloudflare
- **Получение**: https://dash.cloudflare.com/profile/api-tokens
- **Права**: Zone:Zone:Read, Zone:DNS:Edit, Zone:Zone Settings:Read
- **Путь настройки**: Settings → Secrets and variables → Actions → New repository secret

## 🚀 Инструкция по настройке:

1. Перейдите в настройки репозитория на GitHub
2. Выберите **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **"New repository secret"**
4. Добавьте каждый секрет с указанными именами
5. Убедитесь, что все значения введены корректно

## 📋 Проверка настройки:

После настройки всех секретов в логах CI/CD не должно быть ошибок типа "Context access might be invalid".

## 🔐 Безопасность:

- Никогда не коммитьте реальные значения секретов в репозиторий
- Используйте минимальные необходимые права для API токенов
- Регулярно ротируйте API токены
- Проверяйте логи CI/CD на предмет утечки конфиденциальной информации
