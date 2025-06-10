# Управление Версиями в Release Pipeline

## Обзор

В нашем релизном процессе используется автоматическая генерация версий с синхронизацией между GitHub Actions и `package.json`. Это обеспечивает консистентность версий во всех компонентах проекта.

## Как это работает

### 1. Генерация Версии в GitHub Actions

В workflow `release.yml` используется action `paulhatch/semantic-version@v5.4.0` для автоматической генерации версий на основе:

- **Ветки**: `release-stable` (стабильные версии) или `release-beta` (бета-версии)
- **Сообщений коммитов**: `(MAJOR)` или `(MINOR)` для определения типа обновления
- **Истории коммитов**: автоматический инкремент patch-версии

### 2. Обновление package.json

После генерации версии, автоматически обновляется `package.json`:

```yaml
- name: Update package.json version
  run: |
    echo "🔄 Updating package.json version to ${{ steps.semver.outputs.version }}"
    node scripts/update-package-version.cjs ${{ steps.semver.outputs.version }}
```

### 3. Коммит Изменений

Обновленный `package.json` автоматически коммитится обратно в репозиторий:

```yaml
- name: Commit updated package.json
  run: |
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git add package.json
    if git diff --staged --quiet; then
      echo "📝 No changes to package.json version"
    else
      git commit -m "chore: update version to ${{ steps.semver.outputs.version }} [skip ci]"
      git push
      echo "✅ package.json version updated and pushed"
    fi
```

## Форматы Версий

### Стабильные релизы (release-stable)
- Формат: `MAJOR.MINOR.PATCH`
- Примеры: `1.0.0`, `1.2.3`, `2.0.0`

### Бета релизы (release-beta)
- Формат: `MAJOR.MINOR.PATCH-beta.INCREMENT`
- Примеры: `1.0.0-beta.1`, `1.2.3-beta.5`

## Управление Типом Обновления

### Автоматическое определение
- **Patch**: По умолчанию (1.0.0 → 1.0.1)
- **Minor**: Добавить `(MINOR)` в сообщение коммита (1.0.0 → 1.1.0)
- **Major**: Добавить `(MAJOR)` в сообщение коммита (1.0.0 → 2.0.0)

### Примеры сообщений коммитов

```bash
# Patch версия (по умолчанию)
git commit -m "fix: исправлена ошибка в логике печати"

# Minor версия
git commit -m "feat: добавлена поддержка нового типа принтера (MINOR)"

# Major версия  
git commit -m "feat!: полностью переработан API принтера (MAJOR)"
```

## Локальные Скрипты

### Обновление версии вручную

```bash
# Обновить версию в package.json
npm run version:update 1.2.3

# Обновить на бета версию
npm run version:update 1.2.3-beta.1
```

### Использование в коде

```javascript
// Использование в других скриптах
const { updatePackageVersion, isValidVersion } = require('./scripts/update-package-version.cjs');

// Проверка валидности версии
if (isValidVersion('1.2.3')) {
  updatePackageVersion('1.2.3');
}
```

## Безопасность

### Права доступа
- GitHub Action имеет право `contents: write` для коммитов
- Коммиты помечены `[skip ci]` чтобы избежать бесконечных циклов
- Используется официальный email и имя GitHub Action

### Проверки
- Валидация формата версии (semver)
- Проверка существования `package.json`
- Graceful handling ошибок JSON

## Мониторинг

### Логи в GitHub Actions
```
🔄 Updating package.json version to 1.2.3
✅ Версия в package.json обновлена: 1.0.0 → 1.2.3  
✅ package.json version updated and pushed
```

### Телеграм уведомления
Версия автоматически включается в уведомления о релизе в Telegram.

## Отладка

### Частые проблемы

1. **Версия не обновляется**
   - Проверьте права `contents: write` в workflow
   - Убедитесь что скрипт `update-package-version.cjs` существует

2. **Неверный формат версии**
   - Используйте семантическое версионирование (semver)
   - Проверьте что версия соответствует регулярному выражению

3. **Конфликты коммитов**
   - Убедитесь что используется `[skip ci]` в сообщении коммита
   - Проверьте что нет локальных изменений в `package.json`

### Тестирование
```bash
# Запуск тестов для скрипта версионирования
npm run test:scripts

# Проверка конкретного теста
npx vitest tests/scripts/update-package-version.test.js
```

## Интеграция с другими системами

### Electron Builder
`package.json` версия автоматически используется Electron Forge для:
- Имен файлов сборки
- Метаданных приложения
- Имен артефактов

### GitHub Releases
Версия из `package.json` синхронизирована с тегами релизов в GitHub.

### Система обновлений
Версия используется для определения доступности обновлений в приложении.
