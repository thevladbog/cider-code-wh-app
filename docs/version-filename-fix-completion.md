# ✅ Исправлена проблема с версией в именах файлов релиза - ЗАВЕРШЕНО

## 🚨 Проблема

При релизе стабильной версии в названия файлов подставлялась версия из `package.json`, а не та, которая была сгенерирована для релиза в GitHub Actions.

## 🔍 Причина проблемы

1. **GitHub Actions генерирует новую версию** (например, `1.0.20`) через `semantic-version` action
2. **Обновляет package.json** в job `version` с новой версией  
3. **НО** job `build` запускается **параллельно** и не ждет обновления package.json
4. **`forge.config.ts`** загружает версию из **старого** package.json во время инициализации модуля

## ✅ Решение

### 1. **Динамическое чтение версии в forge.config.ts**

Изменили конфигурацию для поддержки переменной окружения `APP_VERSION`:

```typescript
// Функция для динамического получения версии
function getAppVersion(): string {
  // Сначала пробуем взять версию из переменной окружения (приоритет для CI/CD)
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }
  
  // Иначе читаем из package.json
  try {
    const packageData = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    return packageData.version;
  } catch (error) {
    console.warn('Warning: Could not read package.json, using default version');
    return '1.0.0';
  }
}

// Использование в конфигурации
new MakerSquirrel({
  setupExe: `bottle-code-wh-app-${appVersion}-setup.exe`,
  // ...
}),
new MakerDMG({
  name: `bottle-c-wh-${appVersion}`,
  // ...
})
```

### 2. **Обновлена проверка DMG имени**

Синхронизирован `scripts/check-dmg-name.cjs` для использования той же логики:

```javascript
// Функция для динамического получения версии (такая же как в forge.config.ts)
function getAppVersion() {
  // Сначала пробуем взять версию из переменной окружения (приоритет для CI/CD)
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }
  
  // Иначе читаем из package.json
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageData.version;
  } catch (error) {
    console.warn('Warning: Could not read package.json, using default version');
    return '1.0.0';
  }
}
```

### 3. **Обновлен GitHub Actions workflow**

Добавлена переменная окружения `APP_VERSION` в шаги сборки:

```yaml
- name: Build and make application (production)
  if: needs.version.outputs.release_type == 'stable'
  shell: bash
  run: |
    echo "🏭 Building production release with stable API URL..."
    echo "📦 Using version: ${{ needs.version.outputs.new_version }}"
    npm run make
  env:
    NODE_ENV: production
    APP_VERSION: ${{ needs.version.outputs.new_version }}
    
- name: Check macOS DMG configuration
  if: runner.os == 'macOS'
  run: |
    echo "🔍 Checking macOS DMG name configuration..."
    npm run check:dmg
  env:
    APP_VERSION: ${{ needs.version.outputs.new_version }}
```

## 🔧 Дополнительные исправления

### **Проблема с паролем архива сертификатов**

Также была исправлена проблема с генерацией паролей для архивов сертификатов:

1. **Убраны спецсимволы** из генерации пароля для лучшей совместимости
2. **Улучшена логика создания архивов** с приоритетом для Linux (CI/CD)
3. **Добавлена проверка архива** с паролем после создания
4. **Создается fallback решение** для Windows без инструментов шифрования

```javascript
// Генерация пароля только из букв и цифр
function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  // ...
}

// Проверка созданного архива
function verifyArchive(archivePath, password) {
  // Проверяем архив в зависимости от платформы
  // Linux: unzip -P password
  // Windows: 7z/WinRAR или fallback с PASSWORD.txt
  // macOS: unzip -P password
}
```

## ✅ Результат

### **Теперь работает правильно:**

1. **Версия в именах файлов** соответствует сгенерированной в GitHub Actions
2. **DMG проверка** использует правильную версию
3. **Архивы сертификатов** создаются с работающими паролями
4. **Fallback решения** для систем без инструментов шифрования

### **Примеры правильных имен файлов:**

```
# Стабильная версия 1.0.20
bottle-code-wh-app-1.0.20-setup.exe
bottle-c-wh-1.0.20.dmg
secure-certificates-v1.0.20.zip

# Бета версия 1.0.20-beta.1  
bottle-code-wh-app-1.0.20-beta.1-setup.exe
bottle-c-wh-1.0.20-beta.1.dmg
secure-certificates-v1.0.20-beta.1.zip
```

## 🧪 Тестирование

### **Локальное тестирование:**

```powershell
# Тест с переменной окружения
$env:APP_VERSION="1.0.20"
npm run check:dmg

# Результат:
# 📦 Версия приложения: 1.0.20
# 📁 Имя DMG: "bottle-c-wh-1.0.20"
# 📏 Длина имени: 18 символов
# ✅ Имя DMG соответствует требованиям macOS
```

### **Тест архива сертификатов:**

```powershell
$env:VERSION="1.0.20"
node scripts/secure-certificates.cjs --test

# Результат:
# ✅ Archive created with working password
# 🔑 Password verification successful
```

## 📋 Изменённые файлы

- ✅ `forge.config.ts` - динамическое чтение версии
- ✅ `scripts/check-dmg-name.cjs` - синхронизация логики версий
- ✅ `.github/workflows/release.yml` - добавлена переменная APP_VERSION
- ✅ `scripts/secure-certificates.cjs` - исправлены пароли архивов

## 🎯 Следующий релиз

При следующем релизе через `git push origin release-stable` или `git push origin release-beta`:

1. GitHub Actions сгенерирует правильную версию
2. Передаст её в переменной окружения `APP_VERSION`
3. Все файлы будут иметь правильные имена с актуальной версией
4. Архивы сертификатов будут работать с правильными паролями

---

**Дата исправления:** 11 июня 2025  
**Статус:** ✅ COMPLETED  
**Тестирование:** ✅ PASSED  
**Готовность к production:** ✅ READY
