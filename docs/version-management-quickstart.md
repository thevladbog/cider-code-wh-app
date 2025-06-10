# Быстрое руководство по управлению версиями

## Что было реализовано

✅ **Автоматическая синхронизация версий между GitHub Actions и `package.json`**
✅ **Скрипт для ручного обновления версий**
✅ **Демонстрационный workflow для тестирования**
✅ **Полное покрытие тестами**
✅ **Подробная документация**

## Как использовать

### 1. Автоматический релиз через GitHub Actions

```bash
# Создать стабильный релиз
git checkout release-stable
git push origin release-stable

# Создать beta релиз  
git checkout release-beta
git push origin release-beta
```

**Что произойдет:**
1. GitHub Actions сгенерирует новую версию
2. Обновит `package.json` 
3. Сделает коммит с новой версией
4. Создаст сборки для всех платформ
5. Опубликует релиз в GitHub
6. Отправит уведомления в Telegram

### 2. Ручное обновление версии

```bash
# Обновить на конкретную версию
npm run version:update 1.2.3

# Обновить на beta версию
npm run version:update 1.2.3-beta.1
```

### 3. Демонстрация процесса

```bash
# Показать как работает stable релиз
npm run version:demo

# Показать как работает beta релиз  
npm run version:demo:beta
```

### 4. Управление типом обновления

Добавьте в сообщение коммита:
- `(MAJOR)` - для major версии (1.0.0 → 2.0.0)
- `(MINOR)` - для minor версии (1.0.0 → 1.1.0)  
- По умолчанию - patch версия (1.0.0 → 1.0.1)

```bash
# Примеры коммитов
git commit -m "fix: исправлена критическая ошибка"
git commit -m "feat: добавлена новая функция (MINOR)"
git commit -m "feat!: полностью изменен API (MAJOR)"
```

## Форматы версий

- **Stable**: `1.0.0`, `1.2.3`, `2.0.0`
- **Beta**: `1.0.0-beta.1`, `1.2.3-beta.5`

## Тестирование

```bash
# Запустить все тесты для скриптов
npm run test:scripts

# Проверить конкретный модуль
npx vitest tests/scripts/update-package-version.test.js
```

## Файлы в проекте

- `scripts/update-package-version.cjs` - Основной скрипт обновления
- `scripts/demo-version-workflow.cjs` - Демонстрация процесса
- `.github/workflows/release.yml` - GitHub Actions workflow
- `docs/version-management.md` - Подробная документация
- `tests/scripts/update-package-version.test.js` - Тесты

## Безопасность

- Используется `[skip ci]` в коммитах для избежания бесконечных циклов
- GitHub Action имеет минимальные права (`contents: write`)
- Валидация версий соответствует семантическому версионированию
- Graceful handling всех ошибок

## Мониторинг

- Логи в GitHub Actions показывают весь процесс
- Telegram уведомления включают информацию о версии
- Версия автоматически отображается в артефактах сборки

---

**🎉 Готово к использованию!** Система полностью настроена и протестирована.
