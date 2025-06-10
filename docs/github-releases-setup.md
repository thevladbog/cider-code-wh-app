# GitHub Releases автообновление

## 🎯 Обзор

Система автообновления настроена для работы с GitHub Releases репозитория `https://github.com/thevladbog/cider-code-wh-app`.

## ⚙️ Настройки

### Конфигурация автообновления
- **Репозиторий**: `thevladbog/cider-code-wh-app`
- **Провайдер**: GitHub Releases
- **Проверка обновлений**: При запуске + каждые 4 часа
- **Автозагрузка**: Отключена (пользователь выбирает)

### Файлы конфигурации
- `src/utils/updater.ts` - логика автообновления
- `forge.config.ts` - настройки сборки и публикации
- `.github/workflows/build-and-release.yml` - GitHub Actions

## 🚀 Создание релиза

### Автоматический способ
```bash
# Создать релиз с текущей версией
npm run release:github

# Создать релиз с новой версией
npm run release:github 1.0.3
```

### Ручной способ
1. Обновите версию в `package.json`
2. Создайте коммит: `git commit -am "chore: bump version to 1.0.3"`
3. Создайте тег: `git tag -a v1.0.3 -m "Release 1.0.3"`
4. Запушьте: `git push origin main && git push origin v1.0.3`

### GitHub Actions (автоматически)
- Триггер: создание тега `v*`
- Сборка на Windows
- Создание GitHub Release (draft)
- Загрузка артефактов (.exe, .nupkg, RELEASES)

## 📦 Артефакты релиза

Каждый релиз содержит:
- `bottle-code-wh-app-{version}-setup.exe` - установщик
- `bottle_code_wh_app-{version}-full.nupkg` - пакет обновления
- `RELEASES` - метаданные для Squirrel

## 🔄 Процесс обновления

1. **Проверка**: Приложение проверяет GitHub Releases API
2. **Уведомление**: Показывается UI с информацией о новой версии
3. **Загрузка**: Пользователь выбирает загрузить обновление
4. **Установка**: После загрузки предлагается перезапуск

## 🛠️ Отладка

### Локальное тестирование
Для тестирования без GitHub:
```typescript
// В src/utils/updater.ts закомментируйте:
// autoUpdater.setFeedURL({ 
//   provider: 'github', 
//   owner: 'thevladbog', 
//   repo: 'cider-code-wh-app' 
// });

// И используйте локальный сервер:
npm run start:update-server
```

### Проверка обновлений
- Интерфейс обновлений доступен в приложении
- Логи в Developer Tools (F12)
- Состояние: проверка → доступно → загрузка → готово

## 📋 Требования

### GitHub Token
Для публикации через CLI нужен GitHub token:
```bash
# Создайте Personal Access Token с правами 'repo'
export GITHUB_TOKEN="your_token_here"
npm run publish:github
```

### Переменные окружения
- `GITHUB_TOKEN` - для автоматической публикации
- `NODE_ENV=production` - для продакшн сборки

## 🔐 Подписывание (опционально)

Для подписи обновлений добавьте сертификат:
```bash
# Установите переменные окружения
$env:WINDOWS_CERTIFICATE_FILE = "path\to\cert.p12"
$env:WINDOWS_CERTIFICATE_PASSWORD = "password"

# Соберите подписанную версию
npm run build:release
```

## 🎛️ Управление релизами

### GitHub UI
1. Перейдите в [Releases](https://github.com/thevladbog/cider-code-wh-app/releases)
2. Найдите draft релиз
3. Отредактируйте описание
4. Опубликуйте релиз

### Автоматическое описание
GitHub Actions автоматически генерирует описание релиза на основе коммитов между версиями.

## ⚡ Быстрый старт

1. **Убедитесь, что все изменения закоммичены**
2. **Создайте релиз**: `npm run release:github 1.0.3`
3. **Дождитесь сборки**: Проверьте GitHub Actions
4. **Опубликуйте**: Перейдите в Releases и опубликуйте draft

## 🧪 Тестирование

Установите старую версию приложения и проверьте автообновление:
1. Соберите версию 1.0.1
2. Создайте релиз 1.0.2
3. Запустите приложение версии 1.0.1
4. Проверьте уведомление об обновлении
