#!/usr/bin/env node

/**
 * Скрипт для анализа и отладки проблемных сертификатов
 * Выводит детальную информацию о структуре сертификата
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const forge = require('node-forge');

// Получаем путь к файлу сертификата из аргументов командной строки
const certPath = process.argv[2];

if (!certPath) {
  console.error('❌ Необходимо указать путь к файлу сертификата');
  console.log('Использование: node analyze-certificate.cjs /path/to/cert.pem');
  process.exit(1);
}

// Полный путь к файлу сертификата
const fullPath = path.resolve(certPath);

console.log(`🔍 Анализ сертификата: ${fullPath}`);

// Проверяем существование файла
if (!fs.existsSync(fullPath)) {
  console.error(`❌ Файл сертификата не найден: ${fullPath}`);
  process.exit(1);
}

// Считываем содержимое сертификата
try {
  const certData = fs.readFileSync(fullPath, 'utf-8');

  // Проверяем формат PEM
  if (!certData.includes('-----BEGIN CERTIFICATE-----')) {
    console.error('❌ Неверный формат PEM: отсутствует маркер BEGIN CERTIFICATE');
    process.exit(1);
  }

  // Анализ с помощью OpenSSL (если доступен)
  try {
    console.log('\n📋 Информация OpenSSL:');
    const openSSLOutput = execSync(`openssl x509 -in "${fullPath}" -noout -text`, { encoding: 'utf-8' });
    console.log(openSSLOutput);
  } catch (e) {
    console.warn('⚠️ OpenSSL не установлен или произошла ошибка при вызове OpenSSL');
  }
  // Анализ с помощью node-forge
  try {
    console.log('\n📋 Анализ с помощью node-forge:');
    
    let certObj;
    try {
      certObj = forge.pki.certificateFromPem(certData);
    } catch (err) {
      if (err.message && (
        err.message.includes('Cannot read public key') || 
        err.message.includes('OID is not RSA') ||
        err.message.includes('Unsupported public key algorithm'))
      ) {
        console.error('\n❌ Ошибка при анализе алгоритма ключа:', err.message);
        console.log('\n⚠️ Сертификат использует алгоритм ключа, не поддерживаемый node-forge (вероятно ECC/ECDSA). Будет использован OpenSSL для анализа.');
        
        // Анализ типа ключа через OpenSSL
        try {
          const keyType = execSync(`openssl x509 -in "${fullPath}" -noout -pubkey | openssl pkey -pubin -inform PEM -text`, { encoding: 'utf-8' });
          console.log('\n📝 Информация о публичном ключе (OpenSSL):');
          console.log(keyType);
        } catch (opensslErr) {
          console.warn('⚠️ Не удалось определить тип ключа через OpenSSL:', opensslErr.message);
        }
        
        // Получаем основную информацию через OpenSSL
        try {
          const basicInfo = execSync(`openssl x509 -in "${fullPath}" -noout -text`, { encoding: 'utf-8' });
          console.log('\n📋 Основная информация о сертификате (OpenSSL):');
          console.log(basicInfo);
        } catch (basicInfoErr) {
          console.warn('⚠️ Не удалось получить основную информацию через OpenSSL:', basicInfoErr.message);
        }
        
        console.log('\n🚨 ВАЖНО: Ваш сертификат использует алгоритм ключа, который не поддерживается библиотекой node-forge, используемой в приложении.');
        console.log('Рекомендуемое решение:');
        console.log('1. Сгенерировать новый сертификат с использованием алгоритма RSA вместо ECC/ECDSA/DSA');
        console.log('2. При генерации сертификата используйте команду типа:');
        console.log('   openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem');
        console.log('3. Если требуется использовать текущий сертификат, модифицируйте код приложения для поддержки других алгоритмов ключей');
        
        return;
      } else {
        throw err;
      }
    }
    
    // Вывод общей информации
    console.log('\n✅ Основная информация:');
    
    // Серийный номер
    console.log(`📌 Серийный номер: ${certObj.serialNumber}`);
    
    // Срок действия
    const notBefore = new Date(certObj.validity.notBefore);
    const notAfter = new Date(certObj.validity.notAfter);
    console.log(`📅 Действителен с: ${notBefore.toISOString()}`);
    console.log(`📅 Действителен до: ${notAfter.toISOString()}`);
    
    // Информация о субъекте (детально)
    console.log('\n✅ Информация о субъекте сертификата:');
    const subjectAttrs = certObj.subject.attributes;
    if (subjectAttrs.length === 0) {
      console.log('❌ Поля субъекта отсутствуют!');
    } else {
      subjectAttrs.forEach(attr => {
        console.log(`${attr.name}: ${attr.value}`);
      });
    }

    // Поиск CN и альтернатив
    const cn = certObj.subject.getField('CN')?.value;
    const o = certObj.subject.getField('O')?.value;
    
    console.log('\n✅ Ключевые поля для идентификации домена:');
    console.log(`CN (Common Name): ${cn || 'ОТСУТСТВУЕТ'}`);
    console.log(`O (Organization): ${o || 'ОТСУТСТВУЕТ'}`);
    
    // Альтернативные имена
    try {
      const altNamesExt = certObj.getExtension('subjectAltName');
      if (altNamesExt && typeof altNamesExt === 'object' && 'altNames' in altNamesExt) {
        const altNames = altNamesExt.altNames;
        console.log('\n✅ Subject Alternative Names (SAN):');
        altNames.forEach((an, i) => {
          console.log(`SAN #${i+1}: ${an.type === 2 ? 'DNS' : an.type === 7 ? 'IP' : 'Other'}: ${an.value}`);
        });
      } else {
        console.log('\n❌ Расширение subjectAltName отсутствует');
      }
    } catch (e) {
      console.warn('\n⚠️ Ошибка при чтении Subject Alternative Names:', e.message);
    }
    
    // Информация о издателе
    console.log('\n✅ Информация о издателе:');
    const issuerAttrs = certObj.issuer.attributes;
    if (issuerAttrs.length === 0) {
      console.log('❌ Поля издателя отсутствуют!');
    } else {
      issuerAttrs.forEach(attr => {
        console.log(`${attr.name}: ${attr.value}`);
      });
    }
    
    // Список всех расширений
    console.log('\n✅ Список расширений сертификата:');
    try {
      const extensions = certObj.extensions;
      if (!extensions || extensions.length === 0) {
        console.log('❌ Расширения отсутствуют!');
      } else {
        extensions.forEach(ext => {
          console.log(`${ext.name}: ${ext.value ? 'Значение присутствует' : 'Значение отсутствует'}`);
        });
      }
    } catch (e) {
      console.warn('⚠️ Ошибка при чтении расширений:', e.message);
    }
    
  } catch (e) {
    console.error('❌ Ошибка при анализе сертификата с помощью node-forge:', e.message);
    console.error(e);
  }
  
  console.log('\n🎯 Рекомендации:');
  console.log('1. Убедитесь, что сертификат содержит поле CN (Common Name) с именем домена');
  console.log('2. Если CN отсутствует, сертификат должен содержать расширение subjectAltName с DNS именами');
  console.log('3. Проверьте срок действия сертификата (notBefore и notAfter)');
  console.log('4. Убедитесь, что издатель сертификата корректно указан');
  
} catch (error) {
  console.error(`❌ Ошибка при чтении/анализе сертификата: ${error.message}`);
  process.exit(1);
}
