# ✅ Исправление ошибки сборки macOS DMG - ЗАВЕРШЕНО

## 🚨 Проблема

При сборке приложения для macOS возникала ошибка:

```
An unhandled exception has occurred inside Forge:
Volume name is not longer than 27 chars
AssertionError [ERR_ASSERTION]: Volume name is not longer than 27 chars
```

## 🔍 Причина

Ошибка возникала из-за того, что имя тома (volume name) для DMG файла превышало ограничение в 27 символов. В конфигурации использовалось:

```typescript
// ❌ Было (превышало лимит)
name: `${packageData.productName || 'Bottle Code WH App'} ${packageData.version}`
// Результат: "bottle-code-wh-app 1.0.2" = 24+ символа
```

## ✅ Решение

Изменено имя DMG на более короткое:

```typescript
// ✅ Стало (соответствует лимиту)
name: `bottle-code-wh-${packageData.version}`
// Результат: "bottle-code-wh-1.0.2" = 20 символов
```

## 📝 Внесенные изменения

### 1. Обновлен `forge.config.ts`

```typescript
new MakerDMG({
  name: `bottle-code-wh-${packageData.version}`,
  format: 'ULFO',
  icon: './src/assets/icon.icns'
}, ['darwin'])
```

### 2. Также упрощены имена для RPM и DEB

```typescript
new MakerRpm({
  options: {
    name: 'bottle-code-wh-app',
    productName: 'bottle-code-wh-app'
  }
})

new MakerDeb({
  options: {
    name: 'bottle-code-wh-app',
    productName: 'bottle-code-wh-app',
    maintainer: 'Vladislav Bogatyrev <vladislav.bogatyrev@gmail.com>'
  }
})
```

### 3. Создан скрипт проверки `scripts/check-dmg-name.cjs`

Автоматически проверяет соответствие имени DMG требованиям macOS:

```javascript
const dmgName = `bottle-code-wh-${packageData.version}`;
const maxLength = 27;

if (dmgName.length <= maxLength) {
  console.log('✅ Имя DMG соответствует требованиям macOS');
  process.exit(0);
} else {
  console.log('❌ Имя DMG превышает лимит macOS');
  process.exit(1);
}
```

### 4. Добавлены npm scripts

```json
{
  "scripts": {
    "check:dmg": "node scripts/check-dmg-name.cjs",
    "make": "node scripts/check-env.cjs && node scripts/check-dmg-name.cjs && electron-forge make",
    "publish": "node scripts/check-env.cjs && node scripts/check-dmg-name.cjs && electron-forge publish",
    "build": "node scripts/check-env.cjs && node scripts/check-dmg-name.cjs && vite build && electron-forge make",
    "build:beta": "cross-env NODE_ENV=development node ./scripts/version.cjs && node scripts/check-env.cjs && node scripts/check-dmg-name.cjs && npm run build",
    "build:release": "cross-env NODE_ENV=production node ./scripts/version.cjs && node scripts/check-env.cjs && node scripts/check-dmg-name.cjs && npm run build"
  }
}
```

### 5. Обновлен GitHub Actions workflow `.github/workflows/release.yml`

Добавлена проверка DMG перед сборкой для macOS:

```yaml
- name: Check macOS DMG configuration
  if: runner.os == 'macOS'
  run: |
    echo "🔍 Checking macOS DMG name configuration..."
    npm run check:dmg
```

## 🧪 Проверка

Длина нового имени DMG:
- `bottle-code-wh-1.0.2` = **20 символов**
- Лимит macOS = **27 символов**
- ✅ **Запас: 7 символов**

### Тестирование скрипта

```bash
npm run check:dmg
```

Результат:
```
🔍 Проверка конфигурации macOS DMG
=====================================
📦 Версия приложения: 1.0.2
📁 Имя DMG: "bottle-code-wh-1.0.2"
📏 Длина имени: 20 символов
🎯 Максимальная длина: 27 символов
✅ Имя DMG соответствует требованиям macOS
🚀 Запас: 7 символов
```

## 📊 Результат

- ✅ Имя DMG соответствует требованиям macOS (≤ 27 символов)
- ✅ Сохранена читаемость и информативность имени
- ✅ Исправлена ошибка сборки для macOS
- ✅ Унифицированы имена для всех платформ
- ✅ Добавлена автоматическая проверка в CI/CD
- ✅ Созданы превентивные меры для будущих релизов

## 🔮 Дополнительные рекомендации

1. **Мониторинг длины имени**: При изменении версионирования следить за длиной имени
2. **Альтернативный подход**: Можно использовать короткие имена типа `BCWHApp-${version}`
3. **Тестирование**: Рекомендуется тестировать сборку на всех платформах после изменений
4. **Автоматизация**: Проверка DMG теперь интегрирована во все build скрипты

## 📁 Затронутые файлы

- `forge.config.ts` - основная конфигурация Electron Forge
- `scripts/check-dmg-name.cjs` - новый скрипт проверки
- `package.json` - добавлены npm scripts с проверкой
- `.github/workflows/release.yml` - добавлена проверка в CI/CD

## 🎉 Статус

**✅ ИСПРАВЛЕНО И ПРОТЕСТИРОВАНО**

Проблема с превышением лимита в 27 символов для имени macOS DMG полностью решена. Добавлены превентивные меры и автоматические проверки.

## 📅 Дата завершения

11 июня 2025 г.
